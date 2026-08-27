import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { User } from "../models/User";
import { Payment } from "../models/Payment";
import { PlatformSettings } from "../models/PlatformSettings";
import { Notification } from "../models/Notification";
import { emitToUser } from "../socket";

// POST /api/payment/create-order
export async function createOrder(req: AuthRequest, res: Response) {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.paymentStatus === "PAID") {
      return res.status(400).json({ message: "Payment has already been completed." });
    }

    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }

    const orderId = `cov_ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payment = await Payment.create({
      user: user._id,
      orderId,
      amount: settings.membershipFee || 999,
      currency: settings.currency || "INR",
      status: "PENDING",
    });

    return res.json({
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      key: process.env.RAZORPAY_KEY_ID || "rzp_test_covenant_matrimony",
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to create payment order" });
  }
}

// POST /api/payment/verify
export async function verifyPayment(req: AuthRequest, res: Response) {
  try {
    const { orderId, paymentId, status } = req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const payment = await Payment.findOne({ orderId, user: user._id });
    if (!payment) {
      return res.status(404).json({ message: "Payment order not found" });
    }

    if (status === "FAILED") {
      payment.status = "FAILED";
      await payment.save();
      user.paymentStatus = "FAILED";
      await user.save();

      await Notification.create({
        recipient: user._id,
        type: "payment_failed",
        title: "Payment Failed",
        message: "Your Covenant membership payment was not completed. Please try again.",
      });

      return res.status(400).json({ message: "Payment failed. Please try again.", paymentStatus: "FAILED" });
    }

    // Success path
    const generatedPaymentId = paymentId || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    payment.status = "PAID";
    payment.paymentId = generatedPaymentId;
    payment.paidAt = new Date();
    await payment.save();

    user.paymentStatus = "PAID";
    await user.save();

    await Notification.create({
      recipient: user._id,
      type: "payment_success",
      title: "Payment Successful",
      message: "Your payment of ₹999 has been received. Your registration is now awaiting admin approval.",
    });

    try {
      emitToUser(user._id.toString(), "notification:new", {
        title: "Payment Successful",
        message: "Your payment of ₹999 has been received. Your registration is now awaiting admin approval.",
      });
    } catch {
      // Ignore socket error if not connected
    }

    return res.json({
      success: true,
      message: "Payment verified successfully",
      paymentStatus: "PAID",
      paymentId: generatedPaymentId,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to verify payment" });
  }
}

// GET /api/payment/status
export async function getPaymentStatus(req: AuthRequest, res: Response) {
  try {
    const user = await User.findById(req.userId).select("paymentStatus");
    if (!user) return res.status(404).json({ message: "User not found" });
    const latestPayment = await Payment.findOne({ user: user._id }).sort({ createdAt: -1 });

    return res.json({
      paymentStatus: user.paymentStatus,
      latestPayment,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch payment status" });
  }
}
