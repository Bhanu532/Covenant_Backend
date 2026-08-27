import mongoose, { Schema, Document } from "mongoose";

export interface IEducationEntry {
  course: string;
  institution: string;
  city: string;
  passing_year: string;
}

export interface IReferenceEntry {
  name: string;
  place: string;
  ministry_association: string;
  acquaintance: string;
  contact: string;
}

export interface IProfilePhoto {
  id: string;
  url: string;
  isPrimary: boolean;
  order: number;
  createdAt: string;
}

export interface IProfile extends Document {
  user: mongoose.Types.ObjectId;
  full_name: string;
  gender: "male" | "female";
  date_of_birth: string | null;
  denomination: string | null;
  church_name: string | null;
  occupation: string | null;
  education: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  mobile: string | null;
  is_born_again: boolean;
  is_baptized: boolean;
  height_cm: number | null;
  marital_status: "never_married" | "widowed" | "divorced" | null;
  bio: string | null;
  looking_for: string | null;
  photo_url: string | null;
  photos: IProfilePhoto[];
  is_complete: boolean;
  profileStatus: "NOT_STARTED" | "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  profileRejectionReason: string | null;
  profile_date: string | null;
  born_again_date: string | null;
  baptism_date: string | null;
  baptism_church: string | null;
  ministry_responsibility: string | null;
  native_place: string | null;
  present_location: string | null;
  weight_kg: number | null;
  education_history: IEducationEntry[];
  profession: string | null;
  organization: string | null;
  experience: string | null;
  employment_type: string | null;
  previous_organization: string | null;
  born_again_testimony: string | null;
  eu_egf_history: string | null;
  church_history: string | null;
  other_ministry: string | null;
  spiritual_gifts: string | null;
  spiritual_future_plans: string | null;
  secular_future_plans: string | null;
  partner_priorities: string | null;
  preferred_min_age: number | null;
  preferred_max_age: number | null;
  preferred_location: string | null;
  preferred_denomination: string | null;
  preferred_education: string | null;
  preferred_career: string | null;
  preferred_ministry: string | null;
  partner_expectations: string | null;
  father_details: string | null;
  mother_details: string | null;
  parents_location: string | null;
  siblings_details: string | null;
  references: IReferenceEntry[];
  health_details: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileSchema = new Schema<IProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    full_name: { type: String, required: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    date_of_birth: { type: String, default: null },
    denomination: { type: String, default: null },
    church_name: { type: String, default: null },
    occupation: { type: String, default: null },
    education: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    country: { type: String, default: null },
    mobile: { type: String, default: null },
    is_born_again: { type: Boolean, default: false },
    is_baptized: { type: Boolean, default: false },
    height_cm: { type: Number, default: null },
    marital_status: { type: String, enum: ["never_married", "widowed", "divorced"], default: null },
    bio: { type: String, default: null },
    looking_for: { type: String, default: null },
    photo_url: { type: String, default: null },
    photos: [
      {
        id: { type: String, required: true },
        url: { type: String, required: true },
        isPrimary: { type: Boolean, default: false },
        order: { type: Number, default: 0 },
        createdAt: { type: String, default: () => new Date().toISOString() },
      },
    ],
    is_complete: { type: Boolean, default: false },
    profileStatus: { type: String, enum: ["NOT_STARTED", "DRAFT", "SUBMITTED", "APPROVED", "REJECTED"], default: "NOT_STARTED" },
    profileRejectionReason: { type: String, default: null },
    profile_date: { type: String, default: null },
    born_again_date: { type: String, default: null },
    baptism_date: { type: String, default: null },
    baptism_church: { type: String, default: null },
    ministry_responsibility: { type: String, default: null },
    native_place: { type: String, default: null },
    present_location: { type: String, default: null },
    weight_kg: { type: Number, default: null },
    education_history: [
      {
        course: { type: String, default: "" },
        institution: { type: String, default: "" },
        city: { type: String, default: "" },
        passing_year: { type: String, default: "" },
      },
    ],
    profession: { type: String, default: null },
    organization: { type: String, default: null },
    experience: { type: String, default: null },
    employment_type: { type: String, default: null },
    previous_organization: { type: String, default: null },
    born_again_testimony: { type: String, default: null },
    eu_egf_history: { type: String, default: null },
    church_history: { type: String, default: null },
    other_ministry: { type: String, default: null },
    spiritual_gifts: { type: String, default: null },
    spiritual_future_plans: { type: String, default: null },
    secular_future_plans: { type: String, default: null },
    partner_priorities: { type: String, default: null },
    preferred_min_age: { type: Number, default: null },
    preferred_max_age: { type: Number, default: null },
    preferred_location: { type: String, default: null },
    preferred_denomination: { type: String, default: null },
    preferred_education: { type: String, default: null },
    preferred_career: { type: String, default: null },
    preferred_ministry: { type: String, default: null },
    partner_expectations: { type: String, default: null },
    father_details: { type: String, default: null },
    mother_details: { type: String, default: null },
    parents_location: { type: String, default: null },
    siblings_details: { type: String, default: null },
    references: [
      {
        name: { type: String, default: "" },
        place: { type: String, default: "" },
        ministry_association: { type: String, default: "" },
        acquaintance: { type: String, default: "" },
        contact: { type: String, default: "" },
      },
    ],
    health_details: { type: String, default: null },
  },
  { timestamps: true }
);

export const Profile = mongoose.model<IProfile>("Profile", ProfileSchema);
