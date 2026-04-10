const JST = "Asia/Tokyo";
const SHEET_NAME = "points";
const HEADER = ["user_id", "display_name", "points", "last_check_in"];
const CHECK_IN_ACTION_ID = "asakatsu_check_in";
const CHECK_IN_REACTIONS = [
  "やるじゃん",
  "さすが M2 だね",
  "朝活なんて当たり前だよなあ？",
];
const MISSED_CHECK_IN_MESSAGES = [
  "なんで朝活しないの？何してたん",
];
const REQUIRED_SCRIPT_PROPERTIES = [
  "SLACK_BOT_TOKEN",
  "SLACK_CHANNEL_ID",
  "SPREADSHEET_ID",
];

function getConfig_() {
  const props = PropertiesService.getScriptProperties();
  const config = {
    botToken: props.getProperty("SLACK_BOT_TOKEN"),
    channelId: props.getProperty("SLACK_CHANNEL_ID"),
    spreadsheetId: props.getProperty("SPREADSHEET_ID"),
  };

  const missingKeys = REQUIRED_SCRIPT_PROPERTIES.filter(function(key) {
    return !props.getProperty(key);
  });

  if (missingKeys.length > 0) {
    throw new Error(
      "Missing Script Properties: " + missingKeys.join(", "),
    );
  }

  return config;
}

function syncScriptPropertiesFromCi_(newValues) {
  if (!newValues || typeof newValues !== "object" || Array.isArray(newValues)) {
    throw new Error("Expected an object with Script Properties to sync.");
  }

  const sanitized = {};
  REQUIRED_SCRIPT_PROPERTIES.forEach(function(key) {
    const value = newValues[key];
    if (!value) {
      throw new Error("Missing required Script Property in CI payload: " + key);
    }
    sanitized[key] = String(value);
  });

  PropertiesService.getScriptProperties().setProperties(sanitized, false);
  return {
    ok: true,
    updatedKeys: Object.keys(sanitized),
  };
}

function setupProjectFromCi_(reinstallTriggers) {
  setupSheet();
  if (reinstallTriggers) {
    installTriggers();
  }
  return { ok: true };
}
