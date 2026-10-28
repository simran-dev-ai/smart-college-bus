
import { useEffect, useRef, useState } from "react";

import API_BASE_URL from "../api";
const API = `${API_BASE_URL}/api/tracking`;
export default function DriverTracking({ driverUserId }) {
  const [status, setStatus] = useState("Not started");
  const [location, setLocation] = useState(null);
  const [error, setError] = useState("");
  const watchId = useRef(null);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  function startTracking() {
    setError("");

    if (!driverUserId) {
      setError(
        "Driver ID not found. Please connect this page to your logged-in Driver account."
      );
      return;
    }

    if (!navigator.geolocation) {
      setError("GPS location is not supported by this browser.");
      return;
    }

    if (watchId.current !== null) {
      return;
    }

    setStatus("Getting GPS location...");

    watchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setLocation({ latitude, longitude });

        try {
          const response = await fetch(`${API}/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              driverUserId,
              latitude,
              longitude
            })
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.message || "Location update failed.");
          }

          setStatus("Tracking active");
          setError("");
        } catch (err) {
          setStatus("Location not saved");
          setError(err.message);
        }
      },
      (err) => {
        setStatus("GPS unavailable");
        setError(err.message);
        stopTracking();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000
      }
    );
  }

  function stopTracking() {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    setStatus("Tracking stopped");
  }

  return (
    <div style={{
      maxWidth: "700px",
      margin: "30px auto",
      padding: "24px",
      fontFamily: "Arial, sans-serif",
      border: "1px solid #ddd",
      borderRadius: "14px"
    }}>
      <h2>Live Bus GPS Tracking</h2>
      <p>Share your phone's GPS location while driving the college bus.</p>

      <p>
        <strong>Status:</strong> {status}
      </p>

      {location && (
        <div>
          <p>Latitude: {location.latitude.toFixed(6)}</p>
          <p>Longitude: {location.longitude.toFixed(6)}</p>
          <a
            href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            View current location on Google Maps
          </a>
        </div>
      )}

      {error && (
        <p style={{ color: "red" }}>{error}</p>
      )}

      <button
        onClick={startTracking}
        disabled={status === "Tracking active" ||
                  status === "Getting GPS location..."}
        style={{
          padding: "12px 18px",
          marginRight: "10px",
          background: "#167d4a",
          color: "white",
          border: 0,
          borderRadius: "8px",
          cursor: "pointer"
        }}
      >
        Start Tracking
      </button>

      <button
        onClick={stopTracking}
        style={{
          padding: "12px 18px",
          background: "#b42318",
          color: "white",
          border: 0,
          borderRadius: "8px",
          cursor: "pointer"
        }}
      >
        Stop Tracking
      </button>

      <p style={{ fontSize: "13px", color: "#666", marginTop: "18px" }}>
        Allow location permission when your browser asks. Tracking works
        while this page remains open. Stop tracking when the trip ends.
      </p>
    </div>
  );
}
