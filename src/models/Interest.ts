import mongoose, { Schema, Document } from "mongoose";

export interface IInterest extends Document {
  from_user: mongoose.Types.ObjectId;
  to_user: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "declined";
  message: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const InterestSchema = new Schema<IInterest>(
  {
    from_user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    to_user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
    message: { type: String, default: null },
  },
  { timestamps: true }
);

InterestSchema.index({ from_user: 1, to_user: 1 }, { unique: true });

export const Interest = mongoose.model<IInterest>("Interest", InterestSchema);
