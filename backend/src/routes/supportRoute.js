import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createTicket, listTickets, replyToTicket, setTicketStatus } from "../controllers/supportController.js";

const router = express.Router();
router.use(protect);
router.get("/", listTickets);
router.post("/", createTicket);
router.post("/:id/replies", replyToTicket);
router.patch("/:id/status", setTicketStatus);
export default router;
