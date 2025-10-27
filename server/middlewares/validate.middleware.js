
import userValidation from "./userValidation.middleware.js";

export const validateUserMiddleware = (req, res, next) => {
  console.log("🟢 Received Body:", req.body);

  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: "Request body is missing" });
  }


  userValidation(req, res, next);
};
