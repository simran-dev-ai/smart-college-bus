
import { useEffect, useRef, useState } from "react";

import API_BASE_URL from "../api";
const API = `${API_BASE_URL}/api/tracking`;
export default function DriverLocationSharing({ userId, buses = [] }) {
  const [status, setStatus] = useState("Not started");
  const [location, setLocation] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [tracking, setTracking] = useState(false);

  const watchRef = useRef(null);
  const activeRef = useRef(false);

  useEffect(() => {
    return () => {
      activeRef.current = false;

      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
  }, []);

  function stopTracking() {
    activeRef.current = false;

    if (
      watchRef.current !== null &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }

    setTracking(false);
    setSaving(false);
    setStatus("Tracking stopped");
  }

  function startTracking() {
    setError("");

    if (!userId) {
      setError("Driver user ID not found. Please log in again.");
      return;
    }

    if (!navigator.geolocation) {
      setError("GPS is not supported by this browser.");
      return;
    }

    if (activeRef.current) {
      return;
    }

    activeRef.current = true;
    setTracking(true);
    setStatus("Waiting for GPS...");
    setError("");

    watchRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        if (!activeRef.current) return;

        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setLocation({ latitude, longitude });
        setStatus("GPS found — saving location...");
        setSaving(true);

        try {
          const response = await fetch(`${API}/update`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              driverUserId: Number(userId),
              latitude,
              longitude
            })
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(
              data.message || "Unable to save GPS location."
            );
          }

          if (activeRef.current) {
            setStatus("Live tracking active");
            setError("");
          }
        } catch (err) {
          if (activeRef.current) {
            setStatus("GPS save failed");
            setError(err.message || "Unable to connect to backend.");
          }
        } finally {
          setSaving(false);
        }
      },
      (err) => {
        if (!activeRef.current) return;

        let message = "Unable to get GPS location.";

        if (err.code === 1) {
          message = "Location permission denied. Allow location access.";
        } else if (err.code === 2) {
          message = "GPS position unavailable. Check device location settings.";
        } else if (err.code === 3) {
          message = "GPS request timed out. Please try again.";
        }

        setError(message);
        setStatus("GPS unavailable");
        stopTracking();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20000
      }
    );
  }

  const assignedBus = buses[0];

  return (
    <section className="driver-tracking-panel">
      <h3>📍 Live Bus GPS Tracking</h3>

      <p>
        <strong>Assigned Bus:</strong>{" "}
        {assignedBus?.bus_name || "College Bus"}
      </p>

      <p>
        <strong>Bus Number:</strong>{" "}
        {assignedBus?.bus_number || "Not available"}
      </p>

      <p>
        <strong>Status:</strong> {status}
      </p>

      {location && (
        <div>
          <p>
            <strong>Latitude:</strong>{" "}
            {location.latitude.toFixed(6)}
          </p>

          <p>
            <strong>Longitude:</strong>{" "}
            {location.longitude.toFixed(6)}
          </p>

          <a
            href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            View location on Google Maps
          </a>
        </div>
      )}

      {error && (
        <p role="alert" style={{ color: "red" }}>
          {error}
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginTop: "16px"
        }}
      >
        <button
          type="button"
          className="driver-action-button"
          onClick={startTracking}
          disabled={tracking}
        >
          Start Tracking
        </button>

        <button
          type="button"
          className="driver-action-button"
          onClick={stopTracking}
          disabled={!tracking}
        >
          Stop Tracking
        </button>
      </div>

      {saving && <p>Saving current GPS location...</p>}

      <p style={{ fontSize: "13px", marginTop: "14px" }}>
        Allow location permission and keep this page open during the trip.
      </p>
    </section>
  );
}
