import express from "express";
import userToken from "../middlewares/userAuth.middleware.js";
import {
  createGroupConversation,
  getConversations,
  getOrCreateDirectConversation,
  deleteConversation,
} from "../controllers/conversation.controller.js";

const router = express.Router();

router.get("/", userToken, getConversations);
router.post("/group", userToken, createGroupConversation);
router.post("/direct", userToken, getOrCreateDirectConversation);
router.delete("/:conversationId", userToken, deleteConversation);

export default router;
