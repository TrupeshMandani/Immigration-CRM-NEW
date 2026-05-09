const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Student = require("../models/Student");

const ACCESS_SECRET = () =>
  process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET;

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    console.log("🔐 Auth Debug - Token:", token ? "Present" : "Missing");
    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    const decoded = jwt.verify(token, ACCESS_SECRET());
    console.log("🔐 Auth Debug - Decoded:", decoded);

    if (req.context) {
      throw new Error("req.context already set before auth middleware");
    }

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

    req.context = {
      firmId: decoded.firm_id ?? process.env.DEFAULT_FIRM_ID ?? '',
      userId: String(user._id),
      role: user.role || decoded.role,
    };

    // Legacy properties kept for existing routes
    req.user = user;
    req.userId = user._id;
    req.userRole = req.context.role;
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
