import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoute.js";
import adminRoutes from "./routes/adminRoute.js";
import ownerRoutes from "./routes/ownerRoute.js";
import turfRoutes from "./routes/turfRoute.js";
import notificationRoutes from "./routes/notificationRoute.js";
import supportRoutes from "./routes/supportRoute.js";
import subscriptionRoutes from "./routes/subscriptionRoute.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/turfs", turfRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
import path from "path";
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found" });
});

app.get("/", (req, res) => {
  res.send("API is running...");
});

const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch {
    console.error("Server did not start because MongoDB is unavailable.");
    process.exit(1);
  }
};

startServer();
