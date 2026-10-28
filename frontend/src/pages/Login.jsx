
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import API_BASE_URL from "../api";
const API_BASE = API_BASE_URL;
export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();

    if (loading) return;

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Invalid email or password."
        );
      }

      const user = data.user;

      if (!user || !user.role) {
        throw new Error(
          "Login response does not contain user details or role."
        );
      }

      const role = String(user.role).trim().toLowerCase();

      const dashboardRoutes = {
        student: "/student-dashboard",
        admin: "/admin-dashboard",
        driver: "/driver-dashboard",
      };

      const dashboard = dashboardRoutes[role];

      if (!dashboard) {
        throw new Error(`Unsupported account role: ${role}`);
      }

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...user,
          role,
        })
      );

      navigate(dashboard, { replace: true });
    } catch (error) {
      console.error("Login error:", error);

      if (error instanceof TypeError) {
        setMessage(
          "Cannot connect to backend. Please start the server on port 5000."
        );
      } else {
        setMessage(error.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.logo}>🚌</div>

        <h1 style={styles.heading}>Smart College Bus</h1>
        <p style={styles.subtitle}>
          College Transportation Management System
        </p>

        <div style={styles.line} />

        <h2 style={styles.welcome}>Welcome Back!</h2>
        <p style={styles.description}>
          Sign in to access your account.
        </p>

        <form onSubmit={handleLogin}>
          <label htmlFor="login-email" style={styles.label}>
            Email Address
          </label>

          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            autoComplete="username"
            style={styles.input}
            required
          />

          <label htmlFor="login-password" style={styles.label}>
            Password
          </label>

          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            style={styles.input}
            required
          />

          {message && (
            <div style={styles.error} role="alert">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Signing In..." : "Sign In →"}
          </button>
        </form>

        <p style={styles.footer}>
          Secure College Transportation Portal
        </p>
      </section>

      <p style={styles.copyright}>
        Smart College Bus System © 2026
      </p>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    boxSizing: "border-box",
    padding: "30px 16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #eff6ff, #f8fafc, #e0e7ff)",
    fontFamily: "Arial, sans-serif",
    color: "#172033",
  },
  card: {
    width: "100%",
    maxWidth: "440px",
    boxSizing: "border-box",
    background: "#ffffff",
    padding: "32px",
    borderRadius: "18px",
    border: "1px solid #e5eaf3",
    boxShadow: "0 20px 60px rgba(30, 58, 138, 0.12)",
  },
  logo: {
    width: "68px",
    height: "68px",
    margin: "0 auto 16px",
    borderRadius: "18px",
    background: "#eff6ff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "38px",
  },
  heading: {
    textAlign: "center",
    fontSize: "27px",
    color: "#1e3a8a",
    margin: 0,
  },
  subtitle: {
    textAlign: "center",
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.6,
    marginTop: "10px",
  },
  line: {
    height: "1px",
    background: "#e9eef5",
    margin: "25px 0",
  },
  welcome: {
    fontSize: "24px",
    margin: "0 0 8px",
  },
  description: {
    color: "#64748b",
    fontSize: "14px",
    marginBottom: "22px",
  },
  label: {
    display: "block",
    marginTop: "16px",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "bold",
  },
  input: {
    display: "block",
    width: "100%",
    height: "46px",
    boxSizing: "border-box",
    padding: "0 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "14px",
    outlineColor: "#2563eb",
  },
  button: {
    width: "100%",
    minHeight: "48px",
    marginTop: "24px",
    border: "none",
    borderRadius: "8px",
    background: "linear-gradient(90deg, #2563eb, #1d4ed8)",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "bold",
  },
  error: {
    marginTop: "16px",
    padding: "12px",
    borderRadius: "8px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    fontSize: "13px",
    lineHeight: 1.5,
    overflowWrap: "anywhere",
  },
  footer: {
    marginTop: "26px",
    paddingTop: "18px",
    borderTop: "1px solid #e9eef5",
    textAlign: "center",
    color: "#64748b",
    fontSize: "12px",
  },
  copyright: {
    marginTop: "20px",
    color: "#64748b",
    fontSize: "12px",
    textAlign: "center",
  },
};
