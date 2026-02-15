const jwt = require("jsonwebtoken");

// Verify Token
exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token." });
    }
};

// Doctor Only
exports.doctorOnly = (req, res, next) => {
    if (req.user.role !== "doctor") {
        return res.status(403).json({ message: "Access denied. Doctors only." });
    }
    next();
};

// Patient Only
exports.patientOnly = (req, res, next) => {
    if (req.user.role !== "patient") {
        return res.status(403).json({ message: "Access denied. Patients only." });
    }
    next();
};