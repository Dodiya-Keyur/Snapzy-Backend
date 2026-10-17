const express = require("express");

// Middleware
const userAuth = require("../middleware/auth.middleware");

// Controllers
const followControllers = require("../controllers/follow.controllers");

const followrouter = express.Router();

// Follow a user by user ID
followrouter.post("/follow/:userid", userAuth, followControllers.follow);

// Unfollow a user by user ID
followrouter.delete("/unfollow/:userid", userAuth, followControllers.unFollow);

module.exports = followrouter;