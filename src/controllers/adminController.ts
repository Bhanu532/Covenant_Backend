import { Request, Response } from "express";
import { VisionMission } from "../models/VisionMission";
import { TrustedVoice } from "../models/TrustedVoice";
import { Profile } from "../models/Profile";
import mongoose from "mongoose";
import { optionalText, requiredText, validatePhotoDataUrl } from "../utils/validation";

function trustedVoiceDto(v: any) {
  return { id: v._id.toString(), name: v.name, title: v.title, organization: v.organization, photoUrl: v.photoUrl, quote: v.quote, bio: v.bio || "", displayOrder: v.displayOrder, isPublished: v.isPublished, consentConfirmed: v.consentConfirmed, createdAt: v.createdAt, updatedAt: v.updatedAt };
}
function publicTrustedVoiceDto(v: any) {
  return { id: v._id.toString(), name: v.name, title: v.title, organization: v.organization, photoUrl: v.photoUrl, quote: v.quote, bio: v.bio || "", displayOrder: v.displayOrder, createdAt: v.createdAt, updatedAt: v.updatedAt };
}

function trustedVoiceInput(body: any, existingPhoto?: string) {
  const consentConfirmed = body.consentConfirmed === true;
  const isPublished = body.isPublished === true;
  if (isPublished && !consentConfirmed) throw new Error("Consent must be confirmed before publishing.");
  const displayOrder = Number(body.displayOrder);
  if (!Number.isSafeInteger(displayOrder) || displayOrder < 1 || displayOrder > 10000) throw new Error("Display order must be a positive integer.");
  return {
    name: requiredText(body.name, "Full name", 100),
    title: requiredText(body.title, "Title / role", 150),
    organization: requiredText(body.organization, "Church / organization", 200),
    photoUrl: body.photoUrl === existingPhoto ? existingPhoto : validatePhotoDataUrl(body.photoUrl),
    quote: requiredText(body.quote, "Quote", 500),
    bio: optionalText(body.bio, "Bio", 500), displayOrder, isPublished, consentConfirmed,
  };
}

function validateTrustedVoiceForPublish(voice: any) {
  if (voice.consentConfirmed !== true) throw new Error("Consent must be confirmed before publishing.");
  requiredText(voice.name, "Full name", 100);
  requiredText(voice.title, "Title / role", 150);
  requiredText(voice.organization, "Church / organization", 200);
  requiredText(voice.quote, "Quote", 500);
  validatePhotoDataUrl(voice.photoUrl);
  if (!Number.isSafeInteger(voice.displayOrder) || voice.displayOrder < 1 || voice.displayOrder > 10000) throw new Error("Display order must be a positive integer.");
}

