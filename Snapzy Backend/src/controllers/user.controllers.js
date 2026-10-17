const mongoose = require("mongoose");

const postModel = require("../models/post.model");
const userModel = require("../models/user.model");
const likeModel = require("../models/like.model");
const followModel = require("../models/follow.model");
const commentModel = require("../models/comment.model");

const { uploadFile, imagekit } = require('../services/storage.services');

const DEFAULT_PROFILE_PICTURE =
    "https://i.pinimg.com/474x/64/99/f8/6499f89b3bd815780d60f2cbc210b2bd.jpg";

// Fetch profile details and follower counts for the logged-in user
async function getUser(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Query user profile fields from database
        const User = await userModel.findById(userId).select("_id username name email role profilePicture bio createdAt updatedAt settings");
        if (!User) {
            return res.status(404).json({ message: "User not found" });
        }

        // Count total followers for user
        const followersCount = await followModel.countDocuments({
            following: userId
        });

        // Count total followings for user
        const followingCount = await followModel.countDocuments({
            follower: userId
        });

        // Return user profile and follower counts
        return res.status(200).json({
            message: "User fetched successfully",
            User,
            followersCount,
            followingCount
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Fetch all posts created by the authenticated user
async function getUserPost(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Fetch all posts authored by user sorted by newest first
        const posts = await postModel
            .find({ user: userId })
            .sort({ createdAt: -1 })
            .populate("user", "_id username name profilePicture");

        // Return user posts list
        return res.status(200).json({
            message: "User All posts fetched successfully",
            posts
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Fetch user profile and stats by specific user ID
async function getUserById(req, res) {
    try {
        // Extract target user ID from request parameters
        const userId = req.params.userid;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        // Query target user profile from database
        const User = await userModel
            .findById(userId)
            .select("_id username name email profilePicture bio createdAt");

        if (!User) {
            return res.status(404).json({ message: "User not found" });
        }

        // Count followers for target user
        const followersCount = await followModel.countDocuments({
            following: userId
        });

        // Count followings for target user
        const followingCount = await followModel.countDocuments({
            follower: userId
        });

        // Return target user profile and stats
        return res.status(200).json({
            message: "User fetched successfully",
            User,
            followersCount,
            followingCount
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Fetch all posts created by a specific user ID
async function getUserPostsById(req, res) {
    try {
        // Extract target user ID from request parameters
        const userId = req.params.userid;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        // Check if target user exists in database
        const User = await userModel.findById(userId);
        if (!User) {
            return res.status(404).json({ message: "User not found" });
        }

        // Query all posts authored by target user
        const posts = await postModel
            .find({ user: userId })
            .sort({ createdAt: -1 })
            .populate("user", "_id username name profilePicture");

        // Return user posts list
        return res.status(200).json({
            message: "User Posts fetched successfully",
            posts
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Update profile fields (name, username, bio) for current user
async function updateProfile(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Check if user exists in database
        const User = await userModel.findById(userId);
        if (!User) {
            return res.status(404).json({ message: "User not found" });
        }

        // Extract bio, username, and name from request body
        const { bio, username, name } = req.body;
        const normalizedUsername = username.trim().toLowerCase();

        // Check if username is already used by another account
        const usernameExists = await userModel.findOne({
            username: normalizedUsername,
            _id: { $ne: userId }
        });

        if (usernameExists) {
            return res.status(409).json({
                message: "Username already exists"
            });
        }

        // Update user profile fields in database
        await userModel.findOneAndUpdate(
            { _id: userId },
            {
                bio,
                username: normalizedUsername,
                name
            },
            {
                returnDocument: "after",
                runValidators: true
            }
        );

        // Return profile update confirmation response
        return res.status(200).json({
            message: "User Profile Update successfully",
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Upload and update user profile picture
async function updateProfilePicture(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Query user and include profilePictureFileId
        const User = await userModel
            .findById(userId)
            .select("+profilePictureFileId");

        if (!User) {
            return res.status(404).json({ message: "User not found" });
        }

        const oldFile = User.profilePicture;
        const oldFileId = User.profilePictureFileId;

        // Validate that an image file was uploaded
        if (!req.file) {
            return res.status(400).json({
                message: "Image is required"
            });
        }

        // Upload new image to ImageKit cloud storage
        const result = await uploadFile(
            req.file.buffer,
            req.file.mimetype
        );

        // Update profile picture URL and file ID in database
        await userModel.findOneAndUpdate(
            { _id: userId },
            {
                profilePicture: result.url || oldFile,
                profilePictureFileId: result.fileId || oldFileId,
            },
            {
                returnDocument: "after",
                runValidators: true
            }
        );

        // Delete old profile picture from ImageKit if exists
        if (oldFileId) {
            try {
                await imagekit.files.delete(oldFileId);
            } catch (error) {
                console.error("Error deleting old profile picture:", error);
            }
        }

        // Return profile picture update confirmation
        return res.status(200).json({
            message: "User Profile Picture Update successfully",
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Reset profile picture back to default avatar
async function deleteProfilePicture(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Query user and include profilePictureFileId
        const User = await userModel
            .findById(userId)
            .select("+profilePictureFileId");

        if (!User) {
            return res.status(404).json({ message: "User not found" });
        }

        // Delete custom avatar file from ImageKit
        if (User.profilePictureFileId) {
            try {
                await imagekit.files.delete(User.profilePictureFileId);
            } catch (delErr) {
                console.warn("Failed to delete ImageKit avatar:", delErr.message);
            }
        }

        // Reset profile picture to default avatar in database
        await userModel.findOneAndUpdate(
            { _id: userId },
            {
                profilePicture: DEFAULT_PROFILE_PICTURE,
                profilePictureFileId: null
            },
            {
                returnDocument: "after",
                runValidators: true
            }
        );

        // Return avatar reset confirmation response
        return res.status(200).json({
            message: "Profile Picture Deleted successfully",
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Permanently delete user account and all associated resources
async function deleteUser(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Query user document including file IDs
        const User = await userModel
            .findById(userId)
            .select("+profilePictureFileId");

        if (!User) {
            return res.status(404).json({ message: "User not found" });
        }

        // Find all posts created by user with image file IDs
        const posts = await postModel
            .find({ user: userId })
            .select("+imageFileId");

        // Delete all post images from ImageKit cloud storage
        for (const post of posts) {
            if (post.imageFileId) {
                try {
                    await imagekit.files.delete(post.imageFileId);
                } catch (error) {
                    console.log(
                        `Failed to delete ImageKit file ${post.imageFileId}:`,
                        error.message
                    );
                }
            }
        }

        // Delete all posts created by user
        await postModel.deleteMany({ user: userId });

        // Delete profile picture from ImageKit
        if (User.profilePictureFileId) {
            try {
                await imagekit.files.delete(User.profilePictureFileId);
            } catch (error) {
                console.log("Failed to delete profile picture:", error.message);
            }
        }

        // Delete all likes created by user
        await likeModel.deleteMany({ user: userId });

        // Delete all comments created by user
        await commentModel.deleteMany({ user: userId });

        // Delete all follow connections involving user
        await followModel.deleteMany({
            $or: [{ follower: userId }, { following: userId }]
        });

        // Delete user document from database
        await userModel.findOneAndDelete({ _id: userId });

        // Clear session token cookie
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
        });

        // Return account deletion confirmation
        return res.status(200).json({
            message: "User deleted successfully"
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Fetch all posts liked by current user
async function getLikedPost(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Query likes by user and populate post and author information
        const likedPost = await likeModel
            .find({ user: userId })
            .populate({
                path: "post",
                populate: {
                    path: "user",
                    select: "_id username name profilePicture"
                }
            })
            .sort({ createdAt: -1 });

        // Return user liked posts
        return res.status(200).json({
            message: "User All Liked Posts fetched successfully",
            likedPost
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Fetch all posts saved by current user
async function getSavedPost(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Query user and populate saved posts with author details
        const user = await userModel
            .findById(userId)
            .select("savedPosts")
            .populate({
                path: "savedPosts",
                populate: {
                    path: "user",
                    select: "_id username name profilePicture"
                }
            });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Return saved posts list
        return res.status(200).json({
            message: "User all saved posts fetched successfully",
            savedPosts: user.savedPosts
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Fetch followers list for current user
async function getFollowers(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Query follow relationships where current user is the target
        const followers = await followModel
            .find({ following: userId })
            .populate("follower", "_id username name profilePicture");

        // Return followers list
        return res.status(200).json({
            message: "Followers fetched successfully",
            followers
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Fetch following list for current user
async function getFollowing(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Query follow relationships where current user is the follower
        const following = await followModel
            .find({ follower: userId })
            .populate("following", "_id username name profilePicture");

        // Return following list
        return res.status(200).json({
            message: "Following fetched successfully",
            following
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Fetch consolidated user activity history (likes, comments, saves, follows)
async function getUserActivities(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Fetch likes, comments, saved posts, and follows in parallel
        const [likes, comments, userWithSaved, follows] = await Promise.all([
            likeModel
                .find({ user: userId })
                .populate({
                    path: "post",
                    populate: {
                        path: "user",
                        select: "_id username name profilePicture"
                    }
                })
                .sort({ createdAt: -1 }),

            commentModel
                .find({ user: userId })
                .populate({
                    path: "post",
                    populate: {
                        path: "user",
                        select: "_id username name profilePicture"
                    }
                })
                .sort({ createdAt: -1 }),

            userModel
                .findById(userId)
                .select("savedPosts updatedAt")
                .populate({
                    path: "savedPosts",
                    populate: {
                        path: "user",
                        select: "_id username name profilePicture"
                    }
                }),

            followModel
                .find({ follower: userId })
                .populate("following", "_id username name profilePicture")
                .sort({ createdAt: -1 })
        ]);

        // Normalize like activities
        const likeActivities = (likes || [])
            .filter((item) => item.post)
            .map((item) => {
                const post = item.post;
                const author = post.user || {};
                return {
                    id: `like_${item._id}`,
                    type: "like",
                    createdAt: item.createdAt,
                    postId: post._id,
                    postImage: post.image,
                    caption: post.caption || "",
                    likesCount: post.likesCount || 0,
                    commentCount: post.commentCount || 0,
                    username: author.username || author.name || "user",
                    name: author.name || author.username || "",
                    avatar: author.profilePicture || DEFAULT_PROFILE_PICTURE,
                    userId: author._id || author
                };
            });

        // Normalize comment activities
        const commentActivities = (comments || [])
            .filter((item) => item.post)
            .map((item) => {
                const post = item.post;
                const author = post.user || {};
                return {
                    id: `comment_${item._id}`,
                    type: "comment",
                    createdAt: item.createdAt,
                    postId: post._id,
                    postImage: post.image,
                    caption: post.caption || "",
                    likesCount: post.likesCount || 0,
                    commentCount: post.commentCount || 0,
                    commentText: item.commentText,
                    username: author.username || author.name || "user",
                    name: author.name || author.username || "",
                    avatar: author.profilePicture || DEFAULT_PROFILE_PICTURE,
                    userId: author._id || author
                };
            });

        // Normalize saved post activities
        const savedPostsList = (userWithSaved?.savedPosts || []).filter(Boolean);
        const saveActivities = savedPostsList.map((post) => {
            const author = post.user || {};
            return {
                id: `save_${post._id}`,
                type: "save",
                createdAt: post.createdAt || userWithSaved.updatedAt,
                postId: post._id,
                postImage: post.image,
                caption: post.caption || "",
                likesCount: post.likesCount || 0,
                commentCount: post.commentCount || 0,
                username: author.username || author.name || "user",
                name: author.name || author.username || "",
                avatar: author.profilePicture || DEFAULT_PROFILE_PICTURE,
                userId: author._id || author
            };
        });

        // Normalize follow activities
        const followActivities = (follows || [])
            .filter((item) => item.following)
            .map((item) => {
                const followed = item.following || {};
                return {
                    id: `follow_${item._id}`,
                    type: "follow",
                    createdAt: item.createdAt,
                    username: followed.username || followed.name || "user",
                    name: followed.name || followed.username || "",
                    avatar: followed.profilePicture || DEFAULT_PROFILE_PICTURE,
                    caption: followed.name || (followed.username ? `@${followed.username}` : ""),
                    userId: followed._id || followed
                };
            });

        // Combine and sort all activities by newest first
        const allActivities = [
            ...likeActivities,
            ...commentActivities,
            ...saveActivities,
            ...followActivities
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Calculate summary counts for activity filters
        const stats = {
            all: allActivities.length,
            like: likeActivities.length,
            comment: commentActivities.length,
            save: saveActivities.length,
            follow: followActivities.length
        };

        // Return combined activities and filter stats
        return res.status(200).json({
            success: true,
            message: "User activities fetched successfully",
            stats,
            activities: allActivities
        });

    } catch (error) {
        console.error("getUserActivities error:", error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Fetch suggested users with random sampling and recommendation reasons
async function getSuggestedUsers(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid User ID"
            });
        }

        // Get list of users the current user is already following
        const followingDocs = await followModel
            .find({ follower: userId })
            .select("following");
        const followingIds = followingDocs
            .map((f) => f.following)
            .filter(Boolean);

        const currentObjId = new mongoose.Types.ObjectId(userId);
        const followingObjIds = followingIds.map(
            (id) => new mongoose.Types.ObjectId(id)
        );

        // Exclude current user and already followed users from suggestions
        const excludeObjIds = [currentObjId, ...followingObjIds];

        // Fetch up to 5 random users from database who are not yet followed
        let suggestedUsers = await userModel.aggregate([
            { $match: { _id: { $nin: excludeObjIds } } },
            { $sample: { size: 5 } },
            {
                $project: {
                    _id: 1,
                    username: 1,
                    name: 1,
                    profilePicture: 1,
                    bio: 1,
                    createdAt: 1
                }
            }
        ]);

        // Fallback to random users excluding only self if database has few unfollowed users
        if (suggestedUsers.length < 5) {
            const alreadyPickedIds = [
                currentObjId,
                ...suggestedUsers.map((u) => new mongoose.Types.ObjectId(u._id))
            ];

            const fallbackUsers = await userModel.aggregate([
                { $match: { _id: { $nin: alreadyPickedIds } } },
                { $sample: { size: 5 - suggestedUsers.length } },
                {
                    $project: {
                        _id: 1,
                        username: 1,
                        name: 1,
                        profilePicture: 1,
                        bio: 1,
                        createdAt: 1
                    }
                }
            ]);

            suggestedUsers = [...suggestedUsers, ...fallbackUsers];
        }

        const followingSet = new Set(followingIds.map((id) => id.toString()));

        // Enrich suggested users with social graph reasons (e.g. Followed by someone, New to Snapzy)
        const enrichedUsers = await Promise.all(
            suggestedUsers.map(async (u) => {
                const uId = u._id;
                const isFollowing = followingSet.has(uId.toString());

                let reason = "Suggested for you";

                if (followingObjIds.length > 0) {
                    const mutualFollows = await followModel
                        .find({
                            follower: { $in: followingObjIds },
                            following: uId
                        })
                        .populate("follower", "username name")
                        .limit(5);

                    if (mutualFollows.length === 1) {
                        const followerName =
                            mutualFollows[0].follower?.username ||
                            mutualFollows[0].follower?.name ||
                            "someone you follow";
                        reason = `Followed by ${followerName}`;
                    } else if (mutualFollows.length > 1) {
                        const firstFollower =
                            mutualFollows[0].follower?.username ||
                            mutualFollows[0].follower?.name ||
                            "someone";
                        reason = `Followed by ${firstFollower} + ${mutualFollows.length - 1} more`;
                    }
                }

                if (reason === "Suggested for you" && u.createdAt) {
                    const daysAgo =
                        (Date.now() - new Date(u.createdAt).getTime()) /
                        (1000 * 60 * 60 * 24);
                    if (daysAgo <= 30) {
                        reason = "New to Snapzy";
                    }
                }

                return {
                    _id: u._id,
                    username: u.username,
                    name: u.name || u.username,
                    profilePicture: u.profilePicture || DEFAULT_PROFILE_PICTURE,
                    bio: u.bio || "",
                    reason,
                    isFollowing
                };
            })
        );

        // Return suggested users list
        return res.status(200).json({
            success: true,
            message: "Suggested users fetched successfully",
            users: enrichedUsers
        });

    } catch (error) {
        console.error("getSuggestedUsers error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

// Fetch comprehensive account information (creation date, private details, stats)
async function getAccountInfo(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid User ID"
            });
        }

        // Query user details from database
        const user = await userModel
            .findById(userId)
            .select("_id username name email role profilePicture bio createdAt updatedAt settings savedPosts");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Fetch counts for posts, followers, followings, and likes in parallel
        const [postsCount, followersCount, followingCount, likedPostsCount] = await Promise.all([
            postModel.countDocuments({ user: userId }),
            followModel.countDocuments({ following: userId }),
            followModel.countDocuments({ follower: userId }),
            likeModel.countDocuments({ user: userId })
        ]);

        const savedPostsCount = Array.isArray(user.savedPosts) ? user.savedPosts.length : 0;

        // Return account information details
        return res.status(200).json({
            success: true,
            message: "Account information fetched successfully",
            account: {
                _id: user._id,
                username: user.username,
                name: user.name || "",
                email: user.email,
                role: user.role || "user",
                profilePicture: user.profilePicture || DEFAULT_PROFILE_PICTURE,
                bio: user.bio || "",
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                settings: user.settings || {
                    privateAccount: false,
                    activityStatus: true,
                    notifications: {
                        likes: true,
                        comments: true,
                        follows: true,
                        replies: true
                    }
                },
                stats: {
                    postsCount,
                    followersCount,
                    followingCount,
                    savedPostsCount,
                    likedPostsCount
                }
            }
        });

    } catch (error) {
        console.error("getAccountInfo error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

// Fetch user settings and preferences
async function getUserSettings(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid User ID"
            });
        }

        // Query settings field from user document
        const user = await userModel.findById(userId).select("settings");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Define default settings structure
        const defaultSettings = {
            privateAccount: false,
            activityStatus: true,
            notifications: {
                likes: true,
                comments: true,
                follows: true,
                replies: true
            }
        };

        // Merge saved settings with defaults
        const currentSettings = user.settings
            ? {
                ...defaultSettings,
                ...(user.settings.toObject ? user.settings.toObject() : user.settings),
                notifications: {
                    ...defaultSettings.notifications,
                    ...(user.settings.notifications || {})
                }
            }
            : defaultSettings;

        // Return current user settings
        return res.status(200).json({
            success: true,
            settings: currentSettings
        });

    } catch (error) {
        console.error("getUserSettings error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

// Update user settings and notification preferences
async function updateUserSettings(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid User ID"
            });
        }

        // Extract settings updates from request body
        const { privateAccount, activityStatus, notifications } = req.body;

        // Build dynamic dot-notation update fields
        const updateFields = {};
        if (typeof privateAccount === "boolean") {
            updateFields["settings.privateAccount"] = privateAccount;
        }
        if (typeof activityStatus === "boolean") {
            updateFields["settings.activityStatus"] = activityStatus;
        }
        if (notifications && typeof notifications === "object") {
            if (typeof notifications.likes === "boolean") {
                updateFields["settings.notifications.likes"] = notifications.likes;
            }
            if (typeof notifications.comments === "boolean") {
                updateFields["settings.notifications.comments"] = notifications.comments;
            }
            if (typeof notifications.follows === "boolean") {
                updateFields["settings.notifications.follows"] = notifications.follows;
            }
            if (typeof notifications.replies === "boolean") {
                updateFields["settings.notifications.replies"] = notifications.replies;
            }
        }

        // Update settings in database
        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).select("settings");

        // Return updated settings
        return res.status(200).json({
            success: true,
            message: "Settings updated successfully",
            settings: updatedUser?.settings
        });

    } catch (error) {
        console.error("updateUserSettings error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

module.exports = {
    getUser,
    getUserPost,
    getUserById,
    updateProfile,
    updateProfilePicture,
    deleteProfilePicture,
    deleteUser,
    getUserPostsById,
    getLikedPost,
    getSavedPost,
    getFollowers,
    getFollowing,
    getUserActivities,
    getSuggestedUsers,
    getAccountInfo,
    getUserSettings,
    updateUserSettings
};