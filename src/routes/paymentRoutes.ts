import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { createOrder, verifyPayment, getPaymentStatus } from "../controllers/paymentController";

const router = Router();

router.post("/create-order", authMiddleware, createOrder);
router.post("/verify", authMiddleware, verifyPayment);
router.get("/status", authMiddleware, getPaymentStatus);

export default router;
