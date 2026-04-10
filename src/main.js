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
