
import { useEffect, useState } from "react";

import API_BASE_URL from "../api";
const API = `${API_BASE_URL}/api/tracking`;
function StudentLiveTracking() {
  const [busId, setBusId] = useState("1");
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState("Loading bus location...");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!/^\d+$/.test(busId) || Number(busId) < 1) {
      return;
    }

    let active = true;
    let intervalId;

    async function fetchLocation() {
      try {
        setLoading(true);

        const response = await fetch(
          `${API}/bus/${encodeURIComponent(busId)}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load bus location."
          );
        }

        const gps = data.location;

        if (
          !gps ||
          !Number.isFinite(Number(gps.latitude)) ||
          !Number.isFinite(Number(gps.longitude))
        ) {
          throw new Error("Valid GPS coordinates are not available.");
        }

        if (active) {
          setLocation(gps);
          setError("");
          setStatus("Live location received");
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to fetch bus location.");
          setStatus("Location unavailable");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchLocation();
    intervalId = setInterval(fetchLocation, 5000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [busId]);

  const latitude = location
    ? Number(location.latitude)
    : null;

  const longitude = location
    ? Number(location.longitude)
    : null;

  const validBusId =
    /^\d+$/.test(busId) && Number(busId) > 0;

  const mapUrl =
    latitude !== null && longitude !== null
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : "";

  const embedUrl =
    latitude !== null && longitude !== null
      ? `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`
      : "";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f7fb",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
        color: "#172033",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <button
          type="button"
          onClick={() => {
            window.location.href = "/student-dashboard";
          }}
          style={{
            border: "none",
            background: "#e1e9f8",
            padding: "10px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          ← Back to Dashboard
        </button>

        <header
          style={{
            background: "#123b70",
            color: "white",
            padding: "28px",
            borderRadius: "16px",
            marginBottom: "22px",
          }}
        >
          <h1 style={{ margin: "0 0 10px" }}>
            🚌 My Bus Tracking
          </h1>
          <p style={{ margin: 0 }}>
            Track your college bus using the driver's GPS location.
          </p>
        </header>

        <section
          style={{
            background: "white",
            padding: "24px",
            borderRadius: "14px",
            marginBottom: "20px",
            boxShadow: "0 3px 15px rgba(0,0,0,0.05)",
          }}
        >
          <label
            htmlFor="busId"
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "8px",
            }}
          >
            Enter Bus ID
          </label>

          <input
            id="busId"
            type="number"
            min="1"
            value={busId}
            onChange={(event) => {
              setBusId(event.target.value);
              setError("");
              setLocation(null);
              setStatus("Checking bus location...");
            }}
            placeholder="Example: 1"
            style={{
              width: "100%",
              maxWidth: "320px",
              boxSizing: "border-box",
              padding: "12px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              fontSize: "16px",
            }}
          />

          <p style={{ color: "#64748b", fontSize: "14px" }}>
            Enter your bus's database ID. For the current demo, try bus ID 1.
          </p>

          <p role="status" aria-live="polite">
            <strong>Status:</strong>{" "}
            {loading ? "Refreshing location..." : status}
          </p>

          {!validBusId && (
            <p style={{ color: "#b91c1c" }}>
              Please enter a valid positive Bus ID.
            </p>
          )}

          {error && (
            <p
              role="alert"
              style={{
                color: "#b91c1c",
                background: "#fef2f2",
                padding: "12px",
                borderRadius: "8px",
              }}
            >
              {error}
            </p>
          )}
        </section>

        {location && latitude !== null && longitude !== null && (
          <>
            <section
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  background: "white",
                  padding: "20px",
                  borderRadius: "12px",
                }}
              >
                <p style={{ color: "#64748b", marginTop: 0 }}>
                  Bus Number
                </p>
                <h2 style={{ marginBottom: 0 }}>
                  {location.bus_number || `Bus ${busId}`}
                </h2>
              </div>

              <div
                style={{
                  background: "white",
                  padding: "20px",
                  borderRadius: "12px",
                }}
              >
                <p style={{ color: "#64748b", marginTop: 0 }}>
                  Latitude
                </p>
                <h3 style={{ marginBottom: 0 }}>
                  {latitude.toFixed(7)}
                </h3>
              </div>

              <div
                style={{
                  background: "white",
                  padding: "20px",
                  borderRadius: "12px",
                }}
              >
                <p style={{ color: "#64748b", marginTop: 0 }}>
                  Longitude
                </p>
                <h3 style={{ marginBottom: 0 }}>
                  {longitude.toFixed(7)}
                </h3>
              </div>
            </section>

            <section
              style={{
                background: "white",
                padding: "22px",
                borderRadius: "14px",
              }}
            >
              <h2>Live Bus Location on Map</h2>

              {location.recorded_at && (
                <p style={{ color: "#64748b" }}>
                  Last GPS update:{" "}
                  {new Date(location.recorded_at).toLocaleString()}
                </p>
              )}

              <iframe
                title="Live college bus location"
                src={embedUrl}
                width="100%"
                height="420"
                style={{
                  border: 0,
                  borderRadius: "10px",
                }}
                loading="lazy"
                allowFullScreen
              />

              <p>
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open location in Google Maps ↗
                </a>
              </p>
            </section>
          </>
        )}

        <p
          style={{
            color: "#64748b",
            fontSize: "13px",
            marginTop: "22px",
          }}
        >
          The page checks the server every 5 seconds. The map updates
          when a new GPS location is received from the driver.
        </p>
      </div>
    </div>
  );
}

export default StudentLiveTracking;
