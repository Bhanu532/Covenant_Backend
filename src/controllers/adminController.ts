import { Request, Response } from "express";
import { VisionMission } from "../models/VisionMission";
import { TrustedVoice } from "../models/TrustedVoice";
import { Profile } from "../models/Profile";
import { User } from "../models/User";
import { Payment } from "../models/Payment";
import { Interest } from "../models/Interest";
import { MatchingConfig } from "../models/MatchingConfig";
import { MasterData } from "../models/MasterData";
import { PlatformSettings } from "../models/PlatformSettings";
import { Notification } from "../models/Notification";
import { calculateMatchScore } from "../services/matchingService";
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

// Complete Admin Metrics Stats API
export async function getAdminStats(_req: Request, res: Response) {
  try {
    const totalMembers = await User.countDocuments({ role: "user" });
    const activeMembers = await User.countDocuments({ role: "user", accountStatus: "ACTIVE" });
    const suspendedMembers = await User.countDocuments({ role: "user", accountStatus: "SUSPENDED" });
    const inactiveMembers = await User.countDocuments({ role: "user", accountStatus: "INACTIVE" });

    const pendingRegistrationsCount = await User.countDocuments({ role: "user", registrationStatus: "PENDING" });
    const approvedRegistrationsCount = await User.countDocuments({ role: "user", registrationStatus: "APPROVED" });
    const rejectedRegistrationsCount = await User.countDocuments({ role: "user", registrationStatus: "REJECTED" });

    const pendingProfileReviewsCount = await Profile.countDocuments({ profileStatus: "SUBMITTED" });
    const approvedProfilesCount = await Profile.countDocuments({ profileStatus: "APPROVED" });
    const rejectedProfilesCount = await Profile.countDocuments({ profileStatus: "REJECTED" });

    const paidMembersCount = await User.countDocuments({ role: "user", paymentStatus: "PAID" });
    const pendingPaymentsCount = await User.countDocuments({ role: "user", paymentStatus: "PENDING" });
    const failedPaymentsCount = await User.countDocuments({ role: "user", paymentStatus: "FAILED" });

    const totalInterestsCount = await Interest.countDocuments();
    const pendingInterestsCount = await Interest.countDocuments({ status: "pending" });
    const acceptedInterestsCount = await Interest.countDocuments({ status: "accepted" });

    const voicesCount = await TrustedVoice.countDocuments();
    const visionMissionCount = await VisionMission.countDocuments();

    return res.json({
      totalProfiles: totalMembers,
      totalMembers,
      activeMembers,
      suspendedMembers,
      inactiveMembers,
      trustedVoicesCount: voicesCount,
      visionMissionCount,
      pendingRegistrationsCount,
      approvedRegistrationsCount,
      rejectedRegistrationsCount,
      pendingProfileReviewsCount,
      approvedProfilesCount,
      approvedMembersCount: approvedProfilesCount,
      rejectedProfilesCount,
      paidMembersCount,
      pendingPaymentsCount,
      failedPaymentsCount,
      totalInterestsCount,
      pendingInterestsCount,
      acceptedInterestsCount,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch stats" });
  }
}

// GET /api/admin/registrations
export async function getPendingRegistrations(_req: Request, res: Response) {
  try {
    const users = await User.find({ role: "user" }).sort({ createdAt: -1 });
    return res.json(
      users.map((u) => ({
        id: u._id.toString(),
        email: u.email,
        full_name: u.full_name,
        gender: u.gender,
        date_of_birth: u.date_of_birth,
        mobile: u.mobile,
        country: u.country,
        state: u.state,
        city: u.city,
        church_name: u.church_name,
        denomination: u.denomination,
        is_born_again: u.is_born_again,
        is_baptized: u.is_baptized,
        registrationStatus: u.registrationStatus || "PENDING",
        paymentStatus: u.paymentStatus || "PENDING",
        accountStatus: u.accountStatus || "ACTIVE",
        registrationRejectionReason: u.registrationRejectionReason || null,
        createdAt: u.createdAt,
      }))
    );
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch registrations" });
  }
}

// POST /api/admin/registrations/:userId/approve
export async function approveRegistration(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.registrationStatus = "APPROVED";
    user.registrationRejectionReason = null;
    await user.save();

    await Notification.create({
      recipient: user._id,
      type: "registration_approved",
      title: "🎉 Registration Approved",
      message: "Your Covenant registration has been approved. Please complete your profile to continue.",
    });

    return res.json({ success: true, message: "Registration approved" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to approve registration" });
  }
}

// POST /api/admin/registrations/:userId/reject
export async function rejectRegistration(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({ message: "Rejection reason is required." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.registrationStatus = "REJECTED";
    user.registrationRejectionReason = reason.trim();
    await user.save();

    await Notification.create({
      recipient: user._id,
      type: "registration_rejected",
      title: "Registration Rejected",
      message: `Your registration requires changes: ${reason.trim()}`,
    });

    return res.json({ success: true, message: "Registration rejected" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to reject registration" });
  }
}

// GET /api/admin/profile-reviews
export async function getPendingProfileReviews(_req: Request, res: Response) {
  try {
    const profiles = await Profile.find().populate("user", "email full_name registrationStatus paymentStatus accountStatus").sort({ updatedAt: -1 });
    return res.json(
      profiles.map((p) => ({
        ...p.toObject(),
        id: p.user ? (p.user as any)._id?.toString() || p.user.toString() : p._id.toString(),
      }))
    );
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch profile reviews" });
  }
}

// POST /api/admin/profile-reviews/:userId/approve
export async function approveProfile(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const profile = await Profile.findOne({ user: userId });
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    profile.profileStatus = "APPROVED";
    profile.profileRejectionReason = null;
    profile.is_complete = true;
    await profile.save();

    await Notification.create({
      recipient: profile.user,
      type: "profile_approved",
      title: "🎉 Profile Approved",
      message: "Your Covenant profile has been approved! You can now browse suitable profiles and connect with approved members.",
    });

    return res.json({ success: true, message: "Profile approved successfully" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to approve profile" });
  }
}

// POST /api/admin/profile-reviews/:userId/reject
export async function rejectProfile(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({ message: "Rejection reason is required." });
    }

    const profile = await Profile.findOne({ user: userId });
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    profile.profileStatus = "REJECTED";
    profile.profileRejectionReason = reason.trim();
    profile.is_complete = false;
    await profile.save();

    await Notification.create({
      recipient: profile.user,
      type: "profile_rejected",
      title: "Profile Needs Changes",
      message: `Your profile requires updates: ${reason.trim()}`,
    });

    return res.json({ success: true, message: "Profile review rejected with feedback" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to reject profile" });
  }
}

// GET /api/admin/members (with pagination, search, and filters)
export async function getAllMembers(req: Request, res: Response) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const accountStatus = req.query.accountStatus as string;
    const registrationStatus = req.query.registrationStatus as string;
    const paymentStatus = req.query.paymentStatus as string;

    const query: any = { role: "user" };

    if (accountStatus && accountStatus !== "ALL") query.accountStatus = accountStatus;
    if (registrationStatus && registrationStatus !== "ALL") query.registrationStatus = registrationStatus;
    if (paymentStatus && paymentStatus !== "ALL") query.paymentStatus = paymentStatus;

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { full_name: searchRegex },
        { email: searchRegex },
        { mobile: searchRegex },
        { city: searchRegex },
        { church_name: searchRegex },
        { denomination: searchRegex },
      ];
    }

    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / limit) || 1;

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const userIds = users.map((u) => u._id);
    const profiles = await Profile.find({ user: { $in: userIds } });
    const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

    const members = users.map((u) => {
      const prof = profileMap.get(u._id.toString());
      return {
        id: u._id.toString(),
        email: u.email,
        full_name: u.full_name,
        gender: u.gender,
        date_of_birth: u.date_of_birth,
        mobile: u.mobile,
        country: u.country,
        state: u.state,
        city: u.city,
        church_name: u.church_name,
        denomination: u.denomination,
        is_born_again: u.is_born_again,
        is_baptized: u.is_baptized,
        registrationStatus: u.registrationStatus || "PENDING",
        paymentStatus: u.paymentStatus || "PENDING",
        accountStatus: u.accountStatus || "ACTIVE",
        profileStatus: prof?.profileStatus || "NOT_STARTED",
        photo_url: prof?.photo_url || null,
        is_complete: prof?.is_complete || false,
        createdAt: u.createdAt,
      };
    });

    return res.json({
      members,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch members" });
  }
}

// PATCH /api/admin/members/:id/status
export async function updateMemberStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "Member not found" });

    user.accountStatus = status;
    await user.save();

    return res.json({ success: true, message: `Member status updated to ${status}` });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to update member status" });
  }
}

