
const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Save driver's GPS location
router.post("/update", async (req, res) => {
  try {
    const { driverUserId, latitude, longitude } = req.body;

    if (
      !driverUserId ||
      latitude === undefined ||
      longitude === undefined ||
      !Number.isFinite(Number(latitude)) ||
      !Number.isFinite(Number(longitude)) ||
      Number(latitude) < -90 ||
      Number(latitude) > 90 ||
      Number(longitude) < -180 ||
      Number(longitude) > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid driver ID and GPS coordinates are required."
      });
    }

    // Find the driver's database ID and assigned bus
    const [drivers] = await db.query(
      `SELECT d.id AS driver_id, b.id AS bus_id
       FROM drivers d
       JOIN buses b ON b.driver_id = d.id
       WHERE d.user_id = ?
       LIMIT 1`,
      [driverUserId]
    );

    if (drivers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No bus is assigned to this driver."
      });
    }

    const { driver_id, bus_id } = drivers[0];

    // Keep one latest location per bus
    const [existing] = await db.query(
      "SELECT id FROM bus_locations WHERE bus_id = ? LIMIT 1",
      [bus_id]
    );

    if (existing.length > 0) {
      await db.query(
        `UPDATE bus_locations
         SET driver_id = ?, latitude = ?, longitude = ?,
             recorded_at = CURRENT_TIMESTAMP
         WHERE bus_id = ?`,
        [driver_id, Number(latitude), Number(longitude), bus_id]
      );
    } else {
      await db.query(
        `INSERT INTO bus_locations
         (bus_id, driver_id, latitude, longitude)
         VALUES (?, ?, ?, ?)`,
        [bus_id, driver_id, Number(latitude), Number(longitude)]
      );
    }

    res.json({
      success: true,
      message: "Bus location saved successfully.",
      busId: bus_id,
      latitude: Number(latitude),
      longitude: Number(longitude)
    });
  } catch (error) {
    console.error("GPS update error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to save GPS location."
    });
  }
});

// Get latest location of a bus
router.get("/bus/:busId", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         bl.bus_id,
         bl.driver_id,
         bl.latitude,
         bl.longitude,
         bl.recorded_at,
         b.bus_number,
         b.bus_name
       FROM bus_locations bl
       JOIN buses b ON b.id = bl.bus_id
       WHERE bl.bus_id = ?
       LIMIT 1`,
      [req.params.busId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No GPS location recorded for this bus yet."
      });
    }

    res.json({
      success: true,
      location: rows[0]
    });
  } catch (error) {
    console.error("GPS fetch error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to fetch GPS location."
    });
  }
});

module.exports = router;
