import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./estudianteStyles.css";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  GraduationCap,
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
  estudianteService,
  getApiError,
  getSession,
  notificationService,
} from "../../services/api";
import { connectNotifications } from "../../services/notificationsSocket";
import {
  SITUACION_CLASS,
  estadoLabel,
  formatLongDate,
  initials,
  relativeTime,
  roleLabel,
} from "../../utils/format";
import Brand from "../../components/ui/Brand";
import Toast from "../../components/ui/Toast";
import NotificationsView from "../../components/panel/NotificationsView";
import { deriveBimestres, sortUnidades } from "./estudianteUtils";
import OverviewView from "./views/OverviewView";
import CoursesView from "./views/CoursesView";
import PlanningView from "./views/PlanningView";
import GradesView from "./views/GradesView";
import AttendanceView from "./views/AttendanceView";
import MaterialsView from "./views/MaterialsView";
import AnnouncementsView from "./views/AnnouncementsView";
import BoletaView from "./views/BoletaView";

const NAV = [
  {
    label: "Principal",
    items: [{ key: "resumen", label: "Resumen", icon: LayoutDashboard }],
  },
  {
    label: "Mi año escolar",
    items: [
      { key: "cursos", label: "Mis cursos", icon: BookOpen },
      { key: "planificacion", label: "Planificación", icon: ClipboardList },
      { key: "calificaciones", label: "Calificaciones", icon: NotebookPen },
      { key: "asistencia", label: "Asistencia", icon: ClipboardCheck },
      { key: "materiales", label: "Materiales", icon: FolderOpen },
      { key: "boleta", label: "Boleta", icon: FileText },
    ],
  },
  {
    label: "Comunicación",
    items: [
      { key: "comunicados", label: "Comunicados", icon: Megaphone },
      { key: "notificaciones", label: "Notificaciones", icon: Bell },
    ],
  },
];

const VIEW_META = {
  resumen: {
    title: "Mi resumen",
    subtitle: "Tus cursos, promedio, asistencia y novedades en un solo lugar.",
  },
  cursos: {
    title: "Mis cursos",
    subtitle: "Materias y docentes de tu sección en el año escolar.",
  },
  planificacion: {
    title: "Planificación",
    subtitle: "Unidades publicadas y sus contenidos, organizados por bimestre.",
  },
  calificaciones: {
    title: "Calificaciones",
    subtitle: "Tus notas por curso, unidad y criterio, con promedios.",
  },
  asistencia: {
    title: "Asistencia",
    subtitle: "Historial de asistencias y porcentaje acumulado.",
  },
  materiales: {
    title: "Materiales",
    subtitle: "Archivos publicados por tus docentes para cada curso.",
  },
  boleta: {
    title: "Mi boleta",
    subtitle: "Resumen anual de notas, asistencia y situación final.",
  },
  comunicados: {
    title: "Comunicados",
    subtitle: "Avisos generales de la institución y de tu sección.",
  },
  notificaciones: {
    title: "Notificaciones",
    subtitle: "Avisos dirigidos a tu cuenta.",
  },
};

const EMPTY_DATA = {
  matricula: null,
  cursos: [],
  unidadesPorCurso: {},
  materialesPorCurso: {},
  boleta: null,
  comunicados: [],
  calificaciones: null,
  asistencias: null,
};

function settle(promise) {
  return promise.then(
    (value) => ({ value }),
    (error) => ({ error })
  );
}

function isNotFound(error) {
  return error?.response?.status === 404;
}

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

