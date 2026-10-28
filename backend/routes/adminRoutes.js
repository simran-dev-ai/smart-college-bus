
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcryptjs");

async function getCount(sql, params = []) {
  const [rows] = await db.query(sql, params);
  return Number(rows[0]?.total || 0);
}

// ADMIN DASHBOARD
router.get("/dashboard", async (req, res) => {
  try {
    const [
      totalBuses,
      totalRoutes,
      bookedSeats,
      availableSeats,
      totalBookings,
      attendanceRecords,
      buses,
      routes,
      seats,
      bookings,
      attendance
    ] = await Promise.all([
      getCount("SELECT COUNT(*) AS total FROM buses"),
      getCount("SELECT COUNT(*) AS total FROM routes"),
      getCount(
        "SELECT COUNT(*) AS total FROM seats WHERE seat_status = ?",
        ["Booked"]
      ),
      getCount(
        "SELECT COUNT(*) AS total FROM seats WHERE seat_status = ?",
        ["Available"]
      ),
      getCount("SELECT COUNT(*) AS total FROM bookings"),
      getCount("SELECT COUNT(*) AS total FROM attendance"),

      db.query("SELECT * FROM buses ORDER BY id DESC")
        .then(([rows]) => rows),
      db.query("SELECT * FROM routes ORDER BY id DESC")
        .then(([rows]) => rows),
      db.query("SELECT * FROM seats ORDER BY bus_id, id")
        .then(([rows]) => rows),
      db.query("SELECT * FROM bookings ORDER BY id DESC")
        .then(([rows]) => rows),
      db.query("SELECT * FROM attendance ORDER BY id DESC")
        .then(([rows]) => rows)
    ]);

    res.json({
      success: true,
      stats: {
        totalBuses,
        totalRoutes,
        bookedSeats,
        availableSeats,
        totalBookings,
        attendanceRecords
      },
      buses,
      routes,
      seats,
      bookings,
      attendance
    });
  } catch (err) {
    console.error("Dashboard API error:", err.message);
    res.status(500).json({
      success: false,
      message: "Unable to load dashboard data",
      error: err.message
    });
  }
});

// GET ALL STUDENTS
router.get("/students", async (req, res) => {
  try {
    const [students] = await db.query(`
      SELECT
        s.id AS student_id,
        s.user_id,
        s.roll_no,
        s.phone,
        u.name,
        u.email,
        u.created_at
      FROM students s
      JOIN users u ON u.id = s.user_id
      ORDER BY s.id DESC
    `);

    res.json({ success: true, students });
  } catch (err) {
    console.error("List students error:", err.message);
    res.status(500).json({
      success: false,
      message: "Unable to load students."
    });
  }
});

// ADD STUDENT
router.post("/students", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const rollNo = String(req.body.roll_no || "").trim();
  const phone = String(req.body.phone || "").trim();

  if (!name || !email || !password || !rollNo || !phone) {
    return res.status(400).json({
      success: false,
      message: "Please fill all student fields."
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters."
    });
  }

  let connection;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [userResult] = await connection.execute(
      `INSERT INTO users (name, email, password, role)
       VALUES (?, ?, ?, 'student')`,
      [name, email, hashedPassword]
    );

    await connection.execute(
      `INSERT INTO students (user_id, roll_no, phone)
       VALUES (?, ?, ?)`,
      [userResult.insertId, rollNo, phone]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Student added successfully."
    });
  } catch (err) {
    if (connection) await connection.rollback();

    console.error("Add student error:", err.message);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "This email is already registered."
      });
    }

    res.status(500).json({
      success: false,
      message: "Unable to add student. Check database connection and fields."
    });
  } finally {
    if (connection) connection.release();
  }
});

// GET ALL DRIVERS
router.get("/drivers", async (req, res) => {
  try {
    const [drivers] = await db.query(`
      SELECT
        d.id AS driver_id,
        d.user_id,
        d.license_no,
        d.phone,
        u.name,
        u.email,
        b.id AS bus_id,
        b.bus_name,
        b.bus_number
      FROM drivers d
      JOIN users u ON u.id = d.user_id
      LEFT JOIN buses b ON b.driver_id = d.id
      ORDER BY d.id DESC
    `);

    res.json({ success: true, drivers });
  } catch (err) {
    console.error("List drivers error:", err.message);
    res.status(500).json({
      success: false,
      message: "Unable to load drivers."
    });
  }
});

