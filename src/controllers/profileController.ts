import { Response } from "express";
import { Profile } from "../models/Profile";
import { User } from "../models/User";
import { AuthRequest } from "../middleware/auth";
import { calculateMatchScore } from "../services/matchingService";

const WRITABLE = [
  "full_name",
  "gender",
  "date_of_birth",
  "denomination",
  "church_name",
  "occupation",
  "education",
  "city",
  "state",
  "country",
  "mobile",
  "is_born_again",
  "is_baptized",
  "height_cm",
  "marital_status",
  "bio",
  "looking_for",
  "photo_url",
  "photos",
  "is_complete",
  "profile_date",
  "born_again_date",
  "baptism_date",
  "baptism_church",
  "ministry_responsibility",
  "native_place",
  "present_location",
  "weight_kg",
  "education_history",
  "profession",
  "organization",
  "experience",
  "employment_type",
  "previous_organization",
  "born_again_testimony",
  "eu_egf_history",
  "church_history",
  "other_ministry",
  "spiritual_gifts",
  "spiritual_future_plans",
  "secular_future_plans",
  "partner_priorities",
  "preferred_min_age",
  "preferred_max_age",
  "preferred_location",
  "preferred_denomination",
  "preferred_education",
  "preferred_career",
  "preferred_ministry",
  "partner_expectations",
  "father_details",
  "mother_details",
  "parents_location",
  "siblings_details",
  "references",
  "health_details",
] as const;

const NARRATIVES = new Set([
  "bio",
  "looking_for",
  "born_again_testimony",
  "eu_egf_history",
  "church_history",
  "other_ministry",
  "spiritual_gifts",
  "spiritual_future_plans",
  "secular_future_plans",
  "partner_priorities",
  "partner_expectations",
  "father_details",
  "mother_details",
  "siblings_details",
  "health_details",
]);