export default function EstudiantePage() {
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
      const [
        matriculaResult,
        cursosResult,
        boletaResult,
        comunicadosResult,
        calificacionesResult,
        asistenciasResult,
      ] = await Promise.all([
        settle(estudianteService.miMatricula()),
        settle(estudianteService.listarCursos()),
        settle(estudianteService.miBoleta()),
        settle(estudianteService.listarComunicados()),
        settle(estudianteService.misCalificaciones()),
        settle(estudianteService.misAsistencias()),
      ]);

      const failures = [];
      const read = (result, { optional = false } = {}) => {
        if (Object.prototype.hasOwnProperty.call(result, "value")) return result.value;
        if (optional && isNotFound(result.error)) return null;
        failures.push(getApiError(result.error).message);
        return null;
      };

      const matricula = read(matriculaResult, { optional: true });
      const cursosRaw = read(cursosResult);
      const boleta = read(boletaResult, { optional: true });
      const comunicadosRaw = read(comunicadosResult, { optional: true });
      const calificaciones = read(calificacionesResult, { optional: true });
      const asistencias = read(asistenciasResult, { optional: true });

      const cursos = Array.isArray(cursosRaw) ? cursosRaw : [];
      const comunicados = Array.isArray(comunicadosRaw) ? comunicadosRaw : [];

      const [unidadesResults, materialesResults] = await Promise.all([
        Promise.allSettled(cursos.map((curso) => estudianteService.listarUnidades(curso.id))),
        Promise.allSettled(cursos.map((curso) => estudianteService.listarMateriales(curso.id))),
      ]);

      const unidades = unwrapByCourse(unidadesResults, cursos);
      const materiales = unwrapByCourse(materialesResults, cursos);
      failures.push(...unidades.failures, ...materiales.failures);

      setData({
        matricula,
        cursos,
        unidadesPorCurso: unidades.map,
        materialesPorCurso: materiales.map,
        boleta,
        comunicados,
        calificaciones,
        asistencias,
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
                  ? `${failures.length} consultas fallaron. Algunos datos pueden estar incompletos.`
                  : "Algunos datos de tu panel pueden estar incompletos.",
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

  const handleRefresh = () => {
    loadCore({ silent: true });
    loadNotifications();
  };

  const bimestres = useMemo(
    () =>
      deriveBimestres({
        boleta: data.boleta,
        calificaciones: data.calificaciones,
        unidadesPorCurso: data.unidadesPorCurso,
      }),
    [data.boleta, data.calificaciones, data.unidadesPorCurso]
  );

  const publicadas = useMemo(
    () => Object.values(data.unidadesPorCurso).flatMap((unidades) => sortUnidades(unidades)),
    [data.unidadesPorCurso]
  );

  const anioNombre =
    data.matricula?.anioNombre ||
    data.boleta?.anioNombre ||
    data.cursos[0]?.anioNombre ||
    "Año escolar";
  const seccionEtiqueta =
    data.matricula?.seccionEtiqueta || data.cursos[0]?.seccionEtiqueta || "";
  const situacion = data.matricula?.situacionFinal || data.boleta?.situacionFinal || null;
  const sinMatricula = !loading && !data.matricula && data.cursos.length === 0;
  const unreadNotifications = notifications.filter((item) => !item.leida).slice(0, 4);
  const meta = VIEW_META[view] || VIEW_META.resumen;

  return (
    <div className="admin estudiante">
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

        <div className="sidebar__badge sidebar__badge--estudiante">
          <GraduationCap size={14} /> Panel estudiante
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
                    {item.key === "planificacion" && publicadas.length > 0 ? (
                      <span className="nav-item__badge">{publicadas.length}</span>
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
          <button type="button" className="sidebar__year" onClick={() => handleNavigate("boleta")}>
            <span className="sidebar__year-top">
              <small>Año escolar</small>
              <ChevronRight size={15} />
            </span>
            <strong>{anioNombre}</strong>
            <span className={`sidebar__year-state ${situacion === "EN_CURSO" ? "is-open" : ""}`}>
              <i />
              {seccionEtiqueta ? `Sección ${seccionEtiqueta}` : "Sin sección"} · {data.cursos.length} curso(s)
            </span>
          </button>

          <div className="sidebar__user">
            <span className="avatar">{initials(session?.nombres, session?.apellidos)}</span>
            <span className="sidebar__user-info">
              <strong>{session ? `${session.nombres} ${session.apellidos}` : "Estudiante"}</strong>
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
              <p className="topbar__eyebrow">Panel estudiante</p>
              <h1 className="topbar__title">{meta.title}</h1>
              <p className="topbar__sub">{meta.subtitle}</p>
            </div>
          </div>

          <div className="topbar__actions">
            {situacion ? (
              <span className={`badge ${SITUACION_CLASS[situacion] || "badge--neutral"}`}>
                {estadoLabel(situacion)}
              </span>
            ) : null}

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
              onClick={handleRefresh}
              title="Actualizar datos"
              aria-label="Actualizar datos"
            >
              <RefreshCw size={18} className={refreshing ? "spin" : ""} />
            </button>

            <div className="topbar__user">
              <span className="avatar avatar--lg">{initials(session?.nombres, session?.apellidos)}</span>
              <span>
                <strong>{session?.nombres || "Estudiante"}</strong>
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
              <button type="button" className="btn btn--ghost btn--sm" onClick={handleRefresh}>
                Reintentar
              </button>
            </div>
          ) : null}

          {sinMatricula ? (
            <div className="info-strip info-strip--soft estudiante-no-matricula">
              <GraduationCap size={18} />
              <div>
                <strong>Sin matrícula vigente</strong>
                <p>
                  Tu cuenta no tiene una matrícula en el año escolar abierto. Cuando Secretaría te inscriba en una
                  sección, verás aquí tus cursos, notas y asistencia.
                </p>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="loading-state">
              <span className="spinner spinner--dark" />
              <p>Cargando tu año escolar…</p>
            </div>
          ) : (
            <>
              {view === "resumen" ? (
                <OverviewView
                  data={data}
                  bimestres={bimestres}
                  onNavigate={handleNavigate}
                />
              ) : null}

              {view === "cursos" ? (
                <CoursesView
                  cursos={data.cursos}
                  unidadesPorCurso={data.unidadesPorCurso}
                  materialesPorCurso={data.materialesPorCurso}
                  calificaciones={data.calificaciones}
                  onNavigate={handleNavigate}
                />
              ) : null}

              {view === "planificacion" ? (
                <PlanningView
                  cursos={data.cursos}
                  unidadesPorCurso={data.unidadesPorCurso}
                  bimestres={bimestres}
                  initialCursoId={focusCursoId}
                />
              ) : null}

              {view === "calificaciones" ? (
                <GradesView
                  cursos={data.cursos}
                  bimestres={bimestres}
                  initialData={data.calificaciones}
                />
              ) : null}

              {view === "asistencia" ? (
                <AttendanceView
                  bimestres={bimestres}
                  initialData={data.asistencias}
                />
              ) : null}

              {view === "materiales" ? (
                <MaterialsView
                  cursos={data.cursos}
                  materialesPorCurso={data.materialesPorCurso}
                  initialCursoId={focusCursoId}
                  onReload={() => loadCore({ silent: true })}
                  showToast={showToast}
                />
              ) : null}

              {view === "boleta" ? (
                <BoletaView boleta={data.boleta} matricula={data.matricula} />
              ) : null}

              {view === "comunicados" ? (
                <AnnouncementsView comunicados={data.comunicados} />
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
