import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API_BASE_URL from "../api";
const API = `${API_BASE_URL}/api`;
export default function RoutesStops() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [busId, setBusId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRoutes() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `${API}/bookings/options${busId ? `?bus_id=${encodeURIComponent(busId)}` : ""}`
        );
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load route stops.");
        }
        if (!cancelled) {
          setData(result);
          if (!busId && result.selectedBusId) setBusId(String(result.selectedBusId));
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load route stops.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRoutes();
    return () => { cancelled = true; };
  }, [busId]);

  const bus = data?.buses?.find((item) => String(item.bus_id) === String(busId)) || data?.buses?.[0];
  const stops = [...(data?.stops || [])].sort(
    (a, b) => Number(a.stop_order) - Number(b.stop_order)
  );

  const colors = { navy: "#142747", blue: "#4263eb", muted: "#778399", border: "#e7ebf2" };
  const card = {
    background: "#fff",
    border: `1px solid ${colors.border}`,
    borderRadius: 17,
    padding: 22,
    boxShadow: "0 6px 22px rgba(20,39,71,.04)"
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fb", fontFamily: "Arial, sans-serif", color: "#202b3c" }}>
      <header style={{ background: "#fff", borderBottom: `1px solid ${colors.border}`, padding: "17px 5%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <strong style={{ fontSize: 21, color: colors.navy }}>🚌 SmartBus</strong>
          <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>Routes & Stops</div>
        </div>
        <button onClick={() => navigate("/student-dashboard")} style={{ background: "#edf1ff", color: colors.blue, border: 0, padding: "11px 15px", borderRadius: 9, fontWeight: 700, cursor: "pointer" }}>← Dashboard</button>
      </header>

      <main style={{ maxWidth: 1000, padding: "30px 18px", margin: "auto" }}>
        <p style={{ color: colors.blue, fontWeight: 800, fontSize: 12, letterSpacing: 1 }}>ROUTE EXPLORER</p>
        <h1 style={{ color: colors.navy, margin: "0 0 8px", fontSize: 32 }}>Explore Routes & Stops</h1>
        <p style={{ color: colors.muted, lineHeight: 1.6 }}>View the bus route and each boarding stop in travel order.</p>

        {loading && <section style={card}>Loading routes and stops from database...</section>}
        {!loading && error && (
          <section style={card}>
            <p style={{ color: "#b42318" }}>{error}</p>
            <button onClick={() => { setBusId(""); setData(null); }} style={{ padding: "10px 14px", cursor: "pointer" }}>Try again</button>
          </section>
        )}

        {!loading && !error && data && (
          <>
            <section style={{ ...card, marginTop: 22 }}>
              <label htmlFor="route-bus" style={{ display: "block", fontWeight: 700, marginBottom: 9 }}>Choose bus</label>
              <select id="route-bus" value={busId} onChange={(event) => setBusId(event.target.value)} style={{ width: "100%", padding: 12, borderRadius: 9, border: `1px solid ${colors.border}`, background: "#fff" }}>
                {data.buses.map((item) => <option key={item.bus_id} value={item.bus_id}>{item.bus_name} — {item.bus_number}</option>)}
              </select>
              <div style={{ background: "linear-gradient(120deg,#142747,#31578f)", color: "#fff", padding: 23, borderRadius: 14, marginTop: 20 }}>
                <div style={{ fontSize: 13, opacity: .8 }}>SELECTED BUS ROUTE</div>
                <h2 style={{ margin: "8px 0" }}>{bus?.route_name || "College Bus Route"}</h2>
                <div style={{ opacity: .9 }}>{bus?.bus_number || "Bus number unavailable"} · {stops.length} stops</div>
              </div>
            </section>

            <section style={{ ...card, marginTop: 20 }}>
              <h2 style={{ color: colors.navy, marginTop: 0 }}>Route Stops</h2>
              <p style={{ color: colors.muted, fontSize: 13 }}>Stops are shown in the order saved in your existing database. Fare details are available separately under Route Prices.</p>
              {stops.length === 0 ? (
                <p>No stops are available for this route.</p>
              ) : (
                <div style={{ position: "relative", padding: "12px 0 8px 8px" }}>
                  <div style={{ position: "absolute", left: 24, top: 32, bottom: 40, width: 5, background: "#c8d7ff", borderRadius: 5 }} />
                  {stops.map((stop, index) => (
                    <div key={stop.route_stop_id ?? stop.stop_id} style={{ display: "grid", gridTemplateColumns: "48px minmax(0,1fr)", alignItems: "center", gap: 12, position: "relative", marginBottom: 16 }}>
                      <div style={{ zIndex: 1, width: 38, height: 38, borderRadius: "50%", display: "grid", placeItems: "center", background: index === 0 || index === stops.length - 1 ? colors.navy : colors.blue, color: "#fff", border: "4px solid #fff", boxShadow: "0 0 0 2px #c8d7ff", fontWeight: 800, fontSize: 12 }}>{index + 1}</div>
                      <div style={{ background: "#f8faff", border: `1px solid ${colors.border}`, padding: "15px 14px", borderRadius: 12, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, color: colors.navy, overflowWrap: "anywhere" }}>{stop.stop_name}</div>
                        <div style={{ fontSize: 12, color: colors.muted, marginTop: 5 }}>{index === 0 ? "Starting stop" : index === stops.length - 1 ? "Final stop" : `Stop ${index + 1}`}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <button onClick={() => navigate("/route-prices")} style={{ width: "100%", marginTop: 20, border: 0, borderRadius: 10, background: colors.blue, color: "#fff", padding: 14, fontWeight: 800, cursor: "pointer" }}>View Route Prices Separately →</button>
          </>
        )}
      </main>
    </div>
  );
}