export async function getVisionMission(_req: Request, res: Response) {
  try {
    const vm = await VisionMission.findOne();
    if (!vm) return res.json(null);
    return res.json({
      id: vm._id.toString(),
      visionText: vm.visionText,
      visionVerses: vm.visionVerses,
      missionText: vm.missionText,
      missionVerses: vm.missionVerses,
      updatedAt: vm.updatedAt,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch vision & mission" });
  }
}

export async function updateVisionMission(req: Request, res: Response) {
  try {
    const { visionText, visionVerses, missionText, missionVerses } = req.body;
    if (
      typeof visionText !== "string" ||
      typeof missionText !== "string" ||
      !Array.isArray(visionVerses) ||
      !Array.isArray(missionVerses) ||
      !visionVerses.every((verse) => typeof verse === "string") ||
      !missionVerses.every((verse) => typeof verse === "string")
    ) {
      return res.status(400).json({ message: "Statements must be text and verses must be text lists" });
    }

    const normalized = {
      visionText: visionText.trim(),
      visionVerses: visionVerses.map((verse) => verse.trim()).filter(Boolean),
      missionText: missionText.trim(),
      missionVerses: missionVerses.map((verse) => verse.trim()).filter(Boolean),
    };
    if (normalized.visionText.length > 3000 || normalized.missionText.length > 3000) return res.status(400).json({ message: "Vision and mission statements cannot exceed 3000 characters." });
    if (normalized.visionVerses.length > 20 || normalized.missionVerses.length > 20 || [...normalized.visionVerses, ...normalized.missionVerses].some((verse) => verse.length > 100)) return res.status(400).json({ message: "Use at most 20 verse references per statement and 100 characters per reference." });

    if (!normalized.visionText && !normalized.missionText) {
      await VisionMission.deleteMany({});
      return res.json(null);
    }

    let vm = await VisionMission.findOne();

    if (!vm) {
      vm = new VisionMission();
    }

    vm.visionText = normalized.visionText;
    vm.visionVerses = normalized.visionVerses;
    vm.missionText = normalized.missionText;
    vm.missionVerses = normalized.missionVerses;
    await vm.save();

    return res.json({
      id: vm._id.toString(),
      visionText: vm.visionText,
      visionVerses: vm.visionVerses,
      missionText: vm.missionText,
      missionVerses: vm.missionVerses,
      updatedAt: vm.updatedAt,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to update vision & mission" });
  }
}

export async function getTrustedVoices(_req: Request, res: Response) {
  try {
    const voices = await TrustedVoice.find().sort({ displayOrder: 1, createdAt: 1 });
    return res.json(voices.map(trustedVoiceDto));
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch trusted voices" });
  }
}

export async function addTrustedVoice(req: Request, res: Response) {
  try {
    const voice = await TrustedVoice.create(trustedVoiceInput(req.body));
    return res.status(201).json(trustedVoiceDto(voice));
  } catch (error: any) {
    return res.status(400).json({ message: error.message || "Failed to add trusted voice" });
  }
}

export async function getTrustedVoice(req: Request, res: Response) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid trusted voice ID." });
  const voice = await TrustedVoice.findById(req.params.id);
  return voice ? res.json(trustedVoiceDto(voice)) : res.status(404).json({ message: "Trusted voice not found." });
}

export async function updateTrustedVoice(req: Request, res: Response) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid trusted voice ID." });
    const voice = await TrustedVoice.findById(req.params.id);
    if (!voice) return res.status(404).json({ message: "Trusted voice not found." });
    Object.assign(voice, trustedVoiceInput(req.body, voice.photoUrl));
    await voice.save();
    return res.json(trustedVoiceDto(voice));
  } catch (error: any) { return res.status(400).json({ message: error.message }); }
}

export async function updateTrustedVoiceStatus(req: Request, res: Response) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid trusted voice ID." });
    if (typeof req.body.isPublished !== "boolean") return res.status(400).json({ message: "Published status must be true or false." });
    const voice = await TrustedVoice.findById(req.params.id);
    if (!voice) return res.status(404).json({ message: "Trusted voice not found." });
    if (req.body.isPublished) validateTrustedVoiceForPublish(voice);
    voice.isPublished = req.body.isPublished; await voice.save();
    return res.json(trustedVoiceDto(voice));
  } catch (error: any) {
    return res.status(400).json({ message: `Cannot publish trusted voice: ${error.message}` });
  }
}

export async function getPublicTrustedVoices(_req: Request, res: Response) {
  const voices = await TrustedVoice.find({ isPublished: true, consentConfirmed: true }).sort({ displayOrder: 1, createdAt: 1 });
  return res.json(voices.filter((voice) => { try { validateTrustedVoiceForPublish(voice); return true; } catch { return false; } }).map(publicTrustedVoiceDto));
}

export async function deleteTrustedVoice(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid trusted voice ID." });
    const deleted = await TrustedVoice.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Trusted voice not found." });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to delete trusted voice" });
  }
}

export async function getAdminStats(_req: Request, res: Response) {
  try {
    const totalProfilesCount = await Profile.countDocuments();
    const voicesCount = await TrustedVoice.countDocuments();
    const visionMissionCount = await VisionMission.countDocuments();

    return res.json({
      totalProfiles: totalProfilesCount,
      trustedVoicesCount: voicesCount,
      visionMissionCount,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch stats" });
  }
}
