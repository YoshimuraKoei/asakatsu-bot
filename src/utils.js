function todayJst() {
  return Utilities.formatDate(new Date(), JST, "yyyy-MM-dd");
}

function normalizeDate_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, JST, "yyyy-MM-dd");
  }
  return String(value).replace(/\//g, "-").slice(0, 10);
}

function pickRandom_(items) {
  if (!items || items.length === 0) {
    throw new Error("Cannot pick a random item from an empty list.");
  }
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

function isOutsideCheckInWindow_() {
  const now = new Date();
  const hour = Number(Utilities.formatDate(now, JST, "H"));
  const minute = Number(Utilities.formatDate(now, JST, "m"));
  return hour < 8 || (hour === 8 && minute < 30) || hour >= 9;
}

function jsonResponse(body) {
  return ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
