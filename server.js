const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Routes
const authRoutes = require("./routes/authRoutes");
const thyroidRoutes = require("./routes/thyroidRoutes");

// Middleware
const { verifyToken, doctorOnly, patientOnly } = require("./middleware/authMiddleware");

const app = express();

// ============================
// MIDDLEWARE
// ============================

// CORS Configuration (Important for React Frontend)
app.use(cors({
    origin: [
        "http://localhost:3000", 
        "https://your-frontend.vercel.app"  // Replace after frontend deploy
    ],
    credentials: true
}));

app.use(express.json());

// ============================
// DATABASE CONNECTION
// ============================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ============================
// HEALTH CHECK ROUTE
// ============================
app.get("/", (req, res) => {
    res.status(200).json({
        status: "success",
        message: "Thyroid AI Backend Running",
        timestamp: new Date()
    });
});

// ============================
// PUBLIC ROUTES
// ============================
app.use("/api/auth", authRoutes);
app.use("/api/thyroid", thyroidRoutes);

// ============================
// PROTECTED ROUTES
// ============================

// Doctor Dashboard
app.get("/api/doctor/dashboard", verifyToken, doctorOnly, (req, res) => {
    res.json({
        message: "Welcome Doctor! Secure dashboard accessed.",
        user: req.user
    });
});

// Patient Dashboard
app.get("/api/patient/dashboard", verifyToken, patientOnly, (req, res) => {
    res.json({
        message: "Welcome Patient! Secure dashboard accessed.",
        user: req.user
    });
});

// ============================
// GLOBAL ERROR HANDLER
// ============================
app.use((err, req, res, next) => {
    console.error("🔥 Server Error:", err.message);
    res.status(500).json({
        message: "Internal Server Error"
    });
});

// ============================
// SERVER START
// ============================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});