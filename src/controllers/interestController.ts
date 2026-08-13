import { Response } from "express";
import { Interest } from "../models/Interest";
import { Profile } from "../models/Profile";
import { AuthRequest } from "../middleware/auth";
import { createAndEmitNotification } from "../services/notificationService";
import mongoose from "mongoose";

// GET /api/interests
export async function getInterests(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const allInterests = await Interest.find({
      $or: [{ from_user: userId }, { to_user: userId }],
    });

    const userIds = new Set<string>();
    allInterests.forEach((i) => {
      userIds.add(i.from_user.toString());
      userIds.add(i.to_user.toString());
    });

    const profiles = await Profile.find({ user: { $in: Array.from(userIds) } });
    const profileMap = new Map();
    profiles.forEach((p) => {
      profileMap.set(p.user.toString(), {
        id: p.user.toString(),
        full_name: p.full_name,
        photo_url: p.photo_url,
        city: p.city,
        country: p.country,
        denomination: p.denomination,
        occupation: p.occupation,
      });
    });

    const received = allInterests
      .filter((i) => i.to_user.toString() === userId)
      .map((i) => ({
        id: i._id.toString(),
        from_user_id: i.from_user.toString(),
        to_user_id: i.to_user.toString(),
        status: i.status,
        message: i.message,
        created_at: i.createdAt.toISOString(),
        updated_at: i.updatedAt.toISOString(),
        profiles: profileMap.get(i.from_user.toString()) || {},
      }));

    const sent = allInterests
      .filter((i) => i.from_user.toString() === userId)
      .map((i) => ({
        id: i._id.toString(),
        from_user_id: i.from_user.toString(),
        to_user_id: i.to_user.toString(),
        status: i.status,
        message: i.message,
        created_at: i.createdAt.toISOString(),
        updated_at: i.updatedAt.toISOString(),
        profiles: profileMap.get(i.to_user.toString()) || {},
      }));

    return res.json({ received, sent });
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: error.message || "Failed to fetch interests" });
  }
}

// POST /api/interests
export async function sendInterest(req: AuthRequest, res: Response) {
  try {
    const { to_user_id, message } = req.body;
    const from_user_id = req.userId;

    if (typeof to_user_id !== "string" || !mongoose.isValidObjectId(to_user_id)) {
      return res.status(400).json({ message: "Recipient user ID is required" });
    }

    if (message != null && (typeof message !== "string" || message.trim().length > 1000)) return res.status(400).json({ message: "Message cannot exceed 1000 characters." });
    const recipientExists = await Profile.exists({ user: to_user_id });
    if (!recipientExists) return res.status(404).json({ message: "Recipient profile not found." });

    if (from_user_id === to_user_id) {
      return res
        .status(400)
        .json({ message: "Cannot send interest to yourself" });
    }

    let existing = await Interest.findOne({
      from_user: from_user_id,
      to_user: to_user_id,
    });

    if (existing) {
      return res.json({
        id: existing._id.toString(),
        from_user_id: existing.from_user.toString(),
        to_user_id: existing.to_user.toString(),
        status: existing.status,
        message: existing.message,
        created_at: existing.createdAt.toISOString(),
        updated_at: existing.updatedAt.toISOString(),
      });
    }

    let newInterest;
    try {
      newInterest = await Interest.create({
        from_user: from_user_id,
        to_user: to_user_id,
        status: "pending",
        message: typeof message === "string" && message.trim() ? message.trim() : null,
      });
    } catch (error: any) {
      // A simultaneous retry may win the unique (sender, recipient) insert.
      // Recover as the same idempotent success and never emit from the loser.
      if (error?.code === 11000) {
        existing = await Interest.findOne({
          from_user: from_user_id,
          to_user: to_user_id,
        });
        if (existing) {
          return res.json({
            id: existing._id.toString(),
            from_user_id: existing.from_user.toString(),
            to_user_id: existing.to_user.toString(),
            status: existing.status,
            message: existing.message,
            created_at: existing.createdAt.toISOString(),
            updated_at: existing.updatedAt.toISOString(),
          });
        }
      }
      throw error;
    }

    void createAndEmitNotification({
      recipientId: to_user_id,
      actorId: from_user_id!,
      interestId: newInterest._id.toString(),
      type: "interest_received",
      title: "New interest received",
      message: "Someone would like to connect with you.",
    });

    return res.status(201).json({
      id: newInterest._id.toString(),
      from_user_id: newInterest.from_user.toString(),
      to_user_id: newInterest.to_user.toString(),
      status: newInterest.status,
      message: newInterest.message,
      created_at: newInterest.createdAt.toISOString(),
      updated_at: newInterest.updatedAt.toISOString(),
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: error.message || "Failed to send interest" });
  }
}

// PATCH /api/interests/:id
export async function updateInterestStatus(req: AuthRequest, res: Response) {
  try {
    const { status } = req.body;
    if (!["accepted", "declined"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Status must be accepted or declined" });
    }

    const interest = await Interest.findById(req.params.id);
    if (!interest) {
      return res.status(404).json({ message: "Interest request not found" });
    }

    if (interest.to_user.toString() !== req.userId) {
      return res
        .status(403)
        .json({ message: "You cannot respond to this interest request" });
    }

    const wasPending = interest.status === "pending";
    interest.status = status;
    await interest.save();

    if (status === "accepted" && wasPending) {
      void createAndEmitNotification({
        recipientId: interest.from_user.toString(),
        actorId: interest.to_user.toString(),
        interestId: interest._id.toString(),
        type: "interest_accepted",
        title: "Interest accepted",
        message: "Your interest was accepted.",
      });
    }

    return res.json({
      id: interest._id.toString(),
      from_user_id: interest.from_user.toString(),
      to_user_id: interest.to_user.toString(),
      status: interest.status,
      message: interest.message,
      created_at: interest.createdAt.toISOString(),
      updated_at: interest.updatedAt.toISOString(),
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: error.message || "Failed to update interest status" });
  }
}
