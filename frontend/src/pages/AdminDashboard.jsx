
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

import API_BASE_URL from "../api";
const API = API_BASE_URL;const initialStats = {
  totalBuses: "—",
  totalRoutes: "—",
  bookedSeats: "—",
  availableSeats: "—",
  totalBookings: "—",
  attendanceRecords: "—",
};

function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("Backend returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

function AdminDashboard() {
  const navigate = useNavigate();

  const [user] = useState(getSavedUser);
  const [page, setPage] = useState("dashboard");
  const [stats, setStats] = useState(initialStats);
  const [buses, setBuses] = useState([]);
  const [students, setStudents] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [studentForm, setStudentForm] = useState({
    name: "",
    email: "",
    password: "",
    roll_no: "",
    phone: "",
  });

  const [driverForm, setDriverForm] = useState({
    name: "",
    email: "",
    password: "",
    license_no: "",
    phone: "",
  });

  const [assignments, setAssignments] = useState({});
  const [search, setSearch] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiJson(`${API}/api/admin/dashboard`);

      setStats({
        ...initialStats,
        ...(data.stats || {}),
      });

      const busData = await apiJson(`${API}/api/buses`);

      setBuses(
        Array.isArray(busData)
          ? busData
          : busData.buses || busData.data || []
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiJson(`${API}/api/admin/students`);
      setStudents(data.students || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [driverData, busData] = await Promise.all([
        apiJson(`${API}/api/admin/drivers`),
        apiJson(`${API}/api/buses`),
      ]);

      const driverList = driverData.drivers || [];

      setDrivers(driverList);

      setBuses(
        Array.isArray(busData)
          ? busData
          : busData.buses || busData.data || []
      );

      const initialAssignments = {};

      driverList.forEach((driver) => {
        initialAssignments[driver.driver_id] = driver.bus_id
          ? String(driver.bus_id)
          : "";
      });

      setAssignments(initialAssignments);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTracking = useCallback(async () => {
    try {
      const data = await apiJson(`${API}/api/admin/tracking`);
      setLocations(data.locations || []);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const userId = user?.id ?? user?.user_id ?? user?.userId;

      if (!userId) {
        throw new Error("Admin user ID missing. Please log in again.");
      }

      const data = await apiJson(
        `${API}/api/attendance/admin/${userId}`
      );

      setAttendance(
        data.attendance || data.records || data.data || []
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Check the logged-in user and load the admin dashboard.
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return undefined;
    }

    const role = String(user.role || "").toLowerCase();

    if (role !== "admin") {
      navigate(
        role === "student"
          ? "/student-dashboard"
          : role === "driver"
            ? "/driver-dashboard"
            : "/login",
        { replace: true }
      );

      return undefined;
    }

    const timer = window.setTimeout(() => {
      loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [user, navigate, loadDashboard]);

  // Refresh tracking while the tracking page is open.
  useEffect(() => {
    if (page !== "tracking") {
      return undefined;
    }

    const firstTimer = window.setTimeout(() => {
      loadTracking();
    }, 0);

    const interval = window.setInterval(() => {
      loadTracking();
    }, 5000);

    return () => {
      window.clearTimeout(firstTimer);
      window.clearInterval(interval);
    };
  }, [page, loadTracking]);

  async function addStudent(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const data = await apiJson(`${API}/api/admin/students`, {
        method: "POST",
        body: JSON.stringify(studentForm),
      });

      setMessage(data.message || "Student added successfully.");

      setStudentForm({
        name: "",
        email: "",
        password: "",
        roll_no: "",
        phone: "",
      });

      await loadStudents();
    } catch (e) {
      setError(e.message);
    }
  }

  async function addDriver(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const data = await apiJson(`${API}/api/admin/drivers`, {
        method: "POST",
        body: JSON.stringify(driverForm),
      });

      setMessage(data.message || "Driver added successfully.");

      setDriverForm({
        name: "",
        email: "",
        password: "",
        license_no: "",
        phone: "",
      });

      await loadDrivers();
    } catch (e) {
      setError(e.message);
    }
  }

  async function assignBus(driverId) {
    setMessage("");
    setError("");

    try {
      const data = await apiJson(
        `${API}/api/admin/drivers/${driverId}/assign-bus`,
        {
          method: "PUT",
          body: JSON.stringify({
            busId: assignments[driverId] || null,
          }),
        }
      );

      setMessage(data.message || "Bus assignment updated.");
      await loadDrivers();
    } catch (e) {
      setError(e.message);
    }
  }

  function openPage(nextPage) {
    setPage(nextPage);
    setError("");
    setMessage("");
    setSearch("");

    if (nextPage === "dashboard" || nextPage === "buses") {
      loadDashboard();
    }

    if (nextPage === "students") {
      loadStudents();
    }

    if (nextPage === "drivers") {
      loadDrivers();
    }

    if (nextPage === "attendance") {
      loadAttendance();
    }

    if (nextPage === "routes") {
      navigate("/routes-stops");
    }

    if (nextPage === "seats") {
      navigate("/seat-availability");
    }

    if (nextPage === "bookings") {
      navigate("/booking");
    }
  }

  function logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("user_id");
    localStorage.removeItem("userId");

    navigate("/login", { replace: true });
  }

  const adminName =
    user?.name || user?.full_name || "College Admin";

  const filteredStudents = students.filter((student) =>
    [
      student.name,
      student.email,
      student.roll_no,
      student.phone,
    ].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(search.toLowerCase())
    )
  );

  const filteredDrivers = drivers.filter((driver) =>
    [
      driver.name,
      driver.email,
      driver.phone,
      driver.license_no,
      driver.bus_number,
    ].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(search.toLowerCase())
    )
  );

  return (
    <div className="sb-admin-shell">
      <aside className="sb-admin-sidebar">
        <div className="sb-admin-brand">
          <span>🚌</span>
          <div>
            <b>SmartBus</b>
            <small>College Management</small>
          </div>
        </div>

        <p className="sb-admin-nav-title">MAIN MENU</p>

        {[
          ["dashboard", "▦", "Dashboard"],
          ["buses", "▣", "Manage Buses"],
          ["students", "♙", "Manage Students"],
          ["drivers", "♧", "Manage Drivers"],
          ["tracking", "📍", "Live Bus Tracking"],
          ["routes", "⇄", "Routes & Prices"],
          ["seats", "▤", "Seat Availability"],
          ["bookings", "▧", "Bookings"],
          ["attendance", "✓", "Attendance"],
        ].map(([id, icon, label]) => (
          <button
            key={id}
            className={`sb-admin-nav ${page === id ? "active" : ""}`}
            onClick={() => openPage(id)}
            type="button"
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}

        <div className="sb-admin-user">
          <b>{adminName}</b>
          <small>Administrator</small>
          <button type="button" onClick={logout}>
            ↪ Logout
          </button>
        </div>
      </aside>

      <main className="sb-admin-main">
        <header className="sb-admin-top">
          <div>
            <small>SMARTBUS / ADMIN</small>
            <h1>College Transport Portal</h1>
          </div>

          <span className="sb-admin-live-dot">● System</span>
        </header>

        <div className="sb-admin-content">
          {error && (
            <div className="sb-admin-alert error">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
              >
                ×
              </button>
            </div>
          )}

          {message && (
            <div className="sb-admin-alert success">
              <span>{message}</span>
              <button
                type="button"
                onClick={() => setMessage("")}
              >
                ×
              </button>
            </div>
          )}

          {page === "dashboard" && (
            <>
              <section className="sb-admin-hero">
                <div>
                  <span>ADMINISTRATOR PANEL</span>
                  <h2>Welcome back, {adminName}! 👋</h2>
                  <p>
                    Manage students, drivers, buses, attendance and
                    live GPS tracking in one place.
                  </p>
                </div>

                <div className="sb-admin-hero-bus">🚌</div>
              </section>

              <div className="sb-admin-section-title">
                <div>
                  <h2>Overview</h2>
                  <p>Current transport system statistics</p>
                </div>

                <button
                  type="button"
                  className="sb-admin-button"
                  onClick={loadDashboard}
                >
                  ↻ Refresh
                </button>
              </div>

              <div className="sb-admin-stats">
                {[
                  ["Total Buses", stats.totalBuses, "▣"],
                  ["Total Routes", stats.totalRoutes, "⇄"],
                  ["Booked Seats", stats.bookedSeats, "▤"],
                  ["Available Seats", stats.availableSeats, "✓"],
                  ["Total Bookings", stats.totalBookings, "▧"],
                  [
                    "Attendance Records",
                    stats.attendanceRecords,
                    "◷",
                  ],
                ].map(([label, value, icon]) => (
                  <article className="sb-admin-stat" key={label}>
                    <span>{icon}</span>
                    <div>
                      <small>{label}</small>
                      <strong>{loading ? "…" : value}</strong>
                    </div>
                  </article>
                ))}
              </div>

              <div className="sb-admin-section-title">
                <div>
                  <h2>Quick Access</h2>
                  <p>Choose a management section</p>
                </div>
              </div>

              <div className="sb-admin-quick">
                {[
                  [
                    "students",
                    "♙",
                    "Add Student",
                    "Create and view student accounts",
                  ],
                  [
                    "drivers",
                    "♧",
                    "Add Driver / Assign Bus",
                    "Manage driver contact and bus assignment",
                  ],
                  [
                    "tracking",
                    "📍",
                    "Live Bus Tracking",
                    "View latest saved GPS coordinates",
                  ],
                  [
                    "buses",
                    "▣",
                    "Manage Buses",
                    "View buses and seat capacity",
                  ],
                  [
                    "attendance",
                    "✓",
                    "Attendance",
                    "View attendance records",
                  ],
                ].map(([id, icon, title, description]) => (
                  <button
                    type="button"
                    key={id}
                    onClick={() => openPage(id)}
                  >
                    <span>{icon}</span>
                    <b>{title}</b>
                    <small>{description}</small>
                    <em>Open →</em>
                  </button>
                ))}
              </div>
            </>
          )}

          {page === "buses" && (
            <section className="sb-admin-panel">
              <div className="sb-admin-section-title">
                <div>
                  <h2>Manage Buses</h2>
                  <p>Bus records and assigned driver IDs</p>
                </div>

                <button
                  className="sb-admin-button"
                  type="button"
                  onClick={loadDashboard}
                >
                  ↻ Refresh
                </button>
              </div>

              <div className="sb-admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Bus Name</th>
                      <th>Bus Number</th>
                      <th>Total Seats</th>
                      <th>Driver ID</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {buses.map((bus) => (
                      <tr key={bus.id}>
                        <td>{bus.bus_name || bus.name || "—"}</td>
                        <td>{bus.bus_number || "—"}</td>
                        <td>{bus.total_seats ?? "—"}</td>
                        <td>{bus.driver_id || "Not assigned"}</td>
                        <td>{bus.status || "—"}</td>
                      </tr>
                    ))}

                    {!loading && buses.length === 0 && (
                      <tr>
                        <td colSpan="5">No buses found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {page === "students" && (
            <section className="sb-admin-panel">
              <div className="sb-admin-section-title">
                <div>
                  <h2>Manage Students</h2>
                  <p>Create a student login and profile</p>
                </div>

                <button
                  className="sb-admin-button"
                  type="button"
                  onClick={loadStudents}
                >
                  ↻ Refresh
                </button>
              </div>

              <form className="sb-admin-form" onSubmit={addStudent}>
                <label>
                  Student Name
                  <input
                    required
                    value={studentForm.name}
                    onChange={(e) =>
                      setStudentForm({
                        ...studentForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="Enter full name"
                  />
                </label>

                <label>
                  Email
                  <input
                    required
                    type="email"
                    value={studentForm.email}
                    onChange={(e) =>
                      setStudentForm({
                        ...studentForm,
                        email: e.target.value,
                      })
                    }
                    placeholder="student@example.com"
                  />
                </label>

                <label>
                  Password
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={studentForm.password}
                    onChange={(e) =>
                      setStudentForm({
                        ...studentForm,
                        password: e.target.value,
                      })
                    }
                    placeholder="At least 6 characters"
                  />
                </label>

                <label>
                  Roll Number
                  <input
                    required
                    value={studentForm.roll_no}
                    onChange={(e) =>
                      setStudentForm({
                        ...studentForm,
                        roll_no: e.target.value,
                      })
                    }
                    placeholder="e.g. CSE2026"
                  />
                </label>

                <label>
                  Phone
                  <input
                    required
                    value={studentForm.phone}
                    onChange={(e) =>
                      setStudentForm({
                        ...studentForm,
                        phone: e.target.value,
                      })
                    }
                    placeholder="Phone number"
                  />
                </label>

                <button
                  className="sb-admin-button primary"
                  type="submit"
                >
                  ＋ Add Student
                </button>
              </form>

              <input
                className="sb-admin-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students by name, roll number, email or phone"
              />

              <div className="sb-admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Roll Number</th>
                      <th>Email</th>
                      <th>Phone</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.student_id}>
                        <td>{student.name}</td>
                        <td>{student.roll_no}</td>
                        <td>{student.email}</td>
                        <td>{student.phone}</td>
                      </tr>
                    ))}

                    {!loading && filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan="4">No students found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {page === "drivers" && (
            <section className="sb-admin-panel">
              <div className="sb-admin-section-title">
                <div>
                  <h2>Manage Drivers</h2>
                  <p>Create driver accounts and assign a bus</p>
                </div>

                <button
                  className="sb-admin-button"
                  type="button"
                  onClick={loadDrivers}
                >
                  ↻ Refresh
                </button>
              </div>

              <form className="sb-admin-form" onSubmit={addDriver}>
                <label>
                  Driver Name
                  <input
                    required
                    value={driverForm.name}
                    onChange={(e) =>
                      setDriverForm({
                        ...driverForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="Enter full name"
                  />
                </label>

                <label>
                  Email
                  <input
                    required
                    type="email"
                    value={driverForm.email}
                    onChange={(e) =>
                      setDriverForm({
                        ...driverForm,
                        email: e.target.value,
                      })
                    }
                    placeholder="driver@example.com"
                  />
                </label>

                <label>
                  Password
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={driverForm.password}
                    onChange={(e) =>
                      setDriverForm({
                        ...driverForm,
                        password: e.target.value,
                      })
                    }
                    placeholder="At least 6 characters"
                  />
                </label>

                <label>
                  License Number
                  <input
                    required
                    value={driverForm.license_no}
                    onChange={(e) =>
                      setDriverForm({
                        ...driverForm,
                        license_no: e.target.value,
                      })
                    }
                    placeholder="Driving license number"
                  />
                </label>

                <label>
                  Phone
                  <input
                    required
                    value={driverForm.phone}
                    onChange={(e) =>
                      setDriverForm({
                        ...driverForm,
                        phone: e.target.value,
                      })
                    }
                    placeholder="Phone number"
                  />
                </label>

                <button
                  className="sb-admin-button primary"
                  type="submit"
                >
                  ＋ Add Driver
                </button>
              </form>

              <input
                className="sb-admin-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search drivers by name, license, email or phone"
              />

              <div className="sb-admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Driver</th>
                      <th>Phone</th>
                      <th>License</th>
                      <th>Assigned Bus</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredDrivers.map((driver) => (
                      <tr key={driver.driver_id}>
                        <td>
                          <b>{driver.name}</b>
                          <small className="sb-admin-cell-small">
                            {driver.email}
                          </small>
                        </td>

                        <td>{driver.phone}</td>
                        <td>{driver.license_no}</td>

                        <td>
                          <select
                            value={assignments[driver.driver_id] ?? ""}
                            onChange={(e) =>
                              setAssignments({
                                ...assignments,
                                [driver.driver_id]: e.target.value,
                              })
                            }
                          >
                            <option value="">Unassigned</option>

                            {buses.map((bus) => (
                              <option
                                key={bus.id}
                                value={String(bus.id)}
                              >
                                {bus.bus_number} —{" "}
                                {bus.bus_name || bus.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <button
                            className="sb-admin-button compact"
                            type="button"
                            onClick={() => assignBus(driver.driver_id)}
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    ))}

                    {!loading && filteredDrivers.length === 0 && (
                      <tr>
                        <td colSpan="5">No drivers found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {page === "tracking" && (
            <section className="sb-admin-panel">
              <div className="sb-admin-section-title">
                <div>
                  <h2>Live Bus Tracking</h2>
                  <p>
                    Latest GPS location saved by each driver's tracking
                    page. Refreshes every 5 seconds.
                  </p>
                </div>

                <button
                  className="sb-admin-button"
                  type="button"
                  onClick={loadTracking}
                >
                  ↻ Refresh GPS
                </button>
              </div>

              <div className="sb-admin-tracking-grid">
                {locations.map((location) => {
                  const hasGps =
                    location.latitude != null &&
                    location.longitude != null;

                  const mapUrl = hasGps
                    ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
                    : "";

                  return (
                    <article
                      className="sb-admin-track-card"
                      key={location.bus_id}
                    >
                      <div className="sb-admin-track-top">
                        <span>🚌</span>

                        <div>
                          <h3>
                            {location.bus_name || "College Bus"}
                          </h3>
                          <small>
                            {location.bus_number || "No bus number"}
                          </small>
                        </div>

                        <i className={hasGps ? "gps-on" : "gps-off"}>
                          {hasGps ? "GPS received" : "No GPS yet"}
                        </i>
                      </div>

                      <p>
                        <b>Driver:</b>{" "}
                        {location.driver_name || "Not assigned"}
                      </p>

                      <p>
                        <b>Phone:</b>{" "}
                        {location.driver_phone || "Not available"}
                      </p>

                      {hasGps ? (
                        <>
                          <p>
                            <b>Latitude:</b> {location.latitude}
                          </p>
                          <p>
                            <b>Longitude:</b> {location.longitude}
                          </p>
                          <p>
                            <b>Last update:</b>{" "}
                            {location.recorded_at
                              ? String(location.recorded_at)
                                  .replace("T", " ")
                                  .slice(0, 19)
                              : "Unknown"}
                          </p>

                          <a
                            className="sb-admin-map-link"
                            href={mapUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open location in Google Maps ↗
                          </a>

                          <iframe
                            title={`Map for ${
                              location.bus_name ||
                              location.bus_number ||
                              "bus"
                            }`}
                            loading="lazy"
                            src={`https://maps.google.com/maps?q=${location.latitude},${location.longitude}&z=15&output=embed`}
                          />
                        </>
                      ) : (
                        <p className="sb-admin-no-gps">
                          No saved location yet. Ask the assigned driver
                          to start GPS sharing.
                        </p>
                      )}
                    </article>
                  );
                })}

                {locations.length === 0 && (
                  <p>No bus records or GPS information returned yet.</p>
                )}
              </div>
            </section>
          )}

          {page === "attendance" && (
            <section className="sb-admin-panel">
              <div className="sb-admin-section-title">
                <div>
                  <h2>Student Attendance</h2>
                  <p>Attendance records from SmartBus</p>
                </div>

                <button
                  className="sb-admin-button"
                  type="button"
                  onClick={loadAttendance}
                >
                  ↻ Refresh
                </button>
              </div>

              <div className="sb-admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Roll Number</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Driver</th>
                    </tr>
                  </thead>

                  <tbody>
                    {attendance.map((record, index) => (
                      <tr
                        key={
                          record.id ||
                          record.attendance_id ||
                          index
                        }
                      >
                        <td>
                          {record.student_name || record.name || "N/A"}
                        </td>
                        <td>{record.roll_no || "N/A"}</td>
                        <td>
                          {record.attendance_date
                            ? String(record.attendance_date).slice(0, 10)
                            : "N/A"}
                        </td>
                        <td>{record.attendance_time || "N/A"}</td>
                        <td>
                          {record.attendance_status ||
                            record.status ||
                            "N/A"}
                        </td>
                        <td>{record.driver_name || "N/A"}</td>
                      </tr>
                    ))}

                    {!loading && attendance.length === 0 && (
                      <tr>
                        <td colSpan="6">
                          No attendance records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <footer className="sb-admin-footer">
            SmartBus College Management System © 2026
          </footer>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
