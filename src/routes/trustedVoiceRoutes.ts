import { Router } from "express";
import { getPublicTrustedVoices } from "../controllers/adminController";
const router = Router();
router.get("/", getPublicTrustedVoices);
export default router;
