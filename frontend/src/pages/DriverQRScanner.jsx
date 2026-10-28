
import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

import API_BASE_URL from "../api";
const API = `${API_BASE_URL}/api/attendance`;
function DriverQRScanner({ userId }) {
  const [message, setMessage] = useState("");
  const [attendance, setAttendance] = useState(null);
  const [messageType, setMessageType] = useState("info");

  const busyRef = useRef(false);
  const scannerRef = useRef(null);
  const errorTimerRef = useRef(null);

  useEffect(() => {
    if (!userId) return undefined;

    let cancelled = false;
    let scanner;

    const showScannerError = () => {
      errorTimerRef.current = window.setTimeout(() => {
        if (!cancelled) {
          setMessage("Unable to start the camera scanner. Check camera permission and try again.");
          setMessageType("error");
        }
      }, 0);
    };

    const handleScanSuccess = async (decodedText) => {
      if (busyRef.current || cancelled) return;

      const passCode = decodedText.trim();
      if (!passCode) return;

      busyRef.current = true;
      setMessage("Checking pass and marking attendance...");
      setMessageType("info");
      setAttendance(null);

      try {
        const response = await fetch(`${API}/scan`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            passCode,
            userId: Number(userId),
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "QR scan failed.");
        }

        if (!cancelled) {
          setAttendance(data.attendance || null);
          setMessage(data.message || "Attendance marked successfully.");
          setMessageType("success");
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error.message || "Unable to contact the attendance server.");
          setMessageType("error");
        }
      } finally {
        window.setTimeout(() => {
          busyRef.current = false;
        }, 2500);
      }
    };

    try {
      scanner = new Html5QrcodeScanner(
        "driver-qr-reader",
        {
          fps: 10,
          qrbox: { width: 230, height: 230 },
          rememberLastUsedCamera: true,
        },
        false
      );

      scannerRef.current = scanner;
      scanner.render(handleScanSuccess, () => {
        // Ignore scanner messages while looking for a QR code.
      });
    } catch (error) {
      console.error("QR scanner initialization error:", error);
      showScannerError();
    }

    return () => {
      cancelled = true;

      if (errorTimerRef.current !== null) {
        window.clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }

      if (scannerRef.current) {
        const currentScanner = scannerRef.current;
        scannerRef.current = null;

        try {
          Promise.resolve(currentScanner.clear()).catch((error) => {
            console.warn("Unable to clear QR scanner:", error);
          });
        } catch (error) {
          console.warn("QR scanner cleanup error:", error);
        }
      }
    };
  }, [userId]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.intro}>
        <h3>Scan Student Bus Pass</h3>
        <p>
          Allow camera access and hold the student's bus pass QR
          code in front of the camera.
        </p>
      </div>

      {!userId ? (
        <p style={styles.error}>
          Driver user ID is missing. Please log in again.
        </p>
      ) : (
        <div id="driver-qr-reader" style={styles.reader} />
      )}

      <p style={styles.hint}>
        Allow camera permission in your browser. Camera access
        normally requires localhost or HTTPS.
      </p>

      {message && (
        <div
          role="status"
          aria-live="polite"
          style={{
            ...styles.result,
            background:
              messageType === "success"
                ? "#dcfce7"
                : messageType === "error"
                  ? "#fee2e2"
                  : "#eff6ff",
            color:
              messageType === "success"
                ? "#166534"
                : messageType === "error"
                  ? "#b91c1c"
                  : "#1d4ed8",
          }}
        >
          {message}
        </div>
      )}

      {attendance && (
        <div style={styles.student}>
          <h4>Attendance Confirmed</h4>
          <p>
            <strong>Student:</strong>{" "}
            {attendance.student_name || "Not available"}
          </p>
          <p>
            <strong>Roll No:</strong> {attendance.roll_no || "N/A"}
          </p>
          <p>
            <strong>Bus:</strong> {attendance.bus_name || "N/A"}
          </p>
          <p>
            <strong>Bus Number:</strong> {attendance.bus_number || "N/A"}
          </p>
          <p>
            <strong>Seat:</strong> {attendance.seat_number || "N/A"}
          </p>
          <p>
            <strong>Booking ID:</strong> {attendance.booking_id || "N/A"}
          </p>
          <p>
            <strong>Status:</strong> {attendance.status || "Present"}
          </p>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    maxWidth: 600,
    marginTop: 18,
  },
  intro: {
    lineHeight: 1.6,
  },
  reader: {
    width: "100%",
    maxWidth: 480,
    margin: "18px auto",
    background: "#ffffff",
    borderRadius: 12,
    padding: 10,
    boxSizing: "border-box",
  },
  hint: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.6,
  },
  error: {
    color: "#b91c1c",
  },
  result: {
    padding: 14,
    borderRadius: 9,
    marginTop: 16,
    lineHeight: 1.6,
    overflowWrap: "anywhere",
  },
  student: {
    padding: 16,
    marginTop: 14,
    border: "1px solid #bbf7d0",
    borderRadius: 10,
    background: "#f0fdf4",
    lineHeight: 1.6,
    overflowWrap: "anywhere",
  },
};

export default DriverQRScanner;
