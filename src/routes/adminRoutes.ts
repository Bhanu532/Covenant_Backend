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
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  getPendingProfileReviews,
  approveProfile,
  rejectProfile,
  getAllMembers,
  updateMemberStatus,
  getMemberDetails,
  getAllPayments,
  getMatchingStats,
  updateMatchingConfig,
  getMatchingPreview,
  getAdminInterests,
  getMasterData,
  addMasterData,
  updateMasterData,
  toggleMasterDataStatus,
  getReportsData,
  getPlatformSettings,
  updatePlatformSettings,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "../controllers/adminController";
import { adminMiddleware, authMiddleware } from "../middleware/auth";

const router = Router();

// Vision & Mission
router.get("/vision-mission", getVisionMission);
router.put("/vision-mission", authMiddleware, adminMiddleware, updateVisionMission);

// Trusted Voices
router.get("/trusted-voices", authMiddleware, adminMiddleware, getTrustedVoices);
router.post("/trusted-voices", authMiddleware, adminMiddleware, addTrustedVoice);
router.get("/trusted-voices/:id", authMiddleware, adminMiddleware, getTrustedVoice);
router.put("/trusted-voices/:id", authMiddleware, adminMiddleware, updateTrustedVoice);
router.patch("/trusted-voices/:id/status", authMiddleware, adminMiddleware, updateTrustedVoiceStatus);
router.delete("/trusted-voices/:id", authMiddleware, adminMiddleware, deleteTrustedVoice);

// Stats & Dashboard
router.get("/stats", authMiddleware, adminMiddleware, getAdminStats);

// Registrations
router.get("/registrations", authMiddleware, adminMiddleware, getPendingRegistrations);
router.post("/registrations/:userId/approve", authMiddleware, adminMiddleware, approveRegistration);
router.post("/registrations/:userId/reject", authMiddleware, adminMiddleware, rejectRegistration);

// Profile Reviews
router.get("/profile-reviews", authMiddleware, adminMiddleware, getPendingProfileReviews);
router.post("/profile-reviews/:userId/approve", authMiddleware, adminMiddleware, approveProfile);
router.post("/profile-reviews/:userId/reject", authMiddleware, adminMiddleware, rejectProfile);

// Member Management
router.get("/members", authMiddleware, adminMiddleware, getAllMembers);
router.get("/members/:id", authMiddleware, adminMiddleware, getMemberDetails);
router.patch("/members/:id/status", authMiddleware, adminMiddleware, updateMemberStatus);

// Payments Management
router.get("/payments", authMiddleware, adminMiddleware, getAllPayments);

// Matching Management
router.get("/matching/stats", authMiddleware, adminMiddleware, getMatchingStats);
router.put("/matching/config", authMiddleware, adminMiddleware, updateMatchingConfig);
router.post("/matching/preview", authMiddleware, adminMiddleware, getMatchingPreview);

// Interests Management
router.get("/interests", authMiddleware, adminMiddleware, getAdminInterests);

// Master Data Management
router.get("/master-data", authMiddleware, adminMiddleware, getMasterData);
router.post("/master-data", authMiddleware, adminMiddleware, addMasterData);
router.put("/master-data/:id", authMiddleware, adminMiddleware, updateMasterData);
router.patch("/master-data/:id/toggle", authMiddleware, adminMiddleware, toggleMasterDataStatus);

// Reports
router.get("/reports", authMiddleware, adminMiddleware, getReportsData);

// Admin Settings
router.get("/settings", authMiddleware, adminMiddleware, getPlatformSettings);
router.put("/settings", authMiddleware, adminMiddleware, updatePlatformSettings);

// Admin Notifications
router.get("/notifications", authMiddleware, adminMiddleware, getAdminNotifications);
router.patch("/notifications/read-all", authMiddleware, adminMiddleware, markAllAdminNotificationsRead);
router.patch("/notifications/:id/read", authMiddleware, adminMiddleware, markAdminNotificationRead);

export default router;