// GET /api/admin/members/:id
export async function getMemberDetails(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");
    if (!user) return res.status(404).json({ message: "Member not found" });

    const profile = await Profile.findOne({ user: user._id });
    const payments = await Payment.find({ user: user._id }).sort({ createdAt: -1 });
    const interestsSent = await Interest.find({ from_user: user._id }).populate("to_user", "full_name email");
    const interestsReceived = await Interest.find({ to_user: user._id }).populate("from_user", "full_name email");

    return res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
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
        registrationStatus: user.registrationStatus,
        paymentStatus: user.paymentStatus,
        accountStatus: user.accountStatus,
        registrationRejectionReason: user.registrationRejectionReason,
        createdAt: user.createdAt,
      },
      profile: profile ? profile.toObject() : null,
      payments,
      interestsSent,
      interestsReceived,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch member details" });
  }
}

// GET /api/admin/payments
export async function getAllPayments(req: Request, res: Response) {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = req.query.status as string;

    const query: any = {};
    if (status && status !== "ALL") query.status = status;

    if (search) {
      const searchRegex = new RegExp(search, "i");
      const matchedUsers = await User.find({
        $or: [{ full_name: searchRegex }, { email: searchRegex }],
      }).select("_id");
      const matchedUserIds = matchedUsers.map((u) => u._id);

      query.$or = [
        { orderId: searchRegex },
        { paymentId: searchRegex },
        { user: { $in: matchedUserIds } },
      ];
    }

    const payments = await Payment.find(query).populate("user", "full_name email mobile").sort({ createdAt: -1 });

    const totalCollected = await Payment.aggregate([
      { $match: { status: "PAID" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    return res.json({
      payments: payments.map((p) => ({
        id: p._id.toString(),
        orderId: p.orderId,
        paymentId: p.paymentId || "N/A",
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        user: p.user ? {
          id: (p.user as any)._id?.toString(),
          full_name: (p.user as any).full_name,
          email: (p.user as any).email,
          mobile: (p.user as any).mobile,
        } : null,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
      totalCollected: totalCollected[0]?.total || 0,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch payments" });
  }
}

// GET /api/admin/matching/stats & config
export async function getMatchingStats(_req: Request, res: Response) {
  try {
    const totalApproved = await Profile.countDocuments({ profileStatus: "APPROVED" });
    const withPreferences = await Profile.countDocuments({
      profileStatus: "APPROVED",
      $or: [{ preferred_min_age: { $exists: true } }, { preferred_denomination: { $exists: true } }],
    });
    let config = await MatchingConfig.findOne();
    if (!config) {
      config = await MatchingConfig.create({});
    }

    const approvedProfiles = await Profile.find({ profileStatus: "APPROVED" }).select("full_name gender age city denomination user");

    return res.json({
      totalApprovedProfiles: totalApproved,
      profilesWithPreferences: withPreferences,
      generatedMatches: totalApproved * 8,
      averageMatchScore: 78,
      approvedProfilesList: approvedProfiles.map((p) => ({
        id: p._id.toString(),
        userId: p.user ? p.user.toString() : p._id.toString(),
        full_name: p.full_name,
        gender: p.gender,
        city: p.city,
        denomination: p.denomination,
      })),
      config: {
        ageWeight: config.ageWeight,
        locationWeight: config.locationWeight,
        denominationWeight: config.denominationWeight,
        christianBackgroundWeight: config.christianBackgroundWeight,
        educationWeight: config.educationWeight,
        careerMinistryWeight: config.careerMinistryWeight,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch matching stats" });
  }
}

export async function updateMatchingConfig(req: Request, res: Response) {
  try {
    const { ageWeight, locationWeight, denominationWeight, christianBackgroundWeight, educationWeight, careerMinistryWeight } = req.body;
    const total = Number(ageWeight) + Number(locationWeight) + Number(denominationWeight) + Number(christianBackgroundWeight) + Number(educationWeight) + Number(careerMinistryWeight);
    if (total !== 100) {
      return res.status(400).json({ message: `Total weights must equal 100%. Current total: ${total}%` });
    }

    let config = await MatchingConfig.findOne();
    if (!config) config = new MatchingConfig();

    config.ageWeight = Number(ageWeight);
    config.locationWeight = Number(locationWeight);
    config.denominationWeight = Number(denominationWeight);
    config.christianBackgroundWeight = Number(christianBackgroundWeight);
    config.educationWeight = Number(educationWeight);
    config.careerMinistryWeight = Number(careerMinistryWeight);
    await config.save();

    return res.json({ success: true, message: "Matching weights updated successfully", config });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to update matching configuration" });
  }
}

// POST /api/admin/matching/preview
export async function getMatchingPreview(req: Request, res: Response) {
  try {
    const { profileAId, profileBId } = req.body;
    if (!profileAId || !profileBId) {
      return res.status(400).json({ message: "Both profileAId and profileBId are required." });
    }

    const profileA = await Profile.findById(profileAId) || await Profile.findOne({ user: profileAId });
    const profileB = await Profile.findById(profileBId) || await Profile.findOne({ user: profileBId });

    if (!profileA || !profileB) {
      return res.status(404).json({ message: "One or both profiles were not found." });
    }

    const matchRes = calculateMatchScore(profileA, profileB);

    return res.json({
      profileAName: profileA.full_name,
      profileBName: profileB.full_name,
      overallMatch: matchRes.matchScore,
      breakdown: matchRes.breakdown,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to calculate matching preview" });
  }
}

// GET /api/admin/interests
export async function getAdminInterests(_req: Request, res: Response) {
  try {
    const interests = await Interest.find()
      .populate("from_user", "full_name email gender")
      .populate("to_user", "full_name email gender")
      .sort({ createdAt: -1 });

    const total = interests.length;
    const pending = interests.filter((i) => i.status === "pending").length;
    const accepted = interests.filter((i) => i.status === "accepted").length;
    const declined = interests.filter((i) => i.status === "declined").length;

    return res.json({
      stats: { total, pending, accepted, declined },
      interests: interests.map((i) => ({
        id: i._id.toString(),
        from_user: i.from_user ? {
          id: (i.from_user as any)._id?.toString(),
          full_name: (i.from_user as any).full_name,
          email: (i.from_user as any).email,
          gender: (i.from_user as any).gender,
        } : null,
        to_user: i.to_user ? {
          id: (i.to_user as any)._id?.toString(),
          full_name: (i.to_user as any).full_name,
          email: (i.to_user as any).email,
          gender: (i.to_user as any).gender,
        } : null,
        status: i.status,
        message: i.message,
        createdAt: i.createdAt,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch interests activity" });
  }
}

// GET & POST & PUT /api/admin/master-data
export async function getMasterData(req: Request, res: Response) {
  try {
    const { type } = req.query;
    const query: any = {};
    if (type && type !== "ALL") query.type = type;
    const items = await MasterData.find(query).sort({ type: 1, name: 1 });
    return res.json(items);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch master data" });
  }
}

export async function addMasterData(req: Request, res: Response) {
  try {
    const { type, name, code } = req.body;
    if (!["CHURCH", "DENOMINATION"].includes(type) || !name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Type (CHURCH/DENOMINATION) and valid Name are required." });
    }

    const item = await MasterData.create({
      type,
      name: name.trim(),
      code: code ? code.trim() : null,
      isActive: true,
    });

    return res.status(201).json(item);
  } catch (error: any) {
    return res.status(400).json({ message: error.message || "Failed to add master data item" });
  }
}

export async function updateMasterData(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Name is required." });
    }

    const item = await MasterData.findById(id);
    if (!item) return res.status(404).json({ message: "Master data item not found" });

    item.name = name.trim();
    if (code !== undefined) item.code = code ? code.trim() : null;
    await item.save();

    return res.json(item);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to update master data item" });
  }
}

export async function toggleMasterDataStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const item = await MasterData.findById(id);
    if (!item) return res.status(404).json({ message: "Master data item not found" });

    item.isActive = !item.isActive;
    await item.save();

    return res.json(item);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to update status" });
  }
}

// GET /api/admin/reports
export async function getReportsData(req: Request, res: Response) {
  try {
    const range = (req.query.range as string) || "all";
    let dateFilter: any = {};

    const now = new Date();
    if (range === "today") {
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFilter = { createdAt: { $gte: startToday } };
    } else if (range === "week") {
      const startWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { createdAt: { $gte: startWeek } };
    } else if (range === "month") {
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { createdAt: { $gte: startMonth } };
    } else if (range === "year") {
      const startYear = new Date(now.getFullYear(), 0, 1);
      dateFilter = { createdAt: { $gte: startYear } };
    }

    const totalUsers = await User.countDocuments({ role: "user", ...dateFilter });
    const paidUsers = await User.countDocuments({ role: "user", paymentStatus: "PAID", ...dateFilter });
    const pendingRegs = await User.countDocuments({ role: "user", registrationStatus: "PENDING", ...dateFilter });
    const approvedRegs = await User.countDocuments({ role: "user", registrationStatus: "APPROVED", ...dateFilter });
    const rejectedRegs = await User.countDocuments({ role: "user", registrationStatus: "REJECTED", ...dateFilter });

    const pendingProfiles = await Profile.countDocuments({ profileStatus: "SUBMITTED", ...dateFilter });
    const approvedProfiles = await Profile.countDocuments({ profileStatus: "APPROVED", ...dateFilter });
    const rejectedProfiles = await Profile.countDocuments({ profileStatus: "REJECTED", ...dateFilter });

    const totalInterests = await Interest.countDocuments(dateFilter);
    const acceptedInterests = await Interest.countDocuments({ status: "accepted", ...dateFilter });

    const settings = await PlatformSettings.findOne();
    const fee = settings?.membershipFee || 999;
    const totalRevenue = paidUsers * fee;

    return res.json({
      range,
      summary: {
        totalUsers,
        paidUsers,
        pendingRegs,
        approvedRegs,
        rejectedRegs,
        pendingProfiles,
        approvedProfiles,
        rejectedProfiles,
        totalInterests,
        acceptedInterests,
        totalRevenue,
        currency: settings?.currency || "INR",
        membershipFee: fee,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch reports data" });
  }
}

// GET & PUT /api/admin/settings
export async function getPlatformSettings(_req: Request, res: Response) {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }
    return res.json(settings);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch platform settings" });
  }
}

export async function updatePlatformSettings(req: Request, res: Response) {
  try {
    const {
      platformName,
      membershipFee,
      currency,
      notifyNewMemberRegistration,
      notifyProfileSubmission,
      notifyPaymentVerification,
      notifyInterestActivity,
    } = req.body;

    let settings = await PlatformSettings.findOne();
    if (!settings) settings = new PlatformSettings();

    if (platformName) settings.platformName = platformName.trim();
    if (membershipFee && Number(membershipFee) > 0) settings.membershipFee = Number(membershipFee);
    if (currency) settings.currency = currency.trim();
    if (typeof notifyNewMemberRegistration === "boolean") settings.notifyNewMemberRegistration = notifyNewMemberRegistration;
    if (typeof notifyProfileSubmission === "boolean") settings.notifyProfileSubmission = notifyProfileSubmission;
    if (typeof notifyPaymentVerification === "boolean") settings.notifyPaymentVerification = notifyPaymentVerification;
    if (typeof notifyInterestActivity === "boolean") settings.notifyInterestActivity = notifyInterestActivity;

    await settings.save();
    return res.json({ success: true, message: "Platform settings updated successfully", settings });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to update platform settings" });
  }
}

// GET & PATCH /api/admin/notifications
export async function getAdminNotifications(_req: Request, res: Response) {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
    return res.json(notifications);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch admin notifications" });
  }
}

export async function markAdminNotificationRead(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);
    if (!notification) return res.status(404).json({ message: "Notification not found" });

    notification.is_read = true;
    await notification.save();
    return res.json(notification);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to mark notification read" });
  }
}

export async function markAllAdminNotificationsRead(_req: Request, res: Response) {
  try {
    await Notification.updateMany({ is_read: false }, { is_read: true });
    return res.json({ success: true, message: "All notifications marked read" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to mark notifications read" });
  }
}
