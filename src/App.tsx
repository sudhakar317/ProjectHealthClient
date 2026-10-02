import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/auth/AuthContext";
import AuditLogsPage from "@/pages/AuditLogsPage";
import DoctorFormPage from "@/pages/DoctorFormPage";
import DoctorsPage from "@/pages/DoctorsPage";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import SpecializationsPage from "@/pages/SpecializationsPage";

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <LoginPage />;
  const isAdmin = user.role === "ADMIN";

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        {isAdmin && <Route path="doctors" element={<DoctorsPage />} />}
        {isAdmin && <Route path="doctors/new" element={<DoctorFormPage />} />}
        {isAdmin && <Route path="doctors/:id/edit" element={<DoctorFormPage />} />}
        {isAdmin && <Route path="specializations" element={<SpecializationsPage />} />}
        {isAdmin && <Route path="audit-logs" element={<AuditLogsPage />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
