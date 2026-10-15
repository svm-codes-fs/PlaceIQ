import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { Login } from "./pages/auth/Login";
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

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
        }
      })
      .catch(() => console.error("Not authenticated"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-background text-primary">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/student'} /> : <Login onLogin={setUser} />} 
        />
        
        {/* Protected Routes Wrapper */}
        <Route element={<AppLayout user={user} onLogout={() => setUser(null)} />}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/companies" element={<StudentCompanies />} />
          <Route path="/student/applications" element={<StudentApplications />} />
          <Route path="/student/profile" element={<StudentProfile />} />
          <Route path="/student/*" element={<Navigate to="/student" />} />
          
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/students" element={<AdminStudents />} />
          <Route path="/admin/companies" element={<AdminCompanies />} />
          <Route path="/admin/applications" element={<AdminApplications />} />
          <Route path="/admin/results" element={<AdminResults />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/*" element={<Navigate to="/admin" />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
