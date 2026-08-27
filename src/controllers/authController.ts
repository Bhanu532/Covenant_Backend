import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { Profile } from "../models/Profile";
import { AuthRequest } from "../middleware/auth";
import { getJwtSecret } from "../config/auth";

// Helper function to build standard user DTO
async function buildUserDto(user: any) {
  const profile = await Profile.findOne({ user: user._id }).select("profileStatus profileRejectionReason");
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    full_name: user.full_name,
    gender: user.gender,
    date_of_birth: user.date_of_birth,
    mobile: user.mobile,
    country: user.country,
    state: user.state,
    city: user.city,
    church_name: user.church_name,
    denomination: user.denomination,
    is_born_again: user.is_born_again,
    is_baptized: user.is_baptized,
    registrationStatus: user.registrationStatus || "PENDING",
    paymentStatus: user.paymentStatus || "PENDING",
    accountStatus: user.accountStatus || "ACTIVE",
    registrationRejectionReason: user.registrationRejectionReason || null,
    profileStatus: profile?.profileStatus || "NOT_STARTED",
    profileRejectionReason: profile?.profileRejectionReason || null,
  };
}

// POST /api/auth/register
export async function register(req: Request, res: Response) {
  try {
    const {
      email,
      password,
      confirmPassword,
      full_name,
      gender,
      date_of_birth,
      mobile,
      country,
      state,
      city,
      church_name,
      denomination,
      is_born_again,
      is_baptized,
    } = req.body;

    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedName = typeof full_name === "string" ? full_name.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) return res.status(400).json({ message: "Enter a valid email address." });
    if (typeof password !== "string" || password.length < 8 || password.length > 128) return res.status(400).json({ message: "Password must be 8–128 characters." });
    if (confirmPassword && password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match." });
    if (normalizedName.length < 2 || normalizedName.length > 100) return res.status(400).json({ message: "Full name must be 2–100 characters." });
    if (!['male','female'].includes(gender)) return res.status(400).json({ message: "Gender must be male or female." });
    if (!date_of_birth) return res.status(400).json({ message: "Date of Birth is required." });
    if (!mobile || typeof mobile !== "string") return res.status(400).json({ message: "Mobile number is required." });
    if (!country || typeof country !== "string") return res.status(400).json({ message: "Country is required." });
    if (!state || typeof state !== "string") return res.status(400).json({ message: "State is required." });
    if (!city || typeof city !== "string") return res.status(400).json({ message: "City is required." });
    if (!church_name || typeof church_name !== "string" || !church_name.trim()) return res.status(400).json({ message: "Church Name is required." });
    if (!denomination || typeof denomination !== "string" || !denomination.trim()) return res.status(400).json({ message: "Denomination is required." });
    if (is_born_again === undefined || is_born_again === null) return res.status(400).json({ message: "Please specify if you are Born Again." });
    if (is_baptized === undefined || is_baptized === null) return res.status(400).json({ message: "Please specify if you are Baptized." });

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
      full_name: normalizedName,
      gender,
      date_of_birth,
      mobile: mobile.trim(),
      country: country.trim(),
      state: state.trim(),
      city: city.trim(),
      church_name: church_name.trim(),
      denomination: denomination.trim(),
      is_born_again: Boolean(is_born_again),
      is_baptized: Boolean(is_baptized),
      registrationStatus: "PENDING",
      paymentStatus: "PENDING",
      accountStatus: "ACTIVE",
    });

    await Profile.create({
      user: user._id,
      full_name: normalizedName,
      gender,
      date_of_birth,
      mobile: mobile.trim(),
      country: country.trim(),
      state: state.trim(),
      city: city.trim(),
      present_location: `${city.trim()}, ${state.trim()}, ${country.trim()}`,
      church_name: church_name.trim(),
      denomination: denomination.trim(),
      is_born_again: Boolean(is_born_again),
      is_baptized: Boolean(is_baptized),
      is_complete: false,
      profileStatus: "NOT_STARTED",
    });

    const secret = getJwtSecret();
    const token = jwt.sign({ userId: user._id }, secret, { expiresIn: "30d" });
    const userDto = await buildUserDto(user);

    return res.status(201).json({
      token,
      user: userDto,
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
    const userDto = await buildUserDto(user);

    return res.json({
      token,
      user: userDto,
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
        full_name: user.full_name || user.email.split("@")[0],
        gender: user.gender || "male",
        is_complete: false,
        profileStatus: "NOT_STARTED",
      });
    }

    const userDto = await buildUserDto(user);
    return res.json({
      user: userDto,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch current user" });
  }
}
