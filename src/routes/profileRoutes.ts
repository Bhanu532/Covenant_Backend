import { Router } from "express";
import {
  getProfiles,
  getRecommendedProfiles,
  getMyProfile,
  getProfileById,
  updateMyProfile,
} from "../controllers/profileController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/", authMiddleware, getProfiles);
router.get("/recommended", authMiddleware, getRecommendedProfiles);
router.get("/me", authMiddleware, getMyProfile);
router.get("/:id", authMiddleware, getProfileById);
router.put("/me", authMiddleware, updateMyProfile);

export default router;
