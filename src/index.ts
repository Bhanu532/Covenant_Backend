import express from "express";
import http from "http";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes";
import profileRoutes from "./routes/profileRoutes";
import interestRoutes from "./routes/interestRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import { initializeSocket } from "./socket";

dotenv.config();

const app = express();
const server = http.createServer(app);
initializeSocket(server);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/matrimony";

// Middlewares
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "12mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/interests", interestRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

app.use(
  (
    error: Error & { type?: string; status?: number },
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (error.type === "entity.too.large" || error.status === 413) {
      return res.status(413).json({
        message:
          "The profile photos are too large to save. Remove a photo or choose smaller images.",
      });
    }
    return next(error);
  },
);

// Connect DB & Start Server
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB successfully");
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    // Start HTTP server anyway for testing endpoints fallback
    server.listen(PORT, () => {
      console.log(`Server running without DB connection on port ${PORT}`);
    });
  });
