import { useNavigate } from "react-router-dom";
import "./rolestyles.css";
import { LogOut, Sparkles, ShieldCheck } from "lucide-react";
import { clearSession, getSession } from "../../services/api";
import { fullName, roleLabel } from "../../utils/format";
import Brand from "../../components/ui/Brand";

export default function RolePlaceholder() {
  const navigate = useNavigate();
  const session = getSession();

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className="role-page">
      <header className="role-page__top">
        <Brand />
        <button type="button" className="btn btn--ghost" onClick={logout}>
          <LogOut size={16} /> Cerrar sesión
        </button>
      </header>

      <main className="role-page__card">
        <span className="role-page__icon">
          <Sparkles size={26} />
        </span>
        <span className="eyebrow">
          <ShieldCheck size={14} /> {roleLabel(session?.rol)}
        </span>
        <h1>Hola, {session?.nombres || "bienvenido"}</h1>
        <p>
          Tu sesión se inició correctamente en Educa360. El módulo de <strong>{roleLabel(session?.rol)}</strong>{" "}
          se encuentra en construcción; por ahora el panel disponible es el de administración.
        </p>
        <div className="role-page__meta">
          <span>{fullName(session)}</span>
          <span>{session?.email}</span>
        </div>
        <button type="button" className="btn btn--primary" onClick={logout}>
          <LogOut size={16} /> Volver al inicio de sesión
        </button>
      </main>
    </div>
  );
}
