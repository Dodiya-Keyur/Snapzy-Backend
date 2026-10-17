const express = require("express");

// Middleware
const userAuth = require("../middleware/auth.middleware.js");
const { validateRegister, validateChangePassword } = require("../middleware/validateRegister.middleware.js");

// Controllers
const authController = require("../controllers/auth.controllers.js");

const authrouter = express.Router();

// User registration endpoint with input validation
authrouter.post("/register", validateRegister, authController.registerUser);

// User login endpoint
authrouter.post("/login", authController.loginUser);

// User logout endpoint requiring authentication
authrouter.post("/logout", userAuth, authController.logout);

// Change password endpoint for authenticated users
authrouter.post("/change-password", userAuth, validateChangePassword, authController.changePassword);

// Forgot and reset password endpoints by confirming email
authrouter.post("/forgot-password", authController.forgotPassword);
authrouter.post("/reset-password", authController.forgotPassword);
authrouter.post("/verify-reset-email", authController.verifyResetEmail);

module.exports = authrouter;