/**
 * Dorm Key Tracker - Google Apps Script Backend
 * Handles key tracking, queue management, and history logging
 */

// Configuration - Update with your spreadsheet IDs
const CONFIG = {
  // Spreadsheet ID (found in the URL between /d/ and /edit)
  SPREADSHEET_ID: 'YOUR_SHEED_ID',
  
  // Sheet names
  SHEETS: {
    USERS: 'Users',
    STATUS: 'Status',
    HISTORY: 'History',
    QUEUE: 'Queue'
  }
};

/**
 * Set CORS headers for response
 */
function setCorsHeaders(output) {
  return output
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Main doGet handler - Handles GET requests
 */
function doGet(e) {
  const action = e.parameter.action;
  
  try {
    let result;
    
    switch(action) {
      case 'users':
        result = getUsers();
        break;
      case 'status':
        result = getStatus();
        break;
      case 'history':
        result = getHistory();
        break;
      case 'queue':
        result = getQueue();
        break;
      default:
        return setCorsHeaders(
          ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
        );
    }
    
    return setCorsHeaders(
      ContentService.createTextOutput(JSON.stringify(result))
    );
      
  } catch (error) {
    return setCorsHeaders(
      ContentService.createTextOutput(JSON.stringify({ 
        error: error.toString(),
        message: 'An error occurred processing your request'
      }))
    );
  }
}

/**
 * Main doPost handler - Handles POST requests
 */
function doPost(e) {
  try {
    // Handle both JSON and form-urlencoded data
    let data;
    if (e.postData && e.postData.type === 'application/json') {
      data = JSON.parse(e.postData.contents);
    } else {
      // Form-urlencoded data comes in e.parameter
      data = {
        action: e.parameter.action,
        phone: e.parameter.phone,
        name: e.parameter.name,
        note: e.parameter.note || '',
        operation: e.parameter.operation || ''
      };
    }
    
    const action = data.action;
    const phone = data.phone;
    const name = data.name;
    const note = data.note || '';
    
    // Validate authentication
    if (!phone || !name) {
      return setCorsHeaders(
        ContentService.createTextOutput(JSON.stringify({ 
          error: 'Authentication required',
          message: 'Phone and name are required'
        }))
      );
    }
    
    // Verify user exists and matches
    if (!verifyUser(phone, name)) {
      return setCorsHeaders(
        ContentService.createTextOutput(JSON.stringify({ 
          error: 'Authentication failed',
          message: 'Invalid phone number or name'
        }))
      );
    }
    
    let result;
    
    switch(action) {
      case 'take':
        result = takeKey(phone, name, note);
        break;
      case 'available':
        result = markAvailable(phone, name, note);
        break;
      case 'return':
        result = returnKey(phone, name, note);
        break;
      case 'queue':
        const operation = data.operation; // 'join' or 'leave' or 'skip'
        if (operation === 'join') {
          result = joinQueue(phone, name, note);
        } else if (operation === 'leave') {
          result = leaveQueue(phone, name);
        } else if (operation === 'skip') {
          result = skipQueue(phone, name);
        } else {
          return setCorsHeaders(
            ContentService.createTextOutput(JSON.stringify({ 
              error: 'Invalid queue operation'
            }))
          );
        }
        break;
      default:
        return setCorsHeaders(
          ContentService.createTextOutput(JSON.stringify({ 
            error: 'Invalid action'
          }))
        );
    }
    
    return setCorsHeaders(
      ContentService.createTextOutput(JSON.stringify(result))
    );
      
  } catch (error) {
    return setCorsHeaders(
      ContentService.createTextOutput(JSON.stringify({ 
        error: error.toString(),
        message: 'An error occurred processing your request'
      }))
    );
  }
}

/**
 * Get spreadsheet - Opens or creates the spreadsheet
 */
function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  } catch (error) {
    // If spreadsheet doesn't exist, create it
    return createNewSpreadsheet();
  }
}

/**
 * Create a new spreadsheet with required sheets
 */
