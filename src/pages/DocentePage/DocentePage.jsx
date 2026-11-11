import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./docenteStyles.css";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  NotebookPen,
  RefreshCw,
  X,
} from "lucide-react";

import {
  clearSession,
  docenteService,
  getApiError,
  getSession,
  notificationService,
} from "../../services/api";
import { connectNotifications } from "../../services/notificationsSocket";
import { formatLongDate, initials, relativeTime, roleLabel } from "../../utils/format";
import Brand from "../../components/ui/Brand";
import Toast from "../../components/ui/Toast";
import NotificationsView from "../../components/panel/NotificationsView";
import { deriveBimestres, deriveSecciones } from "./docenteUtils";
import OverviewView from "./views/OverviewView";
import CoursesView from "./views/CoursesView";
import PlanningView from "./views/PlanningView";
import AttendanceView from "./views/AttendanceView";
import GradesView from "./views/GradesView";
import MaterialsView from "./views/MaterialsView";
import AnnouncementsView from "./views/AnnouncementsView";

const NAV = [
  {
    label: "Principal",
    items: [{ key: "resumen", label: "Resumen", icon: LayoutDashboard }],
  },
  {
    label: "Docencia",
    items: [
      { key: "cursos", label: "Mis cursos", icon: BookOpen },
      { key: "planificacion", label: "Planificación", icon: ClipboardList },
      { key: "asistencia", label: "Asistencia", icon: ClipboardCheck },
      { key: "calificaciones", label: "Calificaciones", icon: NotebookPen },
      { key: "materiales", label: "Materiales", icon: FolderOpen },
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
    title: "Resumen docente",
    subtitle: "Tus cursos, horario, planificación y pendientes de un vistazo.",
  },
  cursos: {
    title: "Mis cursos",
    subtitle: "Materias, secciones y horario asignados en el año escolar.",
  },
  planificacion: {
    title: "Planificación",
    subtitle: "Unidades por bimestre, contenidos ordenados y publicación al alumnado.",
  },
  asistencia: {
    title: "Asistencia",
    subtitle: "Hoja de clase por bloque y fecha, con observaciones por alumno.",
  },
  calificaciones: {
    title: "Calificaciones",
    subtitle: "Notas por unidad, criterios y acta consolidada del bimestre.",
  },
  materiales: {
    title: "Materiales",
    subtitle: "Archivos de clase vinculados a contenidos y su publicación.",
  },
  comunicados: {
    title: "Comunicados",
    subtitle: "Mensajes para las secciones donde dictas clase.",
  },
  notificaciones: {
    title: "Notificaciones",
    subtitle: "Avisos dirigidos a tu cuenta.",
  },
};

const EMPTY_DATA = {
  cursos: [],
  unidadesPorCurso: {},
  horariosPorCurso: {},
  materialesPorCurso: {},
};

function unwrapByCourse(results, courseList) {
  const map = {};
  const failures = [];

  results.forEach((result, index) => {
    const curso = courseList[index];
    if (!curso) return;
    if (result.status === "fulfilled") {
      map[curso.id] = Array.isArray(result.value) ? result.value : [];
    } else {
      map[curso.id] = [];
      failures.push(getApiError(result.reason).message);
    }
  });

  return { map, failures };
}

export default function DocentePage() {
  const navigate = useNavigate();
  const [view, setView] = useState("resumen");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [focusCursoId, setFocusCursoId] = useState("");
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

    try {
      const cursosRaw = await docenteService.listarCursos();
      const cursos = Array.isArray(cursosRaw) ? cursosRaw : [];

      const [unidadesResults, horariosResults, materialesResults] = await Promise.all([
        Promise.allSettled(cursos.map((curso) => docenteService.listarUnidades(curso.id))),
        Promise.allSettled(cursos.map((curso) => docenteService.listarHorario(curso.id))),
        Promise.allSettled(cursos.map((curso) => docenteService.listarMateriales(curso.id))),
      ]);

      const unidades = unwrapByCourse(unidadesResults, cursos);
      const horarios = unwrapByCourse(horariosResults, cursos);
      const materiales = unwrapByCourse(materialesResults, cursos);
      const failures = [...unidades.failures, ...horarios.failures, ...materiales.failures];

      setData({
        cursos,
        unidadesPorCurso: unidades.map,
        horariosPorCurso: horarios.map,
        materialesPorCurso: materiales.map,
      });
      setFocusCursoId((prev) => {
        if (prev && cursos.some((curso) => String(curso.id) === String(prev))) return prev;
        return cursos[0] ? String(cursos[0].id) : "";
      });
      setError(
        failures.length
          ? {
              message: failures[0],
              detail:
                failures.length > 1
                  ? `${failures.length} consultas de cursos fallaron. Algunos datos pueden estar incompletos.`
                  : "Algunos datos del curso pueden estar incompletos.",
            }
          : null
      );
    } catch (requestError) {
      setError(getApiError(requestError));
      setData(EMPTY_DATA);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  const handleNavigate = (nextView, cursoId = null) => {
    if (cursoId != null) setFocusCursoId(String(cursoId));
    setView(nextView);
    setSidebarOpen(false);
    setBellOpen(false);
  };

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const bimestres = useMemo(
    () => deriveBimestres(data.cursos, data.unidadesPorCurso),
    [data.cursos, data.unidadesPorCurso]
  );

  const secciones = useMemo(() => deriveSecciones(data.cursos), [data.cursos]);

  const anios = useMemo(() => {
    const map = new Map();
    data.cursos.forEach((curso) => {
      if (curso.anioId == null) return;
      if (!map.has(String(curso.anioId))) {
        map.set(String(curso.anioId), {
          id: curso.anioId,
          nombre: curso.anioNombre,
          secciones: new Set(),
        });
      }
      map.get(String(curso.anioId)).secciones.add(curso.seccionId);
    });
    return [...map.values()]
      .map((anio) => ({ ...anio, secciones: anio.secciones.size }))
      .sort((a, b) => String(b.nombre || "").localeCompare(String(a.nombre || "")));
  }, [data.cursos]);

  const currentYear = anios[0] || null;
  const totalDrafts = Object.values(data.unidadesPorCurso).reduce(
    (total, unidades) => total + unidades.filter((unidad) => unidad.estado === "BORRADOR").length,
    0
  );
  const unreadNotifications = notifications.filter((item) => !item.leida).slice(0, 4);
  const meta = VIEW_META[view] || VIEW_META.resumen;

  return (
    <div className="admin docente">
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

        <div className="sidebar__badge sidebar__badge--docente">
          <BookOpen size={14} /> Panel docente
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
                    {item.key === "planificacion" && totalDrafts > 0 ? (
                      <span className="nav-item__badge nav-item__badge--alert">{totalDrafts}</span>
                    ) : null}
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
          <button type="button" className="sidebar__year" onClick={() => handleNavigate("cursos")}>
            <span className="sidebar__year-top">
              <small>Año de trabajo</small>
              <ChevronRight size={15} />
            </span>
            {currentYear ? (
              <>
                <strong>{currentYear.nombre}</strong>
                <span className="sidebar__year-state is-open">
                  <i /> {data.cursos.length} cursos · {currentYear.secciones} sección(es)
                </span>
              </>
            ) : (
              <strong className="muted">Sin cursos asignados</strong>
            )}
          </button>

          <div className="sidebar__user">
            <span className="avatar">{initials(session?.nombres, session?.apellidos)}</span>
            <span className="sidebar__user-info">
              <strong>{session ? `${session.nombres} ${session.apellidos}` : "Docente"}</strong>
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
              <p className="topbar__eyebrow">Panel docente</p>
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
                <strong>{session?.nombres || "Docente"}</strong>
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
              <p>Cargando tus cursos y planificación…</p>
            </div>
          ) : (
            <>
              {view === "resumen" ? (
                <OverviewView
                  cursos={data.cursos}
                  unidadesPorCurso={data.unidadesPorCurso}
                  horariosPorCurso={data.horariosPorCurso}
                  materialesPorCurso={data.materialesPorCurso}
                  anios={anios}
                  secciones={secciones}
                  onNavigate={handleNavigate}
                />
              ) : null}

              {view === "cursos" ? (
                <CoursesView
                  cursos={data.cursos}
                  unidadesPorCurso={data.unidadesPorCurso}
                  horariosPorCurso={data.horariosPorCurso}
                  materialesPorCurso={data.materialesPorCurso}
                  onNavigate={handleNavigate}
                />
              ) : null}

              {view === "planificacion" ? (
                <PlanningView
                  cursos={data.cursos}
                  unidadesPorCurso={data.unidadesPorCurso}
                  bimestres={bimestres}
                  initialCursoId={focusCursoId}
                  onReload={() => loadCore({ silent: true })}
                  showToast={showToast}
                />
              ) : null}

              {view === "asistencia" ? (
                <AttendanceView
                  cursos={data.cursos}
                  horariosPorCurso={data.horariosPorCurso}
                  unidadesPorCurso={data.unidadesPorCurso}
                  initialCursoId={focusCursoId}
                  showToast={showToast}
                />
              ) : null}

              {view === "calificaciones" ? (
                <GradesView
                  cursos={data.cursos}
                  unidadesPorCurso={data.unidadesPorCurso}
                  bimestres={bimestres}
                  initialCursoId={focusCursoId}
                  onNavigate={handleNavigate}
                  onReload={() => loadCore({ silent: true })}
                  showToast={showToast}
                />
              ) : null}

              {view === "materiales" ? (
                <MaterialsView
                  cursos={data.cursos}
                  unidadesPorCurso={data.unidadesPorCurso}
                  materialesPorCurso={data.materialesPorCurso}
                  initialCursoId={focusCursoId}
                  onReload={() => loadCore({ silent: true })}
                  showToast={showToast}
                />
              ) : null}

              {view === "comunicados" ? (
                <AnnouncementsView
                  cursos={data.cursos}
                  initialCursoId={focusCursoId}
                  sessionId={session?.id}
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
