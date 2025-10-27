import { io } from "socket.io-client";

let socketInstance = null;

const buildFallbackSocketUrl = () => {
  if (typeof window === "undefined") {
    return undefined;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const hostname = window.location.hostname || "localhost";
  const port = import.meta.env.VITE_SOCKET_PORT ||
    import.meta.env.VITE_API_PORT ||
    "5050";

  return `${protocol}//${hostname}:${port}`;
};

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  const apiBase = import.meta.env.VITE_DB_URL;
  if (apiBase) {
    try {
      const url = new URL(apiBase);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.pathname = "/";
      return url.toString().replace(/\/$/, "");
    } catch {
      /* ignore invalid URL */
    }
  }

  return buildFallbackSocketUrl();
};

export const connectSocket = (userId) => {
  if (!userId) return null;

  if (socketInstance) {
    socketInstance.emit("register", userId);
    return socketInstance;
  }

  const socketUrl = getSocketUrl();
  if (!socketUrl) return null;

  socketInstance = io(socketUrl, {
    withCredentials: true,
    autoConnect: true,
  });

  socketInstance.on("connect", () => {
    socketInstance.emit("register", userId);
  });

  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export const getSocket = () => socketInstance;

export const emitTyping = ({ to, isTyping }) => {
  if (!socketInstance || !to) return;
  socketInstance.emit("typing", { to, isTyping });
};
