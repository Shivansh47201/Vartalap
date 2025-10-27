import StatusService from "../services/status.service.js";
import { normalizeFileName } from "../utilis/filename.util.js";

export const createStatus = async (req, res) => {
  const userId = req.user?._id;
  const { content, visibility } = req.body;

  let attachments = [];
  if (req.body.attachments) {
    if (Array.isArray(req.body.attachments)) {
      attachments = req.body.attachments;
    } else if (typeof req.body.attachments === "string") {
      try {
        attachments = JSON.parse(req.body.attachments);
      } catch (error) {
        console.error("Failed to parse attachments", error);
      }
    }
  }

  const uploaded = (req.files || []).map((file) => ({
    url: `/uploads/${file.filename}`,
    type: file.mimetype.startsWith("image")
      ? "image"
      : file.mimetype.startsWith("video")
      ? "video"
      : file.mimetype.startsWith("audio")
      ? "audio"
      : "other",
    originalName: normalizeFileName(file.originalname),
    mimeType: file.mimetype,
    size: file.size,
    fileName: file.filename,
    uploadedAt: new Date().toISOString(),
  }));

  const files = [...attachments, ...uploaded].map((file) => ({
    ...file,
    originalName: normalizeFileName(file.originalName || file.originalname),
  }));

  try {
    const statusDoc = await StatusService.createStatus({
      userId,
      content,
      attachments: files,
      visibility,
    });

    res.status(201).json({
      success: true,
      message: "Status posted",
      data: statusDoc,
    });
  } catch (error) {
    console.error("createStatus error", error);
    res.status(400).json({
      success: false,
      message: error.message || "Unable to create status",
    });
  }
};

export const getStatuses = async (req, res) => {
  try {
    const statuses = await StatusService.getRecentStatuses({ userId: req.user?._id });
    res.status(200).json({ success: true, data: statuses });
  } catch (error) {
    console.error("getStatuses error", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyStatuses = async (req, res) => {
  try {
    const statuses = await StatusService.getMyStatuses({ userId: req.user?._id });
    res.status(200).json({ success: true, data: statuses });
  } catch (error) {
    console.error("getMyStatuses error", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
