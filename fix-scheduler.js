// This script modifies the server/index.js file to update the home page scheduler
// to match the format in Collections and Products pages

const fs = require('fs');
const path = require('path');

// Define the file path
const filePath = path.join(__dirname, 'server', 'index.js');

// Read the entire file
let content = fs.readFileSync(filePath, 'utf8');

// Find the scheduler section in the homepageHTML
const homepageStart = content.indexOf('const homepageHTML = `');
const homepageEnd = content.indexOf('`;', homepageStart) + 2;

if (homepageStart === -1 || homepageEnd === -1) {
  console.error('Could not find homepageHTML in the file');
  process.exit(1);
}

const homepageHTML = content.substring(homepageStart, homepageEnd);

// Define the old scheduler pattern to find
const oldSchedulerStart = homepageHTML.indexOf('<\!-- Scheduler Section -->');
const oldSchedulerEnd = homepageHTML.indexOf('<\!-- Variable Reference Card -->', oldSchedulerStart);

if (oldSchedulerStart === -1 || oldSchedulerEnd === -1) {
  console.error('Could not find scheduler section in homepageHTML');
  process.exit(1);
}

// Extract the old scheduler content
const oldScheduler = homepageHTML.substring(oldSchedulerStart, oldSchedulerEnd);

// Define the new scheduler content
const newScheduler = `<\!-- Scheduler Section -->
    <div class="card">
      <h2>Scheduled Global Template Changes</h2>
      <p style="color: #637381; margin-bottom: 15px;">
        Schedule updates to your home page meta tags to automatically go live on a specific date.
        Perfect for seasonal promotions and sales events.
      </p>
      
      <div style="background-color: #f4f6f8; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
        <div style="font-weight: bold; margin-bottom: 10px;">No scheduled changes for home page.</div>
        <button id="scheduleNewChange" style="background-color: #5c6ac4;">Schedule a Template Change</button>
      </div>
    </div>
    
    `;

// Create the updated homepage HTML
const updatedHomepageHTML = 
  homepageHTML.substring(0, oldSchedulerStart) + 
  newScheduler + 
  homepageHTML.substring(oldSchedulerEnd);

// Replace the old homepage HTML with the updated one
const updatedContent = 
  content.substring(0, homepageStart) + 
  updatedHomepageHTML + 
  content.substring(homepageEnd);

// Define the modal HTML to add if it doesn't exist
const scheduleModal = `
  <\!-- Schedule Modal -->
  <div id="scheduleModal" class="modal">
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Schedule Template Changes</h2>
      
      <form id="scheduleForm">
        <div>
          <label for="scheduleTitle">Meta Title Template</label>
          <textarea id="scheduleTitle">{{storeName}} - SALE\! Up to {{maxDiscountPercentage}} OFF {{season}} {{year}}</textarea>
        </div>
        
        <div>
          <label for="scheduleDescription">Meta Description Template</label>
          <textarea id="scheduleDescription">Limited time offer: Save up to {{maxDiscountPercentage}} on our {{season}} collection. Shop now before the sale ends\!</textarea>
        </div>
        
        <div style="display: flex; gap: 15px; margin-bottom: 20px; margin-top: 20px;">
          <div style="flex: 1;">
            <label for="scheduleStart">Start Date</label>
            <input type="date" id="scheduleStart" class="date-picker" style="width: 100%;">
          </div>
          <div style="flex: 1;">
            <label for="scheduleEnd">End Date (Optional)</label>
            <input type="date" id="scheduleEnd" class="date-picker" style="width: 100%;">
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div style="margin-bottom: 10px;">
            <input type="checkbox" id="scheduleOverrideGlobal" checked>
            <label for="scheduleOverrideGlobal" style="display: inline; font-weight: normal;">Override global settings</label>
          </div>
        </div>
        
        <div class="google-preview">
          <h3>Search Preview</h3>
          <div class="google-preview-title" id="schedulePreviewTitle">Your Store - SALE\! Up to 30% OFF Summer 2025</div>
          <div class="google-preview-url">https://your-store.myshopify.com/</div>
          <div class="google-preview-description" id="schedulePreviewDescription">
            Limited time offer: Save up to 30% on our Summer collection. Shop now before the sale ends\!
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="button secondary" id="scheduleCancel">Cancel</button>
          <button type="button" class="button" id="schedulePreview">Preview</button>
          <button type="submit" class="button">Schedule Changes</button>
        </div>
      </form>
    </div>
  </div>`;

