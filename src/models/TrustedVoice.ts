import mongoose, { Schema, Document } from "mongoose";

export interface ITrustedVoice extends Document {
  name: string;
  title: string;
  organization: string;
  photoUrl: string;
  quote: string;
  bio?: string;
  displayOrder: number;
  isPublished: boolean;
  consentConfirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TrustedVoiceSchema = new Schema<ITrustedVoice>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    organization: { type: String, required: true, trim: true, maxlength: 200 },
    photoUrl: { type: String, required: true },
    quote: { type: String, required: true, trim: true, maxlength: 500 },
    bio: { type: String, trim: true, maxlength: 500, default: "" },
    displayOrder: { type: Number, min: 1, max: 10000, default: 1 },
    isPublished: { type: Boolean, default: false },
    consentConfirmed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

TrustedVoiceSchema.index({ isPublished: 1, consentConfirmed: 1, displayOrder: 1, createdAt: 1 });

export const TrustedVoice = mongoose.model<ITrustedVoice>("TrustedVoice", TrustedVoiceSchema);
