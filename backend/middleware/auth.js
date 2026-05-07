const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Student = require("../models/Student");

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    console.log("🔐 Auth Debug - Token:", token ? "Present" : "Missing");
    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔐 Auth Debug - Decoded:", decoded);

    let user;
    if (decoded.role === "admin") {
      user = await Admin.findById(decoded.id);
      console.log("🔐 Auth Debug - Admin found:", user ? "Yes" : "No");
    } else if (decoded.role === "student") {
      user = await Student.findById(decoded.id);
      console.log("🔐 Auth Debug - Student found:", user ? "Yes" : "No");
    }

    if (!user) {
      console.log("🔐 Auth Debug - No user found for token");
      return res.status(403).json({ message: "Invalid or expired session" });
    }

    req.user = user;
    req.userId = user._id;
    req.userRole = user.role || decoded.role; // ensure fallback
    next();
  } catch (error) {
    console.error("🔐 Auth Debug - Error:", error.message);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(500).json({ message: "Authentication error" });
  }
};

// Restrict to admins
const requireAdmin = (req, res, next) => {
  if (req.userRole !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// Restrict to students
const requireStudent = (req, res, next) => {
  if (req.userRole !== "student") {
    return res.status(403).json({ message: "Student access required" });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireStudent,
};
