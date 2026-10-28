
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";

import API_BASE_URL from "../api";
const API = `${API_BASE_URL}/api/attendance`;
export default function DriverAttendance({ userId: propUserId }) {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [records, setRecords] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState("");
  const [loadingCameras, setLoadingCameras] = useState(false);

  let storedUser = null;

  try {
    storedUser = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    storedUser = null;
  }

  const userId =
    propUserId ??
    storedUser?.id ??
    storedUser?.user_id ??
    storedUser?.userId ??
    localStorage.getItem("user_id") ??
    localStorage.getItem("userId");

  async function readResponse(response) {
    const text = await response.text();

    try {
      return text ? JSON.parse(text) : {};
    } catch {
      throw new Error(
        "Server returned an invalid response. Check the backend API URL and restart the backend."
      );
    }
  }

  async function loadAttendance() {
    if (!userId) {
      setError("Driver user ID not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(
        `${API}/driver/${encodeURIComponent(userId)}`
      );
      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message || `Could not load attendance (${response.status}).`
        );
      }

      setRecords(Array.isArray(data.attendance) ? data.attendance : []);
    } catch (err) {
      setError(err.message || "Could not load attendance.");
    }
  }

  async function findCameras() {
    setError("");
    setMessage("Checking available cameras...");
    setLoadingCameras(true);

    try {
      const devices = await Html5Qrcode.getCameras();

      if (!devices || devices.length === 0) {
        throw new Error(
          "No camera found. Connect a camera and allow camera permission in Chrome."
        );
      }

      setCameras(devices);

      const preferred =
        devices.find((device) =>
          /back|rear|environment/i.test(device.label)
        ) || devices[0];

      setCameraId(preferred.id);
      setMessage(
        `Found ${devices.length} camera(s). Select a camera and start scanning.`
      );
    } catch (err) {
      setError(
        err.message ||
          "Could not access cameras. Allow camera permission in your browser."
      );
      setMessage("");
    } finally {
      setLoadingCameras(false);
    }
  }

  async function handleScan(decodedText) {
    if (busyRef.current) return;

    busyRef.current = true;
    setError("");
    setMessage(`QR detected: ${decodedText}. Verifying bus pass...`);

    try {
      if (!userId) {
        throw new Error("Driver user ID not found. Please log in again.");
      }

      const response = await fetch(`${API}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passCode: decodedText.trim(),
          userId,
        }),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message || `Pass verification failed (${response.status}).`
        );
      }

      setMessage(
        `Present marked successfully for ${
          data.attendance?.student_name || "student"
        }.`
      );

      await loadAttendance();
    } catch (err) {
      setError(err.message || "Could not verify the QR code.");
      setMessage("");
    } finally {
      window.setTimeout(() => {
        busyRef.current = false;
      }, 2000);
    }
  }

  async function startScanner() {
    if (!userId) {
      setError("Driver user ID not found. Please log in again.");
      return;
    }

    if (scannerRef.current) return;

    let scanner;

    try {
      setError("");
      setMessage("Starting camera...");

      scanner = new Html5Qrcode("bus-qr-reader", {
        verbose: false,
      });

      scannerRef.current = scanner;

      const cameraConfig = cameraId
        ? cameraId
        : { facingMode: "environment" };

      await scanner.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: (viewWidth, viewHeight) => {
            const size = Math.floor(
              Math.min(viewWidth, viewHeight, 280)
            );

            return { width: size, height: size };
          },
          aspectRatio: 1,
        },
        async (decodedText) => {
          if (busyRef.current) return;

          try {
            if (scannerRef.current?.isScanning) {
              await scanner.pause(true);
            }
          } catch {
            // Continue with verification if pausing is unavailable.
          }

          await handleScan(decodedText);

          if (scannerRef.current === scanner && scanner.isScanning) {
            try {
              scanner.resume();
            } catch {
              // The scanner may already have stopped.
            }
          }
        },
        () => {
          // No QR detected in this frame. Keep scanning.
        }
      );

      setScanning(true);
      setMessage(
        "Camera is running. Hold a clear QR code inside the scanning box."
      );
    } catch (err) {
      if (scannerRef.current === scanner) {
        scannerRef.current = null;
      }

      try {
        if (scanner?.isScanning) await scanner.stop();
        scanner?.clear();
      } catch {
        // Ignore cleanup errors.
      }

      setScanning(false);
      setError(
        `Could not start the scanner: ${
          err?.message || "Unknown camera error"
        }`
      );
      setMessage("");
    }
  }

  async function stopScanner() {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (scanner) {
      try {
        if (scanner.isScanning) await scanner.stop();
      } catch {
        // Camera may already be stopped.
      }

      try {
        scanner.clear();
      } catch {
        // Scanner element may already be cleared.
      }
    }

    setScanning(false);
    setMessage("Scanner stopped.");
  }

  useEffect(() => {
    mountedRef.current = true;
    loadAttendance();
    findCameras();

    return () => {
      mountedRef.current = false;

      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner) {
        if (scanner.isScanning) {
          scanner.stop().catch(() => {});
        } else {
          try {
            scanner.clear();
          } catch {
            // Ignore cleanup errors.
          }
        }
      }
    };
    // Load data when this component mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button
          type="button"
          style={styles.secondary}
          onClick={() => navigate("/driver-dashboard")}
        >
          ← Driver Dashboard
        </button>

        <h1>Bus QR Attendance</h1>
        <p>Scan a student's active bus pass when they board.</p>
      </header>

      <main style={styles.main}>
        <section style={styles.card}>
          <h2>Scan Student Bus Pass</h2>

          <label style={styles.label} htmlFor="camera-choice">
            Select Camera
          </label>

          <select
            id="camera-choice"
            style={styles.select}
            value={cameraId}
            onChange={(event) => setCameraId(event.target.value)}
            disabled={scanning || loadingCameras}
          >
            {cameras.length === 0 && (
              <option value="">No cameras found</option>
            )}

            {cameras.map((camera, index) => (
              <option key={camera.id} value={camera.id}>
                {camera.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>

          <button
            type="button"
            style={styles.secondary}
            onClick={findCameras}
            disabled={scanning || loadingCameras}
          >
            {loadingCameras ? "Checking..." : "Refresh Cameras"}
          </button>

          <div id="bus-qr-reader" style={styles.reader} />

          {message && <p style={styles.success}>{message}</p>}
          {error && <p style={styles.error}>{error}</p>}

          {!scanning ? (
            <button
              type="button"
              style={styles.primary}
              onClick={startScanner}
              disabled={loadingCameras}
            >
              Start QR Scanner
            </button>
          ) : (
            <button
              type="button"
              style={styles.secondary}
              onClick={stopScanner}
            >
              Stop Scanner
            </button>
          )}

          <p style={styles.hint}>
            Tip: Show a clear, bright, valid bus pass QR code inside the
            camera's scanning box. Keep the code steady and avoid glare.
          </p>
        </section>

        <section style={styles.card}>
          <div style={styles.headingRow}>
            <h2>Attendance Records</h2>
            <button
              type="button"
              style={styles.secondary}
              onClick={loadAttendance}
            >
              Refresh
            </button>
          </div>

          {records.length === 0 ? (
            <p>No attendance records available yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll No.</th>
                    <th>Bus</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>{record.student_name || "N/A"}</td>
                      <td>{record.roll_no || "N/A"}</td>
                      <td>
                        {record.bus_name || "Bus"} (
                        {record.bus_number || "N/A"})
                      </td>
                      <td>{record.attendance_date || "N/A"}</td>
                      <td>{record.attendance_time || "N/A"}</td>
                      <td>{record.attendance_status || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    fontFamily: "Arial, sans-serif",
    color: "#172033",
  },
  header: {
    padding: "24px",
    background: "#142b4a",
    color: "white",
  },
  main: {
    maxWidth: "1100px",
    margin: "24px auto",
    padding: "0 16px",
    display: "grid",
    gap: "20px",
  },
  card: {
    background: "white",
    padding: "22px",
    borderRadius: "14px",
    boxShadow: "0 4px 18px #17203312",
    minWidth: 0,
  },
  headingRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  label: {
    display: "block",
    fontWeight: "bold",
    marginBottom: "8px",
  },
  select: {
    display: "block",
    width: "100%",
    maxWidth: "500px",
    padding: "12px",
    marginBottom: "12px",
    border: "1px solid #ccd5e4",
    borderRadius: "8px",
    background: "white",
  },
  reader: {
    width: "100%",
    maxWidth: "500px",
    marginTop: "16px",
    marginBottom: "16px",
  },
  primary: {
    marginTop: "12px",
    padding: "12px 18px",
    background: "#1769e0",
    color: "white",
    border: 0,
    borderRadius: "8px",
    cursor: "pointer",
  },
  secondary: {
    padding: "10px 14px",
    background: "#e8eef8",
    color: "#142b4a",
    border: 0,
    borderRadius: "8px",
    cursor: "pointer",
    marginRight: "8px",
  },
  success: {
    color: "#167443",
    fontWeight: "bold",
    overflowWrap: "anywhere",
  },
  error: {
    color: "#b42318",
    fontWeight: "bold",
    overflowWrap: "anywhere",
  },
  hint: {
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
};
