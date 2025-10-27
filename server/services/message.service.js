import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import mongoose from "mongoose";

class MessageService {
  async sendMessages({
    senderId,
    receiverId,
    conversationId,
    message,
    messageType,
    attachments = [],
  }) {
    if (!senderId || (!message && attachments.length === 0)) {
      throw new Error("Message content or attachment is required");
    }

    let conversation;
    const senderObjId = new mongoose.Types.ObjectId(senderId);
    let receiverObjId = null;

    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        members: { $in: [senderObjId] },
      });

      if (!conversation) {
        throw new Error("Conversation not found or access denied");
      }
    } else {
      if (!receiverId) {
        throw new Error("Receiver id is required for direct messages");
      }

      receiverObjId = new mongoose.Types.ObjectId(receiverId);
      const members = [senderObjId, receiverObjId].sort((a, b) =>
        a.toString().localeCompare(b.toString())
      );

      conversation = await Conversation.findOne({ members, isGroup: false });

      if (!conversation) {
        conversation = await Conversation.create({
          members,
          isGroup: false,
          message: [],
        });
      }

    }

    const formattedAttachments = attachments.map((file) => ({
      url: file.url,
      type: file.type || "other",
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      fileName: file.fileName,
      uploadedAt: file.uploadedAt,
    }));

    const computedType =
      messageType ||
      (formattedAttachments.length > 0
        ? formattedAttachments.every((file) => file.type === "image")
          ? "image"
          : "file"
        : "text");

    const newMessage = await Message.create({
      senderId: senderObjId,
      receiverId: receiverObjId,
      conversationId: conversation._id,
      message,
      messageType: computedType,
      attachments: formattedAttachments,
    });

    if (newMessage) {
      conversation.message.push(newMessage._id);
      conversation.lastMessage = newMessage._id;
      await conversation.save();
    }

    await newMessage.populate([
      { path: "senderId", select: "name username avatar" },
      { path: "receiverId", select: "name username avatar" },
    ]);

    return newMessage;
  }

  async getMessages({ conversationId, myId, otherMembersId, limit = 20, cursor }) {
    if (!conversationId && (!myId || !otherMembersId)) {
      throw new Error("Conversation id or user ids are required");
    }

    const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const myObjectId = myId instanceof mongoose.Types.ObjectId
      ? myId
      : myId
      ? new mongoose.Types.ObjectId(myId)
      : null;

    const otherMemberObjectId = otherMembersId instanceof mongoose.Types.ObjectId
      ? otherMembersId
      : otherMembersId
      ? new mongoose.Types.ObjectId(otherMembersId)
      : null;

    let conversation;

    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        members: { $in: [myObjectId] },
      }).select("_id members isGroup");
    } else {
      conversation = await Conversation.findOne({
        members: { $all: [myObjectId, otherMemberObjectId] },
        isGroup: false,
      }).select("_id members isGroup");
    }

    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    const query = { conversationId: conversation._id };

    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!Number.isNaN(cursorDate.getTime())) {
        query.createdAt = { $lt: cursorDate };
      }
    }

    const messagesDocs = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parsedLimit + 1)
      .populate([
        { path: "senderId", select: "name username avatar" },
        { path: "receiverId", select: "name username avatar" },
      ]);

    const hasMore = messagesDocs.length > parsedLimit;
    const sliced = hasMore ? messagesDocs.slice(0, parsedLimit) : messagesDocs;
    const nextCursor = hasMore
      ? sliced[sliced.length - 1]?.createdAt?.toISOString?.() || null
      : null;

    const messages = [...sliced]
      .reverse()
      .map((doc) => doc.toObject({ virtuals: false }));

    return {
      conversationId: conversation._id,
      messages,
      hasMore,
      nextCursor,
    };
  }

  async markMessagesRead({ conversationId, readerId }) {
    if (!conversationId || !readerId) {
      throw new Error("Conversation id and reader id are required");
    }

    const readerObjId = new mongoose.Types.ObjectId(readerId);

    const unreadMessages = await Message.find({
      conversationId,
      receiverId: readerObjId,
      read: false,
    }).select("_id conversationId senderId receiverId read");

    if (!unreadMessages.length) {
      return [];
    }

    const messageIds = unreadMessages.map((msg) => msg._id);

    await Message.updateMany(
      { _id: { $in: messageIds } },
      { $set: { read: true } }
    );

    return unreadMessages;
  }
}

export default new MessageService();
