import express from "express";
import userToken from "../middlewares/userAuth.middleware.js";
import { translateText } from "../controllers/translate.controller.js";

const router = express.Router();

router.post("/translate", userToken, translateText);

export default router;
