const express = require("express");

// Middleware
const userAuth = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

// Controllers
const postControllers = require("../controllers/post.controller");

const postrouter = express.Router();

// Post creation endpoint with single image upload
postrouter.post("/create-post", userAuth, upload.single("image"), postControllers.createPost);

// Post feed and single post retrieval endpoints
postrouter.get("/feed", userAuth, postControllers.getAllPost);
postrouter.get("/getpost/:postid", userAuth, postControllers.getPost);

// Post metadata update endpoint
postrouter.patch("/update-post/:postid", userAuth, postControllers.updatePost);

// Post deletion endpoint
postrouter.delete("/delete-post/:postid", userAuth, postControllers.deletePost);

// Save and bookmark post endpoints
postrouter.post("/:postid/save", userAuth, postControllers.addSavedPost);
postrouter.delete("/:postid/save", userAuth, postControllers.removeSavedPost);

module.exports = postrouter;