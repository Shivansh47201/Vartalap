import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import connectDb from "../config/db.js";
import User from "../models/user.model.js";

dotenv.config();

const demoUsers = [
  {
    name: "Ananya Sharma",
    username: "ananya99",
    email: "ananya@example.com",
    gender: "female",
    avatar: "https://api.dicebear.com/6.x/avataaars/svg?seed=Ananya%20Sharma",
  },
  {
    name: "Rohan Verma",
    username: "RohanV",
    email: "rohan@example.com",
    gender: "male",
    avatar: "https://api.dicebear.com/6.x/avataaars/svg?seed=Rohan%20Verma",
  },
  {
    name: "Pooja Singh",
    username: "PoojaS",
    email: "pooja@example.com",
    gender: "female",
    avatar: "https://api.dicebear.com/6.x/avataaars/svg?seed=Pooja%20Singh",
  },
  {
    name: "Amit Kumar",
    username: "AmitK",
    email: "amit@example.com",
    gender: "male",
    avatar: "https://api.dicebear.com/6.x/avataaars/svg?seed=Amit%20Kumar",
  },
  {
    name: "Sneha Reddy",
    username: "SnehaR",
    email: "sneha@example.com",
    gender: "female",
    avatar: "https://api.dicebear.com/6.x/avataaars/svg?seed=Sneha%20Reddy",
  },
  {
    name: "Vikram Joshi",
    username: "VikramJ",
    email: "vikram@example.com",
    gender: "male",
    avatar: "https://api.dicebear.com/6.x/avataaars/svg?seed=Vikram%20Joshi",
  },
  {
    name: "Priya Mehta",
    username: "PriyaM",
    email: "priya@example.com",
    gender: "female",
    avatar: "https://api.dicebear.com/6.x/avataaars/svg?seed=Priya%20Mehta",
  },
  {
    name: "Arjun Thakur",
    username: "ArjunT",
    email: "arjun@example.com",
    gender: "male",
    avatar: "https://api.dicebear.com/6.x/avataaars/svg?seed=Arjun%20Thakur",
  },
];

const DEFAULT_PASSWORD = "Password123!";

const seedUsers = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI not found in environment variables");
    }

    await connectDb(uri);

    for (const user of demoUsers) {
      const existingUser = await User.findOne({
        $or: [{ email: user.email }, { username: user.username }],
      });

      if (existingUser) {
        console.log(`Skipping ${user.username} – already exists.`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      await User.create({
        ...user,
        password: hashedPassword,
      });

      console.log(`Created user ${user.username} with default password.`);
    }

    console.log("Seeding complete ✔");
  } catch (error) {
    console.error("Failed to seed users:", error.message);
  } finally {
    await mongoose.connection.close();
  }
};

seedUsers();
