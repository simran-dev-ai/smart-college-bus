import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API_BASE_URL from "../api";
const API = `${API_BASE_URL}/api`;
export default function SeatAvailability() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [busId, setBusId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSeats() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `${API}/bookings/options?bus_id=${encodeURIComponent(busId || "1")}`
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load seats.");
        }

        if (!cancelled) {
          setData(result);
          const firstBusId = String(
            result.selectedBusId || result.buses?.[0]?.bus_id || "1"
          );
          if (!busId) setBusId(firstBusId);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load seat information.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSeats();
    return () => {
      cancelled = true;
    };
  }, [busId]);

  const bus =
    data?.buses?.find((item) => String(item.bus_id) === String(busId)) ||
    data?.buses?.[0];
  const seats = data?.seats || [];
  const available = seats.filter(
    (seat) => String(seat.seat_status).toLowerCase() === "available"
  ).length;
  const booked = seats.length - available;

  const colors = {
    navy: "#10243e",
    blue: "#2563eb",
    teal: "#0f9f91",
    bg: "#f3f6fb",
    border: "#dce5f0",
    muted: "#68788d",
    green: "#147d55",
    red: "#bd3434",
  };

  const card = {
    background: "#ffffff",
    border: `1px solid ${colors.border}`,
    borderRadius: 20,
    padding: 22,
    boxShadow: "0 12px 32px rgba(16,36,62,0.06)",
  };

  const isBooked = (seat) =>
    String(seat.seat_status).toLowerCase() !== "available";

  const seatStyle = (seat) => ({
    minHeight: 66,
    borderRadius: 13,
    border: `1px solid ${isBooked(seat) ? "#f0b5b5" : "#a8dfc1"}`,
    background: isBooked(seat)
      ? "linear-gradient(145deg,#fff0f0,#ffe1e1)"
      : "linear-gradient(145deg,#f0fff6,#d9f7e6)",
    color: isBooked(seat) ? colors.red : colors.green,
    fontWeight: 800,
    fontSize: 14,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    boxShadow: "0 3px 0 rgba(16,36,62,0.05)",
    minWidth: 0,
  });

  // Four seat columns are placed as 2 seats + aisle + 2 seats.
  // This avoids seats overlapping the aisle.
  const seatColumn = (index) => {
    const position = index % 4;
    return position < 2 ? position + 1 : position + 2;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        color: "#172337",
        fontFamily: "Inter, Segoe UI, Arial, sans-serif",
      }}
    >
      <header
        style={{
          background: "#10243e",
          color: "#fff",
          padding: "18px clamp(18px, 5vw, 64px)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              background: "#1c3b5f",
              fontSize: 24,
            }}
          >
            🚌
          </div>
          <div>
            <strong style={{ fontSize: 20, letterSpacing: 0.2 }}>
              Smart College Bus
            </strong>
            <div style={{ color: "#b8c9dc", fontSize: 12, marginTop: 3 }}>
              STUDENT PORTAL / SEAT MAP
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate("/student-dashboard")}
          style={{
            border: "1px solid #45617f",
            borderRadius: 11,
            background: "#193552",
            color: "#fff",
            padding: "11px 16px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ← Dashboard
        </button>
      </header>

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "30px 18px 48px" }}>
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              color: colors.teal,
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Travel planner
          </div>
          <h1
            style={{
              margin: "8px 0",
              color: colors.navy,
              fontSize: "clamp(28px,4vw,38px)",
              letterSpacing: -0.8,
            }}
          >
            Seat Availability
          </h1>
          <p style={{ color: colors.muted, margin: 0, lineHeight: 1.6 }}>
            Check the bus layout and current seat status before booking.
          </p>
        </div>

        {loading && <section style={card}>Loading seats from database...</section>}

        {!loading && error && (
          <section style={card}>
            <p style={{ color: colors.red, fontWeight: 700 }}>{error}</p>
            <button
              onClick={() => {
                setError("");
                setLoading(true);
                setBusId((current) => current || "1");
              }}
              style={{
                border: 0,
                borderRadius: 10,
                background: colors.blue,
                color: "#fff",
                padding: "11px 16px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </section>
        )}

        {!loading && !error && data && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1.65fr) minmax(260px,0.8fr)",
              gap: 20,
              alignItems: "start",
            }}
          >
            <section style={card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  gap: 14,
                  flexWrap: "wrap",
                  marginBottom: 20,
                }}
              >
                <div>
                  <div style={{ color: colors.muted, fontSize: 12, fontWeight: 800 }}>
                    SELECTED BUS
                  </div>
                  <h2 style={{ margin: "6px 0", color: colors.navy, fontSize: 23 }}>
                    {bus?.bus_name || "College Bus"}
                  </h2>
                  <div style={{ color: colors.muted, fontSize: 13 }}>
                    {bus?.bus_number || "Bus number unavailable"}
                    {bus?.route_name ? ` · ${bus.route_name}` : ""}
                  </div>
                </div>
                <label style={{ display: "grid", gap: 7, minWidth: 180 }}>
                  <span style={{ color: colors.muted, fontSize: 12, fontWeight: 800 }}>
                    CHANGE BUS
                  </span>
                  <select
                    value={busId}
                    onChange={(event) => setBusId(event.target.value)}
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      border: `1px solid ${colors.border}`,
                      borderRadius: 11,
                      background: "#fff",
                      color: colors.navy,
                      fontWeight: 700,
                    }}
                  >
                    {(data.buses || []).map((item) => (
                      <option key={item.bus_id} value={item.bus_id}>
                        {item.bus_name} — {item.bus_number}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                {[
                  { label: "Available", color: "#20a36b", count: available },
                  { label: "Booked", color: "#d94b4b", count: booked },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 999,
                      padding: "8px 12px",
                      color: colors.navy,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: 3,
                        background: item.color,
                      }}
                    />
                    {item.label} <strong>{item.count}</strong>
                  </div>
                ))}
                <div
                  style={{
                    marginLeft: "auto",
                    color: colors.muted,
                    fontSize: 12,
                    alignSelf: "center",
                    fontWeight: 700,
                  }}
                >
                  TOTAL {seats.length} SEATS
                </div>
              </div>

              <div
                style={{
                  borderRadius: 28,
                  padding: "18px clamp(10px,3vw,28px) 22px",
                  background: "linear-gradient(180deg,#edf3fa,#f8fbff)",
                  border: "2px solid #cbd8e8",
                  maxWidth: 650,
                  margin: "0 auto",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    borderRadius: "20px 20px 14px 14px",
                    background: "#173858",
                    color: "#fff",
                    padding: "15px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, color: "#b9d2e7", letterSpacing: 1.5 }}>
                      FRONT OF BUS
                    </div>
                    <strong style={{ display: "block", marginTop: 4 }}>Driver cabin</strong>
                  </div>
                  <div style={{ fontSize: 28 }} aria-hidden="true">◉</div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 30px minmax(0,1fr) minmax(0,1fr)",
                    gap: 8,
                    alignItems: "stretch",
                  }}
                >
                  {seats.map((seat, index) => {
                    const row = Math.floor(index / 4) + 1;
                    const position = index % 4;
                    const sideLabel =
                      position === 0 || position === 3 ? "WINDOW" : "AISLE";
                    return (
                      <div
                        key={seat.id ?? seat.seat_id ?? seat.seat_number ?? index}
                        style={{
                          gridColumn: seatColumn(index),
                          gridRow: row,
                          ...seatStyle(seat),
                        }}
                        title={`${seat.seat_number}: ${isBooked(seat) ? "Booked" : "Available"}`}
                      >
                        <span style={{ fontSize: 15 }}>
                          {seat.seat_number ?? `S${index + 1}`}
                        </span>
                        <span style={{ fontSize: 9, letterSpacing: 0.8, fontWeight: 800 }}>
                          {isBooked(seat) ? "BOOKED" : sideLabel}
                        </span>
                      </div>
                    );
                  })}

                  {Array.from({ length: Math.ceil(seats.length / 4) }, (_, row) => (
                    <div
                      key={`aisle-${row}`}
                      style={{
                        gridColumn: 3,
                        gridRow: row + 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#8b9bb0",
                        fontSize: 9,
                        fontWeight: 800,
                        writingMode: "vertical-rl",
                        letterSpacing: 2,
                        borderLeft: "1px dashed #c3cfdd",
                        borderRight: "1px dashed #c3cfdd",
                      }}
                    >
                      AISLE
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 18,
                    textAlign: "center",
                    color: colors.muted,
                    fontSize: 10,
                    letterSpacing: 2,
                    fontWeight: 900,
                  }}
                >
                  REAR OF BUS
                </div>
              </div>
              <p style={{ color: colors.muted, fontSize: 12, lineHeight: 1.6, margin: "18px 0 0" }}>
                Seat colours and counts are loaded from your existing backend. This is a visual 2+2 layout; please compare the positions with your actual bus before using it for real seat selection.
              </p>
            </section>

            <aside style={{ display: "grid", gap: 16 }}>
              <section style={{ ...card, background: "#10243e", color: "#fff", border: 0 }}>
                <div style={{ color: "#a9c4dc", fontSize: 11, fontWeight: 900, letterSpacing: 1.5 }}>
                  SEAT SUMMARY
                </div>
                <div style={{ fontSize: 48, fontWeight: 900, marginTop: 8, lineHeight: 1.1 }}>
                  {available}
                  <span style={{ color: "#a9c4dc", fontSize: 20 }}> / {seats.length}</span>
                </div>
                <div style={{ color: "#d5e2ef", fontSize: 13, marginTop: 6 }}>
                  seats currently available
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 99,
                    background: "#344b63",
                    marginTop: 20,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${seats.length ? (available / seats.length) * 100 : 0}%`,
                      background: "#39c58c",
                      borderRadius: 99,
                    }}
                  />
                </div>
                <div style={{ color: "#b9cadd", fontSize: 11, marginTop: 8 }}>
                  {seats.length ? Math.round((available / seats.length) * 100) : 0}% seats available
                </div>
              </section>

              <section style={card}>
                <h3 style={{ margin: "0 0 14px", color: colors.navy }}>Seat guide</h3>
                {[
                  { color: "#dff8e9", border: "#9bdab5", label: "Available", detail: "Seat is not booked" },
                  { color: "#ffe5e5", border: "#efb0b0", label: "Booked", detail: "Seat is already reserved" },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      gap: 11,
                      alignItems: "center",
                      padding: "11px 0",
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        flexShrink: 0,
                        background: item.color,
                        border: `1px solid ${item.border}`,
                      }}
                    />
                    <div>
                      <strong style={{ display: "block", color: colors.navy, fontSize: 13 }}>
                        {item.label}
                      </strong>
                      <span style={{ color: colors.muted, fontSize: 11 }}>{item.detail}</span>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => navigate("/booking")}
                  style={{
                    width: "100%",
                    marginTop: 18,
                    border: 0,
                    borderRadius: 12,
                    background: colors.teal,
                    color: "#fff",
                    padding: "14px 16px",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 7px 16px rgba(15,159,145,0.18)",
                  }}
                >
                  Continue to Booking →
                </button>
              </section>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}