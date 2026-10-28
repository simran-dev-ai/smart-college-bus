import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import "./Booking.css";

import API_BASE_URL from "../api";
const API_BASE = API_BASE_URL;
function getLoggedInUserId() {
for (const key of ["user", "currentUser", "loggedInUser", "userData"]) {
try {
const saved = localStorage.getItem(key);
if (!saved) continue;

  const user = JSON.parse(saved);
  const id = user?.user_id ?? user?.userId ?? user?.id;

  if (id != null && Number.isInteger(Number(id))) {
    return Number(id);
  }
} catch {
  // Continue checking other storage keys.
}

}

for (const key of ["user_id", "userId", "id"]) {
const value = localStorage.getItem(key);

if (value && Number.isInteger(Number(value))) {
  return Number(value);
}

}

return null;
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}
export default function Booking() {
const navigate = useNavigate();

const [buses, setBuses] = useState([]);
const [stops, setStops] = useState([]);
const [seats, setSeats] = useState([]);

const [busId, setBusId] = useState("");
const [stopId, setStopId] = useState("");
const [seatId, setSeatId] = useState("");

const [loading, setLoading] = useState(true);
const [submitting, setSubmitting] = useState(false);
const [paying, setPaying] = useState(false);

const [error, setError] = useState("");
const [result, setResult] = useState(null);
const [paymentResult, setPaymentResult] = useState(null);

const bus = useMemo(
() => buses.find((item) => String(item.bus_id) === String(busId)),
[buses, busId]
);

const stop = useMemo(
() => stops.find(
(item) => String(item.route_stop_id) === String(stopId)
),
[stops, stopId]
);

const seat = useMemo(
() => seats.find((item) => String(item.id) === String(seatId)),
[seats, seatId]
);

const availableSeats = seats.filter(
(item) => item.seat_status === "Available"
).length;

const loadOptions = useCallback(async (requestedBusId = "") => {
setLoading(true);
setError("");

try {
  const query = requestedBusId
    ? `?bus_id=${encodeURIComponent(requestedBusId)}`
    : "";

  const response = await fetch(
    `${API_BASE}/api/bookings/options${query}`
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Could not load bus options.");
  }

  const busList = Array.isArray(data.buses) ? data.buses : [];
  const stopList = Array.isArray(data.stops) ? data.stops : [];
  const seatList = Array.isArray(data.seats) ? data.seats : [];

  setBuses(busList);
  setStops(stopList);
  setSeats(seatList);

  setBusId(String(data.selectedBusId ?? busList[0]?.bus_id ?? ""));

  setStopId((current) =>
    stopList.some(
      (item) => String(item.route_stop_id) === String(current)
    ) ? current : ""
  );

  setSeatId((current) =>
    seatList.some(
      (item) =>
        String(item.id) === String(current) &&
        item.seat_status === "Available"
    ) ? current : ""
  );
} catch (err) {
  setError(`${err.message} Check that the backend is running.`);
} finally {
  setLoading(false);
}

}, []);

useEffect(() => {
loadOptions();
}, [loadOptions]);

async function handleBusChange(nextBusId) {
setBusId(String(nextBusId));
setStopId("");
setSeatId("");
setResult(null);
setPaymentResult(null);

await loadOptions(String(nextBusId));

}

async function handleBooking(event) {
event.preventDefault();

if (submitting) return;

setError("");
setResult(null);
setPaymentResult(null);

const userId = getLoggedInUserId();

if (!userId) {
  setError("User ID not found. Please log in again.");
  return;
}

if (!bus || !stop || !seat) {
  setError("Please select a bus, boarding stop and one available seat.");
  return;
}

if (seat.seat_status !== "Available") {
  setError("This seat is no longer available. Please select another.");
  await loadOptions(busId);
  return;
}

setSubmitting(true);

try {
  console.log("Sending booking request:", {
  user_id: userId,
  bus_id: Number(bus.bus_id),
  route_id: Number(bus.route_id),
  route_stop_id: Number(stop.route_stop_id),
  seat_id: Number(seat.id),
});
  const response = await fetch(`${API_BASE}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      bus_id: Number(bus.bus_id),
      route_id: Number(bus.route_id),
      route_stop_id: Number(stop.route_stop_id),
      seat_id: Number(seat.id),
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    if (response.status === 409) {
      throw new Error(
        data.message ||
          "You already have an active booking. Only one active booking is allowed per student."
      );
    }

    throw new Error(data.message || "Booking failed.");
  }

  setResult(data);
  setSeatId("");
  await loadOptions(busId);
} catch (err) {
  setError(err.message || "Booking could not be completed.");
  await loadOptions(busId);
} finally {
  setSubmitting(false);
}

}

async function handleDemoPayment() {
  console.log("CONFIRM BOOKING CLICKED");
console.log("Selected values:", {
  busId,
  stop,
  seat,
  submitting,
});
if (paying) return;

const userId = getLoggedInUserId();
const bookingId = result?.booking?.booking_id ?? result?.booking?.id;

setError("");

if (!userId) {
  setError("User ID not found. Please log in again.");
  return;
}

if (!bookingId) {
  setError("Booking ID is missing. Please create the booking again.");
  return;
}

setPaying(true);

try {
  const response = await fetch(
    `${API_BASE}/api/bookings/${bookingId}/demo-payment`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Demo payment failed.");
  }

  if (!data.payment || !data.busPass) {
    throw new Error("Payment or bus-pass details are missing in the response.");
  }

  setPaymentResult(data);
} catch (err) {
  setError(err.message || "Could not complete demo payment.");
} finally {
  setPaying(false);
}

}

const booking = result?.booking || {};
const bookingNumber = booking.booking_id ?? booking.id ?? result?.id ?? "—";
const payment = paymentResult?.payment;
const busPass = paymentResult?.busPass;

const paymentQR = payment
? JSON.stringify({
type: "DEMO_PAYMENT",
paymentReference: payment.payment_reference,
bookingId: payment.booking_id,
amount: payment.amount,
status: payment.payment_status,
note: "Demo only. No real money transferred.",
})
: "";

const passQR = busPass
? JSON.stringify({
type: "DEMO_BUS_PASS",
passNumber: busPass.pass_number,
bookingId: busPass.booking_id,
studentId: busPass.student_id,
issueDate: busPass.issue_date,
validUntil: busPass.valid_until,
status: busPass.pass_status,
note: "Demo pass. Verify against the college database.",
})
: "";

if (loading && buses.length === 0) {
return (
<main className="booking-page">
<div className="booking-loading">Loading your bus options...</div>
</main>
);
}

return (
<main className="booking-page">
<aside className="booking-sidebar">
<div className="booking-brand">
<span className="brand-icon">▣</span>
<div>
<strong>Smart College Bus</strong>
<small>Safe Ride · Smart Future</small>
</div>
</div>

    <nav className="booking-nav">
      <button type="button" onClick={() => navigate("/student-dashboard")}>
        <span>⌂</span> Dashboard
      </button>
      <button type="button" className="active">
        <span>▣</span> Book Bus
      </button>
      <button type="button" onClick={() => navigate("/student-dashboard")}>
        <span>▤</span> My Bookings
      </button>
      <button type="button" onClick={() => navigate("/student-dashboard")}>
        <span>▦</span> Bus Pass
      </button>
    </nav>

    <button
      type="button"
      className="booking-logout"
      onClick={() => navigate("/login")}
    >
      ↪ Logout
    </button>
  </aside>

  <div className="booking-content">
    <div className="booking-topbar">
      <span>STUDENT PORTAL</span>
      <button type="button" onClick={() => navigate("/student-dashboard")}>
        Student Dashboard ↗
      </button>
    </div>

    <header className="booking-hero">
      <div>
        <span className="booking-eyebrow">BOOKING PORTAL</span>
        <h1>Book Your College Bus</h1>
        <p>Select your bus, boarding stop and one seat.</p>
      </div>
      <span className="booking-hero-bus" aria-hidden="true">🚌</span>
    </header>

    {error && (
      <div className="booking-alert error" role="alert">{error}</div>
    )}

    {result ? (
      <section className="booking-confirmed">
        <div className="confirmed-check">✓</div>
        <span className="booking-eyebrow">BOOKING CONFIRMATION</span>
        <h2>Booking saved successfully</h2>
        <p>Complete the demo payment below to request your bus pass.</p>

        <div className="confirmed-details">
          <p>Booking ID <strong>{bookingNumber}</strong></p>
          <p>Student <strong>{booking.student_name || "Logged-in student"}</strong></p>
          <p>Bus <strong>{booking.bus_name || bus?.bus_name || "—"}</strong></p>
          <p>Bus number <strong>{booking.bus_number || bus?.bus_number || "—"}</strong></p>
          <p>Boarding stop <strong>{booking.stop_name || stop?.stop_name || "—"}</strong></p>
          <p>Seat <strong>{booking.seat_number || "See booking details"}</strong></p>
          <p>Fare <strong>{money(booking.fare ?? stop?.fare)}</strong></p>
          <p>Status <strong>{booking.booking_status || "Booked"}</strong></p>
        </div>

        {!paymentResult ? (
          <div className="demo-payment-panel">
            <h3>Step 4: Demo Payment</h3>
            <p>This is a simulated payment. No real money will be charged.</p>
            <button
              type="button"
              className="booking-primary"
              onClick={handleDemoPayment}
              disabled={paying}
            >
              {paying ? "Processing Demo Payment..." : "Complete Demo Payment →"}
            </button>
          </div>
        ) : (
          <div className="demo-payment-success">
            <div className="confirmed-check">✓</div>
            <h2>Demo Payment Successful</h2>

            <div className="confirmed-details">
              <p>Payment status <strong>{payment.payment_status}</strong></p>
              <p>Amount <strong>{money(payment.amount)}</strong></p>
              <p>Payment reference <strong>{payment.payment_reference}</strong></p>
              <p>Bus pass number <strong>{busPass.pass_number}</strong></p>
              <p>
                Pass validity <strong>
                  {String(busPass.issue_date).slice(0, 10)} to {String(busPass.valid_until).slice(0, 10)}
                </strong>
              </p>
            </div>

            <div className="booking-qr-grid">
              <div className="booking-qr-card">
                <h3>Payment QR Code</h3>
                <p>Demo payment reference and amount.</p>
                <div className="booking-qr-image">
                  <QRCodeSVG value={paymentQR} size={190} level="M" includeMargin />
                </div>
                <p className="booking-qr-caption">Demo payment · {money(payment.amount)}</p>
              </div>

              <div className="booking-qr-card">
                <h3>Bus Pass QR Code</h3>
                <p>Your demo pass details.</p>
                <div className="booking-qr-image">
                  <QRCodeSVG value={passQR} size={190} level="M" includeMargin />
                </div>
                <p className="booking-qr-caption">Pass: {busPass.pass_number}</p>
              </div>
            </div>

            <p className="booking-note">
              Demo only: these QR codes do not transfer money or independently
              verify a real bus pass. The college must validate the pass in its database.
            </p>
          </div>
        )}

        <button
          type="button"
          className="booking-secondary"
          onClick={() => navigate("/student-dashboard")}
        >
          Back to Dashboard →
        </button>

        <button
          type="button"
          className="booking-secondary"
          onClick={() => {
            setResult(null);
            setPaymentResult(null);
            setError("");
            loadOptions(busId);
          }}
        >
          Return to Booking
        </button>
      </section>
    ) : (
      <form onSubmit={handleBooking} className="booking-workspace">
        <div className="booking-main">
          <section className="booking-panel">
            <div className="booking-heading">
              <span className="booking-step">1</span>
              <div>
                <h2>Select Bus</h2>
                <p>Choose your college bus.</p>
              </div>
            </div>

            <div className="booking-bus-grid">
              {buses.map((item) => (
                <button
                  type="button"
                  key={`${item.bus_id}-${item.route_id}`}
                  className={`booking-bus-card ${String(busId) === String(item.bus_id) ? "chosen" : ""}`}
                  onClick={() => handleBusChange(item.bus_id)}
                  disabled={submitting}
                >
                  <span className="bus-card-icon">🚌</span>
                  <strong>{item.bus_name}</strong>
                  <span>{item.bus_number}</span>
                  <small>{item.route_name}</small>
                  <small>{item.total_seats} seats</small>
                  <b>{money(item.route_price)}</b>
                </button>
              ))}
            </div>
          </section>

          <section className="booking-panel">
            <div className="booking-heading">
              <span className="booking-step">2</span>
              <div>
                <h2>Choose Boarding Stop</h2>
                <p>Your selected stop determines the fare.</p>
              </div>
            </div>

            <label className="booking-label" htmlFor="boarding-stop">Boarding stop</label>
            <select
              id="boarding-stop"
              className="booking-select"
              value={stopId}
              onChange={(event) => setStopId(event.target.value)}
              disabled={!stops.length || submitting}
              required
            >
              <option value="">Select your stop</option>
              {stops.map((item) => (
                <option key={item.route_stop_id} value={item.route_stop_id}>
                  {item.stop_name} — {money(item.fare)}
                </option>
              ))}
            </select>

            {stop && (
              <div className="booking-fare-strip">
                <span>Selected stop <strong>{stop.stop_name}</strong></span>
                <span>Fare <strong>{money(stop.fare)}</strong></span>
              </div>
            )}
          </section>

          <section className="booking-panel">
            <div className="booking-heading">
              <span className="booking-step">3</span>
              <div>
                <h2>Select One Seat</h2>
                <p>Only one seat can be selected for this booking.</p>
              </div>
            </div>

            <div className="booking-seat-legend">
              <span><i className="legend-available" /> Available</span>
              <span><i className="legend-selected" /> Selected</span>
              <span><i className="legend-booked" /> Booked</span>
            </div>

            <div className="booking-driver">FRONT OF BUS <span>Driver</span></div>

            <div className="booking-seat-grid">
              {seats.map((item) => {
                const available = item.seat_status === "Available";
                const selected = String(seatId) === String(item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`booking-seat ${!available ? "seat-booked" : ""} ${selected ? "seat-selected" : ""}`}
                    disabled={!available || submitting}
                    aria-pressed={selected}
                    onClick={() => setSeatId(String(item.id))}
                  >
                    {item.seat_number}
                  </button>
                );
              })}
            </div>

            <div className="booking-seat-footer">
              <span>Available seats: <strong>{availableSeats}</strong></span>
              <span>Selected seat: <strong>{seat?.seat_number || "None"}</strong></span>
            </div>
          </section>
        </div>

        <aside className="booking-summary">
          <h2>Booking Summary</h2>
          <p>Bus: <strong>{bus?.bus_name || "Not selected"}</strong></p>
          <p>Stop: <strong>{stop?.stop_name || "Not selected"}</strong></p>
          <p>Seat: <strong>{seat?.seat_number || "Not selected"}</strong></p>
          <p>Fare: <strong>{money(stop?.fare)}</strong></p>

          <button
            type="submit"
            className="booking-primary"
            disabled={submitting || loading || !bus || !stop || !seat}
          >
            {submitting ? "Checking and Booking..." : "Confirm Booking →"}
          </button>

          <p className="booking-note">
            The server must reject a second active booking for the same student.
          </p>
        </aside>
      </form>
    )}
  </div>
</main>

);
}