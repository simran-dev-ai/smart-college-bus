
const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET: Driver Dashboard Details
router.get("/dashboard/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver user ID",
      });
    }

    const [driverRows] = await db.execute(
      `SELECT
         d.id AS driver_id,
         d.user_id,
         d.license_no,
         d.phone,
         u.name,
         u.email
       FROM drivers d
       INNER JOIN users u ON u.id = d.user_id
       WHERE d.user_id = ? AND u.role = 'driver'
       LIMIT 1`,
      [userId]
    );

    if (driverRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Driver account not found.",
      });
    }

    const driver = driverRows[0];

    const [buses] = await db.execute(
      `SELECT
         id AS bus_id,
         bus_name,
         bus_number,
         total_seats,
         status
       FROM buses
       WHERE driver_id = ?
       ORDER BY id`,
      [driver.driver_id]
    );

    return res.status(200).json({
      success: true,
      message: "Driver dashboard loaded successfully",
      driver: {
        driver_id: driver.driver_id,
        user_id: driver.user_id,
        name: driver.name,
        email: driver.email,
        license_no: driver.license_no,
        phone: driver.phone,
      },
      buses,
      summary: {
        totalBuses: buses.length,
        activeBuses: buses.filter(
          (bus) => bus.status === "Active"
        ).length,
        inactiveBuses: buses.filter(
          (bus) => bus.status === "Inactive"
        ).length,
      },
    });
  } catch (error) {
    console.error("Driver dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load driver dashboard",
    });
  }
});

// POST: Save Driver's Current GPS Location
router.post("/location", async (req, res) => {
  try {
    const userId = Number(req.body.userId);
    const busId = Number(req.body.busId);
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver user ID.",
      });
    }

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid GPS coordinates.",
      });
    }

    // Verify the logged-in user is a driver
    const [driverRows] = await db.execute(
      `SELECT d.id AS driver_id
       FROM drivers d
       INNER JOIN users u ON u.id = d.user_id
       WHERE d.user_id = ? AND u.role = 'driver'
       LIMIT 1`,
      [userId]
    );

    if (driverRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Driver account not found.",
      });
    }

    const driverId = driverRows[0].driver_id;

    // Confirm the selected bus belongs to this driver
    let assignedBusId = busId;

    if (!Number.isInteger(assignedBusId) || assignedBusId <= 0) {
      const [assignedBuses] = await db.execute(
        `SELECT id
         FROM buses
         WHERE driver_id = ?
         ORDER BY id
         LIMIT 1`,
        [driverId]
      );

      if (assignedBuses.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No bus is assigned to this driver.",
        });
      }

      assignedBusId = assignedBuses[0].id;
    }

    const [busRows] = await db.execute(
      `SELECT id
       FROM buses
       WHERE id = ? AND driver_id = ?
       LIMIT 1`,
      [assignedBusId, driverId]
    );

    if (busRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "This bus is not assigned to this driver.",
      });
    }

    await db.execute(
      `INSERT INTO bus_locations
         (bus_id, driver_id, latitude, longitude)
       VALUES (?, ?, ?, ?)`,
      [assignedBusId, driverId, latitude, longitude]
    );

    return res.status(201).json({
      success: true,
      message: "GPS location saved successfully.",
      location: {
        busId: assignedBusId,
        latitude,
        longitude,
      },
    });
  } catch (error) {
    console.error("Save driver GPS error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Unable to save GPS location. Check the bus_locations table and backend logs.",
    });
  }
});

// GET: Latest GPS Location for a Bus
router.get("/location/:busId", async (req, res) => {
  try {
    const busId = Number(req.params.busId);

    if (!Number.isInteger(busId) || busId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid bus ID.",
      });
    }

    const [rows] = await db.execute(
      `SELECT
         bl.bus_id,
         b.bus_name,
         b.bus_number,
         bl.latitude,
         bl.longitude,
         bl.recorded_at
       FROM bus_locations bl
       INNER JOIN buses b ON b.id = bl.bus_id
       WHERE bl.bus_id = ?
       ORDER BY bl.id DESC
       LIMIT 1`,
      [busId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No GPS location recorded for this bus yet.",
      });
    }

    return res.json({
      success: true,
      location: rows[0],
    });
  } catch (error) {
    console.error("Get bus GPS error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve bus GPS location.",
    });
  }
});

module.exports = router;
