/**
 * Backup and Restore Service for Meta Maximus
 * 
 * Handles database backup and restoration operations
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const database = require('./database');
const logger = require('./logger');
const dataAccess = require('./dataAccess');

// Promisify fs functions
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);

// Default backup directory
const BACKUP_DIR = path.join(process.cwd(), 'backups');

/**
 * Create a backup of all database collections
 * 
 * @param {Object} options - Backup options
 * @param {string} options.outputDir - Directory to store the backup (default: backups/)
 * @param {string} options.prefix - Prefix for backup files (default: backup)
 * @param {string} options.storeId - Store ID to backup (default: all stores)
 * @returns {Promise<Object>} Backup result with file paths and counts
 */
async function createBackup(options = {}) {
  const {
    outputDir = BACKUP_DIR,
    prefix = 'backup',
    storeId
  } = options;
  
  try {
    logger.info('Starting database backup', { outputDir, prefix, storeId });
    
    // Connect to database
    const db = await database.connectToDatabase();
    if (!db) {
      throw new Error('Failed to connect to database for backup');
    }
    
    // Create backup directory if it doesn't exist
    try {
      await stat(outputDir);
    } catch (error) {
      logger.info(`Creating backup directory: ${outputDir}`);
      await mkdir(outputDir, { recursive: true });
    }
    
    // Create timestamp for backup files
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupFiles = {};
    const counts = {};
    
    // Backup all collections
    for (const collectionName of Object.values(dataAccess.RESOURCE_TYPES)) {
      try {
        // Build query for this collection
        const query = {};
        if (storeId) {
          query.storeId = storeId;
        }
        
        // Get all documents from the collection
        const documents = await db.collection(collectionName).find(query).toArray();
        counts[collectionName] = documents.length;
        
        if (documents.length === 0) {
          logger.info(`No documents found in ${collectionName}${storeId ? ` for storeId ${storeId}` : ''}`);
          continue;
        }
        
        // Create backup file name
        const fileName = `${prefix}_${collectionName}_${timestamp}.json`;
        const filePath = path.join(outputDir, fileName);
        
        // Write backup file
        await writeFile(
          filePath,
          JSON.stringify(documents, null, 2),
          'utf8'
        );
        
        backupFiles[collectionName] = filePath;
        
        logger.info(`Backed up ${documents.length} documents from ${collectionName} to ${fileName}`);
      } catch (error) {
        logger.error(`Error backing up collection ${collectionName}`, error);
        throw error;
      }
    }
    
    // Create backup metadata file
    const metadataFile = path.join(outputDir, `${prefix}_metadata_${timestamp}.json`);
    const metadata = {
      timestamp,
      date: new Date().toISOString(),
      storeId: storeId || 'all',
      collections: Object.keys(backupFiles),
      counts,
      backupFiles
    };
    
    await writeFile(
      metadataFile,
      JSON.stringify(metadata, null, 2),
      'utf8'
    );
    
    logger.info('Backup completed successfully', {
      timestamp,
      collections: Object.keys(backupFiles),
      totalDocuments: Object.values(counts).reduce((sum, count) => sum + count, 0)
    });
    
    return {
      timestamp,
      metadata: metadataFile,
      files: backupFiles,
      counts
    };
  } catch (error) {
    logger.error('Backup operation failed', error);
    throw error;
  }
}

/**
 * Restore database from backup files
 * 
 * @param {Object} options - Restore options
 * @param {string} options.metadataFile - Path to backup metadata file
 * @param {boolean} options.dropCollections - Whether to drop collections before restoring (default: false)
 * @param {string} options.storeId - Store ID to restore (default: as specified in backup)
 * @returns {Promise<Object>} Restore result with counts
 */
