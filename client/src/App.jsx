// import { useEffect } from "react";
import "./App.css";
import { Toaster } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import {
  getOtherUsersThunk,
  getUserThunk,
} from "./store/slice/user/user.thunk";
import { fetchConversationsThunk } from "./store/slice/conversation/conversation.thunk";
import { useEffect } from "react";
import { connectSocket, disconnectSocket, getSocket } from "./lib/socket";
import {
  setOnlineUsers,
  setTypingStatus,
} from "./store/slice/user/user.slice";
import { markMessagesAsRead } from "./store/slice/message/message.slice";

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, userProfile, sessionChecked } = useSelector(
    (state) => state.user
  );
  const { conversations } = useSelector((state) => state.conversation);

  useEffect(() => {
    dispatch(getUserThunk());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(getOtherUsersThunk());
      dispatch(fetchConversationsThunk());
    }
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && userProfile?._id) {
      connectSocket(userProfile._id);
      return () => {
        disconnectSocket();
      };
    }

    if (sessionChecked && !isAuthenticated) {
      disconnectSocket();
    }

    return undefined;
  }, [isAuthenticated, userProfile?._id, sessionChecked]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handlePresence = (onlineIds) => {
      dispatch(setOnlineUsers(onlineIds));
    };

    const handleTyping = ({ from, isTyping }) => {
      if (!from) return;
      dispatch(setTypingStatus({ userId: from, isTyping }));
    };

    const handleReadReceipts = (payload) => {
      const { messageIds } = payload || {};
      if (!Array.isArray(messageIds) || !messageIds.length) return;
      dispatch(markMessagesAsRead({ messageIds }));
    };

    socket.on("presence:update", handlePresence);
    socket.on("typing", handleTyping);
    socket.on("message:read", handleReadReceipts);

    return () => {
      socket.off("presence:update", handlePresence);
      socket.off("typing", handleTyping);
      socket.off("message:read", handleReadReceipts);
    };
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    if (!Array.isArray(conversations)) return;

    conversations.forEach((conversation) => {
      if (conversation?._id) {
        socket.emit("conversation:join", conversation._id);
      }
    });
  }, [conversations]);

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
    </>
  );
}

export default App;
