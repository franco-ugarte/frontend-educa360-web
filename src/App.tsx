import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage/LoginPage.jsx";
import AdminPage from "./pages/AdminPage/AdminPage.jsx";
import SecretariaPage from "./pages/SecretariaPage/SecretariaPage.jsx";
import DocentePage from "./pages/DocentePage/DocentePage.jsx";
import EstudiantePage from "./pages/EstudiantePage/EstudiantePage.jsx";
import ApoderadoPage from "./pages/ApoderadoPage/ApoderadoPage.jsx";
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
              <DocentePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estudiante"
          element={
            <ProtectedRoute allowedRoles={["ESTUDIANTE"]}>
              <EstudiantePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/apoderado"
          element={
            <ProtectedRoute allowedRoles={["APODERADO"]}>
              <ApoderadoPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
