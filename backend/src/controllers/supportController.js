import supportTicketModel from "../models/supportTicket.js";
import userModel from "../models/user.js";
import { createNotification } from "../services/notificationService.js";
import transporter from "../config/email.js";

const PAGE_SIZE = 10;
const ticketQuery = (role, userId) => role === "user" ? { createdBy: userId } : {};
const populateTicket = (query) =>
  query
    .populate("createdBy", "name email role")
    .populate("replies.author", "name role");

const notifyStaff = async (notification, excludeId) => {
  const staff = await userModel.find({ role: { $in: ["owner", "admin"] }, isBlocked: false }).select("_id").lean();
  await Promise.all(
    staff
      .filter((p) => String(p._id) !== String(excludeId))
      .map((p) => createNotification({ ...notification, recipient: p._id }))
  );
};

const sendReplyEmail = async (ticket, replyMessage, replierName) => {
  try {
    const user = await userModel.findById(ticket.createdBy).select("email name").lean();
    if (!user?.email) return;
    await transporter.sendMail({
      from: `"BookMyTurf Support" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Re: ${ticket.subject}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:28px 32px;">
            <h1 style="color:#fff;font-size:20px;margin:0;">BookMyTurf Support</h1>
            <p style="color:#94a3b8;font-size:13px;margin:6px 0 0;">A reply to your support ticket</p>
          </div>
          <div style="padding:28px 32px;">
            <p style="color:#475569;font-size:13px;margin:0 0 16px;">Hi <strong>${user.name}</strong>,</p>
            <p style="color:#475569;font-size:13px;margin:0 0 20px;">
              <strong>${replierName}</strong> from our support team has replied to your ticket:
            </p>
            <div style="background:#f0fdf4;border:1px solid #d1fae5;border-radius:8px;padding:18px 20px;margin-bottom:20px;">
              <p style="font-size:12px;color:#15803d;font-weight:700;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Support Reply</p>
              <p style="color:#0f172a;font-size:14px;line-height:1.7;margin:0;">${replyMessage.replace(/\n/g, "<br>")}</p>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 18px;margin-bottom:24px;">
              <p style="font-size:11px;color:#94a3b8;font-weight:700;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">Your original message</p>
              <p style="color:#475569;font-size:13px;margin:0 0 4px;"><strong>Subject:</strong> ${ticket.subject}</p>
              <p style="color:#475569;font-size:13px;line-height:1.6;margin:0;">${ticket.message.replace(/\n/g, "<br>")}</p>
            </div>
            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/support"
               style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;border-radius:6px;text-decoration:none;font-size:13px;font-weight:700;">
              View Full Thread →
            </a>
          </div>
          <div style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="color:#94a3b8;font-size:11px;margin:0;">BookMyTurf · You're receiving this because you submitted a support ticket.</p>
          </div>
        </div>
      `,
    });
  } catch (emailError) {
    console.error("Support reply email failed:", emailError.message);
  }
};

export const listTickets = async (req, res) => {
  const { page = 1, limit = PAGE_SIZE } = req.query;
  const filter = ticketQuery(req.user.role, req.user._id);
  const total = await supportTicketModel.countDocuments(filter);
  const tickets = await populateTicket(
    supportTicketModel.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(Number(limit))
  ).lean();
  res.json({ tickets, total, totalPages: Math.ceil(total / limit), page: Number(page) });
};

export const createTicket = async (req, res) => {
  try {
    const { kind = "support", subject, message } = req.body || {};
    if (!subject?.trim() || !message?.trim()) throw new Error("Subject and message are required.");
    const ticket = await supportTicketModel.create({ createdBy: req.user._id, kind, subject, message });
    await notifyStaff(
      { type: kind, title: `New ${kind}`, message: `${req.user.name}: ${subject}`, link: "/admin/support" },
      req.user._id
    );
    res.status(201).json({ ticket: await populateTicket(supportTicketModel.findById(ticket._id)).lean() });
  } catch (error) {
    res.status(400).json({ message: error.message || "Unable to submit your request." });
  }
};

export const replyToTicket = async (req, res) => {
  try {
    if (req.user.role === "user") throw new Error("Only staff can reply to tickets.");
    const message = req.body?.message?.trim();
    if (!message) throw new Error("Reply message is required.");
    const ticket = await supportTicketModel.findById(req.params.id);
    if (!ticket) throw new Error("Ticket not found.");
    ticket.replies.push({ author: req.user._id, message });
    await ticket.save();
    // Send in-app notification
    await createNotification({
      recipient: ticket.createdBy,
      type: "support-reply",
      title: "Support replied",
      message: `There is a new reply on: ${ticket.subject}`,
      link: "/support",
    });
    // Send email notification to the user
    await sendReplyEmail(ticket, message, req.user.name);
    res.json({ ticket: await populateTicket(supportTicketModel.findById(ticket._id)).lean() });
  } catch (error) {
    res.status(400).json({ message: error.message || "Unable to send reply." });
  }
};

export const setTicketStatus = async (req, res) => {
  if (req.user.role === "user") return res.status(403).json({ message: "Only staff can update ticket status." });
  const ticket = await supportTicketModel.findByIdAndUpdate(
    req.params.id,
    { status: req.body?.status === "resolved" ? "resolved" : "open" },
    { new: true }
  );
  if (!ticket) return res.status(404).json({ message: "Ticket not found." });
  await createNotification({
    recipient: ticket.createdBy,
    type: "support-status",
    title: "Support ticket updated",
    message: `Your ticket "${ticket.subject}" is now ${ticket.status}.`,
    link: "/support",
  });
  res.json({ ticket: await populateTicket(supportTicketModel.findById(ticket._id)).lean() });
};
