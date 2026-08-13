import mongoose, { Schema, Document } from "mongoose";

export interface IVisionMission extends Document {
  visionText: string;
  visionVerses: string[];
  missionText: string;
  missionVerses: string[];
  updatedAt: Date;
}

const VisionMissionSchema = new Schema<IVisionMission>(
  {
    visionText: { type: String, default: "" },
    visionVerses: { type: [String], default: [] },
    missionText: { type: String, default: "" },
    missionVerses: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const VisionMission = mongoose.model<IVisionMission>("VisionMission", VisionMissionSchema);
