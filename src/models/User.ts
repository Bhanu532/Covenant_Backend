import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password?: string;
  role: "user" | "admin";
  registrationStatus: "PENDING" | "APPROVED" | "REJECTED";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  accountStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  full_name?: string;
  gender?: "male" | "female";
  date_of_birth?: string;
  mobile?: string;
  country?: string;
  state?: string;
  city?: string;
  church_name?: string;
  denomination?: string;
  is_born_again?: boolean;
  is_baptized?: boolean;
  registrationRejectionReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    registrationStatus: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
    paymentStatus: { type: String, enum: ["PENDING", "PAID", "FAILED", "REFUNDED"], default: "PENDING" },
    accountStatus: { type: String, enum: ["ACTIVE", "INACTIVE", "SUSPENDED"], default: "ACTIVE" },
    full_name: { type: String, default: null },
    gender: { type: String, enum: ["male", "female"], default: null },
    date_of_birth: { type: String, default: null },
    mobile: { type: String, default: null },
    country: { type: String, default: null },
    state: { type: String, default: null },
    city: { type: String, default: null },
    church_name: { type: String, default: null },
    denomination: { type: String, default: null },
    is_born_again: { type: Boolean, default: false },
    is_baptized: { type: Boolean, default: false },
    registrationRejectionReason: { type: String, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);
