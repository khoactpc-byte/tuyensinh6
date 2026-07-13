function doPost(e) {
  var sheetId = '1NmIUZM9xSiWx5wk7Sun-nP-L4zSSLAKDXhvQcneueZc';
  
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.password !== 'nan123') {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Sai mật khẩu'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    var ss = SpreadsheetApp.openById(sheetId);
    
    if (data.action === 'updateConfig') {
      var configSheet = ss.getSheetByName('CONFIG');
      if (!configSheet) {
        configSheet = ss.insertSheet('CONFIG');
      }
      // Lưu cài đặt thông báo vào dòng 1
      configSheet.getRange('A1').setValue(data.enableNotification);
      configSheet.getRange('B1').setValue(data.notificationText);
      return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
    } 
    else if (data.action === 'updateStudent') {
      var dataSheet = ss.getSheetByName('DATA');
      var stt = data.stt;
      var values = dataSheet.getDataRange().getValues();
      var rowIndex = -1;
      
      for (var i = 1; i < values.length; i++) { // Bỏ qua header
        if (values[i][0] == stt) { // Cột A là STT (index 0)
          rowIndex = i + 1; // getRange thì 1-based
          break;
        }
      }
      
      if (rowIndex > -1) {
        // Cột J là cột thứ 10 (Đã nhập học)
        // Cột K là cột thứ 11 (Tiếng Anh)
        // Cột L là cột thứ 12 (Chuyển trường)
        // Cột M là cột thứ 13 (Ghi chú)
        dataSheet.getRange(rowIndex, 10).setValue(data.daNhapHoc);
        dataSheet.getRange(rowIndex, 11).setValue(data.tiengAnh);
        dataSheet.getRange(rowIndex, 12).setValue(data.chuyenTruong);
        dataSheet.getRange(rowIndex, 13).setValue(data.ghiChu);
        return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Không tìm thấy STT'})).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Action không hợp lệ'})).setMimeType(ContentService.MimeType.JSON);
    
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var sheetId = '1NmIUZM9xSiWx5wk7Sun-nP-L4zSSLAKDXhvQcneueZc';
  var ss = SpreadsheetApp.openById(sheetId);
  var configSheet = ss.getSheetByName('CONFIG');
  
  var config = {
    enableNotification: false,
    notificationText: ''
  };
  
  if (configSheet) {
    config.enableNotification = configSheet.getRange('A1').getValue();
    config.notificationText = configSheet.getRange('B1').getValue();
  }
  
  return ContentService.createTextOutput(JSON.stringify({status: 'success', config: config})).setMimeType(ContentService.MimeType.JSON);
}
