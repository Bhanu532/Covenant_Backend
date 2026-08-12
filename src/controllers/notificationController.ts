import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { Notification } from "../models/Notification";
import { serializeNotification } from "../services/notificationService";
import mongoose from "mongoose";

export async function getNotifications(req: AuthRequest, res: Response) {
  try {
    const requestedLimit = Number(req.query.limit) || 30;
    const limit = Math.min(Math.max(requestedLimit, 1), 100);
    const notifications = await Notification.find({ recipient: req.userId })
      .sort({ createdAt: -1 })
      .limit(limit);
    return res.json(
      await Promise.all(notifications.map(serializeNotification)),
    );
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: error.message || "Failed to fetch notifications" });
  }
}

export async function markAllNotificationsRead(
  req: AuthRequest,
  res: Response,
) {
  try {
    await Notification.updateMany(
      { recipient: req.userId, is_read: false },
      { $set: { is_read: true } },
    );
    return res.json({ success: true });
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: error.message || "Failed to update notifications" });
  }
}

export async function markNotificationRead(req: AuthRequest, res: Response) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid notification ID" });
  }
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.userId },
      { $set: { is_read: true } },
      { new: true },
    );
    if (!notification)
      return res.status(404).json({ message: "Notification not found" });
    return res.json(await serializeNotification(notification));
  } catch {
    return res.status(500).json({ message: "Failed to update notification" });
  }
}
