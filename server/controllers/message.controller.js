import MessageService from "../services/message.service.js";
import ConversationService from "../services/conversation.service.js";
import { emitMessagesRead, emitNewMessage } from "../socket/index.js";
import { normalizeFileName } from "../utilis/filename.util.js";

export const getMessages = async (req, res) => {
  const myId = req.user._id;
  const { conversationId } = req.params;
  const { limit, cursor } = req.query;
  try {
    const messages = await MessageService.getMessages({
      conversationId,
      myId,
      limit,
      cursor,
    });

    res.status(200).json({
      message: "Messages fetched successfully",
      data: messages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

export const sendMessages = async (req, res) => {
  const { message, conversationId, receiverId, messageType } = req.body;
  const senderId = req.user._id;
  let parsedAttachments = [];

  if (req.body.attachments) {
    if (Array.isArray(req.body.attachments)) {
      parsedAttachments = req.body.attachments;
    } else if (typeof req.body.attachments === "string") {
      try {
        parsedAttachments = JSON.parse(req.body.attachments);
      } catch (error) {
        console.error("Failed to parse attachments JSON", error);
      }
    }
  }

  const uploadedAttachments = (req.files || []).map((file) => ({
    url: `/uploads/${file.filename}`,
    type: file.mimetype.startsWith("image")
      ? "image"
      : file.mimetype.startsWith("video")
      ? "video"
      : file.mimetype.startsWith("audio")
      ? "audio"
      : file.mimetype.startsWith("application")
      ? "document"
      : "other",
    originalName: normalizeFileName(file.originalname),
    mimeType: file.mimetype,
    size: file.size,
  }));

  const attachments = [...parsedAttachments, ...uploadedAttachments]
    .filter((file) => file?.url)
    .map((file) => ({
      url: file.url,
      type: file.type || "other",
      originalName: normalizeFileName(file.originalName || file.originalname),
      mimeType: file.mimeType,
      size: file.size,
      fileName: file.filename || undefined,
      uploadedAt: file.uploadedAt || new Date().toISOString(),
    }));

  if (!message && attachments.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Message or attachment is required" });
  }

  try {
    const newMessage = await MessageService.sendMessages({
      senderId,
      receiverId,
      conversationId,
      message,
      messageType,
      attachments,
    });

    emitNewMessage(newMessage);

    const conversation = await ConversationService.getConversationById(
      newMessage.conversationId
    );

    res.status(200).json({
      success: true,
      message: "Message sent successfully",
      data: newMessage,
      conversation: conversation
        ? { ...conversation.toObject(), hasUnread: false }
        : null,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const markMessagesAsRead = async (req, res) => {
  const readerId = req.user._id;
  const { conversationId } = req.params;

  try {
    const updatedMessages = await MessageService.markMessagesRead({
      conversationId,
      readerId,
    });

    if (updatedMessages.length) {
      emitMessagesRead({
        messageIds: updatedMessages.map((msg) => msg._id),
        readerId,
        conversationId,
      });
    }

    res.status(200).json({
      success: true,
      message: "Messages marked as read",
      data: updatedMessages,
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
