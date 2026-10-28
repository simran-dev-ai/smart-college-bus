const express = require("express");
const crypto = require("crypto");
const db = require("../config/db");

const router = express.Router();

function isPositiveInteger(value) {
    return Number.isInteger(Number(value)) && Number(value) > 0;
}

// GET /api/bookings/options
// Load active buses, routes, stops and seats.
router.get("/options", async (req, res) => {
    try {
        const [buses] = await db.query(`
            SELECT
                b.id AS bus_id,
                b.bus_number,
                b.bus_name,
                b.total_seats,
                br.route_id,
                r.route_name,
                r.price AS route_price
            FROM buses b
            JOIN bus_routes br ON br.bus_id = b.id
            JOIN routes r ON r.id = br.route_id
            WHERE b.status = 'Active'
            ORDER BY b.id, br.route_id
        `);

        if (buses.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No active buses or routes found."
            });
        }

        const requestedBusId =
            req.query.bus_id ?? req.query.busId;

        const busId = Number(
            requestedBusId || buses[0].bus_id
        );

        const busRoute = buses.find(
            item => Number(item.bus_id) === busId
        );

        if (!busRoute) {
            return res.status(404).json({
                success: false,
                message: "Selected bus was not found."
            });
        }

        const routeId = Number(
            req.query.routeId || busRoute.route_id
        );

        const validRoute = buses.some(
            item =>
                Number(item.bus_id) === busId &&
                Number(item.route_id) === routeId
        );

        if (!validRoute) {
            return res.status(400).json({
                success: false,
                message:
                    "Selected route does not belong to this bus."
            });
        }

        const [stops] = await db.query(`
            SELECT
                rs.id AS route_stop_id,
                rs.stop_id,
                s.stop_name,
                rs.stop_order,
                COALESCE(rs.stop_price, r.price, 0) AS fare
            FROM route_stops rs
            JOIN stops s ON s.id = rs.stop_id
            JOIN routes r ON r.id = rs.route_id
            WHERE rs.route_id = ?
            ORDER BY rs.stop_order
        `, [routeId]);

        const [seats] = await db.query(`
            SELECT id, seat_number, seat_status
            FROM seats
            WHERE bus_id = ?
            ORDER BY CAST(
                SUBSTRING(seat_number, 2) AS UNSIGNED
            )
        `, [busId]);

        // DEBUG: Check which database and seat statuses
        // the backend is actually reading.
        const [[databaseRow]] = await db.query(`
    SELECT
        DATABASE() AS db,
        @@hostname AS hostname,
        @@port AS port
           ` );

        const bookedSeats = seats
            .filter(seat => seat.seat_status === "Booked")
            .map(seat => seat.seat_number);

        const availableSeats = seats.filter(
            seat => seat.seat_status === "Available"
        ).length;

        console.log("BOOKING OPTIONS DEBUG:", {
    database: databaseRow.db,
    hostname: databaseRow.hostname,
    port: databaseRow.port,
    busId,
    totalSeats: seats.length,
    bookedSeats: seats
        .filter(seat => seat.seat_status === "Booked")
        .map(seat => seat.seat_number),
    availableSeats: seats.filter(
        seat => seat.seat_status === "Available"
    ).length
});

        return res.json({
            success: true,
            buses,
            selectedBusId: busId,

            selectedRouteId: routeId,
            stops,
            seats,
            availableSeats
        });

    } catch (error) {
        console.error("Load booking options error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not load booking options."
        });
    }
});


