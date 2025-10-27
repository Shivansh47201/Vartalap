import express from "express";
import path from "path";
import fs from "fs";
import userToken from "../middlewares/userAuth.middleware.js";
import { messageAttachmentUpload } from "../middlewares/upload.middleware.js";
import { uploadMessageAttachments } from "../controllers/upload.controller.js";

const uploadsDir = path.resolve("uploads");

const router = express.Router();

router.post(
  "/message",
  userToken,
  (req, res, next) => {
    messageAttachmentUpload(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  uploadMessageAttachments
);

router.get("/files/:fileName", (req, res) => {
  const { fileName } = req.params;
  if (!fileName) {
    return res.status(400).json({ message: "File name is required" });
  }

  const sanitizedName = path.basename(fileName);
  const filePath = path.join(uploadsDir, sanitizedName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }

  return res.sendFile(filePath);
});

export default router;
