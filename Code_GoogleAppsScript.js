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
      if (!query || query.length < 3) {
        return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Từ khóa quá ngắn'})).setMimeType(ContentService.MimeType.JSON);
      }
      
      var dataSheet = ss.getSheetByName('tuyensinh');
      var values = dataSheet.getDataRange().getValues();
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
        
        if (nameMatch || idMatch || sttMatch) {
          results.push(row);
        }
      }
      
      if (results.length > 3) {
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
      var dataSheet = ss.getSheetByName('tuyensinh');
      var values = dataSheet.getDataRange().getValues();
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
      return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
    } 
    
    else if (action === 'verifySuper') {
      if (isSuper) {
        return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Sai mật khẩu cấp cao'})).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    else if (action === 'updateStudent') {
      if (!isSuper) return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Cần mật khẩu cấp cao'})).setMimeType(ContentService.MimeType.JSON);
      
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
        dataSheet.getRange(rowIndex, 10).setValue(data.daNhapHoc);
        dataSheet.getRange(rowIndex, 11).setValue(data.tiengAnh);
        dataSheet.getRange(rowIndex, 12).setValue(data.chuyenTruong);
        dataSheet.getRange(rowIndex, 13).setValue(data.ghiChu);
        return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
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
        return ContentService.createTextOutput(JSON.stringify({status: 'success', count: numRows})).setMimeType(ContentService.MimeType.JSON);
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
