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
    text: "<@" + userId + "> " + formatMessage_(POINTS_LOOKUP_MESSAGE, { points: points }),
  });
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
