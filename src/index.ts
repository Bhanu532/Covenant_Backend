import express from "express";
import http from "http";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes";
import profileRoutes from "./routes/profileRoutes";
import interestRoutes from "./routes/interestRoutes";
import adminRoutes from "./routes/adminRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import trustedVoiceRoutes from "./routes/trustedVoiceRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import { initializeSocket } from "./socket";
import { User } from "./models/User";
import { Profile } from "./models/Profile";
import bcrypt from "bcryptjs";
import { getJwtSecret } from "./config/auth";
import { getAllowedOrigins } from "./config/cors";

dotenv.config();
getJwtSecret();
const allowedOrigins = getAllowedOrigins();

const app = express();
const server = http.createServer(app);
initializeSocket(server);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/matrimony";

// Middlewares
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "12mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/interests", interestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/trusted-voices", trustedVoiceRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

async function seedAdminAndInitialData() {
  try {
    const adminEmail = "admin@covenant.com";
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin@123", 10);
      const adminUser = await User.create({
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
      });
      await Profile.create({
        user: adminUser._id,
        full_name: "Super Admin",
        gender: "male",
        is_complete: true,
      });
      console.log("Admin account seeded: admin@covenant.com / admin@123");
    } else {
      // Reset admin password to admin@123 to guarantee login works
      const hashedPassword = await bcrypt.hash("admin@123", 10);
      existingAdmin.password = hashedPassword;
      existingAdmin.role = "admin";
      await existingAdmin.save();
      console.log("Admin credentials updated: admin@covenant.com / admin@123");
    }
  } catch (err) {
    console.error("Error seeding admin user:", err);
  }
}

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
  .then(async () => {
    console.log("Connected to MongoDB successfully");
    await seedAdminAndInitialData();
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    seedAdminAndInitialData();
    // Start HTTP server anyway for testing endpoints fallback
    server.listen(PORT, () => {
      console.log(`Server running without DB connection on port ${PORT}`);
    });
  });
