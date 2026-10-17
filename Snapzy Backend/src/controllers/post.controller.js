const mongoose = require("mongoose");

const postModel = require("../models/post.model");
const userModel = require("../models/user.model");
const likeModel = require("../models/like.model");
const followModel = require("../models/follow.model");
const commentModel = require("../models/comment.model");

const { uploadFile, imagekit } = require('../services/storage.services');

// Create a new post with image upload
async function createPost(req, res) {
    try {
        // Validate that an image file was provided in the request
        if (!req.file) {
            return res.status(400).json({
                message: "Image is required"
            });
        }

        // Upload image to ImageKit cloud storage
        const result = await uploadFile(
            req.file.buffer,
            req.file.mimetype
        );

        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Extract caption, location, and hashtags from request body
        const { caption, location, hashtags } = req.body;

        // Parse hashtags into array format
        let hashtagArray;
        if (hashtags) {
            hashtagArray = Array.isArray(hashtags)
                ? hashtags
                : hashtags
                    .split(/\s+/)
                    .map(tag => tag.replace(/^#/, ""))
                    .filter(Boolean);
        }

        // Create new post record in database
        const post = await postModel.create({
            image: result.url,
            imageFileId: result.fileId,
            caption: caption,
            location: location,
            hashtags: hashtagArray,
            user: userId,
        });

        // Populate author details for the newly created post
        await post.populate("user", "_id username name profilePicture");

        // Return created post with 201 status
        return res.status(201).json({
            message: "Post created successfully",
            post
        });

    } catch (error) {
        console.error(error);

        if (error.code === 11000) {
            return res.status(400).json({
                message: "Post already Created"
            });
        }

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Fetch all posts for the global feed with pagination and user interaction states
async function getAllPost(req, res) {
    try {
        // Parse pagination parameters page and limit from query string
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        // Calculate offset count for database skip
        const skip = (page - 1) * limit;

        // Query posts from database with author populated and sorted by newest first
        const posts = await postModel
            .find()
            .populate("user", "_id username name profilePicture")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Extract authenticated user ID
        const currentUserId = req.user?._id;

        // Return early if no user is authenticated or no posts were found
        if (!currentUserId || posts.length === 0) {
            return res.status(200).json({
                message: "Posts fetched successfully",
                page,
                limit,
                posts
            });
        }

        // Collect all post IDs and author IDs to query interactions in bulk
        const postIds = posts.map((p) => p._id);
        const authorIds = posts
            .map((p) => p.user?._id || p.user)
            .filter(Boolean);

        // Fetch user likes, followings, and saved posts in parallel
        const [userLikes, userFollows, currentUserDoc] = await Promise.all([
            likeModel
                .find({ user: currentUserId, post: { $in: postIds } })
                .select("post")
                .lean(),
            followModel
                .find({ follower: currentUserId, following: { $in: authorIds } })
                .select("following")
                .lean(),
            userModel
                .findById(currentUserId)
                .select("savedPosts")
                .lean(),
        ]);

        // Convert interaction arrays into fast lookup Sets
        const likedPostSet = new Set(userLikes.map((l) => l.post.toString()));
        const followedUserSet = new Set(
            userFollows.map((f) => f.following.toString())
        );
        const savedPostSet = new Set(
            (currentUserDoc?.savedPosts || []).map((id) => id.toString())
        );

        // Enrich post objects with boolean flags isLiked, isSaved, and isFollowing
        const enrichedPosts = posts.map((post) => {
            const postObj = post.toObject ? post.toObject() : { ...post };
            const pId = postObj._id.toString();
            const authorId =
                postObj.user?._id?.toString() || postObj.user?.toString();

            postObj.isLiked = likedPostSet.has(pId);
            postObj.isSaved = savedPostSet.has(pId);
            if (postObj.user && typeof postObj.user === "object") {
                postObj.user.isFollowing = authorId
                    ? followedUserSet.has(authorId)
                    : false;
            }

            return postObj;
        });

        // Return paginated and enriched post feed
        return res.status(200).json({
            message: "Posts fetched successfully",
            page,
            limit,
            posts: enrichedPosts
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Fetch single post details by ID
async function getPost(req, res) {
    try {
        // Extract post ID from request parameters
        const postId = req.params.postid;

        // Validate post ID format
        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                message: "Invalid post ID"
            });
        }

        // Query database for post and populate author details
        const post = await postModel
            .findById(postId)
            .populate("user", "_id username name profilePicture");

        // Return 404 if post does not exist
        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        // Check interaction state for authenticated user
        const currentUserId = req.user?._id;
        let postObj = post.toObject ? post.toObject() : { ...post };

        if (currentUserId) {
            const authorId = postObj.user?._id || postObj.user;
            const [likeDoc, followDoc, currentUserDoc] = await Promise.all([
                likeModel.findOne({ user: currentUserId, post: postId }).select("_id").lean(),
                authorId ? followModel.findOne({ follower: currentUserId, following: authorId }).select("_id").lean() : null,
                userModel.findById(currentUserId).select("savedPosts").lean()
            ]);

            postObj.isLiked = Boolean(likeDoc);
            postObj.isSaved = (currentUserDoc?.savedPosts || []).some(id => id.toString() === postId.toString());
            if (postObj.user && typeof postObj.user === "object") {
                postObj.user.isFollowing = Boolean(followDoc);
            }
        }

        // Return post details
        return res.status(200).json({
            message: "Post found successfully",
            post: postObj
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Update post caption, location, or hashtags
async function updatePost(req, res) {
    try {
        // Extract post ID from request parameters
        const postId = req.params.postid;

        // Validate post ID format
        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                message: "Invalid post ID"
            });
        }

        // Check if post exists in database
        const post = await postModel.findById(postId);
        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        // Extract updated fields from request body
        const { caption, location, hashtags } = req.body;

        // Parse hashtags into array format
        let hashtagArray = [];
        if (hashtags) {
            hashtagArray = Array.isArray(hashtags)
                ? hashtags
                : hashtags
                    .split(/\s+/)
                    .map(tag => tag.replace(/^#/, ""))
                    .filter(Boolean);
        }

        // Update post document where user is the author
        const UpdatedPost = await postModel.findOneAndUpdate(
            {
                _id: postId,
                user: req.user._id
            },
            {
                caption,
                hashtags: hashtagArray,
                location,
            },
            {
                returnDocument: "after",
                runValidators: true
            }
        ).populate("user", "_id username name profilePicture");

        if (!UpdatedPost) {
            return res.status(404).json({
                message: "Post not found or you are not allowed to update it"
            });
        }

        // Return updated post
        return res.status(200).json({
            message: "Post updated successfully",
            UpdatedPost
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Delete post, associated image, likes, and comments
async function deletePost(req, res) {
    try {
        // Extract post ID from request parameters
        const postId = req.params.postid;

        // Validate post ID format
        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                message: "Invalid post ID"
            });
        }

        // Find post and retrieve stored imageFileId
        const post = await postModel
            .findById({ _id: postId })
            .select("+imageFileId")
            .populate("user", "_id");

        // Verify that post exists
        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        // Verify that authenticated user is the post author
        const postUserId = post.user._id;
        const userId = req.user._id;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        if (userId.toString() !== postUserId.toString()) {
            return res.status(403).json({
                message: "You are not allowed to delete this post"
            });
        }

        // Delete image file from ImageKit cloud storage
        if (post.imageFileId) {
            try {
                await imagekit.files.delete(post.imageFileId);
            } catch (imgError) {
                console.warn(`Failed to delete ImageKit file ${post.imageFileId}:`, imgError.message);
            }
        }

        // Delete all likes associated with this post
        await likeModel.deleteMany({
            post: postId
        });

        // Delete all comments and replies associated with this post
        await commentModel.deleteMany({
            post: postId
        });

        // Delete post document from database
        await postModel.findOneAndDelete(
            { _id: postId }
        );

        // Return confirmation response
        return res.status(200).json({
            message: "Post Deleted successfully",
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Add a post to user's saved collection
async function addSavedPost(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Extract post ID from request parameters
        const postId = req.params.postid;

        // Validate user and post ID formats
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                message: "Invalid post ID"
            });
        }

        // Check if user and post exist in database
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const post = await postModel.findById(postId);
        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        // Check if post is already saved
        const isSaved = user.savedPosts.some(
            (id) => id.toString() === postId
        );

        if (isSaved) {
            return res.status(409).json({
                message: "Post is already saved"
            });
        }

        // Add post ID to savedPosts array without duplicates
        await userModel.findByIdAndUpdate(userId, {
            $addToSet: {
                savedPosts: postId
            }
        });

        // Return success response
        return res.status(200).json({
            message: "Post saved successfully"
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Remove a post from user's saved collection
async function removeSavedPost(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Extract post ID from request parameters
        const postId = req.params.postid;

        // Validate user and post ID formats
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                message: "Invalid post ID"
            });
        }

        // Check if user and post exist in database
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const post = await postModel.findById(postId);
        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        // Check if post is currently in saved collection
        const isSaved = user.savedPosts.some(
            (id) => id.toString() === postId
        );

        if (!isSaved) {
            return res.status(404).json({
                message: "Post is not saved"
            });
        }

        // Remove post ID from user's savedPosts array
        await userModel.findByIdAndUpdate(userId, {
            $pull: {
                savedPosts: postId
            }
        });

        // Return confirmation response
        return res.status(200).json({
            message: "Post removed from saved posts successfully"
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

module.exports = { createPost, getAllPost, updatePost, deletePost, getPost, addSavedPost, removeSavedPost };