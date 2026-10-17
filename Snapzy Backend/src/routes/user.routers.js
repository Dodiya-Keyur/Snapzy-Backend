const express = require("express");

// Middleware
const userAuth = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

// Controllers
const userControllers = require("../controllers/user.controllers");

const userrouter = express.Router();

// Current authenticated user profile and content endpoints
userrouter.get("/me", userAuth, userControllers.getUser);
userrouter.get("/me/posts", userAuth, userControllers.getUserPost);
userrouter.get("/me/liked-post", userAuth, userControllers.getLikedPost);
userrouter.get("/me/saved-posts", userAuth, userControllers.getSavedPost);
userrouter.get("/me/activities", userAuth, userControllers.getUserActivities);
userrouter.get("/me/followers", userAuth, userControllers.getFollowers);
userrouter.get("/me/following", userAuth, userControllers.getFollowing);
userrouter.get("/me/account-info", userAuth, userControllers.getAccountInfo);
userrouter.get("/me/settings", userAuth, userControllers.getUserSettings);
userrouter.patch("/me/settings", userAuth, userControllers.updateUserSettings);

// Random suggested users endpoints
userrouter.get("/suggested", userAuth, userControllers.getSuggestedUsers);
userrouter.get("/suggestions", userAuth, userControllers.getSuggestedUsers);

// Target user profile and posts by user ID
userrouter.get("/:userid", userAuth, userControllers.getUserById);
userrouter.get("/:userid/posts", userAuth, userControllers.getUserPostsById);

// Profile text updates
userrouter.patch("/me/update-profile", userAuth, userControllers.updateProfile);

// Profile picture upload and deletion endpoints
userrouter.patch("/me/update-profile-picture", userAuth, upload.single("image"), userControllers.updateProfilePicture);
userrouter.delete("/me/delete-profile-picture", userAuth, userControllers.deleteProfilePicture);

// Permanent user account deletion endpoint
userrouter.delete("/me/delete-user", userAuth, userControllers.deleteUser);

module.exports = userrouter;