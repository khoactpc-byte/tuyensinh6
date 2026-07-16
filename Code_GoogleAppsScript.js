
function setCacheLarge(key, dataStr) {
  var cache = CacheService.getScriptCache();
  var chunkSize = 90000;
  var chunks = Math.ceil(dataStr.length / chunkSize);
  cache.put(key + '_chunks', chunks.toString(), 300); // 5 phút
  for (var i = 0; i < chunks; i++) {
    cache.put(key + '_' + i, dataStr.substring(i * chunkSize, (i + 1) * chunkSize), 300);
  }
}

function getCacheLarge(key) {
  var cache = CacheService.getScriptCache();
  var chunksStr = cache.get(key + '_chunks');
  if (!chunksStr) return null;
  var chunks = parseInt(chunksStr);
  var dataStr = '';
  for (var i = 0; i < chunks; i++) {
    var chunk = cache.get(key + '_' + i);
    if (!chunk) return null;
    dataStr += chunk;
  }
  return dataStr;
}

function clearCache(key) {
  var cache = CacheService.getScriptCache();
  var chunksStr = cache.get(key + '_chunks');
  if (chunksStr) {
    var chunks = parseInt(chunksStr);
    for (var i = 0; i < chunks; i++) {
      cache.remove(key + '_' + i);
    }
    cache.remove(key + '_chunks');
  }
}

function removeAccents(str) {
  if (!str) return '';
  return str.toString().normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D')
            .toLowerCase().trim();
}

