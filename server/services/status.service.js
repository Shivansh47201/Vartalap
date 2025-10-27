import Status from "../models/status.model.js";

class StatusService {
  async createStatus({ userId, content, attachments = [], visibility }) {
    if (!userId) {
      throw new Error("User id is required");
    }

    if (!content && attachments.length === 0) {
      throw new Error("Status requires content or media");
    }

    const formattedAttachments = attachments.map((file) => ({
      url: file.url,
      type: file.type || "image",
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      fileName: file.fileName,
      uploadedAt: file.uploadedAt || new Date(),
    }));

    const statusDoc = await Status.create({
      userId,
      content,
      attachments: formattedAttachments,
      visibility: visibility || "public",
    });

    return statusDoc.populate({ path: "userId", select: "name username avatar" });
  }

  async getRecentStatuses({ userId }) {
    const statuses = await Status.find({
      expiresAt: { $gt: new Date() },
      userId: { $ne: userId },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate({ path: "userId", select: "name username avatar" });

    return statuses;
  }

  async getMyStatuses({ userId }) {
    return Status.find({ userId })
      .sort({ createdAt: -1 })
      .populate({ path: "userId", select: "name username avatar" });
  }
}

export default new StatusService();
