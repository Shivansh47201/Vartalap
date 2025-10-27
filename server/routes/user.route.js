import express from "express";
import { validateUserMiddleware } from "../middlewares/validate.middleware.js";
import {
  registerProfile,
  loginProfile,
  getProfile,
  updateProfile,
  logoutProfile,
  getOtherProfile,
} from "../controllers/user.controller.js";
import userToken from "../middlewares/userAuth.middleware.js";

const router = express.Router();

router.get('/', (req, res) => {
  res.send("Hello")
})

router.post("/register", validateUserMiddleware, registerProfile);
router.post("/login", loginProfile);
router.get("/me", userToken, getProfile);
router.put("/update", userToken, validateUserMiddleware, updateProfile);
router.post("/logout", userToken, logoutProfile);
router.post("/logout", userToken, logoutProfile);
router.get("/get-other-users", userToken, getOtherProfile);

export default router;
