function setupSheet() {
  const sheet = getSheet_();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADER);
  }
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(getConfig_().spreadsheetId);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADER);
  }

  return sheet;
}

function readAllRecords_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, HEADER.length).getValues();
  return values
    .filter(function(row) {
      return row[0];
    })
    .map(function(row, index) {
      return {
        row: index + 2,
        userId: String(row[0]),
        displayName: String(row[1] || ""),
        points: Number(row[2] || 0),
        lastCheckIn: normalizeDate_(row[3]),
      };
    });
}

function findRecordsByUserId_(sheet, userId) {
  return readAllRecords_(sheet).filter(function(record) {
    return record.userId === userId;
  });
}

function upsertRecord_(sheet, record) {
  const rowValues = [[
    record.userId,
    record.displayName,
    record.points,
    record.lastCheckIn,
  ]];

  if (record.row) {
    sheet.getRange(record.row, 1, 1, HEADER.length).setValues(rowValues);
    return;
  }

  sheet.appendRow(rowValues[0]);
}
