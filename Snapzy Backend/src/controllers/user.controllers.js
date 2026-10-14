const mongoose = require("mongoose");

const postModel = require("../models/post.model");
const userModel = require("../models/user.model");
const likeModel = require("../models/like.model");
const followModel = require("../models/follow.model");


const { uploadFile, imagekit } = require('../services/storage.services')

const DEFAULT_PROFILE_PICTURE =
    "https://i.pinimg.com/474x/64/99/f8/6499f89b3bd815780d60f2cbc210b2bd.jpg";


async function getUser(req, res) {

    try {

        const userId = req.user._id;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        const User = await userModel.findById(userId).select("_id username email profilePicture bio createdAt");

        if (!User) {
            return res.status(404).json({ message: "User not found" });
        }

        const followersCount = await followModel.countDocuments({
            following: userId
        });

        const followingCount = await followModel.countDocuments({
            follower: userId
        });

        return res.status(200).json({
            message: "User fetched successfully",
            User,
            followersCount,
            followingCount
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }

}

async function getUserPost(req, res) {

    try {

        const userId = req.user._id

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        const posts = await postModel
            .find({ user: userId })
            .sort({ createdAt: -1 })
            .populate("user", "username profilePicture");

        res.status(200).json({
            message: "User All posts fetched successfully",
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

async function getUserById(req, res) {

    try {

        const userId = req.params.userid;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        const User = await userModel
            .findById(userId)
            .select("_id username profilePicture bio")

        if (!User) {
            return res.status(404).json({ message: "User not found" });
        }

        const followersCount = await followModel.countDocuments({
            following: userId
        });

        const followingCount = await followModel.countDocuments({
            follower: userId
        });

        return res.status(200).json({
            message: "User fetched successfully",
            User,
            followersCount,
            followingCount
        });



    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }

}

async function getUserPostsById(req, res) {

    try {

        const userId = req.params.userid;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        const User = await userModel.findById(userId);

        if (!User) {
            return res.status(404).json({ message: "User not found" });
        }

        const posts = await postModel
            .find({ user: userId })
            .populate("user", "username profilePicture");

        res.status(200).json({
            message: "User Posts fetched successfully",
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

async function updateProfile(req, res) {

    try {

        const userId = req.user._id;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        const User = await userModel.findById(userId);

        if (!User) {
            return res.status(404).json({ message: "User not found" });
        }

        const { bio, username, name } = req.body;

        const normalizedUsername = username.trim().toLowerCase();

        // Check if username is already used by another user
        const usernameExists = await userModel
            .findOne(
                {
                    username: normalizedUsername,
                    _id: { $ne: userId }
                });

        if (usernameExists) {
            return res.status(409).json({
                message: "Username already exists"
            });
        }

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

        res.status(200).json({
            message: "User Profile Update successfully",
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }


}

async function updateProfilePicture(req, res) {

    try {

        const userId = req.user._id;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        const User = await userModel
            .findById(userId)
            .select("+profilePictureFileId");;

        if (!User) {
            return res.status(404).json({ message: "User not found" });
        }
        const oldFile = User.profilePicture;
        const oldFileId = User.profilePictureFileId;


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

        if (oldFileId) {
            try {
                await imagekit.files.delete(oldFileId);
            } catch (error) {
                console.error(error);
            }
        }

        res.status(200).json({
            message: "User Profile Picture Update successfully",
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }


}

async function deleteProfilePicture(req, res) {

    try {

        const userId = req.user._id;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        const User = await userModel
            .findById(userId)
            .select("+profilePictureFileId");;

        if (!User) {
            return res.status(404).json({ message: "User not found" });
        }

        if (User.profilePictureFileId) {
            await imagekit.files.delete(User.profilePictureFileId);
        }

        userModel.findOneAndUpdate(
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

        res.status(200).json({
            message: "Profile Picture Deleted successfully",
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }

}

async function deleteUser(req, res) {

    try {

        // Find logged-in user
        const userId = req.user._id

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Find user
        const User = await userModel
            .findById(userId)
            .select("+profilePictureFileId");

        if (!User) {
            return res.status(404).json({ message: "User not found" });
        }

        // Find all posts created by this user
        const posts = await postModel.
            find({ user: userId, })
            .select("+imageFileId");

        // Delete all post images from ImageKit
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

        // Delete all posts created by this user
        await postModel.deleteMany({
            user: userId,
        });

        // Delete profile picture from ImageKit
        if (User.profilePictureFileId) {
            try {
                await imagekit.files.delete(User.profilePictureFileId);
            } catch (error) {
                console.log("Failed to delete profile picture:", error.message);
            }
        }

        // Delete all likes created by the user
        await likeModel.deleteMany({
            user: userId
        });

        // Delet User
        await userModel.findOneAndDelete(
            { _id: userId }
        );

        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        });

        return res.status(200).json({
            message: "User deleted successfully"
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }

}

async function getLikedPost(req, res) {
    try {

        const userId = req.user._id;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        const likedPost = await likeModel
            .find({ user: userId })
            .populate("post");

        res.status(200).json({
            message: "User All Liked Posts fetched successfully",
            likedPost
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

async function getSavedPost(req, res) {

    try {

        const userId = req.user._id;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        const user = await userModel
            .findById(userId)
            .select("savedPosts")
            .populate({
                path: "savedPosts",
                populate: {
                    path: "user",
                    select: "username profilePicture"
                }
            });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "User all saved posts fetched successfully",
            savedPosts: user.savedPosts
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }

}

async function getFollowers(req, res) {
    try {
        const userId = req.user._id;

        const followers = await followModel
            .find({
                following: userId
            })
            .populate("follower", "_id username profilePicture");

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

async function getFollowing(req, res) {
    try {
        const userId = req.user._id;

        const following = await followModel
            .find({
                follower: userId
            })
            .populate("following", "_id username profilePicture");

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


module.exports = { getUser, getUserPost, getUserById, updateProfile, updateProfilePicture, deleteProfilePicture, deleteUser, getUserPostsById, getLikedPost, getSavedPost, getFollowers, getFollowing }