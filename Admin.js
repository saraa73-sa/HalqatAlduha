// --- 1. الإعدادات العامة ---
const BOT_TOKEN = "8102897977:AAGOlYuOiZNBf0RTEdgOdG95Ju-Q590ncOo";
const CHAT_ID = "-1003572682359";
const MESSAGE_THREAD_ID = 3;  

// --- 2. محرك التشغيل والجدولة ---

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('لوحة الإدارة المتقدمة')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** حفظ الإعدادات وجدولة المهام **/
function saveAdminSettings(data) {
  const props = PropertiesService.getScriptProperties();
  
  props.setProperties({
    'reportTime': data.reportTime, 
    'openTime': data.openTime,    
    'closeTime': data.closeTime,  
    'clearTime': data.clearTime,
    'sheetsToClear': JSON.stringify(data.sheetsToClear) 
  });
  
  refreshDailyTriggers();
  return "تم حفظ الإعدادات وجدولة المهام بالدقيقة ✅";
}

/** تحديث المشغلات (نسخة نظيفة بدون تكرار) **/
function refreshDailyTriggers() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const allTriggers = ScriptApp.getProjectTriggers();
  
  // حذف المشغلات القديمة فقط لتجنب التراكم
  const handlers = ['sendReportsToTelegram', 'autoClearAllSheets'];
  allTriggers.forEach(t => {
    if (handlers.includes(t.getHandlerFunction())) ScriptApp.deleteTrigger(t);
  });

  // جدولة المهام إذا وجدت الأوقات (التنفيذ بالدقيقة)
  if (props.reportTime && props.reportTime.includes(":")) {
    scheduleExact(props.reportTime, 'sendReportsToTelegram');
  }
  
  if (props.clearTime && props.clearTime.includes(":")) {
    scheduleExact(props.clearTime, 'autoClearAllSheets');
  }
}

/** الدالة المساعدة للجدولة الدقيقة **/
function scheduleExact(timeStr, functionName) {
  const [hrs, mins] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(hrs, mins, 0, 0);

  // إذا كان الوقت قد مضى، جدوله لغدٍ
  if (target <= now) target.setDate(target.getDate() + 1);

  ScriptApp.newTrigger(functionName)
           .timeBased()
           .at(target)
           .create();
}

// --- 3. المهام الأساسية ---

/** إرسال التقارير **/
function sendReportsToTelegram() {
  const sheetNames = ["بطاقة الدور (الردود)", "بطاقة التسميع (الردود)", "بطاقة الإجازة (الردود)"];
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  sheetNames.forEach(sheetName => {
    try {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet || sheet.getLastRow() < 2) return;

      const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getDisplayValues();
      let body = "";
      data.forEach(row => {
        // فحص الأعمدة B, C, D, E (الفهرس 1, 2, 3, 4)
        const val = [row[1], row[2], row[3], row[4]].filter(v => v && v.trim()).join(" | ");
        if (val) body += "▫️ " + val + "\n";
      });

      if (body) {
        sendToTelegram(`<b>📅 تقرير: ${sheetName}</b>\n\n${body}`);
      }
    } catch (e) { console.error("Error in " + sheetName + ": " + e.message); }
  });
  
  // إعادة الجدولة لليوم التالي لضمان الاستمرارية
  refreshDailyTriggers(); 
}

/** الحذف التلقائي **/
function autoClearAllSheets() {
  const props = PropertiesService.getScriptProperties().getProperties();
  let sheets = [];
  try { sheets = JSON.parse(props.sheetsToClear || "[]"); } catch(e) {}
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  sheets.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
  });
  
  // إعادة الجدولة لليوم التالي
  refreshDailyTriggers(); 
}

/** إرسال التلجرام (تصحيح الرابط) **/
function sendToTelegram(text) {
  const url = `https://api.telegram.org{BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: CHAT_ID,
    message_thread_id: MESSAGE_THREAD_ID,
    text: text,
    parse_mode: "HTML"
  };
  
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  UrlFetchApp.fetch(url, options);
}
