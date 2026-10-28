
const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Student attendance history
router.get("/student/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid student user ID is required.",
      });
    }

    const [rows] = await db.query(
      `SELECT
         a.id,
         a.student_id,
         a.booking_id,
         a.pass_id,
         a.attendance_date,
         a.attendance_time,
         a.attendance_status,
         a.scanned_by
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       WHERE s.user_id = ?
       ORDER BY a.attendance_date DESC, a.attendance_time DESC`,
      [userId]
    );

    return res.json({
      success: true,
      attendance: rows,
    });
  } catch (error) {
    console.error("Student attendance error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load student attendance.",
    });
  }
});

// Record attendance by bus pass QR code
router.post("/scan", async (req, res) => {
  try {
    const { passCode, scannedBy } = req.body || {};

    if (
      typeof passCode !== "string" ||
      passCode.trim().length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Bus pass QR code is required.",
      });
    }

    const [passes] = await db.query(
      `SELECT
         sbp.booking_id,
         sbp.pass_code,
         b.student_id
       FROM student_bus_passes sbp
       JOIN bookings b ON b.id = sbp.booking_id
       WHERE sbp.pass_code = ?
       LIMIT 1`,
      [passCode.trim()]
    );

    if (passes.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invalid bus pass QR code.",
      });
    }

    const pass = passes[0];

    if (!pass.student_id) {
      return res.status(400).json({
        success: false,
        message: "No student is linked to this bus booking.",
      });
    }

    // Prevent duplicate attendance for the same student today.
    const [existing] = await db.query(
      `SELECT id
       FROM attendance
       WHERE student_id = ?
         AND attendance_date = CURDATE()
       LIMIT 1`,
      [pass.student_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Attendance already recorded today.",
      });
    }

    const validScannedBy =
      scannedBy === undefined ||
      scannedBy === null ||
      scannedBy === ""
        ? null
        : Number(scannedBy);

    if (
      validScannedBy !== null &&
      (!Number.isInteger(validScannedBy) || validScannedBy <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "scannedBy must be a valid positive ID.",
      });
    }

    await db.query(
      `INSERT INTO attendance
       (student_id, booking_id, attendance_date,
        attendance_time, attendance_status, scanned_by)
       VALUES (?, ?, CURDATE(), CURTIME(), 'Present', ?)`,
      [
        pass.student_id,
        pass.booking_id,
        validScannedBy,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Attendance marked Present successfully.",
    });
  } catch (error) {
    console.error("QR attendance error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to record attendance.",
    });
  }
});

// Attendance records for Admin and Driver
router.get("/records", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         a.id,
         a.student_id,
         a.booking_id,
         a.pass_id,
         a.attendance_date,
         a.attendance_time,
         a.attendance_status,
         a.scanned_by,
         s.roll_no,
         u.name AS student_name
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       LEFT JOIN users u ON u.id = s.user_id
       ORDER BY a.attendance_date DESC, a.attendance_time DESC`
    );

    return res.json({
      success: true,
      attendance: rows,
    });
  } catch (error) {
    console.error("Attendance records error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load attendance records.",
    });
  }
});

module.exports = router;
