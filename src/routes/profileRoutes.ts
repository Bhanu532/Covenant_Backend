import { Router } from "express";
import {
  getProfiles,
  getMyProfile,
  getProfileById,
  updateMyProfile,
} from "../controllers/profileController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/", getProfiles);
router.get("/me", authMiddleware, getMyProfile);
router.get("/:id", getProfileById);
router.put("/me", authMiddleware, updateMyProfile);

export default router;
