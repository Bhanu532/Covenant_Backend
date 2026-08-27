import mongoose, { Schema, Document } from "mongoose";

export interface IPlatformSettings extends Document {
  platformName: string;
  membershipFee: number;
  currency: string;
  notifyNewMemberRegistration: boolean;
  notifyProfileSubmission: boolean;
  notifyPaymentVerification: boolean;
  notifyInterestActivity: boolean;
  updatedAt: Date;
}

const PlatformSettingsSchema = new Schema<IPlatformSettings>(
  {
    platformName: { type: String, default: "Covenant Christian Matrimony" },
    membershipFee: { type: Number, default: 999 },
    currency: { type: String, default: "INR" },
    notifyNewMemberRegistration: { type: Boolean, default: true },
    notifyProfileSubmission: { type: Boolean, default: true },
    notifyPaymentVerification: { type: Boolean, default: true },
    notifyInterestActivity: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PlatformSettings = mongoose.model<IPlatformSettings>(
  "PlatformSettings",
  PlatformSettingsSchema
);
