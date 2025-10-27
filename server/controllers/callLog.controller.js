import CallLogService from "../services/callLog.service.js";

export const createCallLog = async (req, res) => {
  try {
    const authUserId = req.user?._id;
    const {
      otherUserId,
      calleeId,
      conversationId,
      mode,
      direction,
      status,
      startedAt,
      endedAt,
      duration,
    } = req.body || {};

    const remoteUserId = otherUserId || calleeId;

    if (!remoteUserId) {
      return res
        .status(400)
        .json({ success: false, message: "calleeId is required" });
    }

    const normalizedDirection = direction === "incoming" ? "incoming" : "outgoing";

    const payload =
      normalizedDirection === "outgoing"
        ? {
            callerId: authUserId,
            calleeId: remoteUserId,
          }
        : {
            callerId: remoteUserId,
            calleeId: authUserId,
          };

    const log = await CallLogService.createLog({
      ...payload,
      conversationId,
      mode,
      direction: normalizedDirection,
      status,
      startedAt,
      endedAt,
      duration,
    });

    res.status(201).json({ success: true, data: log });
  } catch (error) {
    console.error("createCallLog error", error);
    res.status(500).json({
      success: false,
      message: error.message || "Unable to record call log",
    });
  }
};

export const getCallLogs = async (req, res) => {
  try {
    const logs = await CallLogService.getLogsForUser(req.user?._id);
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    console.error("getCallLogs error", error);
    res.status(500).json({
      success: false,
      message: error.message || "Unable to fetch call logs",
    });
  }
};
