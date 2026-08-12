import { Notification, NotificationType } from "../models/Notification";
import { Profile } from "../models/Profile";
import { emitToUser } from "../socket";

export type NotificationPayload = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actor_user_id: string;
  interest_id: string;
  is_read: boolean;
  created_at: string;
  actor_profile?: {
    id: string;
    full_name: string;
    photo_url: string | null;
  };
};

export async function serializeNotification(notification: any): Promise<NotificationPayload> {
  const actorId = notification.actor.toString();
  const profile = await Profile.findOne({ user: actorId }).select(
    "full_name photo_url",
  );
  return {
    id: notification._id.toString(),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    actor_user_id: actorId,
    interest_id: notification.interest.toString(),
    is_read: notification.is_read,
    created_at: notification.createdAt.toISOString(),
    ...(profile
      ? {
          actor_profile: {
            id: actorId,
            full_name: profile.full_name,
            photo_url: profile.photo_url,
          },
        }
      : {}),
  };
}

export async function createAndEmitNotification(input: {
  recipientId: string;
  actorId: string;
  interestId: string;
  type: NotificationType;
  title: string;
  message: string;
}) {
  try {
    const notification = await Notification.create({
      recipient: input.recipientId,
      actor: input.actorId,
      interest: input.interestId,
      type: input.type,
      title: input.title,
      message: input.message,
    });
    const payload = await serializeNotification(notification);
    emitToUser(input.recipientId, "notification:new", payload);
  } catch (error: any) {
    if (error?.code !== 11000) {
      console.error("Notification creation failed:", error);
    }
  }
}
