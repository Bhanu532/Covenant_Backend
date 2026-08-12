import { Router } from "express";
import {
  getInterests,
  sendInterest,
  updateInterestStatus,
} from "../controllers/interestController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/", authMiddleware, getInterests);
router.post("/", authMiddleware, sendInterest);
router.patch("/:id", authMiddleware, updateInterestStatus);

export default router;
