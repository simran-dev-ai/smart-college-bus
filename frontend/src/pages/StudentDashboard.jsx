
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./StudentDashboard.css";

import API_BASE_URL from "../api";
const API = `${API_BASE_URL}/api/buses`;const services = [
  {
    icon: "🗺️",
    title: "Routes & Stops",
    text: "Explore all bus routes and boarding stops.",
    path: "/routes-stops",
    color: "#e8efff",
  },
  {
    icon: "₹",
    title: "Route Prices",
    text: "View route-wise and stop-wise bus fares.",
    path: "/route-prices",
    color: "#e5f8ef",
  },
  {
    icon: "💺",
    title: "Seat Availability",
    text: "View the bus layout and available seats.",
    path: "/seat-availability",
    color: "#fff3dc",
  },
  {
    icon: "🎫",
    title: "Bus Booking",
    text: "Book your bus and select an available seat.",
    path: "/booking",
    color: "#f3e8ff",
  },
  {
    icon: "📍",
    title: "My Bus Tracking",
    text: "Track your college bus using the driver's GPS.",
    path: "/my-bus-tracking",
    color: "#e0f7fa",
  },
  {
    icon: "🪪",
    title: "My Bus Pass",
    text: "View your bus pass and validity.",
    path: "/my-bus-pass",
    color: "#ffe9ed",
  },
  {
    icon: "✓",
    title: "Attendance",
    text: "View your bus attendance records.",
    path: "/attendance",
    color: "#eaf5e5",
  },
];

function StudentDashboard() {
  const navigate = useNavigate();

  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;

    async function loadBuses() {
      try {
        const response = await fetch(API);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load buses.");
        }

        if (active) {
          setBuses(Array.isArray(data.buses) ? data.buses : []);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            "Unable to connect to the bus server. Please check that the backend is running."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadBuses();

    return () => {
      active = false;
    };
  }, []);

  const filteredBuses = buses.filter((bus) => {
    const query = search.toLowerCase();

    return (
      String(bus.bus_name || "").toLowerCase().includes(query) ||
      String(bus.bus_number || "").toLowerCase().includes(query) ||
      String(bus.route_name || "").toLowerCase().includes(query)
    );
  });

  function logout() {
    navigate("/login");
  }

  return (
    <div className="student-dashboard">
      <aside className="student-sidebar">
        <div className="student-brand">
          <div className="student-brand-icon">🚌</div>
          <div>
            <h2>SmartBus</h2>
            <p>College Transport</p>
          </div>
        </div>

        <div className="student-profile">
          <div className="student-avatar">S</div>
          <div>
            <h3>Student Portal</h3>
            <p>Student Account</p>
          </div>
        </div>

        <nav className="student-nav">
          <button
            className="student-nav-item active"
            onClick={() => navigate("/student-dashboard")}
          >
            <span>⌂</span> Dashboard
          </button>

          {services.map((service) => (
            <button
              className="student-nav-item"
              key={service.title}
              onClick={() => navigate(service.path)}
            >
              <span>{service.icon}</span>
              {service.title}
            </button>
          ))}
        </nav>

        <button className="student-logout" onClick={logout}>
          <span>↪</span> Logout
        </button>
      </aside>

      <main className="student-main">
        <header className="student-topbar">
          <div>
            <p className="student-eyebrow">STUDENT WORKSPACE</p>
            <h1>Student Dashboard</h1>
            <p className="student-subtitle">
              Manage your college bus journey in one place.
            </p>
          </div>

          <div className="student-top-actions">
            <div className="student-status">
              <span className="student-status-dot"></span>
              Student Portal
            </div>
            <button
              className="student-logout-top"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </header>

        <section className="student-welcome">
          <div>
            <span className="student-welcome-label">
              WELCOME TO SMARTBUS
            </span>
            <h2>Your college journey, simplified.</h2>
            <p>
              Explore routes, check seats, book your bus and manage
              your travel information.
            </p>
            <button
              className="student-primary-button"
              onClick={() => navigate("/booking")}
            >
              Book a Bus <span>→</span>
            </button>
          </div>

          <div className="student-bus-illustration">🚌</div>
        </section>

        <section className="student-section">
          <div className="student-section-heading">
            <div>
              <h2>Explore Services</h2>
              <p>Choose a service to continue.</p>
            </div>
            <span className="student-service-count">
              {services.length} Services
            </span>
          </div>

          <div className="student-service-grid">
            {services.map((service) => (
              <button
                type="button"
                className="student-service-card"
                key={service.title}
                onClick={() => navigate(service.path)}
              >
                <div
                  className="student-service-icon"
                  style={{ backgroundColor: service.color }}
                >
                  {service.icon}
                </div>

                <div className="student-service-content">
                  <h3>{service.title}</h3>
                  <p>{service.text}</p>
                </div>

                <span className="student-card-arrow">↗</span>
              </button>
            ))}
          </div>
        </section>

        <section className="student-section student-buses-section">
          <div className="student-section-heading">
            <div>
              <h2>Available Buses</h2>
              <p>Check the buses configured in your system.</p>
            </div>
            <span className="student-service-count">
              {buses.length} Buses
            </span>
          </div>

          <div className="student-search-box">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search bus name, number or route..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {loading && (
            <div className="student-message">
              Loading available buses...
            </div>
          )}

          {!loading && error && (
            <div className="student-message student-error">
              {error}
              <button
                onClick={() => window.location.reload()}
                className="student-retry-button"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && filteredBuses.length === 0 && (
            <div className="student-message">
              No buses found. Try another search.
            </div>
          )}

          {!loading && !error && filteredBuses.length > 0 && (
            <div className="student-bus-grid">
              {filteredBuses.map((bus) => (
                <article
                  className="student-bus-card"
                  key={bus.bus_id || bus.id || bus.bus_number}
                >
                  <div className="student-bus-card-top">
                    <div className="student-bus-icon">🚌</div>
                    <span className="student-bus-active">
                      {bus.status || "Available"}
                    </span>
                  </div>

                  <h3>{bus.bus_name || "College Bus"}</h3>
                  <p className="student-bus-number">
                    {bus.bus_number || "Bus number unavailable"}
                  </p>

                  <div className="student-bus-detail">
                    <span>Route</span>
                    <strong>{bus.route_name || "Route not assigned"}</strong>
                  </div>

                  <div className="student-bus-detail">
                    <span>Total Seats</span>
                    <strong>{bus.total_seats ?? "—"}</strong>
                  </div>

                  <button
                    className="student-bus-book-button"
                    onClick={() => navigate("/booking")}
                  >
                    Book This Bus →
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="student-footer">
          <span>SmartBus College Transport System</span>
          <span>Student Dashboard</span>
        </footer>
      </main>
    </div>
  );
}

export default StudentDashboard;
