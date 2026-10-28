
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API_BASE_URL from "../api";
const API = `${API_BASE_URL}/api`;
export default function RoutePrices() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [busId, setBusId] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPrices() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API}/bookings/options?bus_id=${encodeURIComponent(busId || "1")}`
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load fares.");
        }

        if (!cancelled) {
          setData(result);
          setBusId(String(result.selectedBusId || result.buses?.[0]?.bus_id || "1"));
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load fares.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPrices();
    return () => { cancelled = true; };
  }, [busId]);

  const bus = data?.buses?.find(
    (item) => String(item.bus_id) === String(busId)
  ) || data?.buses?.[0];

  const stops = [...(data?.stops || [])]
    .sort((a, b) => Number(a.stop_order) - Number(b.stop_order))
    .filter((stop) => String(stop.stop_name || "").toLowerCase().includes(search.trim().toLowerCase()));

  const money = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;

  const border = "#e7ebf2";
  const navy = "#142747";
  const blue = "#4263eb";
  const muted = "#778399";

  const card = {
    background: "#fff",
    border: `1px solid ${border}`,
    borderRadius: 17,
    padding: 22,
    boxShadow: "0 6px 22px rgba(20,39,71,.04)"
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fb", color: "#202b3c", fontFamily: "Arial, sans-serif" }}>
      <header style={{ background: "#fff", borderBottom: `1px solid ${border}`, padding: "17px 5%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <strong style={{ fontSize: 21, color: navy }}>🚌 SmartBus</strong>
          <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>Route Prices</div>
        </div>
        <button onClick={() => navigate("/student-dashboard")} style={{ background: "#edf1ff", color: blue, border: 0, borderRadius: 9, padding: "11px 15px", fontWeight: 700, cursor: "pointer" }}>← Dashboard</button>
      </header>

      <main style={{ maxWidth: 950, margin: "auto", padding: "30px 18px" }}>
        <p style={{ color: blue, fontWeight: 800, fontSize: 12, letterSpacing: 1 }}>FARE DIRECTORY</p>
        <h1 style={{ color: navy, fontSize: 32, margin: "0 0 8px" }}>Route Prices</h1>
        <p style={{ color: muted, lineHeight: 1.6 }}>Compare boarding-stop fares before booking your college bus.</p>

        {loading && <section style={card}>Loading prices from database...</section>}
        {!loading && error && <section style={card}><p style={{ color: "#b42318" }}>{error}</p><button onClick={() => window.location.reload()}>Try again</button></section>}

        {!loading && !error && data && (
          <>
            <section style={{ ...card, marginTop: 22 }}>
              <label htmlFor="fare-bus" style={{ display: "block", fontWeight: 700, marginBottom: 9 }}>Select bus / route</label>
              <select id="fare-bus" value={busId} onChange={(event) => setBusId(event.target.value)} style={{ width: "100%", padding: 12, borderRadius: 9, border: `1px solid ${border}`, background: "#fff" }}>
                {data.buses.map((item) => <option key={item.bus_id} value={item.bus_id}>{item.route_name} — {item.bus_number}</option>)}
              </select>

              <div style={{ marginTop: 20, background: "linear-gradient(120deg,#142747,#31578f)", color: "#fff", borderRadius: 14, padding: 24 }}>
                <div style={{ opacity: .8, fontSize: 12 }}>FULL ROUTE PRICE</div>
                <div style={{ fontSize: 34, fontWeight: 800, margin: "7px 0" }}>{money(bus?.route_price)}</div>
                <div style={{ opacity: .9 }}>{bus?.route_name}</div>
                <div style={{ opacity: .8, fontSize: 13, marginTop: 8 }}>{bus?.bus_name} · {bus?.bus_number}</div>
              </div>
            </section>

            <section style={{ ...card, marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
                <div>
                  <h2 style={{ margin: "0 0 6px", color: navy }}>Stop-wise Fare</h2>
                  <p style={{ margin: 0, color: muted, fontSize: 13 }}>Fare values are read from your existing API.</p>
                </div>
                <input aria-label="Search stop" placeholder="Search stop..." value={search} onChange={(event) => setSearch(event.target.value)} style={{ width: "100%", maxWidth: 250, padding: 12, border: `1px solid ${border}`, borderRadius: 9 }} />
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
                  <thead>
                    <tr style={{ background: "#f5f7fb", textAlign: "left" }}>
                      {["No.", "Boarding Stop", "Fare"].map((label) => <th key={label} style={{ padding: 14, fontSize: 12, color: "#58667d", borderBottom: `1px solid ${border}` }}>{label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {stops.map((stop, index) => (
                      <tr key={stop.route_stop_id ?? stop.stop_id}>
                        <td style={{ padding: 14, borderBottom: `1px solid ${border}`, color: muted }}>{stop.stop_order ?? index + 1}</td>
                        <td style={{ padding: 14, borderBottom: `1px solid ${border}`, fontWeight: 700, color: navy }}>📍 {stop.stop_name}</td>
                        <td style={{ padding: 14, borderBottom: `1px solid ${border}`, fontWeight: 800, color: blue }}>{money(stop.fare)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {stops.length === 0 && <p style={{ color: muted }}>No matching stops found.</p>}
              <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, marginTop: 15 }}>Fare amounts are displayed exactly from the current API response. Confirm the institution's fare policy before accepting real payments.</p>
            </section>

            <button onClick={() => navigate("/booking")} style={{ width: "100%", marginTop: 20, border: 0, borderRadius: 10, background: blue, color: "#fff", padding: 14, fontWeight: 800, cursor: "pointer" }}>Continue to Booking →</button>
          </>
        )}
      </main>
    </div>
  );
}
