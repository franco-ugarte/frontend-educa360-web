import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage/LoginPage.jsx";
import AdminPage from "./pages/AdminPage/AdminPage.jsx";
import SecretariaPage from "./pages/SecretariaPage/SecretariaPage.jsx";
import RolePlaceholder from "./pages/RolePlaceholder/RolePlaceholder.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/secretaria"
          element={
            <ProtectedRoute allowedRoles={["SECRETARIA"]}>
              <SecretariaPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/docente"
          element={
            <ProtectedRoute allowedRoles={["DOCENTE"]}>
              <RolePlaceholder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estudiante"
          element={
            <ProtectedRoute allowedRoles={["ESTUDIANTE"]}>
              <RolePlaceholder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/apoderado"
          element={
            <ProtectedRoute allowedRoles={["APODERADO"]}>
              <RolePlaceholder />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
