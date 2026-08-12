import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";

let io: Server | null = null;

export function authenticateSocketToken(token: unknown): string {
  if (typeof token !== "string" || !token) throw new Error("Unauthorized");
  try {
    const secret = process.env.JWT_SECRET || "matrimony_secret";
    const decoded = jwt.verify(token, secret) as { userId?: string };
    if (!decoded.userId) throw new Error("Unauthorized");
    return decoded.userId;
  } catch {
    throw new Error("Unauthorized");
  }
}

export function initializeSocket(server: HttpServer) {
  io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST", "PATCH"] },
  });

  io.use((socket, next) => {
    try {
      socket.data.userId = authenticateSocketToken(
        socket.handshake.auth?.token,
      );
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`);
  });

  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}
