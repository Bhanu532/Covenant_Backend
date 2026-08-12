import { Response } from "express";
import { Profile } from "../models/Profile";
import { AuthRequest } from "../middleware/auth";

// GET /api/profiles
export async function getProfiles(req: AuthRequest, res: Response) {
  try {
    const profiles = await Profile.find();
    const formatted = profiles.map((p) => ({
      ...p.toObject(),
      id: p.user.toString(),
    }));
    return res.json(formatted);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch profiles" });
  }
}

// GET /api/profiles/me
export async function getMyProfile(req: AuthRequest, res: Response) {
  try {
    const profile = await Profile.findOne({ user: req.userId });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    return res.json({ ...profile.toObject(), id: profile.user.toString() });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch profile" });
  }
}

// GET /api/profiles/:id
export async function getProfileById(req: AuthRequest, res: Response) {
  try {
    const profile = await Profile.findOne({ user: req.params.id });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    return res.json({ ...profile.toObject(), id: profile.user.toString() });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch profile" });
  }
}

// PUT /api/profiles/me
export async function updateMyProfile(req: AuthRequest, res: Response) {
  try {
    let profile = await Profile.findOne({ user: req.userId });
    if (!profile) {
      profile = new Profile({ user: req.userId, ...req.body });
    } else {
      Object.assign(profile, req.body);
    }

    if (profile.photos && profile.photos.length > 0) {
      const primaryPhoto = profile.photos.find((p) => p.isPrimary) || profile.photos[0];
      profile.photo_url = primaryPhoto.url;
    }

    await profile.save();
    return res.json({ ...profile.toObject(), id: profile.user.toString() });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to save profile" });
  }
}
