import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import generateToken from "../utilis/generateToken.util.js";

class UserService {
  // Register Service Logic
  async registerUser(body) {
    const { name, username, email, password, gender, language } = body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("User already exists. Please log in");
    }
    try {
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, salt);
     
      const user = await new User({
        name,
        username,
        email,
        password: hashPassword,
        gender,
        language: language || "en",
      });

      const savedUser = await user.save();
      const userObj = savedUser.toObject();
      delete userObj.password;
      return userObj;
    } catch (error) {
      console.error(error);
      throw new Error("Internal server error");
    }
  }

  // Login Service Logic
  async loginUser(body) {
    try {
      const { email, username, password } = body;

      // Build dynamic query: either email or username (or both)
      const query = {};
      if (email) query.email = email;
      if (username) query.username = username;

      if (!query.email && !query.username) {
        throw new Error("Email or username is required");
      }

      const existingUser = await User.findOne(query);

      if (!existingUser) {
        throw new Error("User not found");
      }

      const isMatch = await bcrypt.compare(password, existingUser.password);
      if (!isMatch) throw new Error("Invalid credentials");

      const token = generateToken(existingUser);

      const userObj = existingUser.toObject();
      delete userObj.password;

       return { user: userObj, token };
    } catch (error) {
      console.error(error);
      throw new Error("Internal server error");
    }
  }

  //Get User Profile
  async getUser(userId) {
    try {
      const existingUser = await User.findById(userId).select("-password");
      if (!existingUser) {
        throw new Error("User not found");
      }
      return existingUser;
    } catch (error) {
      console.error(error);
      throw new Error("Internal server error");
    }
  }

  //Update User Profile
  async updatedUser(userId, data) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");

      const { name, email, username, gender, avatar, password, language } = data;

      if (name) user.name = name;
      if (email) user.email = email;
      if (username) user.username = username;
      if (gender) user.gender = gender;
      if (avatar !== undefined) user.avatar = avatar;
      if (language) user.language = language;

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
      }

      await user.save();

      const userObj = user.toObject();
      delete userObj.password;

      return userObj;
    } catch (error) {
      console.error("Update user failed", error);
      throw error;
    }
  }


  async logoutProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return { message: "Logout successful" };
  }

  async getOtherProfile(userId){
    const otherUser = await User.find({_id: { $ne: userId}});
    return otherUser;
  }

}

export default new UserService();
