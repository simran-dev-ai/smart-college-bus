import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import "./MyBusPass.css";

import API_BASE_URL from "../api";
const API = `${API_BASE_URL}/api/attendance`;

function MyBusPass() {
  const navigate = useNavigate();
  const [pass, setPass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadBusPass = async () => {
      try {
        setLoading(true);
        setError("");

        // Read the existing login details
        const savedUser = localStorage.getItem("user");

        if (!savedUser) {
          setError("Please login first to view your bus pass.");
          return;
        }

        const user = JSON.parse(savedUser);

        // Get the user ID saved by the login system
        const userId =
          user?.id ??
          user?.userId ??
          user?.user_id ??
          user?.user?.id;

        if (!userId) {
          console.error("Login user data:", user);
          setError(
            "Student ID login data mein nahi mili. Please share your Login.jsx code."
          );
          return;
        }

        const response = await fetch(
          `${API}/my-pass/${encodeURIComponent(userId)}`
        );

        const data = await response.json();

        if (!response.ok || !data.success || !data.busPass) {
          setError(data.message || "Active bus pass nahi mila.");
          return;
        }

        setPass(data.busPass);
      } catch (err) {
        console.error("My Bus Pass error:", err);
        setError(
          "Bus pass load nahi hua. Backend server aur API response check karo."
        );
      } finally {
        setLoading(false);
      }
    };

    loadBusPass();
  }, []);

  const formatDate = (value) => {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="bus-pass-page">
        <div className="bus-pass-card">
          <h2>Loading Your Bus Pass...</h2>
          <p>Please wait.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bus-pass-page">
        <div className="bus-pass-card bus-pass-error">
          <h2>My Bus Pass</h2>
          <p>{error}</p>

          <button onClick={() => window.location.reload()}>
            Try Again
          </button>

          <button
            className="secondary-btn"
            onClick={() => navigate("/student-dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const passNumber =
    pass.pass_number || pass.pass_code || pass.pass_id || "BUS PASS";

  return (
    <div className="bus-pass-page">
      <div className="bus-pass-topbar">
        <button onClick={() => navigate("/student-dashboard")}>
          ← Dashboard
        </button>

        <button onClick={() => window.print()}>
          Print Bus Pass
        </button>
      </div>

      <div className="bus-pass-card">
        <div className="bus-pass-heading">
          <div className="bus-icon">🚌</div>

          <div>
            <p className="bus-pass-eyebrow">SMART COLLEGE BUS</p>
            <h1>Student Bus Pass</h1>
            <p>Digital Travel Identity</p>
          </div>
        </div>

        <div className="bus-pass-status">
          ● ACTIVE BUS PASS
        </div>

        <div className="bus-pass-number">
          <span>PASS NUMBER</span>
          <h2>{passNumber}</h2>
        </div>

        <div className="bus-pass-details">
          <div>
            <span>Student Name</span>
            <strong>{pass.student_name || pass.name || "Student"}</strong>
          </div>

          <div>
            <span>Roll Number</span>
            <strong>{pass.roll_no || "Not available"}</strong>
          </div>

          <div>
            <span>Bus Number</span>
            <strong>{pass.bus_number || "Not assigned"}</strong>
          </div>

          <div>
            <span>Bus Name</span>
            <strong>{pass.bus_name || "College Bus"}</strong>
          </div>

          <div>
            <span>Route</span>
            <strong>{pass.route_name || "Not available"}</strong>
          </div>

          <div>
            <span>Boarding Stop</span>
            <strong>
              {pass.stop_name || pass.boarding_stop || "Not available"}
            </strong>
          </div>

          <div>
            <span>Seat Number</span>
            <strong>{pass.seat_number || "Not assigned"}</strong>
          </div>

          <div>
            <span>Valid From</span>
            <strong>{formatDate(pass.issue_date || pass.valid_from)}</strong>
          </div>

          <div>
            <span>Valid Until</span>
            <strong>{formatDate(pass.valid_until || pass.valid_to)}</strong>
          </div>
        </div>

        <div className="bus-pass-qr">
          <QRCodeSVG
            value={String(passNumber)}
            size={160}
            level="H"
            includeMargin
          />

          <p>Show this QR code to the bus driver.</p>
          <small>
            Attendance requires the connected scanner system.
          </small>
        </div>

        <div className="bus-pass-footer">
          <strong>Smart College Bus Management System</strong>
          <span>Please carry your digital bus pass while travelling.</span>
        </div>
      </div>
    </div>
  );
}

export default MyBusPass;