function createNewSpreadsheet() {
  const ss = SpreadsheetApp.create('Dorm Key Tracker');
  const spreadsheetId = ss.getId();
  
  // Create Users sheet with headers
  const usersSheet = ss.insertSheet(CONFIG.SHEETS.USERS);
  usersSheet.getRange(1, 1, 1, 3).setValues([['Phone', 'Name', 'RoomNumber']]);
  usersSheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  
  // Create other sheets empty (no headers)
  ss.insertSheet(CONFIG.SHEETS.STATUS);
  ss.insertSheet(CONFIG.SHEETS.HISTORY);
  ss.insertSheet(CONFIG.SHEETS.QUEUE);
  
  // Delete default sheet
  ss.deleteSheet(ss.getSheetByName('Sheet1'));
  
  return ss;
}

/**
 * Get sheet by name, create if doesn't exist
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Only Users sheet gets headers
    if (sheetName === CONFIG.SHEETS.USERS) {
      sheet.getRange(1, 1, 1, 3).setValues([['Phone', 'Name', 'RoomNumber']]);
      sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
    }
    // Other sheets created empty - headers added dynamically when first used
  }
  
  return sheet;
}

/**
 * Ensure Status sheet has headers (called before first write)
 */
function ensureStatusHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 6).setValues([['Status', 'HolderPhone', 'HolderName', 'TakenAt', 'Note', 'CurrentCallIndex']]);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }
}

/**
 * Ensure History sheet has headers (called before first write)
 */
function ensureHistoryHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 5).setValues([['Timestamp', 'Phone', 'Name', 'Action', 'Note']]);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }
}

/**
 * Ensure Queue sheet has headers (called before first write)
 */
function ensureQueueHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 4).setValues([['QueuedAt', 'Phone', 'Name', 'Note']]);
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  }
}

/**
 * Get all users
 */
function getUsers() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.USERS);
    
    // If sheet is empty, return empty array
    if (sheet.getLastRow() === 0) {
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    
    // Skip header row, return empty if no data rows
    if (data.length <= 1) return [];
    
    const users = [];
    for (let i = 1; i < data.length; i++) {
      // Only include rows with phone number (non-empty)
      if (data[i][0] && data[i][0].toString().trim() !== '') {
        users.push({
          Phone: String(data[i][0] || '').trim(),
          Name: String(data[i][1] || '').trim(),
          RoomNumber: String(data[i][2] || '').trim()
        });
      }
    }
    
    return users;
  } catch (error) {
    Logger.log('Error in getUsers: ' + error.toString());
    return [];
  }
}

/**
 * Verify user exists and matches
 */
function verifyUser(phone, name) {
  try {
    const users = getUsers();
    // Normalize phone numbers for comparison
    const normalizedPhone = String(phone || '').trim().replace(/[\s\-\(\)]/g, '');
    const normalizedName = String(name || '').trim();
    
    const user = users.find(u => {
      const userPhone = String(u.Phone || '').trim().replace(/[\s\-\(\)]/g, '');
      return userPhone === normalizedPhone;
    });
    
    return user && String(user.Name || '').trim() === normalizedName;
  } catch (error) {
    Logger.log('Error in verifyUser: ' + error.toString());
    return false;
  }
}

/**
 * Get current key status
 */
function getStatus() {
  const sheet = getSheet(CONFIG.SHEETS.STATUS);
  
  // If sheet is empty, return default Available status
  if (sheet.getLastRow() === 0) {
    return {
      Status: 'Available',
      HolderPhone: '',
      HolderName: '',
      TakenAt: '',
      Note: '',
      CurrentCallIndex: 0
    };
  }
  
  const data = sheet.getDataRange().getValues();
  
  // Check if headers exist, if not sheet is empty
  if (data.length === 0 || (data.length === 1 && data[0][0] !== 'Status')) {
    return {
      Status: 'Available',
      HolderPhone: '',
      HolderName: '',
      TakenAt: '',
      Note: '',
      CurrentCallIndex: 0
    };
  }
  
  // If only headers, return default
  if (data.length === 1) {
    return {
      Status: 'Available',
      HolderPhone: '',
      HolderName: '',
      TakenAt: '',
      Note: '',
      CurrentCallIndex: 0
    };
  }
  
  // Return status from row 2 (after headers)
  return {
    Status: String(data[1][0] || 'Available').trim(),
    HolderPhone: String(data[1][1] || '').trim(), // Normalize phone
    HolderName: String(data[1][2] || '').trim(),
    TakenAt: data[1][3] || '',
    Note: String(data[1][4] || '').trim(),
    CurrentCallIndex: parseInt(data[1][5] || '0')
  };
}

