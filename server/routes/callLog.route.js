import express from "express";
import userToken from "../middlewares/userAuth.middleware.js";
import { createCallLog, getCallLogs } from "../controllers/callLog.controller.js";

const router = express.Router();

router.get("/", userToken, getCallLogs);
router.post("/", userToken, createCallLog);

export default router;
