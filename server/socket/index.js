import { Server } from "socket.io";

let ioInstance = null;
const onlineUsers = new Map();
const defaultOrigins = ["http://localhost:5173", "https://localhost:5173"];
const allowedSocketOrigins = [
  process.env.CLIENT_URL?.replace(/\/$/, ""),
  ...(process.env.CLIENT_URL
    ? [process.env.CLIENT_URL.replace(/\/$/, "").replace(/^http:/, "https:")]
    : []),
  ...defaultOrigins,
].filter(Boolean);

const isLanOrigin = (origin = "") => /^(https?:\/\/)?\d+\.\d+\.\d+\.\d+/.test(origin);

const broadcastPresence = () => {
  if (!ioInstance) return;
  ioInstance.emit("presence:update", Array.from(onlineUsers.keys()));
};

export const initSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin) {
          return callback(null, true);
        }

        const normalized = origin.replace(/\/$/, "");
        if (
          allowedSocketOrigins.length === 0 ||
          allowedSocketOrigins.includes(normalized) ||
          (process.env.ALLOW_LAN_DEV === "true" && isLanOrigin(normalized))
        ) {
          return callback(null, true);
        }

        if (isLanOrigin(normalized)) {
          return callback(null, true);
        }

        return callback(null, true);
      },
      credentials: true,
    },
  });

  ioInstance.on("connection", (socket) => {
    socket.on("register", (userId) => {
      if (!userId) return;
      const userKey = userId.toString();
      socket.data.userId = userKey;
      onlineUsers.set(userKey, socket.id);
      socket.join(userKey);
      broadcastPresence();
    });

    socket.on("conversation:join", (conversationId) => {
      if (!conversationId) return;
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("conversation:leave", (conversationId) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("typing", ({ to, isTyping }) => {
      const fromUser = socket.data.userId;
      if (!fromUser || !to) return;
      ioInstance
        .to(to.toString())
        .emit("typing", { from: fromUser, isTyping: Boolean(isTyping) });
    });

    socket.on("call:offer", (payload = {}) => {
      const { to } = payload;
      if (!to) return;
      ioInstance.to(to.toString()).emit("call:offer", {
        ...payload,
        from: socket.data.userId,
      });
    });

    socket.on("call:answer", (payload = {}) => {
      const { to } = payload;
      if (!to) return;
      ioInstance.to(to.toString()).emit("call:answer", payload);
    });

    socket.on("call:ice-candidate", (payload = {}) => {
      const { to } = payload;
      if (!to) return;
      ioInstance.to(to.toString()).emit("call:ice-candidate", payload);
    });

    socket.on("call:end", (payload = {}) => {
      const { to } = payload;
      if (!to) return;
      ioInstance.to(to.toString()).emit("call:end", payload);
    });

    socket.on("call:reject", (payload = {}) => {
      const { to } = payload;
      if (!to) return;
      ioInstance.to(to.toString()).emit("call:reject", payload);
    });

    socket.on("disconnect", () => {
      const userKey = socket.data.userId;
      if (userKey && onlineUsers.has(userKey)) {
        onlineUsers.delete(userKey);
        broadcastPresence();
      }
      socket.data.userId = null;
    });
  });

  return ioInstance;
};

export const getSocket = () => {
  if (!ioInstance) {
    throw new Error("Socket.io instance has not been initialised");
  }
  return ioInstance;
};

export const emitNewMessage = (messageDoc) => {
  if (!ioInstance || !messageDoc) return;
  const plainMessage = messageDoc.toObject
    ? messageDoc.toObject({ getters: true })
    : messageDoc;

  const senderId = plainMessage.senderId?.toString?.() || plainMessage.senderId;
  const receiverId = plainMessage.receiverId?.toString?.() || plainMessage.receiverId;
  const conversationId =
    plainMessage.conversationId?.toString?.() || plainMessage.conversationId;

  if (senderId) {
    ioInstance.to(senderId).emit("message:new", plainMessage);
  }
  if (receiverId) {
    ioInstance.to(receiverId).emit("message:new", plainMessage);
  }
  if (conversationId) {
    ioInstance
      .to(`conversation:${conversationId}`)
      .emit("message:new", plainMessage);
  }
};

export const emitMessagesRead = ({
  messageIds = [],
  readerId,
  conversationId,
}) => {
  if (!ioInstance || !readerId || !conversationId || !messageIds.length) return;

  const payload = {
    messageIds: messageIds.map((id) => id.toString()),
    readerId: readerId.toString(),
    conversationId: conversationId.toString(),
  };

  ioInstance.to(readerId.toString()).emit("message:read", payload);
  ioInstance.to(`conversation:${conversationId}`).emit("message:read", payload);
};
