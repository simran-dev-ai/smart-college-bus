
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DriverDashboard.css";
import DriverAttendance from "./DriverAttendance.jsx";
import DriverLocationSharing from "./DriverLocationSharing.jsx";

import API_BASE_URL from "../api";
const API = API_BASE_URL;
export default function DriverDashboard() {
  const navigate = useNavigate();

  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const [activePage, setActivePage] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [driver, setDriver] = useState(null);
  const [buses, setBuses] = useState([]);

  const userId = user?.id ?? user?.user_id ?? user?.userId;
  const isDriver = String(user?.role || "").toLowerCase() === "driver";

  useEffect(() => {
    if (!user || !isDriver || !userId) {
      navigate("/login", { replace: true });
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API}/api/driver/dashboard/${encodeURIComponent(userId)}`
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.success === false) {
          throw new Error(
            data.message || `Dashboard request failed (${response.status}).`
          );
        }

        if (!cancelled) {
          setDriver(data.driver || null);
          setBuses(Array.isArray(data.buses) ? data.buses : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Cannot connect to the backend.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [navigate, user, isDriver, userId]);

  function logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("user_id");
    localStorage.removeItem("userId");
    navigate("/login", { replace: true });
  }

  const name = driver?.name || user?.name || "Driver";
  const email = driver?.email || user?.email || "";

  const menu = [
    { id: "dashboard", icon: "⌂", label: "Dashboard" },
    { id: "profile", icon: "👤", label: "My Profile" },
    { id: "buses", icon: "🚌", label: "My Assigned Bus" },
    { id: "route", icon: "🗺️", label: "Route Information" },
    { id: "attendance", icon: "▦", label: "QR Attendance" },
    { id: "tracking", icon: "📍", label: "Live Bus Tracking" },
  ];

  function openPage(page) {
    setActivePage(page);
  }

  function renderContent() {
    if (loading) {
      return (
        <section className="driver-card">
          <h2>Loading Driver Dashboard...</h2>
          <p>Please wait.</p>
        </section>
      );
    }

    if (error) {
      return (
        <section className="driver-section">
          <article className="driver-card">
            <h2>Unable to Load Dashboard</h2>
            <p>{error}</p>
            <button
              type="button"
              className="driver-action-button"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </article>
        </section>
      );
    }

    if (activePage === "attendance") {
      return (
        <section className="driver-section">
          <h2>QR Attendance</h2>
          <article className="driver-card driver-attendance-card">
            <h3>Scan Student Bus Pass</h3>
            <p>
              Allow camera permission and scan a student's active bus pass QR
              code.
            </p>
            <DriverAttendance userId={userId} />
          </article>
        </section>
      );
    }

    if (activePage === "tracking") {
      return (
        <section className="driver-section">
          <h2>Live Bus Tracking</h2>
          <article className="driver-card">
            <p>
              Start GPS sharing to send the driver's location to the backend.
            </p>
            <DriverLocationSharing userId={userId} buses={buses} />
          </article>
        </section>
      );
    }

    if (activePage === "profile") {
      return (
        <section className="driver-section">
          <h2>My Profile</h2>
          <article className="driver-card">
            <h3>{name}</h3>
            <p><strong>Email:</strong> {email || "Not available"}</p>
            <p>
              <strong>License:</strong>{" "}
              {driver?.license_no || "Not available"}
            </p>
            <p>
              <strong>Phone:</strong> {driver?.phone || "Not available"}
            </p>
            <p><strong>Role:</strong> Driver</p>
          </article>
        </section>
      );
    }

    if (activePage === "buses") {
      return (
        <section className="driver-section">
          <h2>My Assigned Bus</h2>

          {buses.length === 0 ? (
            <article className="driver-card">
              <p>No assigned bus found. Please contact the administrator.</p>
            </article>
          ) : (
            <div className="driver-card-grid">
              {buses.map((bus) => (
                <article
                  className="driver-card"
                  key={bus.bus_id ?? bus.id}
                >
                  <h3>🚌 {bus.bus_name || "College Bus"}</h3>
                  <p>
                    <strong>Bus Number:</strong> {bus.bus_number || "N/A"}
                  </p>
                  <p>
                    <strong>Total Seats:</strong> {bus.total_seats ?? "N/A"}
                  </p>
                  <p><strong>Status:</strong> {bus.status || "Unknown"}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (activePage === "route") {
      return (
        <section className="driver-section">
          <h2>Route Information</h2>

          {buses.length === 0 ? (
            <article className="driver-card">
              <p>No assigned bus found. Route information is unavailable.</p>
            </article>
          ) : (
            <div className="driver-card-grid">
              {buses.map((bus) => (
                <article
                  className="driver-card"
                  key={bus.bus_id ?? bus.id}
                >
                  <h3>🗺️ {bus.route_name || bus.routeName || "Assigned Route"}</h3>
                  <p>
                    <strong>Bus:</strong> {bus.bus_name || "College Bus"}
                  </p>
                  <p>
                    <strong>Bus Number:</strong> {bus.bus_number || "N/A"}
                  </p>
                  <p>
                    <strong>Starting Stop:</strong>{" "}
                    {bus.start_stop || bus.starting_stop || "Not provided by backend"}
                  </p>
                  <p>
                    <strong>Destination:</strong>{" "}
                    {bus.destination || bus.end_stop || "Not provided by backend"}
                  </p>
                  <p>
                    <strong>Route:</strong>{" "}
                    {bus.route_name || bus.routeName
                      ? `${bus.route_name || bus.routeName}`
                      : "Route details need to be returned by the backend API."}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      );
    }

    return (
      <section className="driver-section">
        <h2>Welcome back, {name}!</h2>
        <p className="driver-section-description">
          Manage your bus, student attendance and GPS location.
        </p>

        <div className="driver-card-grid">
          <article className="driver-card">
            <h3>🚌 Assigned Buses</h3>
            <p className="driver-stat">{buses.length}</p>
            <button
              type="button"
              className="driver-action-button"
              onClick={() => openPage("buses")}
            >
              View My Buses
            </button>
          </article>

          <article className="driver-card">
            <h3>🗺️ Route Information</h3>
            <p>View your assigned bus and route details.</p>
            <button
              type="button"
              className="driver-action-button"
              onClick={() => openPage("route")}
            >
              View Route Information
            </button>
          </article>

          <article className="driver-card">
            <h3>▦ QR Attendance</h3>
            <p>Scan a valid student bus pass.</p>
            <button
              type="button"
              className="driver-action-button"
              onClick={() => openPage("attendance")}
            >
              Open QR Scanner
            </button>
          </article>

          <article className="driver-card">
            <h3>📍 Live Bus Tracking</h3>
            <p>Share the driver's GPS location.</p>
            <button
              type="button"
              className="driver-action-button"
              onClick={() => openPage("tracking")}
            >
              Open GPS Tracking
            </button>
          </article>
        </div>
      </section>
    );
  }

  return (
    <div className="driver-layout">
      <aside className="driver-sidebar">
        <div className="driver-brand">
          <h2>🚌 SmartBus</h2>
          <p>DRIVER PORTAL</p>
        </div>

        <p className="driver-menu-title">MAIN MENU</p>

        <nav className="driver-navigation">
          {menu.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                activePage === item.id
                  ? "driver-nav-button active"
                  : "driver-nav-button"
              }
              onClick={() => openPage(item.id)}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>

        <div className="driver-sidebar-user">
          <p>👨‍✈️ {name}</p>
          <small>Driver Account</small>
          <button
            type="button"
            className="driver-logout-button"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="driver-main">
        <header className="driver-header">
          <div>
            <span className="driver-welcome-label">
              SMART COLLEGE BUS MANAGEMENT
            </span>
            <h1>
              {menu.find((item) => item.id === activePage)?.label}
            </h1>
            <p>Your college transportation workspace.</p>
          </div>

          <div className="driver-header-user">
            👨‍✈️ <strong>{name}</strong>
          </div>
        </header>

        <div className="driver-content">{renderContent()}</div>

        <footer className="driver-footer">
          © 2026 SmartBus College Transportation Management
        </footer>
      </main>
    </div>
  );
}
