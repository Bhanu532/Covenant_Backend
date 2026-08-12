import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { Profile } from "../models/Profile";
import { AuthRequest } from "../middleware/auth";

// POST /api/auth/register
export async function register(req: Request, res: Response) {
  try {
    const { email, password, full_name, gender } = req.body;

    if (!email || !password || !full_name || !gender) {
      return res.status(400).json({ message: "Email, password, full name, and gender are required" });
    }

    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.trim().toLowerCase(),
      password: hashedPassword,
    });

    const profile = await Profile.create({
      user: user._id,
      full_name,
      gender,
      is_complete: false,
    });

    const secret = process.env.JWT_SECRET || "matrimony_secret";
    const token = jwt.sign({ userId: user._id }, secret, { expiresIn: "30d" });

    return res.status(201).json({
      token,
      user: { id: user._id.toString(), email: user.email },
      profile,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Registration failed" });
  }
}

// POST /api/auth/login
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const profile = await Profile.findOne({ user: user._id });

    const secret = process.env.JWT_SECRET || "matrimony_secret";
    const token = jwt.sign({ userId: user._id }, secret, { expiresIn: "30d" });

    return res.json({
      token,
      user: { id: user._id.toString(), email: user.email },
      profile,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Login failed" });
  }
}

// GET /api/auth/me
export async function getMe(req: AuthRequest, res: Response) {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let profile = await Profile.findOne({ user: user._id });
    if (!profile) {
      profile = await Profile.create({
        user: user._id,
        full_name: user.email.split("@")[0],
        gender: "male",
        is_complete: false,
      });
    }

    return res.json({
      user: { id: user._id.toString(), email: user.email },
      profile,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch current user" });
  }
}
