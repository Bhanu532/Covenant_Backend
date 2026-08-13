import { Router } from "express";
import {
  getVisionMission,
  updateVisionMission,
  getTrustedVoices,
  addTrustedVoice,
  deleteTrustedVoice,
  getAdminStats,
  getTrustedVoice,
  updateTrustedVoice,
  updateTrustedVoiceStatus,
} from "../controllers/adminController";
import { adminMiddleware, authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/vision-mission", getVisionMission);
router.put("/vision-mission", authMiddleware, adminMiddleware, updateVisionMission);

router.get("/trusted-voices", authMiddleware, adminMiddleware, getTrustedVoices);
router.post("/trusted-voices", authMiddleware, adminMiddleware, addTrustedVoice);
router.get("/trusted-voices/:id", authMiddleware, adminMiddleware, getTrustedVoice);
router.put("/trusted-voices/:id", authMiddleware, adminMiddleware, updateTrustedVoice);
router.patch("/trusted-voices/:id/status", authMiddleware, adminMiddleware, updateTrustedVoiceStatus);
router.delete("/trusted-voices/:id", authMiddleware, adminMiddleware, deleteTrustedVoice);

router.get("/stats", authMiddleware, adminMiddleware, getAdminStats);

export default router;
