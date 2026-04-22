const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
require("dotenv").config();

const authRoutes = require("./src/routes/auth.routes");
const detectRoutes = require("./src/routes/detect.routes");
const complaintRoutes = require("./src/routes/complaint.routes");
const historyRoutes = require("./src/routes/history.routes");

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({ ok: true, service: "Cyber Threat Detection Backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/detect", detectRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/history", historyRoutes);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI missing in .env");
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

start();
