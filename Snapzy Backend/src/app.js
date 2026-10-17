const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// API Route Handlers
const authRouter = require("./routes/auth.routers");
const postrouter = require("./routes/post.routers");
const userrouter = require("./routes/user.routers");
const likerouter = require("./routes/like.routers");
const followrouter = require("./routes/follow.routers");
const commentrouter = require("./routes/comment.routers");
const searchrouter = require("./routes/search.routers");
const notificationrouter = require("./routes/notifications.routers");

const app = express();

// Trust reverse proxy (necessary on Render and cloud platforms for secure cookies)
app.set("trust proxy", 1);

// Allowed origins for Cross-Origin Resource Sharing (CORS)
const frontendUrl = process.env.FRONTEND_URL?.trim();

const allowedOrigins = [
	"http://localhost:5173",
	"https://snapzy-green.vercel.app",
	frontendUrl,
]
	.filter(Boolean)
	.map((url) => url.replace(/\/$/, ""));

// Configure CORS middleware with credential support
app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin) {
				return callback(null, true);
			}

			const normalizedOrigin = origin.replace(/\/$/, "");

			if (allowedOrigins.includes(normalizedOrigin)) {
				return callback(null, true);
			}

			return callback(
				new Error(`Not allowed by CORS: ${origin}`)
			);
		},
		credentials: true,
	})
);

// Parse cookies from incoming requests
app.use(cookieParser());

// Parse JSON request payloads
app.use(express.json());

// Base health check endpoints for Render uptime monitoring
app.get("/", (req, res) => {
	res.status(200).json({ status: "ok", message: "Snapzy Backend API is running" });
});

app.get("/health", (req, res) => {
	res.status(200).json({ status: "healthy" });
});

// Mount API endpoint routers
app.use("/api/auth", authRouter);
app.use("/api/posts", postrouter);
app.use("/api/users", userrouter);
app.use("/api/posts", likerouter);
app.use("/api/follows", followrouter);
app.use("/api/comments", commentrouter);
app.use("/search", searchrouter);
app.use("/api/search", searchrouter);
app.use("/api/noti", notificationrouter);

module.exports = app;