import express from "express";
import cookieParser from "cookie-parser";
import auth from './routes/auth.route.js';
import attendanceRoutes from "./routes/attendance.route.js";
import adminAttendance from "./routes/admin.attendance.route.js";
import { requireAdmin } from "./middleware/auth.admin.js";
import protect from "./routes/protected.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import adminProtected from "./routes/admin.protected.js";
import user from "./routes/user.route.js";
import userCheck from "./routes/user.route.js";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:3000",          // local dev
  "https://milking-three.vercel.app" // deployed frontend
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser requests like Postman
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true, // allow cookies
}));

//Protect page
app.use("/api/v1/protected", authMiddleware, protect);
app.use("/api/v1/admin/protected", authMiddleware, requireAdmin, adminProtected);


//Routes
app.use("/api/v1/auth", auth);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/admin", authMiddleware, requireAdmin, adminAttendance);
app.use("/api/v1/admin/users", authMiddleware, requireAdmin, user);
app.use("/api/v1/admin/users/my", authMiddleware, userCheck);

export default app;