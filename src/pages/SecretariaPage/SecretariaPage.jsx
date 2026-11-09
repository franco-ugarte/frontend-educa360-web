import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./secretariastyles.css";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  RefreshCw,
  Users,
  UserCheck,
  X,
} from "lucide-react";

import {
  clearSession,
  getApiError,
  getSession,
  notificationService,
  secretariaService,
} from "../../services/api";
import { connectNotifications } from "../../services/notificationsSocket";
import { formatLongDate, initials, relativeTime, roleLabel } from "../../utils/format";
import Brand from "../../components/ui/Brand";
import Toast from "../../components/ui/Toast";
import NotificationsView from "../../components/panel/NotificationsView";
import OverviewView from "./views/OverviewView";
import StudentsView from "./views/StudentsView";
import EnrollmentsView from "./views/EnrollmentsView";
import FamiliesView from "./views/FamiliesView";
import TicketsView from "./views/TicketsView";
import AnnouncementsView from "./views/AnnouncementsView";

const NAV = [
  {
    label: "Principal",
    items: [{ key: "resumen", label: "Resumen", icon: LayoutDashboard }],
  },
  {
    label: "Gestión",
    items: [
      { key: "estudiantes", label: "Estudiantes", icon: GraduationCap },
      { key: "matriculas", label: "Matrículas", icon: ClipboardList },
      { key: "familias", label: "Familias", icon: Users },
      { key: "tickets", label: "Justificaciones", icon: ClipboardCheck },
      { key: "comunicados", label: "Comunicados", icon: Megaphone },
    ],
  },
  {
    label: "Sistema",
    items: [{ key: "notificaciones", label: "Notificaciones", icon: Bell }],
  },
];

const VIEW_META = {
  resumen: {
    title: "Resumen de secretaría",
    subtitle: "Matrículas, familias, estudiantes y justificaciones en un solo lugar.",
  },
  estudiantes: {
    title: "Estudiantes",
    subtitle: "Fichas, expedientes, estados académicos y datos de contacto.",
  },
  matriculas: {
    title: "Matrículas",
    subtitle: "Inscripción por sección, cambios de sección y retiros del año.",
  },
  familias: {
    title: "Familias y apoderados",
    subtitle: "Representantes, hijos vinculados y canales de contacto.",
  },
  tickets: {
    title: "Justificaciones",
    subtitle: "Bandeja de tickets de inasistencia pendientes de resolución.",
  },
  comunicados: {
    title: "Comunicados",
    subtitle: "Mensajes generales para toda la comunidad educativa.",
  },
  notificaciones: {
    title: "Notificaciones",
    subtitle: "Avisos dirigidos a tu cuenta.",
  },
};

const EMPTY_DATA = {
  estudiantes: [],
  matriculas: [],
  apoderados: [],
  tickets: [],
  comunicados: [],
};

function yearNumber(nombre) {
  const match = String(nombre || "").match(/\d{4}/);
  return match ? Number(match[0]) : 0;
}

