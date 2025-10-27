// app.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";



import userRoutes from "./routes/user.route.js";
import messageRoutes from "./routes/message.route.js";
import conversationRoutes from "./routes/conversation.route.js";
import uploadRoutes from "./routes/upload.route.js";
import statusRoutes from "./routes/status.route.js";
import callLogRoutes from "./routes/callLog.route.js";
import utilsRoutes from "./routes/utils.route.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const baseClient = process.env.CLIENT_URL?.replace(/\/$/, "");
const allowedOrigins = [
  baseClient,
  baseClient?.replace(/^http:/, "https:"),
  "http://localhost:5173",
  "https://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, "");
      if (
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      if (process.env.ALLOW_LAN_DEV === "true" && /^(https?:\/\/)?\d+\.\d+\.\d+\.\d+/.test(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/api/v1/user", userRoutes);
app.use("/api/v1/message", messageRoutes);
app.use("/api/v1/conversation", conversationRoutes);
app.use("/api/v1/uploads", uploadRoutes);
app.use("/api/v1/status", statusRoutes);
app.use("/api/v1/call-log", callLogRoutes);
app.use("/api/v1/utils", utilsRoutes);




app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;