// Check if we need to add the modal HTML
let finalContent = updatedContent;
if (\!finalContent.includes('id="scheduleModal"')) {
  // Find the end of the body tag in homepageHTML
  const bodyEnd = finalContent.indexOf('</body>', homepageStart);
  if (bodyEnd \!== -1) {
    finalContent = 
      finalContent.substring(0, bodyEnd) + 
      scheduleModal + 
      finalContent.substring(bodyEnd);
  }
}

// Add CSS for modal if not already present
const styleStart = finalContent.indexOf('<style>', homepageStart);
const styleEnd = finalContent.indexOf('</style>', styleStart);

if (styleStart \!== -1 && styleEnd \!== -1) {
  const stylesSection = finalContent.substring(styleStart, styleEnd);
  
  // Check if modal styles already exist
  if (\!stylesSection.includes('.modal {')) {
    const modalStyles = `
    .modal {
      display: none;
      position: fixed;
      z-index: 1;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
      background-color: rgba(0,0,0,0.4);
    }
    .modal-content {
      background-color: #fefefe;
      margin: 10% auto;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      width: 50%;
      max-width: 600px;
    }
    .close {
      color: #aaa;
      float: right;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
    }
    .close:hover {
      color: black;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }
    .button {
      padding: 6px 12px;
      background: #5c6ac4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      text-decoration: none;
      font-size: 14px;
      display: inline-block;
    }
    .button.secondary {
      background: #f4f6f8;
      color: #212b36;
      border: 1px solid #c4cdd5;
    }
    .date-picker {
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #ddd;
      margin-bottom: 15px;
    }`;
    
    // Add modal styles to the styles section
    finalContent = 
      finalContent.substring(0, styleEnd) + 
      modalStyles + 
      finalContent.substring(styleEnd);
  }
}

// Add JavaScript for the modal
const scriptStart = finalContent.indexOf('<script>', homepageStart);
const scriptEnd = finalContent.indexOf('</script>', scriptStart);

if (scriptStart \!== -1 && scriptEnd \!== -1) {
  const scriptSection = finalContent.substring(scriptStart, scriptEnd);
  
  // Add modal scripts if they don't exist
  if (\!scriptSection.includes('scheduleNewChange')) {
    const modalScripts = `
    // Schedule modal functionality
    const scheduleModal = document.getElementById('scheduleModal');
    
    // Schedule new changes
    document.getElementById('scheduleNewChange').addEventListener('click', function() {
      // Set default schedule date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      document.getElementById('scheduleStart').valueAsDate = tomorrow;
      
      scheduleModal.style.display = 'block';
    });
    
    // Schedule cancel
    document.getElementById('scheduleCancel').addEventListener('click', function() {
      scheduleModal.style.display = 'none';
    });
    
    // Schedule preview
    document.getElementById('schedulePreview').addEventListener('click', function() {
      const title = document.getElementById('scheduleTitle').value
        .replace(/{{storeName}}/g, 'Your Store')
        .replace(/{{season}}/g, 'Summer')
        .replace(/{{year}}/g, '2025')
        .replace(/{{maxDiscountPercentage}}/g, '30%');
      
      const description = document.getElementById('scheduleDescription').value
        .replace(/{{storeName}}/g, 'Your Store')
        .replace(/{{season}}/g, 'Summer')
        .replace(/{{year}}/g, '2025')
        .replace(/{{maxDiscountPercentage}}/g, '30%');
      
      document.getElementById('schedulePreviewTitle').textContent = title;
      document.getElementById('schedulePreviewDescription').textContent = description;
    });
    
    // Schedule submit
    document.getElementById('scheduleForm').addEventListener('submit', function(e) {
      e.preventDefault();
      
      // In a real app, we would save to the server
      alert('Schedule saved successfully\!');
      scheduleModal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.onclick = function(event) {
      if (event.target == scheduleModal) {
        scheduleModal.style.display = 'none';
      }
    };`;
    
    // Add modal scripts to the script section
    finalContent = 
      finalContent.substring(0, scriptEnd) + 
      modalScripts + 
      finalContent.substring(scriptEnd);
  }
}

// Write the updated content back to the file
fs.writeFileSync(filePath, finalContent, 'utf8');

console.log('Home Page scheduler has been updated to match Collection/Product Settings.');