/**
 * Update key status
 */
function updateStatus(status, holderPhone, holderName, takenAt, note, currentCallIndex) {
  const sheet = getSheet(CONFIG.SHEETS.STATUS);
  ensureStatusHeaders(sheet);
  
  const rowData = [
    status || 'Available',
    holderPhone || '',
    holderName || '',
    takenAt || '',
    note || '',
    currentCallIndex !== undefined ? currentCallIndex : (sheet.getLastRow() > 1 ? sheet.getRange(2, 6).getValue() : 0) || 0
  ];
  
  // If row 2 doesn't exist, create it
  if (sheet.getLastRow() === 1) {
    sheet.appendRow(rowData);
  } else {
    sheet.getRange(2, 1, 1, 6).setValues([rowData]);
  }
}

/**
 * Add entry to history
 */
function addToHistory(phone, name, action, note) {
  const sheet = getSheet(CONFIG.SHEETS.HISTORY);
  ensureHistoryHeaders(sheet);
  
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  
  sheet.appendRow([timestamp, phone, name, action, note || '']);
  
  // Keep only last 100 entries (optional cleanup)
  const maxRows = 101; // Header + 100 entries
  if (sheet.getLastRow() > maxRows) {
    sheet.deleteRows(2, sheet.getLastRow() - maxRows);
  }
}

/**
 * Get history (latest first, limited to 50)
 */
function getHistory() {
  const sheet = getSheet(CONFIG.SHEETS.HISTORY);
  
  // If sheet is empty, return empty array
  if (sheet.getLastRow() === 0) return [];
  
  const data = sheet.getDataRange().getValues();
  
  // If only headers or no data, return empty
  if (data.length <= 1) return [];
  
  const history = [];
  const startRow = Math.max(2, data.length - 49); // Last 50 entries
  
  for (let i = data.length - 1; i >= startRow && i >= 1; i--) {
    history.push({
      Timestamp: data[i][0] || '',
      Phone: data[i][1] || '',
      Name: data[i][2] || '',
      Action: data[i][3] || '',
      Note: data[i][4] || ''
    });
  }
  
  return history;
}

/**
 * Take key - User gets the key (Status = Using)
 */
