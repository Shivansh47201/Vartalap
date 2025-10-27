import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slice/user/user.slice";
import messageReducer from "./slice/message/message.slice";
import conversationReducer from "./slice/conversation/conversation.slice";
import statusReducer from "./slice/status/status.slice";
import callReducer from "./slice/call/call.slice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    message: messageReducer,
    conversation: conversationReducer,
    status: statusReducer,
    callLogs: callReducer,
  },
});
