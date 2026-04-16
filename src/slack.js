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
  const records = readAllRecords_(sheet);
  const message = buildPointsListMessage_(records, userId);

  postJson_("https://slack.com/api/chat.postMessage", {
    channel: channelId,
    thread_ts: threadTs,
    text: message,
  });
}

function buildPointsListMessage_(records, currentUserId) {
  if (!records || records.length === 0) {
    return POINTS_LIST_EMPTY_MESSAGE;
  }

  const latestByUserId = {};
  records.forEach(function(record) {
    latestByUserId[record.userId] = record;
  });

  const latestRecords = Object.keys(latestByUserId).map(function(userId) {
    return latestByUserId[userId];
  });

  latestRecords.sort(function(a, b) {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    return getPointListLabel_(a).localeCompare(getPointListLabel_(b));
  });

  const lines = latestRecords.map(function(record, index) {
    return (index + 1) + ". " + getPointListLabel_(record) + " " + record.points + "ポイント";
  });

  const currentUserIndex = latestRecords.findIndex(function(record) {
    return record.userId === currentUserId;
  });
  const rankMessage = currentUserIndex >= 0
    ? formatMessage_(POINTS_LIST_USER_RANK_MESSAGE, { rank: currentUserIndex + 1 })
    : POINTS_LIST_USER_NOT_FOUND_MESSAGE;

  return POINTS_LIST_HEADER + "\n" + lines.join("\n") + "\n\n" + rankMessage;
}

function getPointListLabel_(record) {
  if (record.userId) {
    return "<@" + record.userId + ">";
  }
  return record.displayName || "unknown";
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