function takeKey(phone, name, note) {
  const status = getStatus();
  
  if (status.Status !== 'Available') {
    return {
      success: false,
      message: `Key is currently ${status.Status}. Please wait until it's available.`,
      error: 'Key not available'
    };
  }
  
  // Check if user is next in queue or holder is marking it available for them
  const queue = getQueue();
  const normalizedPhone = normalizePhone(phone);
  const currentIndex = status.CurrentCallIndex || 0;
  const nextPerson = queue[currentIndex];
  const isNextInQueue = nextPerson && normalizePhone(nextPerson.Phone) === normalizedPhone;
  const isHolderMarkingAvailable = normalizePhone(status.HolderPhone) === normalizedPhone && status.Status === 'Available';
  
  // If not next in queue and not the current holder, warn but allow if queue is empty
  if (!isNextInQueue && !isHolderMarkingAvailable && queue.length > 0 && nextPerson) {
    // Allow but it's unusual
    // For now, allow but log a note
    note = (note || '') + ` (Taken out of queue order - ${nextPerson.Name} was next)`;
  }
  
  const takenAt = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  
  // Remove from queue if in queue
  if (isInQueue(phone)) {
    const sheet = getSheet(CONFIG.SHEETS.QUEUE);
    const queueData = sheet.getDataRange().getValues();
    const normalizedPhone = normalizePhone(phone);
    for (let i = queueData.length - 1; i >= 1; i--) {
      if (normalizePhone(queueData[i][1]) === normalizedPhone) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
  }
  
  updateStatus('Using', phone, name, takenAt, note || '', 0);
  addToHistory(phone, name, 'Take', note || '');
  
  return {
    success: true,
    message: 'You now hold the key. Please mark it available when finished.',
    status: getStatus()
  };
}

/**
 * Mark as Available - Holder is done and ready to hand off
 */
function markAvailable(phone, name, note) {
  const status = getStatus();
  const normalizedPhone = normalizePhone(phone);
  
  if (normalizePhone(status.HolderPhone) !== normalizedPhone) {
    return {
      success: false,
      message: `Only the current holder can mark it as available. Current holder: ${status.HolderPhone}, You: ${phone}`,
      error: 'Unauthorized'
    };
  }
  
  // Accept both 'Using' and 'Taken' for backward compatibility
  if (status.Status !== 'Using' && status.Status !== 'Taken') {
    return {
      success: false,
      message: 'Key is already available or in an invalid state',
      error: 'Invalid state'
    };
  }
  
  // Keep holder info but change status to Available, reset call index to 0
  updateStatus('Available', status.HolderPhone, status.HolderName, status.TakenAt, note || 'Ready to hand over', 0);
  addToHistory(phone, name, 'Available', note || 'Ready to hand over');
  
  const queue = getQueue();
  const currentIndex = 0; // Start at beginning when marking available
  let message = 'Key marked as available.';
  if (queue.length > 0 && queue[currentIndex]) {
    message += ` Next person to call: ${queue[currentIndex].Name} (${queue[currentIndex].Phone})`;
  } else {
    message += ' No one waiting in queue - you can hand it freely.';
  }
  
  return {
    success: true,
    message: message,
    status: getStatus(),
    nextInQueue: queue.length > 0 ? queue[0] : null
  };
}

/**
 * Return key - Make key available with no holder (only if no one in queue)
 */
function returnKey(phone, name, note) {
  const status = getStatus();
  const normalizedPhone = normalizePhone(phone);
  
  if (normalizePhone(status.HolderPhone) !== normalizedPhone) {
    return {
      success: false,
      message: `Only the current holder can return the key. Current holder: ${status.HolderPhone}, You: ${phone}`,
      error: 'Unauthorized'
    };
  }
  
  updateStatus('Available', '', '', '', note || '', 0);
  addToHistory(phone, name, 'Return', note);
  
  return {
    success: true,
    message: 'Key returned successfully',
    status: getStatus()
  };
}

/**
 * Get queue
 */
function getQueue() {
  const sheet = getSheet(CONFIG.SHEETS.QUEUE);
  
  // If sheet is empty, return empty array
  if (sheet.getLastRow() === 0) return [];
  
  const data = sheet.getDataRange().getValues();
  
  // If only headers or no data, return empty
  if (data.length <= 1) return [];
  
  const queue = [];
  for (let i = 1; i < data.length; i++) {
    queue.push({
      QueuedAt: data[i][0] || '',
      Phone: String(data[i][1] || '').trim(), // Normalize phone
      Name: String(data[i][2] || '').trim(),
      Note: String(data[i][3] || '').trim()
    });
  }
  
  return queue;
}

/**
 * Normalize phone number for comparison
 */
function normalizePhone(phone) {
  return String(phone || '').trim().replace(/[\s\-\(\)]/g, '');
}

/**
 * Check if user is in queue
 */
function isInQueue(phone) {
  const queue = getQueue();
  const normalizedPhone = normalizePhone(phone);
  return queue.some(q => normalizePhone(q.Phone) === normalizedPhone);
}

/**
 * Join queue
 */
function joinQueue(phone, name, note) {
  // Check if already in queue
  if (isInQueue(phone)) {
    return {
      success: false,
      message: 'You are already in the queue',
      error: 'Already queued'
    };
  }
  
  const queuedAt = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  
  const sheet = getSheet(CONFIG.SHEETS.QUEUE);
  ensureQueueHeaders(sheet);
  sheet.appendRow([queuedAt, phone, name, note || '']);
  
  addToHistory(phone, name, 'Queue', note || 'Joined queue');
  
  return {
    success: true,
    message: 'Joined queue successfully',
    queue: getQueue()
  };
}

/**
 * Leave queue
 */
function leaveQueue(phone, name) {
  if (!isInQueue(phone)) {
    return {
      success: false,
      message: 'You are not in the queue',
      error: 'Not in queue'
    };
  }
  
  const sheet = getSheet(CONFIG.SHEETS.QUEUE);
  const data = sheet.getDataRange().getValues();
  const normalizedPhone = normalizePhone(phone);
  
  for (let i = data.length - 1; i >= 1; i--) {
    if (normalizePhone(data[i][1]) === normalizedPhone) {
      sheet.deleteRow(i + 1);
      addToHistory(phone, name, 'Queue', 'Left queue');
      break;
    }
  }
  
  return {
    success: true,
    message: 'Left queue successfully',
    queue: getQueue()
  };
}

/**
 * Skip queue - Current holder can skip to next person (doesn't remove from queue)
 */
function skipQueue(phone, name) {
  const status = getStatus();
  const normalizedPhone = normalizePhone(phone);
  
  if (normalizePhone(status.HolderPhone) !== normalizedPhone) {
    return {
      success: false,
      message: `Only the current holder can skip queue. Current holder: ${status.HolderPhone}, You: ${phone}`,
      error: 'Unauthorized'
    };
  }
  
  if (status.Status !== 'Available') {
    return {
      success: false,
      message: 'Key must be available to skip queue',
      error: 'Invalid state'
    };
  }
  
  const queue = getQueue();
  if (queue.length === 0) {
    return {
      success: false,
      message: 'No one in queue to skip',
      error: 'Empty queue'
    };
  }
  
  const currentIndex = status.CurrentCallIndex || 0;
  const skippedPerson = queue[currentIndex];
  
  if (!skippedPerson) {
    return {
      success: false,
      message: 'Invalid queue position',
      error: 'No person at current position'
    };
  }
  
  // Increment call index (don't remove from queue - they stay in line)
  const nextIndex = currentIndex + 1;
  
  // If we've skipped past all people in queue, wrap back to 0
  const newIndex = nextIndex >= queue.length ? 0 : nextIndex;
  
  // Update status with new call index
  updateStatus(
    status.Status,
    status.HolderPhone,
    status.HolderName,
    status.TakenAt,
    status.Note,
    newIndex
  );
  
  addToHistory(phone, name, 'Skip', `Skipped calling ${skippedPerson.Name} (moved to next person)`);
  
  const nextPerson = queue[newIndex];
  let message = `Skipped ${skippedPerson.Name}. They remain in queue.`;
  if (nextPerson) {
    message += ` Next person to call: ${nextPerson.Name} (${nextPerson.Phone})`;
  } else {
    message += ' No one else in queue.';
  }
  
  return {
    success: true,
    message: message,
    queue: queue, // Queue unchanged
    nextInQueue: nextPerson,
    currentCallIndex: newIndex
  };
}

/**
 * Setup function - Run this once to initialize the spreadsheet
 * Update CONFIG.SPREADSHEET_ID with your spreadsheet ID after creation
 */
function setup() {
  const ss = createNewSpreadsheet();
  Logger.log('Spreadsheet created with ID: ' + ss.getId());
  Logger.log('Spreadsheet URL: ' + ss.getUrl());
  Logger.log('Update CONFIG.SPREADSHEET_ID in Code.gs with: ' + ss.getId());
  Logger.log('');
  Logger.log('Setup complete!');
  Logger.log('- Users sheet created with headers (Phone, Name, RoomNumber)');
  Logger.log('- Status, History, and Queue sheets created empty (headers added automatically)');
  Logger.log('Add users in the Users sheet with Phone, Name, and RoomNumber columns.');
}

