import mongoose, { Schema, Document } from "mongoose";

export interface IMasterDataItem extends Document {
  type: "CHURCH" | "DENOMINATION";
  name: string;
  code?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MasterDataSchema = new Schema<IMasterDataItem>(
  {
    type: { type: String, enum: ["CHURCH", "DENOMINATION"], required: true },
    name: { type: String, required: true },
    code: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

MasterDataSchema.index({ type: 1, name: 1 }, { unique: true });

export const MasterData = mongoose.model<IMasterDataItem>(
  "MasterData",
  MasterDataSchema
);
