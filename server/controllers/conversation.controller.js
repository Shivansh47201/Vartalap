import ConversationService from "../services/conversation.service.js";

export const createGroupConversation = async (req, res) => {
  try {
    const { name, memberIds } = req.body;
    const createdBy = req.user?._id;

    const conversation = await ConversationService.createGroupConversation({
      name,
      memberIds,
      createdBy,
    });

    res.status(201).json({
      success: true,
      message: "Group conversation created",
      conversation,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Unable to create conversation",
    });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.user?._id;
    const conversations = await ConversationService.getUserConversations(userId);

    res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Unable to fetch conversations",
    });
  }
};

export const getOrCreateDirectConversation = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { memberId } = req.body;

    const conversation = await ConversationService.getOrCreateDirectConversation({
      userId,
      otherUserId: memberId,
    });

    res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Unable to start conversation",
    });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { conversationId } = req.params;

    const removedId = await ConversationService.deleteConversation({
      userId,
      conversationId,
    });

    res.status(200).json({
      success: true,
      conversationId: removedId,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Unable to delete conversation",
    });
  }
};
