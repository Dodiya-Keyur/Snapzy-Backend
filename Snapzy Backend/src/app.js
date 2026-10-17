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
const allowedOrigins = [
	"https://snapzy-delta.vercel.app",
	"http://localhost:5173",
	"http://localhost:3000",
	"http://localhost:5174",
];

if (process.env.FRONTEND_URL) {
	const configured = process.env.FRONTEND_URL.trim().replace(/\/$/, "");
	if (!allowedOrigins.includes(configured)) {
		allowedOrigins.push(configured);
	}
}

// Configure CORS middleware with credential and Authorization header support
app.use(
	cors({
		origin: function (origin, callback) {
			if (!origin) return callback(null, true);

			const cleanOrigin = origin.replace(/\/$/, "");
			try {
				const url = new URL(cleanOrigin);
				if (
					allowedOrigins.includes(cleanOrigin) ||
					url.hostname.endsWith(".vercel.app") ||
					cleanOrigin.startsWith("http://localhost:") ||
					cleanOrigin.startsWith("http://127.0.0.1:")
				) {
					return callback(null, true);
				}
			} catch (e) {
				if (allowedOrigins.includes(cleanOrigin)) {
					return callback(null, true);
				}
			}

			return callback(null, false);
		},
		credentials: true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With"],
		exposedHeaders: ["Set-Cookie"],
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