function validateProfile(body: any) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Profile data must be an object.");
  const data: any = {};
  for (const key of WRITABLE) if (Object.prototype.hasOwnProperty.call(body, key)) data[key] = body[key];
  if (data.full_name !== undefined) {
    if (typeof data.full_name !== "string" || data.full_name.trim().length < 2 || data.full_name.trim().length > 100) {
      throw new Error("Full name must be 2–100 characters.");
    }
    data.full_name = data.full_name.trim();
  }
  if (data.gender !== undefined) {
    if (!['male','female'].includes(data.gender)) {
      throw new Error("Gender must be male or female.");
    }
  }
  for (const [key, value] of Object.entries(data)) if (typeof value === "string") { const max = NARRATIVES.has(key) ? 5000 : 200; if (value.length > max) throw new Error(`${key.replaceAll('_',' ')} cannot exceed ${max} characters.`); data[key] = value.trim() || null; }
  for (const key of ["date_of_birth","profile_date","born_again_date","baptism_date"]) if (data[key]) { if (!/^\d{4}-\d{2}-\d{2}$/.test(data[key]) || Number.isNaN(Date.parse(data[key]))) throw new Error(`${key.replaceAll('_',' ')} must be a valid date.`); if (new Date(data[key]) > new Date()) throw new Error(`${key.replaceAll('_',' ')} cannot be in the future.`); }
  if (data.date_of_birth) { const age = (Date.now() - Date.parse(data.date_of_birth)) / 31557600000; if (age < 18 || age > 100) throw new Error("Age must be between 18 and 100."); }
  if (data.height_cm != null && (!Number.isFinite(data.height_cm) || data.height_cm < 100 || data.height_cm > 250)) throw new Error("Height must be between 100 and 250 cm.");
  if (data.weight_kg != null && (!Number.isFinite(data.weight_kg) || data.weight_kg < 30 || data.weight_kg > 300)) throw new Error("Weight must be between 30 and 300 kg.");
  if (data.marital_status != null && !['never_married','widowed','divorced'].includes(data.marital_status)) throw new Error("Invalid marital status.");
  if (data.employment_type != null && !["Full Time","Part Time","Self Employed","Business","Unemployed","Other","full_time","part_time","self_employed","business","unemployed","other"].includes(data.employment_type)) throw new Error("Invalid employment type.");
  if (data.education_history != null) { if (!Array.isArray(data.education_history) || data.education_history.length > 20) throw new Error("Education history cannot exceed 20 entries."); data.education_history = data.education_history.map((entry:any, i:number) => { if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).some(k => !['course','institution','city','passing_year'].includes(k))) throw new Error(`Education entry ${i + 1} is invalid.`); const clean:any = {}; for (const key of ['course','institution','city','passing_year']) { if (typeof entry[key] !== 'string' || entry[key].trim().length > 200) throw new Error(`Education entry ${i + 1} has an invalid ${key}.`); clean[key] = entry[key].trim(); } if (clean.passing_year && (!/^\d{4}$/.test(clean.passing_year) || +clean.passing_year < 1940 || +clean.passing_year > new Date().getFullYear() + 10)) throw new Error(`Education entry ${i + 1} has an invalid passing year.`); return clean; }); }
  if (data.references != null) { if (!Array.isArray(data.references) || data.references.length > 10) throw new Error("References cannot exceed 10 entries."); data.references = data.references.map((entry:any, i:number) => { if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).some(k => !['name','place','ministry_association','acquaintance','contact'].includes(k))) throw new Error(`Reference ${i + 1} is invalid.`); const clean:any = {}; for (const key of ['name','place','ministry_association','acquaintance','contact']) { if (typeof entry[key] !== 'string' || entry[key].trim().length > 200) throw new Error(`Reference ${i + 1} has an invalid ${key}.`); clean[key] = entry[key].trim(); } if (clean.contact && !/^[+\d][\d\s()+-]{5,30}$/.test(clean.contact)) throw new Error(`Reference ${i + 1} has an invalid contact.`); return clean; }); }
  if (data.photos != null) { if (!Array.isArray(data.photos) || data.photos.length > 8) throw new Error("You can add up to 8 photos."); if (data.photos.filter((p:any) => p?.isPrimary).length > 1) throw new Error("Only one photo may be primary."); let total = 0; data.photos = data.photos.map((p:any,i:number) => { if (!p || typeof p !== 'object' || Array.isArray(p) || Object.keys(p).some(k => !['id','url','isPrimary','order','createdAt','_id'].includes(k)) || typeof p.id !== 'string' || typeof p.url !== 'string' || typeof p.isPrimary !== 'boolean' || !Number.isSafeInteger(p.order) || p.order < 0 || typeof p.createdAt !== 'string' || Number.isNaN(Date.parse(p.createdAt))) throw new Error(`Photo ${i + 1} is invalid.`); const match = p.url.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/); if (!match) throw new Error(`Photo ${i + 1} must be JPEG, PNG, or WEBP.`); const bytes = Buffer.from(match[2], 'base64'); if (bytes.length > 5 * 1024 * 1024) throw new Error(`Photo ${i + 1} exceeds 5 MB.`); const magic = (match[1] === 'png' && bytes[0] === 0x89 && bytes[1] === 0x50) || (match[1] === 'jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8) || (match[1] === 'webp' && bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP'); if (!magic) throw new Error(`Photo ${i + 1} content is invalid.`); total += bytes.length; return { id:p.id, url:p.url, isPrimary:p.isPrimary, order:p.order, createdAt:p.createdAt }; }); if (total > 9 * 1024 * 1024) throw new Error("Profile photos exceed the 9 MB total limit."); }
  return data;
}

// GET /api/profiles (Browse Profiles - ONLY VALID PROFILES)
export async function getProfiles(req: AuthRequest, res: Response) {
  try {
    // Check requesting user's status first!
    const reqUser = await User.findById(req.userId);
    if (!reqUser || reqUser.paymentStatus !== "PAID" || reqUser.registrationStatus !== "APPROVED" || reqUser.accountStatus !== "ACTIVE") {
      return res.status(403).json({ message: "Your account is not approved to browse profiles." });
    }

    const reqProfile = await Profile.findOne({ user: req.userId });
    if (!reqProfile || reqProfile.profileStatus !== "APPROVED") {
      return res.status(403).json({ message: "Your profile must be approved before browsing." });
    }

    // Find all valid users (PAID + APPROVED + ACTIVE)
    const validUsers = await User.find({
      paymentStatus: "PAID",
      registrationStatus: "APPROVED",
      accountStatus: "ACTIVE",
      _id: { $ne: req.userId },
    }).select("_id");

    const validUserIds = validUsers.map((u) => u._id);

    // Filter profiles where profileStatus == APPROVED and user in validUserIds
    const profiles = await Profile.find({
      user: { $in: validUserIds },
      profileStatus: "APPROVED",
    }).select(
      [
        "user",
        "full_name",
        "gender",
        "date_of_birth",
        "denomination",
        "church_name",
        "occupation",
        "education",
        "city",
        "state",
        "country",
        "present_location",
        "ministry_responsibility",
        "born_again_date",
        "photo_url",
        "is_complete",
        "profileStatus",
        "preferred_min_age",
        "preferred_max_age",
        "preferred_location",
        "preferred_denomination",
      ].join(" "),
    );

    const formatted = profiles.map((p) => {
      const matchData = calculateMatchScore(reqProfile, p);
      return {
        ...p.toObject(),
        id: p.user.toString(),
        matchScore: matchData.matchScore,
      };
    });

    return res.json(formatted);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch profiles" });
  }
}

