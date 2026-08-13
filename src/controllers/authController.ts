import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { Profile } from "../models/Profile";
import { AuthRequest } from "../middleware/auth";
import { getJwtSecret } from "../config/auth";

// POST /api/auth/register
export async function register(req: Request, res: Response) {
  try {
    const { email, password, full_name, gender } = req.body;

    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedName = typeof full_name === "string" ? full_name.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) return res.status(400).json({ message: "Enter a valid email address." });
    if (typeof password !== "string" || password.length < 8 || password.length > 128) return res.status(400).json({ message: "Password must be 8–128 characters." });
    if (normalizedName.length < 2 || normalizedName.length > 100) return res.status(400).json({ message: "Full name must be 2–100 characters." });
    if (!['male','female'].includes(gender)) return res.status(400).json({ message: "Gender must be male or female." });

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
    });

    await Profile.create({
      user: user._id,
      full_name: normalizedName,
      gender,
      is_complete: false,
    });

    const secret = getJwtSecret();
    const token = jwt.sign({ userId: user._id }, secret, { expiresIn: "30d" });

    return res.status(201).json({
      token,
      user: { id: user._id.toString(), email: user.email, role: user.role },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Registration failed" });
  }
}

// POST /api/auth/login
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password || email.length > 254 || password.length > 128) {
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

    const secret = getJwtSecret();
    const token = jwt.sign({ userId: user._id }, secret, { expiresIn: "30d" });

    return res.json({
      token,
      user: { id: user._id.toString(), email: user.email, role: user.role },
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

    const profileExists = await Profile.exists({ user: user._id });
    if (!profileExists) {
      await Profile.create({
        user: user._id,
        full_name: user.email.split("@")[0],
        gender: "male",
        is_complete: false,
      });
    }

    return res.json({
      user: { id: user._id.toString(), email: user.email, role: user.role },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch current user" });
  }
}
