const fs = require('fs');
const path = require('path');

// Path to the server/index.js file
const filePath = path.join(__dirname, 'server', 'index.js');

// Read the file content
let content = fs.readFileSync(filePath, 'utf8');

// Find the Home Page scheduler section
const homeSchedulerRegex = /(<\!-- Scheduler Section -->[\s\S]*?<div class="card">[\s\S]*?<h2>Scheduled Changes<\/h2>[\s\S]*?<p style="color: #637381; margin-bottom: 15px;">[\s\S]*?<\/p>)([\s\S]*?)(<\/div>[\s\S]*?<\!-- Variable Reference Card -->)/;

// The new scheduler format that matches Collection/Product Settings
const newSchedulerFormat = `
      <div style="background-color: #f4f6f8; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
        <div style="font-weight: bold; margin-bottom: 10px;">No scheduled changes for home page.</div>
        <button id="scheduleNewChange" style="background-color: #5c6ac4;">Schedule a Template Change</button>
      </div>
    `;

// Replace the Home Page scheduler section with the new format
if (homeSchedulerRegex.test(content)) {
  content = content.replace(homeSchedulerRegex, (match, intro, currentFormat, outro) => {
    return `${intro}${newSchedulerFormat}${outro}`;
  });
}

// We also need to add a modal for the scheduling, as Collection/Product Settings have
const scheduleModalHTML = `
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

// Add the schedule modal HTML to the home page HTML if it doesn't already exist
if (\!content.includes('<div id="scheduleModal" class="modal">') && content.includes('const homepageHTML = `')) {
  const homepageHTMLEndPos = content.indexOf('</body>', content.indexOf('const homepageHTML = `'));
  if (homepageHTMLEndPos \!== -1) {
    content = content.substring(0, homepageHTMLEndPos) + scheduleModalHTML + content.substring(homepageHTMLEndPos);
  }
}

// Add the necessary modal CSS if not already present
const modalCSSCheck = /\.modal\s*\{[\s\S]*?\}/;
if (\!modalCSSCheck.test(content.substring(content.indexOf('const homepageHTML = `'), content.indexOf('</style>', content.indexOf('const homepageHTML = `'))))) {
  const homepageStylePos = content.indexOf('<style>', content.indexOf('const homepageHTML = `')) + '<style>'.length;
  
  const modalCSS = `
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
  
  content = content.substring(0, homepageStylePos) + modalCSS + content.substring(homepageStylePos);
}

// Add JavaScript to handle the scheduler modal
const homepageScriptPos = content.indexOf('<script>', content.indexOf('const homepageHTML = `')) + '<script>'.length;
const scheduleModalJS = `
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

// Check if our script additions already exist, if not, add them
if (\!content.includes('scheduleNewChange')) {
  content = content.substring(0, homepageScriptPos) + scheduleModalJS + content.substring(homepageScriptPos);
}

// Write the updated content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Home Page scheduler updated successfully to match Collection/Product Settings.');
