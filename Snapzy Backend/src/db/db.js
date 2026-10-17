const mongoose = require("mongoose");

// Connect to MongoDB database instance
async function connectDB() {
    try {
        // Establish connection using MongoDB URI from environment variables
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Database Connect sucessfully");
    } catch (err) {
        console.log("Database Connection Error", err);
    }
}

module.exports = connectDB;