// GET /api/profiles/recommended
export async function getRecommendedProfiles(req: AuthRequest, res: Response) {
  try {
    const reqUser = await User.findById(req.userId);
    if (!reqUser || reqUser.paymentStatus !== "PAID" || reqUser.registrationStatus !== "APPROVED" || reqUser.accountStatus !== "ACTIVE") {
      return res.status(403).json({ message: "Your account is not approved to view recommended profiles." });
    }

    const reqProfile = await Profile.findOne({ user: req.userId });
    if (!reqProfile || reqProfile.profileStatus !== "APPROVED") {
      return res.status(403).json({ message: "Your profile must be approved before viewing recommendations." });
    }

    const validUsers = await User.find({
      paymentStatus: "PAID",
      registrationStatus: "APPROVED",
      accountStatus: "ACTIVE",
      _id: { $ne: req.userId },
    }).select("_id");

    const validUserIds = validUsers.map((u) => u._id);

    // Opposite gender filter for matrimony recommendations
    const oppositeGender = reqProfile.gender === "male" ? "female" : "male";

    const profiles = await Profile.find({
      user: { $in: validUserIds },
      profileStatus: "APPROVED",
      gender: oppositeGender,
    });

    const matches = profiles.map((p) => {
      const matchResult = calculateMatchScore(reqProfile, p);
      return {
        id: p.user.toString(),
        user: p.user.toString(),
        full_name: p.full_name,
        gender: p.gender,
        date_of_birth: p.date_of_birth,
        denomination: p.denomination,
        church_name: p.church_name,
        occupation: p.occupation || p.profession,
        education: p.education,
        city: p.city,
        state: p.state,
        country: p.country,
        present_location: p.present_location,
        photo_url: p.photo_url,
        matchScore: matchResult.matchScore,
        breakdown: matchResult.breakdown,
      };
    });

    matches.sort((a, b) => b.matchScore - a.matchScore);

    return res.json(matches);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch recommended profiles" });
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

    // Hide sensitive reference & health details when viewing other profiles
    const obj: any = profile.toObject();
    if (req.userId?.toString() !== req.params.id) {
      delete obj.references;
      delete obj.health_details;
    }

    return res.json({ ...obj, id: profile.user.toString() });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch profile" });
  }
}

// PUT /api/profiles/me
export async function updateMyProfile(req: AuthRequest, res: Response) {
  try {
    const updates = validateProfile(req.body);
    const action = req.body.action; // "save_draft" or "submit_profile"

    let profile = await Profile.findOne({ user: req.userId });
    if (!profile) {
      profile = new Profile({ user: req.userId, ...updates });
    } else {
      Object.assign(profile, updates);
    }

    if (profile.photos && profile.photos.length > 0) {
      const primaryPhoto = profile.photos.find((p) => p.isPrimary) || profile.photos[0];
      profile.photo_url = primaryPhoto.url;
    }

    if (action === "submit_profile") {
      profile.profileStatus = "SUBMITTED";
      profile.profileRejectionReason = null;
    } else if (action === "save_draft" || !profile.profileStatus || profile.profileStatus === "NOT_STARTED") {
      if (profile.profileStatus !== "SUBMITTED" && profile.profileStatus !== "APPROVED") {
        profile.profileStatus = "DRAFT";
      }
    }

    await profile.save();
    return res.json({ ...profile.toObject(), id: profile.user.toString() });
  } catch (error: any) {
    return res.status(error?.name === "ValidationError" ? 400 : 400).json({ message: error.message || "Failed to save profile" });
  }
}
