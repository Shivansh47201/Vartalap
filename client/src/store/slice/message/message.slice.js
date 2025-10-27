import { createSlice } from "@reduxjs/toolkit";
import {
  getMessageThunk,
  markMessagesReadThunk,
  sendMessageThunk,
} from "./message.thunk.js";

const initialState = {
  buttonLoading: false,
  isFetching: false,
  moreLoading: false,
  messages: [],
  hasMore: false,
  nextCursor: null,
};

export const messageSlice = createSlice({
  name: "message",
  initialState,
  reducers: {
    resetMessages: (state) => {
      state.messages = [];
      state.isFetching = false;
      state.moreLoading = false;
      state.hasMore = false;
      state.nextCursor = null;
    },
    addMessage: (state, action) => {
      const incoming = action.payload;
      if (!incoming?._id) return;

      const exists = state.messages.some((msg) => msg?._id === incoming._id);
      if (exists) {
        state.messages = state.messages.map((msg) =>
          msg?._id === incoming._id ? { ...msg, ...incoming } : msg
        );
      } else {
        state.messages = [...state.messages, incoming];
      }
    },
    markMessagesAsRead: (state, action) => {
      const messageIds = action.payload?.messageIds;
      if (!Array.isArray(messageIds) || !messageIds.length) return;
      const idsSet = new Set(messageIds.map((id) => id?.toString?.() || id));

      state.messages = state.messages.map((msg) => {
        const msgId = msg?._id?.toString?.() || msg?._id;
        if (idsSet.has(msgId)) {
          return { ...msg, read: true };
        }
        return msg;
      });
    },
  },
  extraReducers: (builder) => {
    // Send Message 
    builder.addCase(sendMessageThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(sendMessageThunk.fulfilled, (state, action) => {
      state.buttonLoading = false;
      const newMessage = action.payload?.data;
      const tempId = action.payload?.tempId || action.meta?.arg?.tempId;
      if (!newMessage) return;

      if (tempId) {
        const replaced = state.messages.some((msg) => msg?._id === tempId);
        if (replaced) {
          state.messages = state.messages.map((msg) =>
            msg?._id === tempId ? { ...msg, ...newMessage, pending: false } : msg
          );
          return;
        }
      }

      const exists = state.messages.some((msg) => msg?._id === newMessage?._id);
      state.messages = exists
        ? state.messages.map((msg) =>
            msg?._id === newMessage?._id ? { ...msg, ...newMessage } : msg
          )
        : [...state.messages, newMessage];
    });
    builder.addCase(sendMessageThunk.rejected, (state, action) => {
      state.buttonLoading = false;
      const tempId = action.meta?.arg?.tempId;
      if (tempId) {
        state.messages = state.messages.map((msg) =>
          msg?._id === tempId ? { ...msg, pending: false, error: true } : msg
        );
      }
    });

    //Get Message 
    builder.addCase(getMessageThunk.pending, (state, action) => {
      if (action.meta?.arg?.cursor) {
        state.moreLoading = true;
      } else {
        state.isFetching = true;
      }
    });
    builder.addCase(getMessageThunk.fulfilled, (state, action) => {
      const payload = action.payload?.data;
      const incomingMessages = Array.isArray(payload?.messages)
        ? payload.messages
        : [];
      const cursor = action.meta?.arg?.cursor;

      if (cursor) {
        state.moreLoading = false;
        const existingIds = new Set(
          state.messages.map((msg) => msg?._id?.toString?.() || msg?._id)
        );
        const deduped = incomingMessages.filter((msg) => {
          const id = msg?._id?.toString?.() || msg?._id;
          return id && !existingIds.has(id);
        });
        state.messages = [...deduped, ...state.messages];
      } else {
        state.isFetching = false;
        state.messages = incomingMessages;
      }

      state.hasMore = Boolean(payload?.hasMore);
      state.nextCursor = payload?.nextCursor || null;
    });
    builder.addCase(getMessageThunk.rejected, (state, action) => {
      if (action.meta?.arg?.cursor) {
        state.moreLoading = false;
      } else {
        state.isFetching = false;
        state.messages = [];
        state.hasMore = false;
        state.nextCursor = null;
      }
    });

    builder.addCase(markMessagesReadThunk.fulfilled, (state, action) => {
      const updated = action.payload?.data;
      if (!Array.isArray(updated) || !updated.length) return;
      const ids = updated.map((msg) => msg?._id?.toString?.() || msg?._id);
      const idsSet = new Set(ids);
      state.messages = state.messages.map((msg) => {
        const msgId = msg?._id?.toString?.() || msg?._id;
        if (idsSet.has(msgId)) {
          return { ...msg, read: true };
        }
        return msg;
      });
    });
  },
});

export const { resetMessages, addMessage, markMessagesAsRead } =
  messageSlice.actions;
export default messageSlice.reducer;
