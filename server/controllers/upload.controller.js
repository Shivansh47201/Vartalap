import path from "path";
import { normalizeFileName } from "../utilis/filename.util.js";

export const uploadMessageAttachments = (req, res) => {
  const files = (req.files || []).map((file) => ({
    url: `/uploads/${file.filename}`,
    originalName: normalizeFileName(file.originalname),
    mimeType: file.mimetype,
    size: file.size,
    type: file.mimetype.startsWith("image")
      ? "image"
      : file.mimetype.startsWith("video")
      ? "video"
      : file.mimetype.startsWith("audio")
      ? "audio"
      : file.mimetype.startsWith("application")
      ? "document"
      : "other",
    filename: file.filename,
    extension: path.extname(file.originalname).replace(/^\./, ""),
    uploadedAt: new Date().toISOString(),
  }));

  return res.status(201).json({
    success: true,
    message: "Files uploaded successfully",
    files,
  });
};