function doPost(e) {
  // Thay đổi ở đây: Giấu kín Sheet ID và Mật khẩu ở phía máy chủ
  var sheetId = '1NmIUZM9xSiWx5wk7Sun-nP-L4zSSLAKDXhvQcneueZc';
  var adminPassword = 'nan123';
  var superPassword = 'khoa186';
  
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var ss = SpreadsheetApp.openById(sheetId);
    
    // ==========================================
    // CÁC CHỨC NĂNG CÔNG KHAI (Không cần mật khẩu)
    // ==========================================
    
    if (action === 'getConfig') {
      var configSheet = ss.getSheetByName('CONFIG');
      var isEnabled = false;
      var text = '';
      var month = '.......';
      var year = '2026';
      
      if (configSheet) {
        isEnabled = configSheet.getRange('A1').getValue();
        text = configSheet.getRange('B1').getValue();
        month = configSheet.getRange('M2').getValue() || '.......';
        year = configSheet.getRange('N2').getValue() || '2026';
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        enableNotification: isEnabled,
        notificationText: text,
        month: month,
        year: year
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    else if (action === 'search') {
      var query = data.query;
      var providedPass = data.password;
      var isSuperOrAdmin = (providedPass === adminPassword || providedPass === superPassword);
      
      if (!isSuperOrAdmin && (!query || query.length < 3)) {
        return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Từ khóa quá ngắn'})).setMimeType(ContentService.MimeType.JSON);
      }
      
      var values;
      var cachedValues = getCacheLarge('ts_values');
      if (cachedValues) {
        values = JSON.parse(cachedValues);
      } else {
        var dataSheet = ss.getSheetByName('tuyensinh');
        values = dataSheet.getDataRange().getValues();
        try {
          setCacheLarge('ts_values', JSON.stringify(values));
        } catch (e) {}
      }
      var normalizedQuery = removeAccents(query);
      var results = [];
      
      for (var i = 2; i < values.length; i++) {
        var row = values[i];
        var rawID = row[1] ? row[1].toString() : '';
        var rawName = row[3] ? row[3].toString() : '';
        var rawSTT = row[0] ? row[0].toString() : '';
        
        var cleanRawID = removeAccents(rawID).replace(/^0+/, '');
        var cleanQueryID = normalizedQuery.replace(/^0+/, '');
        var nameMatch = removeAccents(rawName).includes(normalizedQuery);
        var idMatch = cleanRawID.includes(cleanQueryID);
        var sttMatch = rawSTT === query.trim();
        
        var isShortNumber = /^\d+$/.test(query.trim()) && query.trim().length < 4;
        if (isShortNumber) {
          if (sttMatch) results.push(row);
        } else {
          if (nameMatch || idMatch || sttMatch) results.push(row);
        }
      }
      
      if (!isSuperOrAdmin && results.length > 3) {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'too_many', 
          count: results.length
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success', 
        results: results
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ==========================================
    // CÁC CHỨC NĂNG BẢO MẬT (Yêu cầu mật khẩu)
    // ==========================================
    
    var providedPass = data.password;
    var isAdmin = (providedPass === adminPassword);
    var isSuper = (providedPass === superPassword);
    
    if (!isAdmin && !isSuper) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Sai mật khẩu'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    var role = isSuper ? 'super' : 'admin';
    
    if (action === 'login') {
      var sheetUrl = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/edit';
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success', 
        sheetUrl: sheetUrl,
        role: role
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    else if (action === 'getAllData') {
      var values;
      var cachedValues = getCacheLarge('ts_values');
      if (cachedValues) {
        values = JSON.parse(cachedValues);
      } else {
        var dataSheet = ss.getSheetByName('tuyensinh');
        values = dataSheet.getDataRange().getValues();
        try {
          setCacheLarge('ts_values', JSON.stringify(values));
        } catch (e) {}
      }
      var studentsData = values.slice(2);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        results: studentsData
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    else if (action === 'updateConfig') {
      var configSheet = ss.getSheetByName('CONFIG');
      if (!configSheet) configSheet = ss.insertSheet('CONFIG');
      configSheet.getRange('A1').setValue(data.enableNotification);
      configSheet.getRange('B1').setValue(data.notificationText);
      clearCache('ts_values'); return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
    } 
    
    else if (action === 'verifySuper') {
      if (isSuper) {
        clearCache('ts_values'); return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Sai mật khẩu cấp cao'})).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    else if (action === 'updateStudent') {
      var dataSheet = ss.getSheetByName('tuyensinh');
      var stt = data.stt;
      var values = dataSheet.getDataRange().getValues();
      var rowIndex = -1;
      
      for (var i = 1; i < values.length; i++) {
        if (values[i][0] == stt) {
          rowIndex = i + 1;
          break;
        }
      }
      
      if (rowIndex > -1) {
        dataSheet.getRange(rowIndex, 50).setValue(data.daNhapHoc);
        dataSheet.getRange(rowIndex, 51).setValue(data.tiengAnh);
        dataSheet.getRange(rowIndex, 52).setValue(data.chuyenTruong);
        dataSheet.getRange(rowIndex, 53).setValue(data.ghiChu);
        clearCache('ts_values'); return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Không tìm thấy STT'})).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    else if (action === 'addStudents') {
      if (!isSuper) return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Cần mật khẩu cấp cao'})).setMimeType(ContentService.MimeType.JSON);
      
      var dataSheet = ss.getSheetByName('tuyensinh');
      var newStudents = data.newStudents;
      if (newStudents && newStudents.length > 0) {
        var lastRow = dataSheet.getLastRow();
        var lastStt = 0;
        if (lastRow > 2) { 
          var lastSttValue = dataSheet.getRange(lastRow, 1).getValue();
          if (!isNaN(lastSttValue) && lastSttValue !== '') lastStt = parseInt(lastSttValue);
          else lastStt = lastRow - 2; 
        }
        for (var i = 0; i < newStudents.length; i++) {
          lastStt++;
          newStudents[i][0] = lastStt; 
        }
        var numRows = newStudents.length;
        var numCols = newStudents[0].length;
        var newRange = dataSheet.getRange(lastRow + 1, 1, numRows, numCols);
        newRange.setValues(newStudents);
        if (lastRow > 2) {
          var sourceRange = dataSheet.getRange(lastRow, 1, 1, numCols);
          sourceRange.copyTo(newRange, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
        }
        clearCache('ts_values'); return ContentService.createTextOutput(JSON.stringify({status: 'success', count: numRows})).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Không có dữ liệu mới'})).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Action không hợp lệ'})).setMimeType(ContentService.MimeType.JSON);
    
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("API Tuyen Sinh is running.").setMimeType(ContentService.MimeType.TEXT);
}
