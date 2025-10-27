import express from "express";
import userToken from "../middlewares/userAuth.middleware.js";
import { messageAttachmentUpload } from "../middlewares/upload.middleware.js";
import {
  createStatus,
  getStatuses,
  getMyStatuses,
} from "../controllers/status.controller.js";

const router = express.Router();

router.get("/feed", userToken, getStatuses);
router.get("/me", userToken, getMyStatuses);
router.post(
  "/",
  userToken,
  (req, res, next) => {
    messageAttachmentUpload(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  createStatus
);

export default router;
