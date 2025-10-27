import UserService from "../services/user.service.js";

export const registerProfile = async (req, res) => {
  try {
    const user = await UserService.registerUser(req.body);

    res.status(201).json({
      message: "Welcome! Registration Successful",
      success: true,
      user,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Oops! Registration failed",
      success: false,
    });
    console.log("Registration failed", error);
  }
};

export const loginProfile = async (req, res) => {
  try {
    const { user, token } = await UserService.loginUser(req.body);

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res
      .status(200)
      .json({ message: "Welcome! Login Successful", success: true, user });
  } catch (error) {
    res.status(401).json({ message: "Oops! Login failed", success: false });
    console.log("Login failed", error);
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }
    const user = await UserService.getUser(userId);

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }
    res.status(200).json({
      message: "Welcome! Profile fetched successfully",
      success: true,
      user,
    });
  } catch (error) {
    const status = error.message === "User not found" ? 404 : 400;
    res.status(status).json({
      message: "Oops! Get profile failed",
      success: false,
      error: error.message,
    });
    console.log("Get profile failed", error);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?._id;
    const updatedUser = await UserService.updatedUser(userId, req.body);

    res.status(200).json({
      message: "Congrats! Profile updated successfully",
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Oops! Update profile failed",
      success: false,
    });
    console.log("Update profile failed", error);
  }
};

export const logoutProfile = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }
    await UserService.logoutProfile(userId);
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      path: "/",
    });
    res.status(200).json({
      message: "Logout successfully",
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Oops! Logout profile failed",
      success: false,
    });
    console.log("Logout profile failed", error);
  }
};
export const getOtherProfile = async (req, res) => {
  try {
    const user = await UserService.getOtherProfile(req.user._id);

    res.status(200).json({
      message: "Other user profile fetched successfully",
      success: true,
      user,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Oops! Get other profile failed",
      success: false,
    });
    console.log("Get other profile failed", error);
  }
};
