import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./adminstyles.css";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  CircleX,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Megaphone,
  Menu,
  RefreshCw,
  School,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import {
  adminService,
  clearSession,
  getApiError,
  getSession,
  notificationService,
} from "../../services/api";
import { connectNotifications } from "../../services/notificationsSocket";
import { formatLongDate, initials, relativeTime, roleLabel } from "../../utils/format";
import Brand from "../../components/ui/Brand";
import Toast from "../../components/ui/Toast";
import OverviewView from "./views/OverviewView";
import UsersView from "./views/UsersView";
import AcademicView from "./views/AcademicView";
import SectionsView from "./views/SectionsView";
import CoursesView from "./views/CoursesView";
import SubjectsView from "./views/SubjectsView";
import AnnouncementsView from "./views/AnnouncementsView";
import NotificationsView from "../../components/panel/NotificationsView";

const NAV = [
  {
    label: "Principal",
    items: [{ key: "resumen", label: "Resumen", icon: LayoutDashboard }],
  },
  {
    label: "Gestión",
    items: [
      { key: "usuarios", label: "Usuarios", icon: Users },
      { key: "academico", label: "Año escolar", icon: CalendarDays },
      { key: "secciones", label: "Secciones", icon: School },
      { key: "cursos", label: "Cursos", icon: GraduationCap },
      { key: "materias", label: "Materias", icon: LibraryBig },
      { key: "comunicados", label: "Comunicados", icon: Megaphone },
    ],
  },
  {
    label: "Sistema",
    items: [{ key: "notificaciones", label: "Notificaciones", icon: Bell }],
  },
];

const VIEW_META = {
  resumen: { title: "Resumen general", subtitle: "Estado del año escolar y de la comunidad educativa." },
  usuarios: { title: "Usuarios", subtitle: "Cuentas, roles, estado de acceso y credenciales." },
  academico: { title: "Año escolar", subtitle: "Años, bimestres y estados del calendario académico." },
  secciones: { title: "Secciones", subtitle: "Grupos de alumnos por grado y año escolar." },
  cursos: { title: "Cursos", subtitle: "Materia, sección y docente asignado." },
  materias: { title: "Materias", subtitle: "Catálogo institucional de lo que se enseña." },
  comunicados: { title: "Comunicados", subtitle: "Mensajes generales o dirigidos a una sección." },
  notificaciones: { title: "Notificaciones", subtitle: "Avisos dirigidos a tu cuenta." },
};

const EMPTY_DATA = {
  usuarios: [],
  docentes: [],
  anios: [],
  secciones: [],
  cursos: [],
  materias: [],
  estudiantes: [],
  bimestres: [],
};

export default function AdminPage() {
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
    const timer = setTimeout(() => setToast(null), 4000);
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
      adminService.listarUsuarios(),
      adminService.listarDocentes(),
      adminService.listarAnios(),
      adminService.listarSecciones(),
      adminService.listarCursos(),
      adminService.listarMaterias(),
      adminService.listarEstudiantes(),
    ]);

    const keys = ["usuarios", "docentes", "anios", "secciones", "cursos", "materias", "estudiantes"];
    const next = { ...EMPTY_DATA, bimestres: data.bimestres };
    const failures = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        next[keys[index]] = result.value || [];
      } else {
        failures.push(getApiError(result.reason).message);
      }
    });

    const year = [...next.anios].sort((a, b) => (b.anio || 0) - (a.anio || 0)).find((a) => a.estado === "ABIERTO")
      || [...next.anios].sort((a, b) => (b.anio || 0) - (a.anio || 0))[0]
      || null;

    if (year) {
      try {
        next.bimestres = await adminService.listarBimestres(year.id);
      } catch {
        next.bimestres = [];
      }
    }

    setData(next);
    setError(failures.length ? { message: failures[0], detail: failures.length > 1 ? `${failures.length} consultas fallaron.` : null } : null);
    setLoading(false);
    setRefreshing(false);
  }, [data.bimestres]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const currentYear = useMemo(
    () =>
      data.anios.find((anio) => anio.estado === "ABIERTO")
      || [...data.anios].sort((a, b) => (b.anio || 0) - (a.anio || 0))[0]
      || null,
    [data.anios]
  );

  const unreadNotifications = notifications.filter((item) => !item.leida).slice(0, 4);
  const meta = VIEW_META[view] || VIEW_META.resumen;

  return (
    <div className="admin">
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

        <div className="sidebar__badge">
          <ShieldCheck size={14} /> Panel administrador
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
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar__bottom">
          <button type="button" className="sidebar__year" onClick={() => handleNavigate("academico")}>
            <span className="sidebar__year-top">
              <small>Año escolar</small>
              <ChevronRight size={15} />
            </span>
            {currentYear ? (
              <>
                <strong>{currentYear.nombre}</strong>
                <span className={`sidebar__year-state ${currentYear.estado === "ABIERTO" ? "is-open" : ""}`}>
                  <i /> {currentYear.estado}
                </span>
              </>
            ) : (
              <strong className="muted">Sin año registrado</strong>
            )}
          </button>

          <div className="sidebar__user">
            <span className="avatar">{initials(session?.nombres, session?.apellidos)}</span>
            <span className="sidebar__user-info">
              <strong>{session ? `${session.nombres} ${session.apellidos}` : "Administrador"}</strong>
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
              <p className="topbar__eyebrow">Panel administrador</p>
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
                <strong>{session?.nombres || "Administrador"}</strong>
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
                <OverviewView
                  data={data}
                  currentYear={currentYear}
                  notifications={notifications}
                  unread={unread}
                  onNavigate={handleNavigate}
                  onReload={() => loadCore({ silent: true })}
                />
              ) : null}

              {view === "usuarios" ? (
                <UsersView data={data} onReload={() => loadCore({ silent: true })} showToast={showToast} />
              ) : null}

              {view === "academico" ? (
                <AcademicView data={data} onReload={() => loadCore({ silent: true })} showToast={showToast} />
              ) : null}

              {view === "secciones" ? (
                <SectionsView data={data} onReload={() => loadCore({ silent: true })} showToast={showToast} />
              ) : null}

              {view === "cursos" ? (
                <CoursesView data={data} onReload={() => loadCore({ silent: true })} showToast={showToast} />
              ) : null}

              {view === "materias" ? (
                <SubjectsView data={data} onReload={() => loadCore({ silent: true })} showToast={showToast} />
              ) : null}

              {view === "comunicados" ? (
                <AnnouncementsView data={data} onReload={() => loadCore({ silent: true })} showToast={showToast} />
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
