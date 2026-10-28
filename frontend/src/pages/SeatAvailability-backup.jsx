
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
          setBusId(String(result.selectedBusId || result.buses?.[0]?.bus_id || "1"));
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load seat information.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSeats();
    return () => { cancelled = true; };
  }, [busId]);

  const bus = data?.buses?.find(
    (item) => String(item.bus_id) === String(busId)
  ) || data?.buses?.[0];

  const seats = data?.seats || [];
  const available = seats.filter(
    (seat) => String(seat.seat_status).toLowerCase() === "available"
  ).length;
  const booked = seats.length - available;

  const colors = {
    navy: "#142747",
    blue: "#4263eb",
    bg: "#f4f7fc",
    border: "#e3e9f2",
    muted: "#738198"
  };

  const seatStyle = (seat) => {
    const isBooked = String(seat.seat_status).toLowerCase() !== "available";
    return {
      minHeight: 52,
      borderRadius: 10,
      border: `1px solid ${isBooked ? "#efb8b8" : "#a8dfbd"}`,
      background: isBooked ? "#fde8e8" : "#e4f8eb",
      color: isBooked ? "#b42318" : "#167744",
      fontWeight: 800,
      fontSize: 13,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center"
    };
  };

  const card = {
    background: "#fff",
    border: `1px solid ${colors.border}`,
    borderRadius: 18,
    padding: 22,
    boxShadow: "0 8px 25px rgba(20,39,71,.04)"
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: "#202b3c", fontFamily: "Arial, sans-serif" }}>
      <header style={{ background: "#fff", borderBottom: `1px solid ${colors.border}`, padding: "17px 5%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <strong style={{ color: colors.navy, fontSize: 21 }}>🚌 SmartBus</strong>
          <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>Seat Availability</div>
        </div>
        <button onClick={() => navigate("/student-dashboard")} style={{ border: 0, borderRadius: 9, background: "#eaf0ff", color: colors.blue, padding: "11px 16px", fontWeight: 700, cursor: "pointer" }}>← Dashboard</button>
      </header>

      <main style={{ maxWidth: 1100, margin: "auto", padding: "30px 18px" }}>
        <p style={{ color: colors.blue, fontWeight: 800, fontSize: 12, letterSpacing: 1 }}>BUS LAYOUT</p>
        <h1 style={{ color: colors.navy, margin: "0 0 10px", fontSize: 32 }}>Choose your seat</h1>
        <p style={{ color: colors.muted, lineHeight: 1.6 }}>View window seats, aisle seats and live seat status from your existing database.</p>

        {loading && <section style={card}>Loading seats from database...</section>}
        {!loading && error && <section style={card}><p style={{ color: "#b42318" }}>{error}</p><button onClick={() => window.location.reload()}>Try again</button></section>}

        {!loading && !error && data && (
          <>
            <section style={{ ...card, marginTop: 22 }}>
              <label htmlFor="bus-select" style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>Select bus</label>
              <select id="bus-select" value={busId} onChange={(event) => setBusId(event.target.value)} style={{ width: "100%", padding: 12, border: `1px solid ${colors.border}`, borderRadius: 9, background: "#fff" }}>
                {data.buses.map((item) => (
                  <option key={item.bus_id} value={item.bus_id}>{item.bus_name} — {item.bus_number}</option>
                ))}
              </select>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 12, marginTop: 20 }}>
                {[
                  ["Total Seats", seats.length, "#edf1ff"],
                  ["Available", available, "#e4f8eb"],
                  ["Booked", booked, "#fde8e8"]
                ].map(([label, count, bg]) => (
                  <div key={label} style={{ background: bg, borderRadius: 12, padding: 17 }}>
                    <div style={{ fontSize: 13, color: colors.muted }}>{label}</div>
                    <strong style={{ display: "block", fontSize: 27, marginTop: 5 }}>{count}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ ...card, marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <h2 style={{ color: colors.navy, margin: "0 0 6px" }}>{bus?.bus_name || "College Bus"}</h2>
                  <div style={{ color: colors.muted, fontSize: 13 }}>{bus?.bus_number} · {bus?.route_name}</div>
                </div>
                <span style={{ background: "#edf1ff", padding: "9px 12px", borderRadius: 9, color: colors.blue, fontWeight: 700 }}>Front of Bus ↑</span>
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", margin: "22px 0" }}>
                <span>🟩 Available</span><span>🟥 Booked</span>
                <span>▰ Window side</span><span>▰ Aisle side</span>
              </div>

              <div style={{ maxWidth: 540, margin: "auto", border: "3px solid #b8c5d8", borderRadius: "75px 75px 22px 22px", padding: "22px 16px 18px", background: "#f8faff" }}>
                <div style={{ textAlign: "center", fontWeight: 800, color: colors.navy, paddingBottom: 18, borderBottom: `1px dashed ${colors.border}`, marginBottom: 15 }}>DRIVER / FRONT</div>

                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 35px minmax(0,1fr) minmax(0,1fr)", gap: 7, alignItems: "stretch" }}>
                  {seats.map((seat, index) => {
                    const position = index % 4;
                    const row = Math.floor(index / 4);
                    const isWindow = position === 0 || position === 3;
                    return (
                      <div key={seat.id ?? seat.seat_number} style={{ gridColumn: position + 1, gridRow: row + 1, ...seatStyle(seat) }}>
                        <span>{seat.seat_number}</span>
                        <span style={{ fontSize: 9, fontWeight: 500 }}>{isWindow ? "WINDOW" : "AISLE"}</span>
                      </div>
                    );
                  })}
                  {Array.from({ length: Math.ceil(seats.length / 4) }, (_, row) => (
                    <div key={`aisle-${row}`} style={{ gridColumn: 3, gridRow: row + 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9aa6b8", fontSize: 10, writingMode: "vertical-rl", letterSpacing: 2 }}>AISLE</div>
                  ))}
                </div>
                <div style={{ textAlign: "center", color: colors.muted, fontSize: 12, marginTop: 18 }}>REAR OF BUS</div>
              </div>

              <p style={{ color: colors.muted, fontSize: 12, lineHeight: 1.6, marginTop: 18 }}>This is a visual 2+2 seat layout. Seat availability comes from the backend. The actual window/aisle position should be confirmed against your physical bus layout.</p>
              <button onClick={() => navigate("/booking")} style={{ width: "100%", marginTop: 8, border: 0, borderRadius: 10, background: colors.blue, color: "#fff", padding: 14, fontWeight: 800, cursor: "pointer" }}>Continue to Booking →</button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
