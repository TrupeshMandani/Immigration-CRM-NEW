const express = require("express");
const router = express.Router();
const ctrl = require("./auth.controller");
const { authenticateToken } = require("../../middleware/auth");

console.log("🔧 AUTH ROUTE LOADED");
console.log("🔧 Controller login function:", typeof ctrl.login);

// Public routes
router.post("/login", (req, res, next) => {
  console.log("🔥 AUTH ROUTE HIT - LOGIN");
  console.log("🔥 Request body:", req.body);
  ctrl.login(req, res, next);
});
router.post("/login-link", ctrl.sendLoginLink);
router.post("/firebase-login", ctrl.firebaseLogin);
router.post("/register", ctrl.registerStudent);

// Test endpoint
router.get("/test", (req, res) => {
  console.log("🔥 TEST ENDPOINT HIT");
  res.json({ message: "Auth route working" });
});
router.post("/register-admin", ctrl.registerAdmin);

// Protected routes
router.post("/change-password", authenticateToken, ctrl.changePassword);
router.get("/profile", authenticateToken, ctrl.getProfile);

module.exports = router;
