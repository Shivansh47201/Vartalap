import { createSlice } from "@reduxjs/toolkit";
import {
  createGroupConversationThunk,
  createDirectConversationThunk,
  fetchConversationsThunk,
  deleteConversationThunk,
} from "./conversation.thunk";
import {
  markMessagesReadThunk,
  sendMessageThunk,
} from "../message/message.thunk";

const initialState = {
  conversations: [],
  loading: false,
  creating: false,
  selectedConversationId: null,
};

const conversationSlice = createSlice({
  name: "conversation",
  initialState,
  reducers: {
    setSelectedConversation: (state, action) => {
      state.selectedConversationId = action.payload;
      const idx = state.conversations.findIndex(
        (conv) => conv?._id === action.payload
      );
      if (idx >= 0) {
        state.conversations[idx] = {
          ...state.conversations[idx],
          hasUnread: false,
        };
      }
    },
    upsertConversation: (state, action) => {
      const conversation = action.payload;
      if (!conversation?._id) return;
      const existingIndex = state.conversations.findIndex(
        (item) => item?._id === conversation._id
      );
      if (existingIndex >= 0) {
        state.conversations[existingIndex] = {
          ...state.conversations[existingIndex],
          ...conversation,
          hasUnread:
            typeof conversation.hasUnread === "boolean"
              ? conversation.hasUnread
              : state.conversations[existingIndex].hasUnread,
        };
      } else {
        state.conversations.unshift({
          ...conversation,
          hasUnread: Boolean(conversation.hasUnread),
        });
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchConversationsThunk.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchConversationsThunk.fulfilled, (state, action) => {
      state.loading = false;
      const payloadConversations = action.payload?.conversations;
      if (Array.isArray(payloadConversations)) {
        state.conversations = payloadConversations.map((conv) => ({
          ...conv,
          hasUnread: Boolean(conv.hasUnread),
        }));
        if (
          !state.selectedConversationId &&
          state.conversations.length
        ) {
          state.selectedConversationId = state.conversations[0]?._id;
        }
      }
    });
    builder.addCase(fetchConversationsThunk.rejected, (state) => {
      state.loading = false;
    });

    builder.addCase(createGroupConversationThunk.pending, (state) => {
      state.creating = true;
    });
    builder.addCase(createGroupConversationThunk.fulfilled, (state, action) => {
      state.creating = false;
      const conversation = action.payload?.conversation;
      if (conversation?._id) {
        state.conversations = [conversation, ...state.conversations];
        state.selectedConversationId = conversation._id;
      }
    });
    builder.addCase(createGroupConversationThunk.rejected, (state) => {
      state.creating = false;
    });

    builder.addCase(sendMessageThunk.fulfilled, (state, action) => {
      const conversation = action.payload?.conversation;
      if (conversation?._id) {
        const existingIndex = state.conversations.findIndex(
          (item) => item?._id === conversation._id
        );
        if (existingIndex >= 0) {
          state.conversations[existingIndex] = {
            ...state.conversations[existingIndex],
            ...conversation,
            hasUnread: Boolean(conversation.hasUnread),
          };
        } else {
          state.conversations = [
            { ...conversation, hasUnread: Boolean(conversation.hasUnread) },
            ...state.conversations,
          ];
        }
        if (!state.selectedConversationId) {
          state.selectedConversationId = conversation._id;
        }
      }
    });

    builder.addCase(markMessagesReadThunk.fulfilled, (state, action) => {
      const conversationId = action.meta?.arg?.conversationId;
      if (!conversationId) return;
      const existingIndex = state.conversations.findIndex(
        (item) => item?._id === conversationId
      );
      if (existingIndex >= 0) {
        state.conversations[existingIndex] = {
          ...state.conversations[existingIndex],
          hasUnread: false,
        };
      }
    });

    builder.addCase(createDirectConversationThunk.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createDirectConversationThunk.fulfilled, (state, action) => {
      state.loading = false;
      const conversation = action.payload?.conversation;
      if (conversation?._id) {
        const existingIndex = state.conversations.findIndex(
          (item) => item?._id === conversation._id
        );
        if (existingIndex >= 0) {
          state.conversations[existingIndex] = {
            ...state.conversations[existingIndex],
            ...conversation,
            hasUnread: Boolean(conversation.hasUnread),
          };
        } else {
          state.conversations = [
            { ...conversation, hasUnread: Boolean(conversation.hasUnread) },
            ...state.conversations,
          ];
        }
        state.selectedConversationId = conversation._id;
      }
    });
    builder.addCase(createDirectConversationThunk.rejected, (state) => {
      state.loading = false;
    });

    builder.addCase(deleteConversationThunk.fulfilled, (state, action) => {
      const removedId = action.payload?.conversationId;
      if (!removedId) return;

      state.conversations = state.conversations.filter(
        (conv) => conv?._id !== removedId
      );

      if (state.selectedConversationId === removedId) {
        state.selectedConversationId = state.conversations[0]?._id || null;
      }
    });
  },
});

export const { setSelectedConversation, upsertConversation } =
  conversationSlice.actions;
export default conversationSlice.reducer;
