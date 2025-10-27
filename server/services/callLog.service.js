import CallLog from "../models/callLog.model.js";

class CallLogService {
  async createLog({
    callerId,
    calleeId,
    conversationId,
    mode,
    direction,
    status,
    startedAt,
    endedAt,
    duration,
  }) {
    if (!callerId || !calleeId) {
      throw new Error("Caller and callee are required");
    }

    const payload = {
      callerId,
      calleeId,
      conversationId,
      mode,
      direction,
      status,
      startedAt,
      endedAt,
      duration,
    };

    const log = await CallLog.create(payload);
    return log
      .populate({ path: "callerId", select: "name username avatar" })
      .populate({ path: "calleeId", select: "name username avatar" });
  }

  async getLogsForUser(userId) {
    if (!userId) {
      throw new Error("User id is required");
    }

    return CallLog.find({
      $or: [{ callerId: userId }, { calleeId: userId }],
    })
      .sort({ startedAt: -1 })
      .limit(100)
      .populate({ path: "callerId", select: "name username avatar" })
      .populate({ path: "calleeId", select: "name username avatar" });
  }
}

export default new CallLogService();
