import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
  user: mongoose.Types.ObjectId;
  orderId: string;
  paymentId?: string | null;
  amount: number;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: String, required: true, unique: true },
    paymentId: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PENDING",
    },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Payment = mongoose.model<IPayment>("Payment", PaymentSchema);
