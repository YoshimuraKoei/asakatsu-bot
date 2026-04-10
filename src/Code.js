const JST = "Asia/Tokyo";
const SHEET_NAME = "points";
const HEADER = ["user_id", "display_name", "points", "last_check_in"];
const CHECK_IN_ACTION_ID = "asakatsu_check_in";
const CHECK_IN_REACTIONS = [
  "やるじゃん",
  "さすがだね",
  "えらい！がんばってる！",
  "今日も仕上がってるね",
  "ちゃんと朝活して偉いね",
  "その調子だよ",
  "明日も会おうね",
  "他の人もあなたを見習ってくれればいいのに...",
  "❤️",
];
const MISSED_CHECK_IN_MESSAGES = [
  "なんで朝活しないの？",
  "理由を説明しなさい",
  "何してたの？",
  "？？？？？？？？？？？？？？？？？？？？？？？？？？？？？？？？？？？？？？？？",
];
const REQUIRED_SCRIPT_PROPERTIES = [
  "SLACK_BOT_TOKEN",
  "SLACK_CHANNEL_ID",
  "SPREADSHEET_ID",
];

function doPost(e) {
  const jsonPayload = parseJsonBody_(e);
  if (jsonPayload) {
    if (jsonPayload.type === "url_verification") {
      return jsonResponse({ challenge: jsonPayload.challenge });
    }

    if (
      jsonPayload.type === "event_callback" &&
      jsonPayload.event &&
      jsonPayload.event.type === "app_mention"
    ) {
      handleAppMention_(jsonPayload.event);
      return jsonResponse({ ok: true });
    }
  }

  const payload = parseSlackPayload_(e);
  if (!payload) {
    return jsonResponse({ ok: true });
  }

  if (payload.type !== "block_actions") {
    return jsonResponse({ ok: true });
  }

  const action = (payload.actions || [])[0];
  if (!action || action.action_id !== CHECK_IN_ACTION_ID) {
    return jsonResponse({ ok: true });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const userId = payload.user.id;
    const channelId = payload.channel.id;
    const threadTs = payload.message && payload.message.ts ? payload.message.ts : null;
    const displayName = payload.user.username || payload.user.name || userId;
    const today = todayJst();
    const sheet = getSheet_();
    const records = findRecordsByUserId_(sheet, userId);
    const record = records.length ? records[records.length - 1] : null;
    const alreadyCheckedIn = records.some(function(item) {
      return item.lastCheckIn === today;
    });

    if (alreadyCheckedIn) {
      postEphemeral_(
        channelId,
        userId,
        "おはよう！今日はもうチェックイン済みです。現在のポイントは " +
          (record ? record.points : 0) +
          " です。",
      );
      return jsonResponse({ ok: true });
    }

    if (isOutsideCheckInWindow_()) {
      postEphemeral_(
        channelId,
        userId,
        "8:30-9:00 の受付時間外です。ポイントは加算されません。",
      );
      return jsonResponse({ ok: true });
    }

    const nextPoints = (record ? record.points : 0) + 1;
    upsertRecord_(sheet, {
      row: record ? record.row : null,
      userId: userId,
      displayName: displayName,
      points: nextPoints,
      lastCheckIn: today,
    });

    postEphemeral_(
      channelId,
      userId,
      "おはよう！現在のポイントは " + nextPoints + " です。",
    );

    if (threadTs) {
      postJson_("https://slack.com/api/chat.postMessage", {
        channel: channelId,
        thread_ts: threadTs,
        text: "<@" + userId + "> " + pickRandom_(CHECK_IN_REACTIONS),
      });
    }

    return jsonResponse({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function parseJsonBody_(e) {
  const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : "";
  if (!rawBody) return null;

  try {
    return JSON.parse(rawBody);
  } catch (err) {
    return null;
  }
}

function parseSlackPayload_(e) {
  const params = e && e.parameter ? e.parameter : {};
  if (params.payload) {
    return JSON.parse(params.payload);
  }

  const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : "";
  if (!rawBody) {
    return null;
  }

  const payloadMatch = rawBody.match(/(?:^|&)payload=([^&]+)/);
  if (!payloadMatch) {
    return null;
  }

  const decoded = decodeURIComponent(payloadMatch[1].replace(/\+/g, " "));
  return JSON.parse(decoded);
}

function handleAppMention_(event) {
  const userId = event.user;
  const channelId = event.channel;
  const threadTs = event.ts;
  const sheet = getSheet_();
  const records = findRecordsByUserId_(sheet, userId);
  const record = records.length ? records[records.length - 1] : null;
  const points = record ? record.points : 0;

  postJson_("https://slack.com/api/chat.postMessage", {
    channel: channelId,
    thread_ts: threadTs,
    text: "<@" + userId + "> 現在のポイントは " + points + " です。",
  });
}

function postMorningCheckIn() {
  const props = getConfig_();
  postJson_("https://slack.com/api/chat.postMessage", {
    channel: props.channelId,
    text: "<!channel> 朝活開始！8:30-9:00 の間にボタンを押してください。",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "<!channel> *朝活開始！* 8:30-9:00 の間にボタンを押してください。",
        },
        accessory: {
          type: "button",
          action_id: CHECK_IN_ACTION_ID,
          text: {
            type: "plain_text",
            text: "チェックインする",
          },
          style: "primary",
          value: "check_in",
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "同じ日に 2 回押しても加算は 1 回です。8:30-9:00 が加点対象です。",
          },
        ],
      },
    ],
  });
}

function remindNonCheckins() {
  const props = getConfig_();
  const today = todayJst();
  const sheet = getSheet_();
  const records = readAllRecords_(sheet);
  const checkedIn = {};

  records.forEach(function(record) {
    if (record.lastCheckIn === today) {
      checkedIn[record.userId] = true;
    }
  });

  const membersResp = postJson_("https://slack.com/api/conversations.members", {
    channel: props.channelId,
    limit: 1000,
  });

  const members = (membersResp.members || []).filter(function(memberId) {
    return memberId !== "USLACKBOT" && memberId.charAt(0) !== "B";
  });

  const sleepy = members.filter(function(memberId) {
    return !checkedIn[memberId];
  });

  if (sleepy.length === 0) {
    return;
  }

  const targetUserId = pickRandom_(sleepy);
  const message = pickRandom_(MISSED_CHECK_IN_MESSAGES);
  postJson_("https://slack.com/api/chat.postMessage", {
    channel: props.channelId,
    text: "<@" + targetUserId + "> " + message,
  });
}

function installTriggers() {
  deleteTriggers_();

  ScriptApp.newTrigger("postMorningCheckIn")
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .nearMinute(30)
    .inTimezone(JST)
    .create();

  ScriptApp.newTrigger("remindNonCheckins")
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .nearMinute(0)
    .inTimezone(JST)
    .create();
}

function deleteTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
}

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

function normalizeDate_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, JST, "yyyy-MM-dd");
  }
  return String(value).replace(/\//g, "-").slice(0, 10);
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

function todayJst() {
  return Utilities.formatDate(new Date(), JST, "yyyy-MM-dd");
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
    throw new Error("Missing Script Properties: " + missingKeys.join(", "));
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

function postEphemeral_(channel, user, text) {
  postJson_("https://slack.com/api/chat.postEphemeral", {
    channel: channel,
    user: user,
    text: text,
  });
}

function postJson_(url, payload) {
  const config = getConfig_();
  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + config.botToken,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const body = JSON.parse(response.getContentText());
  if (!body.ok) {
    throw new Error(url + " failed: " + response.getContentText());
  }
  return body;
}

function jsonResponse(body) {
  return ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
