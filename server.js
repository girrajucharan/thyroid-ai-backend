const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Import Routes
const authRoutes = require("./routes/authRoutes");
const thyroidRoutes = require("./routes/thyroidRoutes");

// Import Middleware
const { verifyToken, doctorOnly, patientOnly } = require("./middleware/authMiddleware");

const app = express();

// ------------------------
// Middleware
// ------------------------
app.use(cors());
app.use(express.json());

// ------------------------
// MongoDB Connection
// ------------------------
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected Successfully"))
    .catch((err) => console.log("MongoDB Error:", err));

// ------------------------
// Public Routes
// ------------------------
app.use("/api/auth", authRoutes);
app.use("/api/thyroid", thyroidRoutes);

app.get("/", (req, res) => {
    res.send("Thyroid Backend Server Running Successfully");
});

// ------------------------
// Protected Routes
// ------------------------

// Doctor-only dashboard
app.get("/api/doctor/dashboard", verifyToken, doctorOnly, (req, res) => {
    res.json({
        message: "Welcome Doctor! Secure dashboard accessed.",
        user: req.user
    });
});

// Patient-only dashboard
app.get("/api/patient/dashboard", verifyToken, patientOnly, (req, res) => {
    res.json({
        message: "Welcome Patient! Secure dashboard accessed.",
        user: req.user
    });
});

// ------------------------
// Server Start
// ------------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});