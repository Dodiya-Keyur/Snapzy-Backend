const express = require("express");

// Middleware
const userAuth = require("../middleware/auth.middleware");

// Controllers
const likeControllers = require("../controllers/like.controllers");

const likerouter = express.Router();

// Like and unlike post endpoints
likerouter.post("/:postid/like", userAuth, likeControllers.likePost);
likerouter.delete("/:postid/unlike", userAuth, likeControllers.unlikePost);

// Get all likes for a specific post
likerouter.get("/:postid/likes", userAuth, likeControllers.getPostLikes);

// Get like status of post for authenticated user
likerouter.get("/:postid/isliked", userAuth, likeControllers.userIsLiked);

module.exports = likerouter;