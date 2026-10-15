import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { StudentDashboard } from "./pages/student/StudentDashboard";
import { StudentCompanies } from "./pages/student/StudentCompanies";
import { StudentApplications } from "./pages/student/StudentApplications";
import { StudentProfile } from "./pages/student/StudentProfile";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminStudents } from "./pages/admin/AdminStudents";
import { AdminCompanies } from "./pages/admin/AdminCompanies";
import { AdminApplications } from "./pages/admin/AdminApplications";
import { AdminResults } from "./pages/admin/AdminResults";
import { AdminReports } from "./pages/admin/AdminReports";
import { SuperColleges } from "./pages/super/SuperColleges";
import { api, HOME } from "./utils/api";

// Only lets users with the given role through; others go to their own home page
function RequireRole({ user, role }) {
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={HOME[user.role]} replace />;
  return <Outlet />;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    const onExpired = () => setUser(null);
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => {});
    setUser(null);
  }, []);

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-background text-primary">Loading...</div>;
  }

  const home = user ? HOME[user.role] : "/login";

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to={home} /> : <Login onLogin={setUser} />} />
        <Route path="/register" element={user ? <Navigate to={home} /> : <Register onLogin={setUser} />} />

        <Route element={<AppLayout user={user} onLogout={logout} />}>
          <Route element={<RequireRole user={user} role="student" />}>
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/companies" element={<StudentCompanies />} />
            <Route path="/student/applications" element={<StudentApplications />} />
            <Route path="/student/profile" element={<StudentProfile />} />
            <Route path="/student/*" element={<Navigate to="/student" />} />
          </Route>

          <Route element={<RequireRole user={user} role="college_admin" />}>
            <Route path="/admin" element={<AdminDashboard user={user} />} />
            <Route path="/admin/students" element={<AdminStudents />} />
            <Route path="/admin/companies" element={<AdminCompanies />} />
            <Route path="/admin/applications" element={<AdminApplications />} />
            <Route path="/admin/results" element={<AdminResults />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/*" element={<Navigate to="/admin" />} />
          </Route>

          <Route element={<RequireRole user={user} role="super_admin" />}>
            <Route path="/super" element={<SuperColleges />} />
            <Route path="/super/*" element={<Navigate to="/super" />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={home} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
