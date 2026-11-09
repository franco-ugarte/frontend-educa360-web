import { Navigate, useLocation } from "react-router-dom";
import { getSession } from "../services/api";

export default function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(session.rol)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