export default function SecretariaPage() {
  const navigate = useNavigate();
  const [view, setView] = useState("resumen");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const bellRef = useRef(null);
  const session = useMemo(() => getSession(), []);

  const showToast = useCallback((type, message) => {
    setToast({ type, message, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onClick = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const loadCore = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    const results = await Promise.allSettled([
      secretariaService.listarEstudiantes(),
      secretariaService.listarMatriculas(),
      secretariaService.listarApoderados(),
      secretariaService.listarTickets(),
      secretariaService.listarComunicados(),
    ]);

    const keys = ["estudiantes", "matriculas", "apoderados", "tickets", "comunicados"];
    const next = { ...EMPTY_DATA };
    const failures = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        next[keys[index]] = Array.isArray(result.value) ? result.value : [];
      } else {
        failures.push(getApiError(result.reason).message);
      }
    });

    setData(next);
    setError(
      failures.length
        ? {
            message: failures[0],
            detail: failures.length > 1 ? `${failures.length} consultas fallaron.` : null,
          }
        : null
    );
    setLoading(false);
    setRefreshing(false);
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const [list, counter] = await Promise.all([
        notificationService.listar(),
        notificationService.contador(),
      ]);
      setNotifications(Array.isArray(list) ? list : []);
      setUnread(counter?.noLeidas || 0);
    } catch {
      /* el panel sigue operativo sin notificaciones */
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCore();
    loadNotifications();
  }, [loadCore, loadNotifications]);

  useEffect(() => {
    const disconnect = connectNotifications((notification) => {
      setNotifications((prev) => {
        if (prev.some((item) => item.id === notification.id)) return prev;
        return [notification, ...prev];
      });
      setUnread((prev) => prev + 1);
      showToast("info", notification.titulo || "Nuevo aviso recibido");
    });
    return disconnect;
  }, [showToast]);

  const markOne = async (notification) => {
    if (notification.leida) return;
    try {
      const updated = await notificationService.marcarLeida(notification.id);
      setNotifications((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setUnread((prev) => Math.max(0, prev - 1));
    } catch (requestError) {
      showToast("error", getApiError(requestError).message);
    }
  };

  const markAll = async () => {
    try {
      const counter = await notificationService.marcarTodasLeidas();
      setNotifications((prev) =>
        prev.map((item) =>
          item.leida ? item : { ...item, leida: true, leidaAt: item.leidaAt || new Date().toISOString() }
        )
      );
      setUnread(counter?.noLeidas || 0);
      showToast("success", "Todas las notificaciones quedaron como leídas.");
    } catch (requestError) {
      showToast("error", getApiError(requestError).message);
    }
  };

  const handleNavigate = (nextView) => {
    setView(nextView);
    setSidebarOpen(false);
    setBellOpen(false);
  };

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  /**
   * Secretaría no tiene acceso a la estructura académica (/admin/anios o
   * /admin/secciones), así que reconstruimos los años y secciones visibles a
   * partir de las matrículas y comunicados que sí puede leer.
   */
  const { anios, secciones } = useMemo(() => {
    const yearMap = new Map();
    const sectionMap = new Map();

    (data.matriculas || []).forEach((matricula) => {
      if (matricula.anioId) {
        yearMap.set(String(matricula.anioId), {
          id: matricula.anioId,
          nombre: matricula.anioNombre,
          anio: yearNumber(matricula.anioNombre),
        });
      }
      if (matricula.seccionId) {
        sectionMap.set(String(matricula.seccionId), {
          id: matricula.seccionId,
          etiqueta: matricula.seccionEtiqueta,
          anioId: matricula.anioId,
          anioNombre: matricula.anioNombre,
        });
      }
    });

    (data.comunicados || []).forEach((comunicado) => {
      if (comunicado.anioId && !yearMap.has(String(comunicado.anioId))) {
        yearMap.set(String(comunicado.anioId), {
          id: comunicado.anioId,
          nombre: comunicado.anioNombre,
          anio: yearNumber(comunicado.anioNombre),
        });
      }
    });

    return {
      anios: [...yearMap.values()].sort((a, b) => b.anio - a.anio),
      secciones: [...sectionMap.values()].sort(
        (a, b) => b.anio - a.anio || String(a.etiqueta).localeCompare(String(b.etiqueta))
      ),
    };
  }, [data.matriculas, data.comunicados]);

  const currentYear = useMemo(() => {
    const withActive = data.matriculas.some((matricula) => matricula.situacionFinal === "EN_CURSO");
    if (withActive) {
      const active = data.matriculas.find((matricula) => matricula.situacionFinal === "EN_CURSO");
      const found = anios.find((anio) => String(anio.id) === String(active.anioId));
      if (found) return found;
    }
    return anios[0] || null;
  }, [anios, data.matriculas]);

  const enriched = useMemo(
    () => ({ ...data, anios, secciones }),
    [data, anios, secciones]
  );

  const unreadNotifications = notifications.filter((item) => !item.leida).slice(0, 4);
  const meta = VIEW_META[view] || VIEW_META.resumen;

  return (
    <div className="admin secretaria">
      {sidebarOpen ? <div className="admin__overlay" onClick={() => setSidebarOpen(false)} /> : null}

      <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__brand">
          <Brand />
          <button
            type="button"
            className="icon-btn sidebar__close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar__badge sidebar__badge--secretaria">
          <UserCheck size={14} /> Panel de secretaría
        </div>

        <nav className="sidebar__nav">
          {NAV.map((group) => (
            <div key={group.label} className="sidebar__group">
              <span className="sidebar__label">{group.label}</span>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = view === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`nav-item ${active ? "nav-item--active" : ""}`}
                    onClick={() => handleNavigate(item.key)}
                  >
                    <span className="nav-item__icon">
                      <Icon size={18} />
                    </span>
                    <span>{item.label}</span>
                    {item.key === "notificaciones" && unread > 0 ? (
                      <span className="nav-item__badge">{unread > 99 ? "99+" : unread}</span>
                    ) : null}
                    {item.key === "tickets" && data.tickets.filter((ticket) => ticket.estado === "PENDIENTE").length ? (
                      <span className="nav-item__badge nav-item__badge--alert">
                        {data.tickets.filter((ticket) => ticket.estado === "PENDIENTE").length}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar__bottom">
          <button type="button" className="sidebar__year" onClick={() => handleNavigate("matriculas")}>
            <span className="sidebar__year-top">
              <small>Año de trabajo</small>
              <ChevronRight size={15} />
            </span>
            {currentYear ? (
              <>
                <strong>{currentYear.nombre}</strong>
                <span className="sidebar__year-state is-open">
                  <i /> {data.matriculas.filter((m) => String(m.anioId) === String(currentYear.id)).length} matrículas
                </span>
              </>
            ) : (
              <strong className="muted">Sin año registrado</strong>
            )}
          </button>

          <div className="sidebar__user">
            <span className="avatar">{initials(session?.nombres, session?.apellidos)}</span>
            <span className="sidebar__user-info">
              <strong>{session ? `${session.nombres} ${session.apellidos}` : "Secretaría"}</strong>
              <small>{roleLabel(session?.rol)}</small>
            </span>
            <button type="button" className="icon-btn icon-btn--light" onClick={handleLogout} title="Cerrar sesión">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <div className="admin__main">
        <header className="topbar">
          <div className="topbar__left">
            <button
              type="button"
              className="icon-btn topbar__menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="topbar__eyebrow">Panel de secretaría</p>
              <h1 className="topbar__title">{meta.title}</h1>
              <p className="topbar__sub">{meta.subtitle}</p>
            </div>
          </div>

          <div className="topbar__actions">
            <span className="topbar__date">
              <CalendarDays size={15} />
              {formatLongDate()}
            </span>

            <div className="topbar__bell" ref={bellRef}>
              <button
                type="button"
                className="icon-btn icon-btn--white"
                onClick={() => setBellOpen((value) => !value)}
                aria-label="Notificaciones"
              >
                <Bell size={19} />
                {unread > 0 ? <span className="icon-btn__dot">{unread > 9 ? "9+" : unread}</span> : null}
              </button>

              {bellOpen ? (
                <div className="notif-panel">
                  <div className="notif-panel__head">
                    <div>
                      <strong>Notificaciones</strong>
                      <small>{unread} sin leer</small>
                    </div>
                    <button type="button" className="link-btn" onClick={markAll}>
                      Marcar todas
                    </button>
                  </div>
                  <div className="notif-panel__list">
                    {unreadNotifications.length ? (
                      unreadNotifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          className="notif-item notif-item--unread"
                          onClick={() => markOne(notification)}
                        >
                          <span className="notif-item__icon">
                            <Bell size={15} />
                          </span>
                          <span className="notif-item__text">
                            <strong>{notification.titulo}</strong>
                            <small>{notification.mensaje}</small>
                            <em>{relativeTime(notification.createdAt)}</em>
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="notif-empty">
                        <CircleCheck size={26} />
                        <p>Estás al día</p>
                        <small>No tienes notificaciones pendientes.</small>
                      </div>
                    )}
                  </div>
                  <button type="button" className="notif-panel__foot" onClick={() => handleNavigate("notificaciones")}>
                    Ver todas las notificaciones
                    <ChevronRight size={15} />
                  </button>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="icon-btn icon-btn--white"
              onClick={() => loadCore({ silent: true })}
              title="Actualizar datos"
              aria-label="Actualizar datos"
            >
              <RefreshCw size={18} className={refreshing ? "spin" : ""} />
            </button>

            <div className="topbar__user">
              <span className="avatar avatar--lg">{initials(session?.nombres, session?.apellidos)}</span>
              <span>
                <strong>{session?.nombres || "Secretaría"}</strong>
                <small>{roleLabel(session?.rol)}</small>
              </span>
            </div>
          </div>
        </header>

        <main className="admin__content">
          {error ? (
            <div className="alert alert--error alert--inline" role="alert">
              <CircleX size={18} />
              <div>
                <p>{error.message}</p>
                {error.detail ? <small>{error.detail}</small> : null}
              </div>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => loadCore({ silent: true })}>
                Reintentar
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="loading-state">
              <span className="spinner spinner--dark" />
              <p>Cargando información del panel…</p>
            </div>
          ) : (
            <>
              {view === "resumen" ? (
                <OverviewView data={enriched} currentYear={currentYear} onNavigate={handleNavigate} />
              ) : null}

              {view === "estudiantes" ? (
                <StudentsView
                  data={enriched}
                  onReload={() => loadCore({ silent: true })}
                  showToast={showToast}
                  onNavigate={handleNavigate}
                />
              ) : null}

              {view === "matriculas" ? (
                <EnrollmentsView
                  data={enriched}
                  onReload={() => loadCore({ silent: true })}
                  showToast={showToast}
                />
              ) : null}

              {view === "familias" ? (
                <FamiliesView
                  data={enriched}
                  onReload={() => loadCore({ silent: true })}
                  showToast={showToast}
                />
              ) : null}

              {view === "tickets" ? (
                <TicketsView
                  data={enriched}
                  onReload={() => loadCore({ silent: true })}
                  showToast={showToast}
                />
              ) : null}

              {view === "comunicados" ? (
                <AnnouncementsView
                  data={enriched}
                  sessionId={session?.id}
                  onReload={() => loadCore({ silent: true })}
                  showToast={showToast}
                />
              ) : null}

              {view === "notificaciones" ? (
                <NotificationsView
                  notifications={notifications}
                  unread={unread}
                  loading={notificationsLoading}
                  onReload={loadNotifications}
                  onMarkOne={markOne}
                  onMarkAll={markAll}
                />
              ) : null}
            </>
          )}
        </main>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
