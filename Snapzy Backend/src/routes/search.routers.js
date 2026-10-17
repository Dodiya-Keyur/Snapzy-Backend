const express = require("express");

// Controllers
const searchControllers = require("../controllers/search.controllers");

// Middleware
const userAuth = require("../middleware/auth.middleware");

const searchrouter = express.Router();

// Search users and posts with query and filter parameters
searchrouter.get("/", userAuth, searchControllers.search);

module.exports = searchrouter;