async function restoreFromBackup(options = {}) {
  const {
    metadataFile,
    dropCollections = false,
    storeId
  } = options;
  
  if (!metadataFile) {
    throw new Error('Metadata file path is required for restore operation');
  }
  
  try {
    logger.info('Starting database restore', { metadataFile, dropCollections, storeId });
    
    // Read metadata file
    const metadataContent = await readFile(metadataFile, 'utf8');
    const metadata = JSON.parse(metadataContent);
    
    // Connect to database
    const db = await database.connectToDatabase();
    if (!db) {
      throw new Error('Failed to connect to database for restore');
    }
    
    const restoreCounts = {};
    
    // Restore each collection
    for (const collectionName of Object.keys(metadata.backupFiles)) {
      try {
        // Read backup file
        const backupFile = metadata.backupFiles[collectionName];
        const backupContent = await readFile(backupFile, 'utf8');
        let documents = JSON.parse(backupContent);
        
        // Filter by storeId if specified
        if (storeId) {
          documents = documents.filter(doc => doc.storeId === storeId);
        }
        
        if (documents.length === 0) {
          logger.info(`No documents to restore for ${collectionName}`);
          restoreCounts[collectionName] = 0;
          continue;
        }
        
        // Drop collection if requested
        if (dropCollections) {
          logger.warn(`Dropping collection ${collectionName} before restore`);
          await db.collection(collectionName).drop().catch(() => {
            // Ignore error if collection doesn't exist
            logger.info(`Collection ${collectionName} did not exist, skipping drop`);
          });
        }
        
        // Insert documents in batches
        const batchSize = 100;
        const batches = [];
        
        for (let i = 0; i < documents.length; i += batchSize) {
          batches.push(documents.slice(i, i + batchSize));
        }
        
        let insertedCount = 0;
        
        for (const batch of batches) {
          // Convert string _id back to ObjectId
          const preparedBatch = batch.map(doc => {
            const newDoc = { ...doc };
            if (newDoc._id && typeof newDoc._id === 'string') {
              try {
                const { ObjectId } = require('mongodb');
                newDoc._id = new ObjectId(newDoc._id);
              } catch (e) {
                // Keep string _id if not a valid ObjectId
              }
            }
            return newDoc;
          });
          
          // Insert batch
          const result = await db.collection(collectionName).insertMany(
            preparedBatch,
            { ordered: false } // Continue on error
          );
          
          insertedCount += result.insertedCount;
        }
        
        restoreCounts[collectionName] = insertedCount;
        
        logger.info(`Restored ${insertedCount} documents to ${collectionName}`);
      } catch (error) {
        logger.error(`Error restoring collection ${collectionName}`, error);
        // Continue with other collections despite errors
      }
    }
    
    logger.info('Restore completed', {
      totalRestored: Object.values(restoreCounts).reduce((sum, count) => sum + count, 0),
      collections: restoreCounts
    });
    
    return {
      timestamp: new Date().toISOString(),
      originalBackup: metadata.timestamp,
      counts: restoreCounts
    };
  } catch (error) {
    logger.error('Restore operation failed', error);
    throw error;
  }
}

/**
 * List available backups
 * 
 * @param {Object} options - List options
 * @param {string} options.directory - Directory to look for backups (default: backups/)
 * @returns {Promise<Array>} Array of backup metadata
 */
async function listBackups(options = {}) {
  const { directory = BACKUP_DIR } = options;
  
  try {
    logger.info(`Listing backups in ${directory}`);
    
    // Check if directory exists
    try {
      await stat(directory);
    } catch (error) {
      logger.info(`Backup directory ${directory} does not exist`);
      return [];
    }
    
    // List files
    const files = fs.readdirSync(directory);
    
    // Find metadata files
    const metadataFiles = files.filter(file => file.includes('_metadata_') && file.endsWith('.json'));
    
    // Read metadata files
    const backups = [];
    
    for (const file of metadataFiles) {
      try {
        const filePath = path.join(directory, file);
        const content = await readFile(filePath, 'utf8');
        const metadata = JSON.parse(content);
        
        backups.push({
          filename: file,
          path: filePath,
          timestamp: metadata.timestamp,
          date: metadata.date,
          storeId: metadata.storeId,
          collections: metadata.collections,
          counts: metadata.counts,
          totalDocuments: Object.values(metadata.counts).reduce((sum, count) => sum + count, 0)
        });
      } catch (error) {
        logger.error(`Error reading metadata file ${file}`, error);
        // Continue with other files despite errors
      }
    }
    
    // Sort by timestamp (newest first)
    backups.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    logger.info(`Found ${backups.length} backups`);
    
    return backups;
  } catch (error) {
    logger.error('Error listing backups', error);
    throw error;
  }
}

module.exports = {
  createBackup,
  restoreFromBackup,
  listBackups,
  BACKUP_DIR
};