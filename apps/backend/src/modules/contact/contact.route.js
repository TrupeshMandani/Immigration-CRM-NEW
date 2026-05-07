const express = require("express");
const router = express.Router();
const ctrl = require("./contact.controller");

// Public route for contact form submission
router.post("/", ctrl.submitContact);

module.exports = router;

