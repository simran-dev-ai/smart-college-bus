
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import Booking from "./pages/Booking";
import RoutesStops from "./pages/RoutesStops";
import SeatAvailability from "./pages/SeatAvailability";
import RoutePrices from "./pages/RoutePrices";
import DriverDashboard from "./pages/DriverDashboard";
import MyBusPass from "./pages/MyBusPass";
import Attendance from "./pages/Attendance";
import AdminDashboard from "./pages/AdminDashboard";
import StudentLiveBusTracking from "./pages/StudentLiveTracking";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/student-dashboard"
          element={<StudentDashboard />}
        />

        <Route
          path="/admin-dashboard"
          element={<AdminDashboard />}
        />

        <Route
          path="/driver-dashboard"
          element={<DriverDashboard />}
        />

        <Route path="/booking" element={<Booking />} />
        <Route path="/routes-stops" element={<RoutesStops />} />
        <Route path="/seat-availability" element={<SeatAvailability />} />
        <Route path="/route-prices" element={<RoutePrices />} />
        <Route path="/my-bus-pass" element={<MyBusPass />} />
        <Route path="/attendance" element={<Attendance />} />

        <Route
          path="/my-bus-tracking"
          element={<StudentLiveBusTracking />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
