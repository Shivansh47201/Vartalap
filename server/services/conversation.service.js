import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import mongoose from "mongoose";

class ConversationService {
  async createGroupConversation({ name, memberIds, createdBy }) {
    if (!name || !Array.isArray(memberIds) || memberIds.length === 0) {
      throw new Error("Group name and members are required");
    }

    const uniqueMemberIds = Array.from(
      new Set([
        ...memberIds.map((id) => new mongoose.Types.ObjectId(id)),
        new mongoose.Types.ObjectId(createdBy),
      ])
    );

    const conversation = await Conversation.create({
      name,
      members: uniqueMemberIds,
      isGroup: true,
      createdBy,
    });

    return conversation;
  }

  async getUserConversations(userId) {
    if (!userId) {
      throw new Error("User id is required");
    }

    const conversations = await Conversation.find({
      members: { $in: [userId] },
    })
      .populate({
        path: "members",
        select: "name username email avatar",
      })
      .populate({
        path: "lastMessage",
        populate: {
          path: "senderId",
          select: "name username avatar",
        },
      })
      .sort({ updatedAt: -1 });

    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadExists = await Message.exists({
          conversationId: conversation._id,
          receiverId: userId,
          read: false,
        });
        const convObj = conversation.toObject();
        return {
          ...convObj,
          hasUnread: Boolean(unreadExists),
        };
      })
    );

    return conversationsWithUnread;
  }

  async getConversationById(conversationId) {
    if (!conversationId) {
      throw new Error("Conversation id is required");
    }

    const conversation = await Conversation.findById(conversationId)
      .populate({
        path: "members",
        select: "name username email avatar",
      })
      .populate({
        path: "lastMessage",
        populate: {
          path: "senderId",
          select: "name username avatar",
        },
      });

    return conversation;
  }

  async getOrCreateDirectConversation({ userId, otherUserId }) {
    if (!userId || !otherUserId) {
      throw new Error("Both user ids are required");
    }

    const members = [userId, otherUserId]
      .map((id) => new mongoose.Types.ObjectId(id))
      .sort((a, b) => a.toString().localeCompare(b.toString()));

    let conversation = await Conversation.findOne({
      members,
      isGroup: false,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        members,
        isGroup: false,
        message: [],
        createdBy: userId,
      });
    }

    await conversation.populate({
      path: "members",
      select: "name username email avatar",
    });

    await conversation.populate({
      path: "lastMessage",
      populate: {
        path: "senderId",
        select: "name username avatar",
      },
    });

    const unreadExists = await Message.exists({
      conversationId: conversation._id,
      receiverId: userId,
      read: false,
    });

    const convObj = conversation.toObject();

    return {
      ...convObj,
      hasUnread: Boolean(unreadExists),
    };
  }

  async deleteConversation({ userId, conversationId }) {
    if (!userId || !conversationId) {
      throw new Error("Conversation id and user id are required");
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const isMember = conversation.members.some((memberId) =>
      memberId.toString() === userId.toString()
    );

    if (!isMember) {
      throw new Error("You do not have permission to delete this conversation");
    }

    await Message.deleteMany({ conversationId: conversation._id });
    await conversation.deleteOne();

    return conversationId;
  }
}

export default new ConversationService();