// POST /api/bookings/:bookingId/demo-payment
// DEMO payment only. No real money is collected.
router.post("/:bookingId/demo-payment", async (req, res) => {
    const bookingId = Number(req.params.bookingId);
    const userId = Number(req.body.user_id);

    if (
        !isPositiveInteger(bookingId) ||
        !isPositiveInteger(userId)
    ) {
        return res.status(400).json({
            success: false,
            message: "Valid booking ID and user ID are required."
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [bookings] = await connection.query(`
            SELECT
                b.id AS booking_id,
                b.student_id,
                b.bus_id,
                b.seat_id,
                b.route_stop_id,
                b.booking_status,
                s.user_id
            FROM bookings b
            JOIN students s ON s.id = b.student_id
            WHERE b.id = ?
            FOR UPDATE
        `, [bookingId]);

        if (
            bookings.length === 0 ||
            Number(bookings[0].user_id) !== userId
        ) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Booking not found for this user."
            });
        }

        const booking = bookings[0];

        if (booking.booking_status !== "Booked") {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "This booking is not active."
            });
        }

        const [fareRows] = await connection.query(`
            SELECT COALESCE(rs.stop_price, r.price, 0) AS fare
            FROM bookings b
            LEFT JOIN route_stops rs
                ON rs.id = b.route_stop_id
            LEFT JOIN routes r
                ON r.id = rs.route_id
            WHERE b.id = ?
        `, [bookingId]);

        const amount = Number(fareRows[0]?.fare || 0);

        // Reuse a successful payment if one already exists.
        const [existingPayments] = await connection.query(`
            SELECT
                id,
                booking_id,
                amount,
                payment_method,
                payment_reference,
                payment_status,
                payment_date
            FROM payments
            WHERE booking_id = ?
              AND payment_status = 'Success'
            ORDER BY id DESC
            LIMIT 1
        `, [bookingId]);

        let payment = existingPayments[0];

        if (!payment) {
            const paymentReference =
                `DEMO-${bookingId}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

            const [paymentInsert] = await connection.query(`
                INSERT INTO payments
                    (booking_id, amount, payment_method,
                     payment_reference, payment_status, payment_date)
                VALUES (?, ?, 'DEMO', ?, 'Success', CURRENT_TIMESTAMP)
            `, [bookingId, amount, paymentReference]);

            const [newPayments] = await connection.query(`
                SELECT
                    id,
                    booking_id,
                    amount,
                    payment_method,
                    payment_reference,
                    payment_status,
                    payment_date
                FROM payments
                WHERE id = ?
            `, [paymentInsert.insertId]);

            payment = newPayments[0];
        }

        // Reuse an active bus pass if already generated.
        const [existingPasses] = await connection.query(`
            SELECT
                id,
                student_id,
                booking_id,
                pass_number,
                issue_date,
                valid_until,
                pass_status
            FROM bus_passes
            WHERE booking_id = ?
              AND pass_status = 'Active'
            ORDER BY id DESC
            LIMIT 1
        `, [bookingId]);

        let busPass = existingPasses[0];

        if (!busPass) {
            const passNumber =
                `CBP-${bookingId}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

            const [passInsert] = await connection.query(`
                INSERT INTO bus_passes
                    (student_id, booking_id, pass_number,
                     issue_date, valid_until, pass_status)
                VALUES (?, ?, ?, CURDATE(),
                        DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'Active')
            `, [
                booking.student_id,
                bookingId,
                passNumber
            ]);

            const [newPasses] = await connection.query(`
                SELECT
                    id,
                    student_id,
                    booking_id,
                    pass_number,
                    issue_date,
                    valid_until,
                    pass_status
                FROM bus_passes
                WHERE id = ?
            `, [passInsert.insertId]);

            busPass = newPasses[0];
        }

        await connection.commit();

        return res.json({
            success: true,
            message:
                "Demo payment successful. Bus pass generated.",
            demo_only: true,
            payment: {
                payment_id: payment.id,
                booking_id: Number(payment.booking_id),
                amount: Number(payment.amount),
                payment_method: payment.payment_method,
                payment_reference: payment.payment_reference,
                payment_status: payment.payment_status,
                payment_date: payment.payment_date
            },
            busPass: {
                id: busPass.id,
                student_id: busPass.student_id,
                booking_id: busPass.booking_id,
                pass_number: busPass.pass_number,
                issue_date: busPass.issue_date,
                valid_until: busPass.valid_until,
                pass_status: busPass.pass_status
            }
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Demo payment error:", error);

        return res.status(500).json({
            success: false,
            message: "Demo payment could not be completed."
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});


// POST /api/bookings
// Create a booking and reserve one available seat.
router.post("/", async (req, res) => {
    const {
        user_id,
        bus_id,
        route_id,
        route_stop_id,
        seat_id
    } = req.body;

    if (
        !isPositiveInteger(user_id) ||
        !isPositiveInteger(bus_id) ||
        !isPositiveInteger(route_id) ||
        !isPositiveInteger(route_stop_id) ||
        !isPositiveInteger(seat_id)
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Please provide valid user, bus, route, stop and seat IDs."
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [students] = await connection.query(`
            SELECT id
            FROM students
            WHERE user_id = ?
            FOR UPDATE
        `, [Number(user_id)]);

        if (students.length === 0) {
            await connection.rollback();

            return res.status(403).json({
                success: false,
                message:
                    "No student profile is linked to this user. Please log in with a student account."
            });
        }

        const studentId = students[0].id;
        console.log("========== BOOKING CHECK ==========");
console.log("Received user_id:", Number(user_id));
console.log("Matched student_id:", Number(studentId));

        // Allow only one active booking per student.
        const [existingBookings] = await connection.query(`
            SELECT id
            FROM bookings
            WHERE student_id = ?
              AND booking_status = 'Booked'
            LIMIT 1
            FOR UPDATE
        `, [studentId]);
        console.log("Existing active bookings:", existingBookings);

        if (existingBookings.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message:
                    "You already have an active bus booking. Only one active seat booking is allowed per student."
            });
        }

        const [routes] = await connection.query(`
            SELECT b.id, b.bus_name, b.bus_number
            FROM buses b
            JOIN bus_routes br ON br.bus_id = b.id
            WHERE b.id = ?
              AND br.route_id = ?
              AND b.status = 'Active'
            FOR UPDATE
        `, [Number(bus_id), Number(route_id)]);

        if (routes.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message:
                    "The selected bus and route are not available."
            });
        }

        const [stops] = await connection.query(`
            SELECT
                rs.id,
                rs.stop_price,
                s.stop_name,
                COALESCE(rs.stop_price, r.price, 0) AS fare
            FROM route_stops rs
            JOIN stops s ON s.id = rs.stop_id
            JOIN routes r ON r.id = rs.route_id
            WHERE rs.id = ?
              AND rs.route_id = ?
            FOR UPDATE
        `, [Number(route_stop_id), Number(route_id)]);

        if (stops.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message:
                    "The selected stop does not belong to this route."
            });
        }

        const [seats] = await connection.query(`
            SELECT id, seat_number, seat_status
            FROM seats
            WHERE id = ?
              AND bus_id = ?
            FOR UPDATE
        `, [Number(seat_id), Number(bus_id)]);

        if (
            seats.length === 0 ||
            seats[0].seat_status !== "Available"
        ) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message:
                    "This seat is no longer available. Please select another seat."
            });
        }

        const [insertResult] = await connection.query(`
            INSERT INTO bookings
                (student_id, bus_id, seat_id, route_stop_id,
                 booking_date, booking_status)
            VALUES (?, ?, ?, ?, CURDATE(), 'Booked')
        `, [
            studentId,
            Number(bus_id),
            Number(seat_id),
            Number(route_stop_id)
        ]);

        const [seatUpdate] = await connection.query(`
            UPDATE seats
            SET seat_status = 'Booked'
            WHERE id = ?
              AND bus_id = ?
              AND seat_status = 'Available'
        `, [Number(seat_id), Number(bus_id)]);

        if (seatUpdate.affectedRows !== 1) {
            throw new Error(
                "The seat could not be reserved. Please try again."
            );
        }

        await connection.commit();

        return res.status(201).json({
            success: true,
            message:
                "Booking created. Complete demo payment to generate your bus pass.",
            booking: {
                booking_id: insertResult.insertId,
                student_id: studentId,
                bus_id: Number(bus_id),
                bus_name: routes[0].bus_name,
                bus_number: routes[0].bus_number,
                route_id: Number(route_id),
                route_stop_id: Number(route_stop_id),
                stop_name: stops[0].stop_name,
                fare: Number(stops[0].fare || 0),
                seat_id: Number(seat_id),
                seat_number: seats[0].seat_number,
                booking_status: "Booked",
                booking_date: new Date().toISOString().slice(0, 10)
            }
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Booking error:",error);

        return res.status(500).json({
            success: false,
            message:
                error.message || "Booking could not be completed."
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});

module.exports = router;