import dotenv from "dotenv";
import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import app from "./app.js";
import connectDb from "./config/db.js";
import { initSocket } from "./socket/index.js";

dotenv.config();

const PORT = process.env.PORT || 5050;
const HOST = process.env.HOST || "0.0.0.0";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveCertPath = (fileName) => {
  const localPath = path.resolve(fileName);
  if (fs.existsSync(localPath)) {
    return localPath;
  }

  const parentPath = path.resolve(__dirname, `../${fileName}`);
  if (fs.existsSync(parentPath)) {
    return parentPath;
  }

  return null;
};

const certPath = resolveCertPath("cert.pem");
const keyPath = resolveCertPath("cert.key");

const hasHttpsCert = Boolean(certPath && keyPath);

const start = async () => {
  try {
    await connectDb(process.env.MONGODB_URI);
    const server = hasHttpsCert
      ? https.createServer(
          {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
          },
          app
        )
      : http.createServer(app);
    initSocket(server);

    server.listen(PORT, HOST, () => {
      const displayHost = HOST === "0.0.0.0" ? "localhost" : HOST;
      const scheme = hasHttpsCert ? "https" : "http";
      console.log(`Server is running on ${scheme}://${displayHost}:${PORT}`);
      if (!hasHttpsCert) {
        console.warn(
          "HTTPS certificates not found; falling back to HTTP. Video/audio calls on mobile may be blocked."
        );
      }
    });
  } catch (error) {
    console.log("Oops! Server Crashed", error);
  }
};

start();
