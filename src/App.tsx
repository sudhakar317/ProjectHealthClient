import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/auth/AuthContext";
import LoginPage from "@/pages/LoginPage";

// Each page is its own chunk, fetched the first time it is opened. A doctor never downloads the
// admin screens, and the first paint no longer waits on every page in the app. The login page
// stays eager: it is the first screen a signed-out user sees.
const HomePage = lazy(() => import("@/pages/HomePage"));
const PatientsPage = lazy(() => import("@/pages/PatientsPage"));
const PatientFormPage = lazy(() => import("@/pages/PatientFormPage"));
const PatientDetailPage = lazy(() => import("@/pages/PatientDetailPage"));
const DoctorsPage = lazy(() => import("@/pages/DoctorsPage"));
const DoctorFormPage = lazy(() => import("@/pages/DoctorFormPage"));
const SpecializationsPage = lazy(() => import("@/pages/SpecializationsPage"));
const AuditLogsPage = lazy(() => import("@/pages/AuditLogsPage"));

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <LoginPage />;
  const isAdmin = user.role === "ADMIN";
  const isDoctor = user.role === "DOCTOR";

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="patients" element={<PatientsPage />} />
        {/* Only a doctor registers patients, matching the server rule. */}
        {isDoctor && <Route path="patients/new" element={<PatientFormPage />} />}
        <Route path="patients/:id/edit" element={<PatientFormPage />} />
        {/* Visit history lives here; both roles may read and record visits. */}
        <Route path="patients/:id" element={<PatientDetailPage />} />
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
