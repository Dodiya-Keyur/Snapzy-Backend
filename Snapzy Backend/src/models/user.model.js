const mongoose = require("mongoose");

const DEFAULT_PROFILE_PICTURE =
    "https://i.pinimg.com/474x/64/99/f8/6499f89b3bd815780d60f2cbc210b2bd.jpg";


const userSchema = new mongoose.Schema({

    username: {
        type: String,
        lowercase: true,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30,
    },

    name: {
        type: String,
        trim: true,
    },

    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        trim: true,
    },

    password: {
        type: String,
        required: true,
        select: false
    },

    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
    },

    profilePicture: {
        type: String,
        default: DEFAULT_PROFILE_PICTURE,
    },

    profilePictureFileId: {
        type: String,
        default: null,
        select: false
    },

    bio: {
        type: String,
        maxlength: 150,
        default: "",
    },

    savedPosts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
        },
    ],

    settings: {
        privateAccount: {
            type: Boolean,
            default: false,
        },
        activityStatus: {
            type: Boolean,
            default: true,
        },
        notifications: {
            likes: { type: Boolean, default: true },
            comments: { type: Boolean, default: true },
            follows: { type: Boolean, default: true },
            replies: { type: Boolean, default: true },
        },
    },

},
    {
        timestamps: true,
    }
);


const userModel = mongoose.model("User", userSchema);

module.exports = userModel;