// ADD DRIVER
router.post("/drivers", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const licenseNo = String(req.body.license_no || "").trim();
  const phone = String(req.body.phone || "").trim();

  if (!name || !email || !password || !licenseNo || !phone) {
    return res.status(400).json({
      success: false,
      message: "Please fill all driver fields."
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters."
    });
  }

  let connection;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [userResult] = await connection.execute(
      `INSERT INTO users (name, email, password, role)
       VALUES (?, ?, ?, 'driver')`,
      [name, email, hashedPassword]
    );

    await connection.execute(
      `INSERT INTO drivers (user_id, license_no, phone)
       VALUES (?, ?, ?)`,
      [userResult.insertId, licenseNo, phone]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Driver added successfully."
    });
  } catch (err) {
    if (connection) await connection.rollback();

    console.error("Add driver error:", err.message);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "This email is already registered."
      });
    }

    res.status(500).json({
      success: false,
      message: "Unable to add driver. Check database connection and fields."
    });
  } finally {
    if (connection) connection.release();
  }
});

// ASSIGN OR UNASSIGN DRIVER TO BUS
router.put("/drivers/:driverId/assign-bus", async (req, res) => {
  const driverId = Number(req.params.driverId);
  const rawBusId = req.body.busId;
  const busId =
    rawBusId === "" || rawBusId == null ? null : Number(rawBusId);

  if (
    !Number.isInteger(driverId) ||
    driverId < 1 ||
    (busId !== null &&
      (!Number.isInteger(busId) || busId < 1))
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid driver and bus IDs are required."
    });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [driverRows] = await connection.execute(
      "SELECT id FROM drivers WHERE id = ?",
      [driverId]
    );

    if (!driverRows.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Driver not found."
      });
    }

    if (busId !== null) {
      const [busRows] = await connection.execute(
        "SELECT id FROM buses WHERE id = ?",
        [busId]
      );

      if (!busRows.length) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Bus not found."
        });
      }

      // Remove the bus from its previous driver, if any.
      await connection.execute(
        "UPDATE buses SET driver_id = NULL WHERE id = ?",
        [busId]
      );
    }

    // Ensure this driver is assigned to at most one bus.
    await connection.execute(
      "UPDATE buses SET driver_id = NULL WHERE driver_id = ?",
      [driverId]
    );

    if (busId !== null) {
      await connection.execute(
        "UPDATE buses SET driver_id = ? WHERE id = ?",
        [driverId, busId]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message:
        busId === null
          ? "Driver unassigned from bus."
          : "Driver assigned to bus successfully."
    });
  } catch (err) {
    if (connection) await connection.rollback();

    console.error("Assign driver error:", err.message);

    res.status(500).json({
      success: false,
      message: "Unable to assign driver to bus."
    });
  } finally {
    if (connection) connection.release();
  }
});

// LIVE BUS GPS LOCATIONS
router.get("/tracking", async (req, res) => {
  try {
    const [locations] = await db.query(`
      SELECT
        b.id AS bus_id,
        b.bus_name,
        b.bus_number,
        b.status AS bus_status,
        d.id AS driver_id,
        d.phone AS driver_phone,
        u.name AS driver_name,
        bl.latitude,
        bl.longitude,
        bl.recorded_at
      FROM buses b
      LEFT JOIN drivers d ON d.id = b.driver_id
      LEFT JOIN users u ON u.id = d.user_id
      LEFT JOIN bus_locations bl
        ON bl.bus_id = b.id
        AND bl.recorded_at = (
          SELECT MAX(bl2.recorded_at)
          FROM bus_locations bl2
          WHERE bl2.bus_id = b.id
        )
      ORDER BY b.id DESC
    `);

    res.json({ success: true, locations });
  } catch (err) {
    console.error("Admin tracking error:", err.message);

    res.status(500).json({
      success: false,
      message:
        "Unable to load GPS locations. Check bus_locations table and GPS updates."
    });
  }
});

module.exports = router;
