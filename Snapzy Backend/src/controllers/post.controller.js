const mongoose = require("mongoose");

const postModel = require("../models/post.model");
const userModel = require("../models/user.model");
const likeModel = require("../models/like.model");

const { uploadFile, imagekit } = require('../services/storage.services');
const commentModel = require("../models/comment.model");

async function createPost(req, res) {

    try {

        if (!req.file) {
            return res.status(400).json({
                message: "Image is required"
            });
        }

        // Upload image
        const result = await uploadFile(
            req.file.buffer,
            req.file.mimetype
        );

        //Get User 
        const userId = req.user._id;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        const { caption, location, hashtags } = req.body;

        let hashtagArray

        if (hashtags) {
            hashtagArray = Array.isArray(hashtags)
                ? hashtags
                : hashtags
                    .split(/\s+/)
                    .map(tag => tag.replace(/^#/, ""))
                    .filter(Boolean);
        }

        // Create a post
        const post = await postModel.create({
            image: result.url,
            imageFileId: result.fileId,
            caption: caption,
            location: location,
            hashtags: hashtagArray,
            user: userId,
        });

        res.status(201).json({
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

        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }


}

async function getAllPost(req, res) {

    try {

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const skip = (page - 1) * limit;


        const posts = await postModel
            .find()
            .populate("user", "username profilePicture")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            message: "Posts fetched successfully",
            page,
            limit,
            posts
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });

    }

}

async function getPost(req, res) {

    try {

        //Get Post Id
        const postId = req.params.postid;

        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                message: "Invalid post ID"
            });
        }

        // Find Post
        const post = await postModel
            .findById(postId)
            .populate("user", "username profilePicture");


        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        res.status(200).json({
            message: "Post found successfully",
            post
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }


}

async function updatePost(req, res) {
    try {

        //Get Post Id
        const postId = req.params.postid;

        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                message: "Invalid post ID"
            });
        }

        // Find Post
        const post = await postModel
            .findById(postId)

        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        // Get caption
        const { caption, location, hashtags } = req.body;

        let hashtagArray = [];

        if (hashtags) {
            hashtagArray = Array.isArray(hashtags)
                ? hashtags
                : hashtags
                    .split(/\s+/)
                    .map(tag => tag.replace(/^#/, ""))
                    .filter(Boolean);
        }

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
        );

        if (!UpdatedPost) {
            return res.status(404).json({
                message: "Post not found or you are not allowed to update it"
            });
        }

        res.status(200).json({
            message: "Post updated successfully",
            UpdatedPost
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }

}

async function deletePost(req, res) {

    try {

        //Get Post Id
        const postId = req.params.postid;

        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                message: "Invalid post ID"
            });
        }

        //Get Post By Id
        const post = await postModel
            .findById({ _id: postId })
            .select("+imageFileId")
            .populate("user", "_id");

        // Check post exists
        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        // Get post creator
        const postUserId = post.user._id;

        // Check whether logged-in user created this post
        const userId = req.user._id

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

        // Delete image from ImageKit
        if (post.imageFileId) {
            try {
                await imagekit.files.delete(post.imageFileId);
            } catch (imgError) {
                console.warn(`Failed to delete ImageKit file ${post.imageFileId}:`, imgError.message);
            }
        }

        // Delete all likes of Post
        await likeModel.deleteMany({
            post: postId
        });

        // Delete all comments of Post
        await commentModel.deleteMany({
            post: postId
        });

        // Delete Post
        await postModel.findOneAndDelete(
            { _id: postId }
        );

        res.status(200).json({
            message: "Post Deleted successfully",
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }

}

async function addSavedPost(req, res) {
    try {
        const userId = req.user._id;
        const postId = req.params.postid;

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

        const isSaved = user.savedPosts.some(
            (id) => id.toString() === postId
        );

        if (isSaved) {
            return res.status(409).json({
                message: "Post is already saved"
            });
        }

        await userModel.findByIdAndUpdate(userId, {
            $addToSet: {
                savedPosts: postId
            }
        });

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

async function removeSavedPost(req, res) {
    try {
        const userId = req.user._id;
        const postId = req.params.postid;

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

        const isSaved = user.savedPosts.some(
            (id) => id.toString() === postId
        );

        if (!isSaved) {
            return res.status(404).json({
                message: "Post is not saved"
            });
        }

        await userModel.findByIdAndUpdate(userId, {
            $pull: {
                savedPosts: postId
            }
        });

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

module.exports = { createPost, getAllPost, updatePost, deletePost, getPost, addSavedPost, removeSavedPost }