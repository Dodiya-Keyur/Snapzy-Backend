const commentrouter = require("express").Router();

// Middleware
const userAuth = require("../middleware/auth.middleware");

// Controllers
const commentControllers = require("../controllers/comment.controllesr");
const replyControllers = require("../controllers/reply.controllers");

// Fetch all comments authored by current logged-in user
commentrouter.get("/me", userAuth, commentControllers.getUserComments);

// Create comment on a post
commentrouter.post("/posts/:postid/comments", userAuth, commentControllers.createComment);

// Fetch all comments on a post
commentrouter.get("/posts/:postid/comments", userAuth, commentControllers.getComments);

// Update comment text by comment ID
commentrouter.patch("/comment/:commentid", userAuth, commentControllers.updateComment);

// Delete comment and its replies by comment ID
commentrouter.delete("/comment/:commentid", userAuth, commentControllers.deleteComment);

// Create a reply to an existing comment
commentrouter.post("/comment/:commentid/replies", userAuth, replyControllers.createReply);

// Fetch all replies to a comment
commentrouter.get("/comment/:commentid/replies", userAuth, replyControllers.getReplies);

module.exports = commentrouter;
