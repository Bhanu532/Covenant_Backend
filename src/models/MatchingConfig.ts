import mongoose, { Schema, Document } from "mongoose";

export interface IMatchingConfig extends Document {
  ageWeight: number;
  locationWeight: number;
  denominationWeight: number;
  christianBackgroundWeight: number;
  educationWeight: number;
  careerMinistryWeight: number;
  updatedAt: Date;
}

const MatchingConfigSchema = new Schema<IMatchingConfig>(
  {
    ageWeight: { type: Number, default: 20 },
    locationWeight: { type: Number, default: 20 },
    denominationWeight: { type: Number, default: 20 },
    christianBackgroundWeight: { type: Number, default: 20 },
    educationWeight: { type: Number, default: 10 },
    careerMinistryWeight: { type: Number, default: 10 },
  },
  { timestamps: true }
);

export const MatchingConfig = mongoose.model<IMatchingConfig>(
  "MatchingConfig",
  MatchingConfigSchema
);
