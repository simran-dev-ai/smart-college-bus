
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const driverRoutes = require("./routes/driverRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const trackingRoutes = require("./routes/trackingRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/tracking", trackingRoutes);

// Available Buses API
app.get("/api/buses", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM buses");

    res.json({
      success: true,
      count: rows.length,
      buses: rows,
    });
  } catch (error) {
    console.error("Buses API error:", error.message);

    res.status(500).json({
      success: false,
      message: "Database error",
    });
  }
});

// Backend Status
app.get("/", (req, res) => {
  res.json({
    message: "Smart College Bus Backend is Running",
  });
});

// Database Test
app.get("/api/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS test");

    res.json({
      message: "Database connected successfully",
      result: rows[0].test,
    });
  } catch (error) {
    console.error("Database test error:", error.message);

    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
