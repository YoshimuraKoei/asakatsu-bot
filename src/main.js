function doPost(e) {
  const jsonPayload = parseJsonBody_(e);
  if (jsonPayload) {
    if (jsonPayload.action) {
      return handleAdminAction_(jsonPayload);
    }

    if (jsonPayload.type === "url_verification") {
      return jsonResponse({ challenge: jsonPayload.challenge });
    }

    if (
      jsonPayload.type === "event_callback" &&
      jsonPayload.event &&
      jsonPayload.event.type === "app_mention"
    ) {
      const eventId = jsonPayload.event_id;
      if (eventId && isDuplicateSlackEvent_(eventId)) {
        return jsonResponse({ ok: true });
      }

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
        formatMessage_(
          ALREADY_CHECKED_IN_MESSAGE,
          { points: record ? record.points : 0 },
        ),
      );
      return jsonResponse({ ok: true });
    }

    if (isOutsideCheckInWindow_()) {
      postEphemeral_(
        channelId,
        userId,
        OUTSIDE_CHECK_IN_WINDOW_MESSAGE,
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
      formatMessage_(POINTS_UPDATED_MESSAGE, { points: nextPoints }),
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

function handleAdminAction_(payload) {
  const config = getConfig_();
  if (!config.adminApiToken || payload.adminToken !== config.adminApiToken) {
    return jsonResponse({
      ok: false,
      error: "unauthorized",
    });
  }

  try {
    if (payload.action === ADMIN_ACTION_SYNC_SCRIPT_PROPERTIES) {
      return jsonResponse(syncScriptPropertiesFromCi(payload.params));
    }

    if (payload.action === ADMIN_ACTION_SETUP_PROJECT) {
      return jsonResponse(setupProjectFromCi(Boolean(payload.reinstallTriggers)));
    }

    return jsonResponse({
      ok: false,
      error: "unknown_action",
      action: payload.action,
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error && error.message ? error.message : String(error),
    });
  }
}
