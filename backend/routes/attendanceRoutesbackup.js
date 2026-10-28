
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const API = "http://localhost:5000";

const menuItems = [
  { label: "Dashboard", icon: "▦", page: "dashboard" },
  { label: "Manage Buses", icon: "▣", page: "buses" },
  { label: "Routes & Prices", icon: "⇄", path: "/routes-stops" },
  { label: "Seat Availability", icon: "▤", path: "/seat-availability" },
  { label: "Bookings", icon: "▧", path: "/booking" },
  { label: "Attendance", icon: "✓", page: "attendance" },
];

const quickItems = [
  {
    title: "Manage Buses",
    description: "View available college buses.",
    icon: "▣",
    page: "buses",
  },
  {
    title: "Routes & Prices",
    description: "Explore routes, stops and fares.",
    icon: "⇄",
    path: "/routes-stops",
  },
  {
    title: "Seat Availability",
    description: "Check booked and available seats.",
    icon: "▤",
    path: "/seat-availability",
  },
  {
    title: "Bookings",
    description: "Open the booking section.",
    icon: "▧",
    path: "/booking",
  },
  {
    title: "Attendance",
    description: "View QR-scanned student attendance.",
    icon: "✓",
    page: "attendance",
  },
];

const defaultStats = {
  totalBuses: "—",
  totalRoutes: "—",
  bookedSeats: "—",
  availableSeats: "—",
  totalBookings: "—",
  attendanceRecords: "—",
};

function getSavedUserId(user) {
  return user?.id ?? user?.userId ?? user?.user_id ?? user?.user?.id;
}

function AdminDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState("dashboard");
  const [stats, setStats] = useState(defaultStats);
  const [buses, setBuses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busLoading, setBusLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [error, setError] = useState("");
  const [attendanceError, setAttendanceError] = useState("");
  const [search, setSearch] = useState("");
  const [attendanceSearch, setAttendanceSearch] = useState("");

  useEffect(() => {
    try {
      const savedUser = JSON.parse(localStorage.getItem("user") || "null");

      if (!savedUser) {
        navigate("/login", { replace: true });
        return;
      }

      if (String(savedUser.role || "").toLowerCase() !== "admin") {
        const roleRoutes = {
          student: "/student-dashboard",
          driver: "/driver-dashboard",
        };

        navigate(roleRoutes[String(savedUser.role || "").toLowerCase()] || "/login", {
          replace: true,
        });
        return;
      }

      setUser(savedUser);
      loadDashboard();
    } catch (err) {
      console.error("Admin session error:", err);
      navigate("/login", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  async function readJson(response) {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load data.");
    }

    return data;
  }

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      let dashboardData = null;

      try {
        const response = await fetch(`${API}/api/admin/dashboard`);
        dashboardData = await readJson(response);
      } catch (err) {
        console.warn("Admin summary API unavailable:", err.message);
      }

      if (dashboardData) {
        const source = dashboardData.stats || dashboardData;

        setStats((previous) => ({
          ...previous,
          totalBuses: source.totalBuses ?? source.total_buses ?? previous.totalBuses,
          totalRoutes: source.totalRoutes ?? source.total_routes ?? previous.totalRoutes,
          bookedSeats: source.bookedSeats ?? source.booked_seats ?? previous.bookedSeats,
          availableSeats: source.availableSeats ?? source.available_seats ?? previous.availableSeats,
          totalBookings: source.totalBookings ?? source.total_bookings ?? previous.totalBookings,
          attendanceRecords:
            source.attendanceRecords ??
            source.attendance_records ??
            previous.attendanceRecords,
        }));
      }

      const busResponse = await fetch(`${API}/api/buses`);
      const busData = await readJson(busResponse);
      const busList = Array.isArray(busData.buses)
        ? busData.buses
        : Array.isArray(busData)
          ? busData
          : [];

      setBuses(busList);

      setStats((previous) => ({
        ...previous,
        totalBuses: previous.totalBuses === "—" ? busList.length : previous.totalBuses,
      }));
    } catch (err) {
      console.error("Admin dashboard error:", err);
      setError("Dashboard data could not be loaded. Check the backend and database connection.");
    } finally {
      setLoading(false);
    }
  }

  async function openBuses() {
    setActivePage("buses");
    setBusLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/api/buses`);
      const data = await readJson(response);
      const list = Array.isArray(data.buses)
        ? data.buses
        : Array.isArray(data)
          ? data
          : [];

      setBuses(list);
    } catch (err) {
      console.error("Load buses error:", err);
      setError(err.message || "Unable to load buses.");
    } finally {
      setBusLoading(false);
    }
  }

  async function loadAttendance() {
    setActivePage("attendance");
    setAttendanceLoading(true);
    setAttendanceError("");

    try {
      const savedUser = JSON.parse(localStorage.getItem("user") || "null");
      const userId = getSavedUserId(savedUser);

      if (!userId) {
        throw new Error("Admin user ID was not found. Please log in again.");
      }

      const response = await fetch(
        `${API}/api/attendance/admin/${encodeURIComponent(userId)}`
      );
      const data = await readJson(response);

      if (!data.success) {
        throw new Error(data.message || "Unable to load attendance.");
      }

      const records = Array.isArray(data.attendance) ? data.attendance : [];
      setAttendance(records);

      setStats((previous) => ({
        ...previous,
        attendanceRecords: data.count ?? records.length,
      }));
    } catch (err) {
      console.error("Admin attendance error:", err);
      setAttendanceError(
        `${err.message || "Unable to load attendance records."} Check the backend server and /api/attendance/admin/:userId endpoint.`
      );
    } finally {
      setAttendanceLoading(false);
    }
  }

  function handleMenuClick(item) {
    if (item.path) {
      navigate(item.path);
      return;
    }

    if (item.page === "buses") {
      openBuses();
      return;
    }

    if (item.page === "attendance") {
      loadAttendance();
      return;
    }

    setActivePage("dashboard");
    setError("");
  }

  function logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("user_id");
    localStorage.removeItem("userId");
    navigate("/login", { replace: true });
  }

  const adminName =
    user?.name || user?.full_name || user?.username || "College Admin";

  const filteredBuses = buses.filter((bus) => {
    const query = search.trim().toLowerCase();

    return (
      String(bus.bus_name || "").toLowerCase().includes(query) ||
      String(bus.bus_number || "").toLowerCase().includes(query)
    );
  });

  const filteredAttendance = attendance.filter((record) => {
    const query = attendanceSearch.trim().toLowerCase();

    return [
      record.student_name,
      record.roll_no,
      record.bus_name,
      record.bus_number,
      record.seat_number,
      record.attendance_status,
      record.driver_name,
      record.attendance_date,
    ].some((value) => String(value ?? "").toLowerCase().includes(query));
  });

  const statCards = [
    { title: "Total Buses", value: stats.totalBuses, icon: "▣", color: "blue" },
    { title: "Total Routes", value: stats.totalRoutes, icon: "⇄", color: "purple" },
    { title: "Booked Seats", value: stats.bookedSeats, icon: "▤", color: "orange" },
    { title: "Available Seats", value: stats.availableSeats, icon: "✓", color: "green" },
    { title: "Total Bookings", value: stats.totalBookings, icon: "▧", color: "pink" },
    { title: "Attendance Records", value: stats.attendanceRecords, icon: "◷", color: "cyan" },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon">🚌</div>
          <div>
            <h2>SmartBus</h2>
            <p>College Management</p>
          </div>
        </div>

        <p className="admin-menu-heading">MAIN MENU</p>

        <nav className="admin-navigation">
          {menuItems.map((item) => {
            const active =
              item.page === activePage ||
              (item.path && window.location.pathname === item.path);

            return (
              <button
                type="button"
                key={item.label}
                className={`admin-nav-item ${active ? "active" : ""}`}
                onClick={() => handleMenuClick(item)}
              >
                <span className="admin-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {active && <span className="admin-nav-dot">•</span>}
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-profile">
            <div className="admin-avatar">{adminName.charAt(0).toUpperCase()}</div>
            <div>
              <strong>{adminName}</strong>
              <span>Administrator</span>
            </div>
          </div>

          <button type="button" className="admin-logout" onClick={logout}>
            <span>↪</span> Logout
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="admin-topbar-label">SMARTBUS / ADMIN</p>
            <h2>College Transport Portal</h2>
          </div>

          <div className="admin-topbar-right">
            <span className="admin-status">
              <span className="admin-status-dot" />
              {loading ? "Connecting..." : error ? "Check connection" : "Dashboard"}
            </span>
            <div className="admin-top-avatar">{adminName.charAt(0).toUpperCase()}</div>
          </div>
        </header>

        <div className="admin-content">
          {activePage === "dashboard" ? (
            <>
              <section className="admin-welcome">
                <div>
                  <span className="admin-eyebrow">ADMINISTRATOR PANEL</span>
                  <h1>Welcome back, {adminName}! 👋</h1>
                  <p>Monitor buses, routes, seats, bookings and student attendance from one place.</p>
                </div>
                <div className="admin-welcome-bus" aria-hidden="true">🚌</div>
              </section>

              <section className="admin-section-heading">
                <div>
                  <h2>Overview</h2>
                  <p>Current transport system statistics</p>
                </div>
                <span className="admin-database-status"><span /> Database connected</span>
              </section>

              {error && (
                <div className="admin-error" role="alert">
                  <strong>Notice:</strong> {error}
                  <button type="button" onClick={loadDashboard}>Retry</button>
                </div>
              )}

              <section className="admin-stats-grid">
                {statCards.map((stat) => (
                  <article className="admin-stat-card" key={stat.title}>
                    <div className={`admin-stat-icon ${stat.color}`}>{stat.icon}</div>
                    <div>
                      <p>{stat.title}</p>
                      <strong>{loading ? "…" : stat.value}</strong>
                    </div>
                  </article>
                ))}
              </section>

              <section className="admin-quick-access">
                <div className="admin-quick-heading">
                  <div>
                    <h2>Quick Access</h2>
                    <p>Open a section to view its records.</p>
                  </div>
                  <button type="button" className="admin-refresh-button" onClick={loadDashboard}>
                    ↻ Refresh
                  </button>
                </div>

                <div className="admin-quick-grid">
                  {quickItems.map((item) => (
                    <button
                      type="button"
                      key={item.title}
                      className="admin-quick-card"
                      onClick={() => handleMenuClick(item)}
                    >
                      <span className="admin-quick-icon">{item.icon}</span>
                      <span className="admin-quick-text">
                        <strong>{item.title}</strong>
                        <small>{item.description}</small>
                      </span>
                      <span className="admin-quick-arrow">→</span>
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : activePage === "buses" ? (
            <section className="admin-bus-page">
              <button type="button" className="admin-back-button" onClick={() => setActivePage("dashboard")}>
                ← Back to Dashboard
              </button>

              <div className="admin-section-heading">
                <div>
                  <h2>Manage Buses</h2>
                  <p>Bus information loaded from your backend.</p>
                </div>
                <button type="button" className="admin-primary-button" onClick={openBuses}>
                  ↻ Refresh
                </button>
              </div>

              {error && <div className="admin-error" role="alert">{error}</div>}

              <input
                className="admin-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by bus name or bus number..."
              />

              {busLoading ? (
                <p className="admin-empty">Loading buses...</p>
              ) : filteredBuses.length === 0 ? (
                <p className="admin-empty">No buses found for this search.</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Bus Name</th>
                        <th>Bus Number</th>
                        <th>Total Seats</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBuses.map((bus, index) => (
                        <tr key={bus.bus_id ?? bus.id ?? index}>
                          <td>{bus.bus_name || "College Bus"}</td>
                          <td>{bus.bus_number || "N/A"}</td>
                          <td>{bus.total_seats ?? "N/A"}</td>
                          <td>
                            <span className={`admin-bus-status ${String(bus.status).toLowerCase() === "active" ? "is-active" : ""}`}>
                              {bus.status || "Unknown"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="admin-note">
                This section displays bus records. Add/edit actions require matching backend endpoints.
              </p>
            </section>
          ) : (
            <section className="admin-bus-page">
              <button type="button" className="admin-back-button" onClick={() => setActivePage("dashboard")}>
                ← Back to Dashboard
              </button>

              <div className="admin-section-heading">
                <div>
                  <h2>Student Attendance</h2>
                  <p>Records saved after scanning a student's bus-pass QR code.</p>
                </div>
                <button
                  type="button"
                  className="admin-primary-button"
                  onClick={loadAttendance}
                  disabled={attendanceLoading}
                >
                  {attendanceLoading ? "Loading..." : "↻ Refresh"}
                </button>
              </div>

              {attendanceError && (
                <div className="admin-error" role="alert">
                  <strong>Attendance error:</strong> {attendanceError}
                </div>
              )}

              <input
                className="admin-search"
                type="search"
                value={attendanceSearch}
                onChange={(event) => setAttendanceSearch(event.target.value)}
                placeholder="Search student, roll number, bus, date or status..."
              />

              {attendanceLoading ? (
                <p className="admin-empty">Loading attendance records...</p>
              ) : filteredAttendance.length === 0 ? (
                <p className="admin-empty">
                  {attendance.length === 0
                    ? "No attendance records found yet. Scan an active student bus-pass QR code first."
                    : "No attendance records match your search."}
                </p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Roll Number</th>
                        <th>Bus</th>
                        <th>Seat</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Scanned By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendance.map((record) => (
                        <tr key={record.id}>
                          <td>{record.student_name || "Student"}</td>
                          <td>{record.roll_no || "N/A"}</td>
                          <td>
                            {record.bus_name || "College Bus"}
                            <br />
                            <small>{record.bus_number || ""}</small>
                          </td>
                          <td>{record.seat_number || "N/A"}</td>
                          <td>{record.attendance_date || "N/A"}</td>
                          <td>{record.attendance_time || "N/A"}</td>
                          <td>
                            <span className={`admin-bus-status ${String(record.attendance_status).toLowerCase() === "present" ? "is-active" : ""}`}>
                              {record.attendance_status || "Unknown"}
                            </span>
                          </td>
                          <td>{record.driver_name || "Driver"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="admin-note">
                Total records loaded: {attendance.length}. Refresh this page after a new QR scan to see the latest attendance.
              </p>
            </section>
          )}

          <footer className="admin-footer">
            SmartBus College Management System © 2026
          </footer>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
