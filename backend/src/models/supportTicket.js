import mongoose from "mongoose";

const replySchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

const supportTicketSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    kind: { type: String, enum: ["support", "complaint"], default: "support" },
    subject: { type: String, required: true, trim: true, maxlength: 140 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ["open", "resolved"], default: "open" },
    replies: { type: [replySchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model("supportTicket", supportTicketSchema);
