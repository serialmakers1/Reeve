let replayPendingStart = false;

export function markReplayPending() {
  replayPendingStart = true;
}

export function consumeReplayPending(): boolean {
  if (!replayPendingStart) return false;
  replayPendingStart = false;
  return true;
}
