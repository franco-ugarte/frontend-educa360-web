import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./loginstyles.css";
import {
  ArrowRight,
  BookOpen,
  CircleCheck,
  CircleX,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { authService, getApiError, getSession, saveSession } from "../../services/api";
import { formatLongDate } from "../../utils/format";
import Brand from "../../components/ui/Brand";

const HOME_BY_ROLE = {
  ADMIN: "/admin",
  SECRETARIA: "/secretaria",
  DOCENTE: "/docente",
  ESTUDIANTE: "/estudiante",
  APODERADO: "/apoderado",
};

const DEMO_ACCOUNTS = [
  { role: "ADMIN", email: "admin@educa360.pe", password: "Admin12345", tone: "primary" },
  { role: "SECRETARÍA", email: "sofia@educa360.pe", password: "Secreta1234", tone: "accent" },
  { role: "DOCENTE", email: "dana@educa360.pe", password: "Docente1234", tone: "secondary" },
  { role: "ESTUDIANTE", email: "alma@educa360.pe", password: "Alumno1234", tone: "info" },
  { role: "APODERADO", email: "lucia@educa360.pe", password: "Familia1234", tone: "success" },
];

const FEATURES = [
  {
    icon: GraduationCap,
    title: "Toda la vida académica",
    text: "Años escolares, matrículas, secciones, cursos y horarios en un solo lugar.",
  },
  {
    icon: BookOpen,
    title: "Seguimiento real",
    text: "Notas, asistencia y promedios calculados sobre la información oficial.",
  },
  {
    icon: Users,
    title: "Comunidad conectada",
    text: "Comunicados y notificaciones para docentes, estudiantes y apoderados.",
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [demoOpen, setDemoOpen] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session) {
      navigate(HOME_BY_ROLE[session.rol] || "/login", { replace: true });
    }
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    if (!form.email.trim() || !form.password) {
      setError({ message: "Ingresa tu correo institucional y tu contraseña." });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const auth = await authService.login({
        email: form.email.trim(),
        password: form.password,
      });
      saveSession(auth);
      if (!remember) {
        // La sesión igualmente se mantiene en esta pestaña; el check solo comunica intención.
        sessionStorage.setItem("educa360.sessionOnly", "1");
      }
      const from = location.state?.from;
      const target = from && from.startsWith("/admin") ? from : HOME_BY_ROLE[auth.user?.rol] || "/login";
      navigate(target, { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (account) => {
    setForm({ email: account.email, password: account.password });
    setError(null);
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-hero">
          <div className="login-hero__glow login-hero__glow--one" />
          <div className="login-hero__glow login-hero__glow--two" />
          <div className="login-hero__grid" />

          <div className="login-hero__top">
            <div className="login-hero__logo">
              <Brand inverted />
            </div>
            <span className="login-hero__pill">
              <ShieldCheck size={14} /> Acceso seguro
            </span>
          </div>

          <div className="login-hero__content">
            <span className="eyebrow eyebrow--light">
              <Sparkles size={14} /> Colegio Nuestra Señora de Monserrat
            </span>
            <h1 className="login-hero__title">
              Una sola plataforma para <span>toda</span> la comunidad educativa.
            </h1>
            <p className="login-hero__text">
              Gestiona la vida académica del colegio con información confiable, trazable y
              disponible en tiempo real.
            </p>

            <ul className="login-features">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="login-feature">
                  <span className="login-feature__icon">
                    <Icon size={19} />
                  </span>
                  <span>
                    <strong>{title}</strong>
                    <small>{text}</small>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="login-hero__footer">
            <div>
              <strong>Módulos conectados</strong>
              <span>Matrícula · Notas · Asistencia · Comunicados · Notificaciones</span>
            </div>
            <span className="login-hero__chip">v3.6</span>
          </div>
        </section>

        <section className="login-form-side">
          <div className="login-card">
            <div className="login-card__header">
              <span className="eyebrow">Bienvenido de vuelta</span>
              <h2>Inicia sesión en tu cuenta</h2>
              <p>Usa tus credenciales institucionales para entrar al panel de Educa360.</p>
            </div>

            {error ? (
              <div className="alert alert--error" role="alert">
                <CircleX size={18} />
                <div>
                  <p>{error.message}</p>
                  {error.fields?.length ? (
                    <ul className="alert__list">
                      {error.fields.map((field) => (
                        <li key={field}>{field}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            ) : null}

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <label className="field">
                <span className="field__label">Correo institucional</span>
                <span className="field__control">
                  <Mail size={18} className="field__icon" />
                  <input
                    className="field__input"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="nombre@educa360.pe"
                    value={form.email}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </span>
              </label>

              <label className="field">
                <span className="field__label">Contraseña</span>
                <span className="field__control">
                  <Lock size={18} className="field__icon" />
                  <input
                    className="field__input"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    placeholder="Ingresa tu contraseña"
                    value={form.password}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="field__toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>

              <div className="login-meta">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                  />
                  <span>Mantener sesión</span>
                </label>
                <span className="login-meta__secure">
                  <ShieldCheck size={14} /> Token válido 24 h
                </span>
              </div>

              <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner" /> Verificando credenciales…
                  </>
                ) : (
                  <>
                    Ingresar al panel <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="demo">
              <button
                type="button"
                className="demo__toggle"
                onClick={() => setDemoOpen((value) => !value)}
                aria-expanded={demoOpen}
              >
                <span>
                  <CircleCheck size={15} /> Acceso de demostración
                </span>
                <small>{demoOpen ? "Ocultar cuentas" : "Ver cuentas de prueba"}</small>
              </button>

              {demoOpen ? (
                <div className="demo__grid">
                  {DEMO_ACCOUNTS.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      className={`demo__item demo__item--${account.tone}`}
                      onClick={() => fillDemo(account)}
                    >
                      <span className="demo__role">{account.role}</span>
                      <span className="demo__email">{account.email}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <p className="login-footer">
              <span>{formatLongDate()}</span>
              <span>Educa360 · Panel institucional</span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
