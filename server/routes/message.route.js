import express from "express";
import {
  getMessages,
  sendMessages,
  markMessagesAsRead,
} from "../controllers/message.controller.js";
import userToken from "../middlewares/userAuth.middleware.js";

const router = express.Router();

router.get("/:conversationId", userToken, getMessages);
router.post("/send", userToken, sendMessages);
router.post("/mark-read/:conversationId", userToken, markMessagesAsRead);

export default router;
