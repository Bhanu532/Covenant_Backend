import mongoose, { Document, Schema } from "mongoose";

export type NotificationType =
  | "payment_success"
  | "payment_failed"
  | "registration_approved"
  | "registration_rejected"
  | "profile_submitted"
  | "profile_approved"
  | "profile_rejected"
  | "interest_received"
  | "interest_accepted";

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  type: NotificationType;
  actor?: mongoose.Types.ObjectId | null;
  interest?: mongoose.Types.ObjectId | null;
  title: string;
  message: string;
  is_read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "payment_success",
        "payment_failed",
        "registration_approved",
        "registration_rejected",
        "profile_submitted",
        "profile_approved",
        "profile_rejected",
        "interest_received",
        "interest_accepted",
      ],
      required: true,
    },
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    interest: { type: Schema.Types.ObjectId, ref: "Interest", default: null },
    title: { type: String, required: true },
    message: { type: String, required: true },
    is_read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, is_read: 1, createdAt: -1 });
NotificationSchema.index(
  { recipient: 1, type: 1, interest: 1 },
  { unique: true, sparse: true },
);

export const Notification = mongoose.model<INotification>(
  "Notification",
  NotificationSchema,
);
