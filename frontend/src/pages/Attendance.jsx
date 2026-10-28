
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API_BASE_URL from "../api";
const API = `${API_BASE_URL}/api/attendance`;
function Attendance() {
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const savedUser = localStorage.getItem("user");

      if (!savedUser) {
        throw new Error("Please login with your student account.");
      }

      let user;

      try {
        user = JSON.parse(savedUser);
      } catch {
        throw new Error("Invalid login details. Please login again.");
      }

      const userId = user?.id ?? user?.user_id ?? user?.userId;
      const role = String(user?.role ?? "").toLowerCase();

      if (!userId || role !== "student") {
        throw new Error(
          "Student login details nahi mile. Please login again."
        );
      }

      const response = await fetch(
        `${API}/student/${encodeURIComponent(userId)}`
      );

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "Server returned an invalid response. Please check the backend."
        );
      }

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message || "Unable to load attendance records."
        );
      }

      const attendanceRecords = Array.isArray(data)
        ? data
        : Array.isArray(data?.attendance)
          ? data.attendance
          : Array.isArray(data?.records)
            ? data.records
            : [];

      setRecords(attendanceRecords);
    } catch (err) {
      setError(
        err.message || "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAttendance();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAttendance]);

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <button
          type="button"
          style={styles.backButton}
          onClick={() => navigate("/student-dashboard")}
        >
          ← Back to Dashboard
        </button>

        <header style={styles.header}>
          <div style={styles.icon}>✓</div>

          <p style={styles.eyebrow}>SMART COLLEGE BUS</p>

          <h1 style={styles.headerTitle}>My Attendance</h1>

          <p style={styles.subtitle}>
            View your college bus boarding attendance history.
          </p>
        </header>

        <section style={styles.summary}>
          <div>
            <span style={styles.summaryLabel}>
              Total Attendance Records
            </span>

            <strong style={styles.count}>
              {records.length}
            </strong>
          </div>

          <div style={styles.summaryIcon}>📋</div>
        </section>

        {loading && (
          <section style={styles.card}>
            <p>Loading attendance records...</p>
          </section>
        )}

        {!loading && error && (
          <section style={styles.errorCard}>
            <h2>Unable to Load Attendance</h2>
            <p>{error}</p>

            <button
              type="button"
              style={styles.primaryButton}
              onClick={loadAttendance}
            >
              Try Again
            </button>
          </section>
        )}

        {!loading && !error && records.length === 0 && (
          <section style={styles.emptyCard}>
            <div style={styles.emptyIcon}>🚌</div>

            <h2>No Attendance Records Yet</h2>

            <p>
              Your attendance will appear here after your valid
              bus pass is scanned and the server saves your record.
            </p>

            <button
              type="button"
              style={styles.primaryButton}
              onClick={loadAttendance}
            >
              Refresh Attendance
            </button>
          </section>
        )}

        {!loading && !error && records.length > 0 && (
          <section>
            <div style={styles.historyHeader}>
              <h2 style={styles.sectionTitle}>
                Attendance History
              </h2>

              <button
                type="button"
                style={styles.refreshButton}
                onClick={loadAttendance}
              >
                ↻ Refresh
              </button>
            </div>

            {records.map((record, index) => {
              const status = String(
                record.attendance_status || record.status || "Present"
              );

              const isPresent = status.toLowerCase() === "present";

              return (
                <article
                  key={
                    record.id ??
                    `${record.attendance_date ?? "date"}-${index}`
                  }
                  style={styles.recordCard}
                >
                  <div style={styles.recordTop}>
                    <div style={styles.busIcon}>🚌</div>

                    <div style={styles.busInfo}>
                      <h3 style={styles.busName}>
                        {record.bus_name || "College Bus"}
                      </h3>

                      <p style={styles.busNumber}>
                        {record.bus_number ||
                          record.registration_number ||
                          "Bus number unavailable"}
                      </p>
                    </div>

                    <span
                      style={{
                        ...styles.status,
                        ...(isPresent
                          ? styles.present
                          : styles.otherStatus),
                      }}
                    >
                      {status}
                    </span>
                  </div>

                  <div style={styles.details}>
                    <div style={styles.detailItem}>
                      <span>Date</span>
                      <strong>
                        {record.attendance_date
                          ? String(record.attendance_date).slice(0, 10)
                          : "N/A"}
                      </strong>
                    </div>

                    <div style={styles.detailItem}>
                      <span>Time</span>
                      <strong>
                        {record.attendance_time
                          ? String(record.attendance_time).slice(0, 8)
                          : "N/A"}
                      </strong>
                    </div>

                    <div style={styles.detailItem}>
                      <span>Booking ID</span>
                      <strong>{record.booking_id ?? "N/A"}</strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <p style={styles.footer}>
          Smart College Bus Management System
        </p>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "28px 16px",
    background: "#eef3fb",
    color: "#172554",
    fontFamily: "Arial, sans-serif",
  },

  container: {
    maxWidth: 900,
    margin: "0 auto",
  },

  backButton: {
    padding: "11px 16px",
    border: "1px solid #cbd5e1",
    borderRadius: 9,
    background: "#ffffff",
    color: "#173f83",
    fontWeight: "bold",
    cursor: "pointer",
  },

  header: {
    padding: "28px 0 22px",
  },

  icon: {
    display: "grid",
    placeItems: "center",
    width: 52,
    height: 52,
    borderRadius: 15,
    background: "#17458b",
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "bold",
  },

  eyebrow: {
    marginTop: 22,
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 2,
  },

  headerTitle: {
    margin: "12px 0",
    fontSize: 32,
    color: "#172554",
  },

  subtitle: {
    color: "#64748b",
    lineHeight: 1.6,
  },

  summary: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 22,
    borderRadius: 16,
    background: "#17458b",
    color: "#ffffff",
    marginBottom: 24,
  },

  summaryLabel: {
    display: "block",
    fontSize: 13,
    opacity: 0.85,
  },

  count: {
    display: "block",
    marginTop: 8,
    fontSize: 32,
  },

  summaryIcon: {
    fontSize: 34,
  },

  card: {
    padding: 24,
    borderRadius: 14,
    background: "#ffffff",
  },

  errorCard: {
    padding: 24,
    borderRadius: 14,
    border: "1px solid #fecaca",
    background: "#ffffff",
    color: "#991b1b",
    overflowWrap: "anywhere",
  },

  primaryButton: {
    padding: "11px 18px",
    border: "none",
    borderRadius: 9,
    background: "#17458b",
    color: "#ffffff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  refreshButton: {
    padding: "9px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: 9,
    background: "#ffffff",
    color: "#17458b",
    fontWeight: "bold",
    cursor: "pointer",
  },

  emptyCard: {
    padding: "36px 24px",
    borderRadius: 16,
    background: "#ffffff",
    textAlign: "center",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
  },

  emptyIcon: {
    fontSize: 44,
  },

  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 21,
  },

  recordCard: {
    marginBottom: 16,
    padding: 22,
    borderRadius: 16,
    background: "#ffffff",
    boxShadow: "0 5px 18px rgba(15, 23, 42, 0.05)",
  },

  recordTop: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 13,
  },

  busIcon: {
    display: "grid",
    placeItems: "center",
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "#e8efff",
    fontSize: 25,
  },

  busInfo: {
    flex: 1,
    minWidth: 130,
  },

  busName: {
    margin: "0 0 6px",
    fontSize: 18,
  },

  busNumber: {
    margin: 0,
    color: "#64748b",
    fontSize: 13,
  },

  status: {
    padding: "8px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "bold",
  },

  present: {
    background: "#dcfce7",
    color: "#166534",
  },

  otherStatus: {
    background: "#fef3c7",
    color: "#92400e",
  },

  details: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 18,
    marginTop: 22,
    paddingTop: 18,
    borderTop: "1px solid #e2e8f0",
  },

  detailItem: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },

  footer: {
    marginTop: 32,
    textAlign: "center",
    color: "#64748b",
    fontSize: 12,
  },
};

export default Attendance;
