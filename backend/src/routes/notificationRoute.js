import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { list, markRead, stream } from "../controllers/notificationController.js";

const router = express.Router();
router.use(protect);
router.get("/", list);
router.patch("/read", markRead);
router.get("/stream", stream);
export default router;
