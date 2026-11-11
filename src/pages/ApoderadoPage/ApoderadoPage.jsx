import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./apoderadoStyles.css";
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
  Ticket,
  Users,
  X,
} from "lucide-react";

import {
  apoderadoService,
  clearSession,
  getApiError,
  getSession,
  notificationService,
} from "../../services/api";
import { connectNotifications } from "../../services/notificationsSocket";
import {
  PARENTESCO_LABELS,
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
import {
  deriveBimestres,
  deriveCursos,
  hijoInitials,
  hijoName,
  isActiveTicket,
  sortTickets,
  sortUnidades,
} from "./apoderadoUtils";
import OverviewView from "./views/OverviewView";
import ChildrenView from "./views/ChildrenView";
import CoursesView from "./views/CoursesView";
import PlanningView from "./views/PlanningView";
import GradesView from "./views/GradesView";
import AttendanceView from "./views/AttendanceView";
import MaterialsView from "./views/MaterialsView";
import BoletaView from "./views/BoletaView";
import TicketsView from "./views/TicketsView";
import AnnouncementsView from "./views/AnnouncementsView";

const NAV = [
  {
    label: "Principal",
    items: [
      { key: "resumen", label: "Resumen", icon: LayoutDashboard },
      { key: "hijos", label: "Representados", icon: Users },
    ],
  },
  {
    label: "Año escolar",
    items: [
      { key: "cursos", label: "Cursos", icon: BookOpen },
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
      { key: "tickets", label: "Justificaciones", icon: Ticket },
      { key: "comunicados", label: "Comunicados", icon: Megaphone },
      { key: "notificaciones", label: "Notificaciones", icon: Bell },
    ],
  },
];

const VIEW_META = {
  resumen: {
    title: "Resumen del representado",
    subtitle: "Cursos, promedio, asistencia y novedades del estudiante seleccionado.",
  },
  hijos: {
    title: "Mis representados",
    subtitle: "Estudiantes vinculados a tu cuenta y su matrícula vigente.",
  },
  cursos: {
    title: "Cursos",
    subtitle: "Materias de la sección, unidades publicadas y materiales disponibles.",
  },
  planificacion: {
    title: "Planificación",
    subtitle: "Unidades publicadas y sus contenidos, organizados por bimestre.",
  },
  calificaciones: {
    title: "Calificaciones",
    subtitle: "Notas por curso, unidad y criterio, con promedios.",
  },
  asistencia: {
    title: "Asistencia",
    subtitle: "Historial de asistencias y porcentaje acumulado del representado.",
  },
  materiales: {
    title: "Materiales",
    subtitle: "Archivos publicados por los docentes para cada curso.",
  },
  boleta: {
    title: "Boleta",
    subtitle: "Resumen anual de notas, asistencia y situación final.",
  },
  tickets: {
    title: "Justificaciones",
    subtitle: "Tickets de inasistencia creados para el representado.",
  },
  comunicados: {
    title: "Comunicados",
    subtitle: "Avisos generales y de las secciones de tus representados.",
  },
  notificaciones: {
    title: "Notificaciones",
    subtitle: "Avisos dirigidos a tu cuenta.",
  },
};

const EMPTY_CHILD_DATA = {
  cursos: [],
  unidadesPorCurso: {},
  materialesPorCurso: {},
  boleta: null,
  calificaciones: null,
  asistencias: null,
  tickets: [],
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
      if (!isNotFound(result.reason)) {
        failures.push(getApiError(result.reason).message);
      }
    }
  });

  return { map, failures };
}

export default function ApoderadoPage() {
  const navigate = useNavigate();
  const [view, setView] = useState("resumen");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [hijos, setHijos] = useState([]);
  const [comunicados, setComunicados] = useState([]);
  const [selectedHijoId, setSelectedHijoId] = useState("");
  const [childData, setChildData] = useState(EMPTY_CHILD_DATA);
  const [shellLoading, setShellLoading] = useState(true);
  const [childLoading, setChildLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [shellError, setShellError] = useState(null);
  const [dataError, setDataError] = useState(null);
  const [childReloadKey, setChildReloadKey] = useState(0);
  const [focusCursoId, setFocusCursoId] = useState("");
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

  const loadShell = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setShellLoading(true);

    try {
      const [hijosResult, comunicadosResult] = await Promise.all([
        settle(apoderadoService.listarHijos()),
        settle(apoderadoService.listarComunicados()),
      ]);

      if (Object.prototype.hasOwnProperty.call(hijosResult, "error")) {
        setShellError(getApiError(hijosResult.error));
        setHijos([]);
        setComunicados([]);
        return;
      }

      const list = Array.isArray(hijosResult.value) ? hijosResult.value : [];
      const comunicadosList = Object.prototype.hasOwnProperty.call(comunicadosResult, "value")
        ? Array.isArray(comunicadosResult.value)
          ? comunicadosResult.value
          : []
        : [];

      setHijos(list);
      setComunicados(comunicadosList);
      setShellError(
        Object.prototype.hasOwnProperty.call(comunicadosResult, "error")
          ? {
              message: getApiError(comunicadosResult.error).message,
              detail: "Los comunicados no se pudieron cargar en este momento.",
            }
          : null
      );
      setSelectedHijoId((prev) => {
        if (prev && list.some((hijo) => String(hijo.estudianteId) === String(prev))) return prev;
        return list[0] ? String(list[0].estudianteId) : "";
      });
    } catch (requestError) {
      setShellError(getApiError(requestError));
    } finally {
      setShellLoading(false);
      setRefreshing(false);
    }
  }, []);

  const selectedHijo = useMemo(
    () => hijos.find((hijo) => String(hijo.estudianteId) === String(selectedHijoId)) || null,
    [hijos, selectedHijoId]
  );

  useEffect(() => {
    if (!selectedHijo) {
      setChildData(EMPTY_CHILD_DATA);
      setDataError(null);
      setChildLoading(false);
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      setChildLoading(true);
      setDataError(null);
      const failures = [];

      try {
        const [calResult, asiResult, bolResult, tickResult] = await Promise.all([
          settle(apoderadoService.calificaciones(selectedHijo.estudianteId)),
          settle(apoderadoService.asistencias(selectedHijo.estudianteId)),
          settle(apoderadoService.boleta(selectedHijo.estudianteId)),
          settle(apoderadoService.listarTickets(selectedHijo.estudianteId)),
        ]);

        if (cancelled) return;

        const read = (result) => {
          if (Object.prototype.hasOwnProperty.call(result, "value")) return result.value;
          if (isNotFound(result.error)) return null;
          failures.push(getApiError(result.error).message);
          return null;
        };

        const calificaciones = read(calResult);
        const asistencias = read(asiResult);
        const boleta = read(bolResult);
        const ticketsRaw = read(tickResult);
        const tickets = Array.isArray(ticketsRaw) ? sortTickets(ticketsRaw) : [];
        const cursos = deriveCursos({ hijo: selectedHijo, boleta, calificaciones, asistencias });

        const [unidadesResults, materialesResults] = await Promise.all([
          Promise.allSettled(
            cursos.map((curso) => apoderadoService.listarUnidades(selectedHijo.estudianteId, curso.id))
          ),
          Promise.allSettled(
            cursos.map((curso) => apoderadoService.listarMateriales(selectedHijo.estudianteId, curso.id))
          ),
        ]);

        if (cancelled) return;

        const unidades = unwrapByCourse(unidadesResults, cursos);
        const materiales = unwrapByCourse(materialesResults, cursos);
        failures.push(...unidades.failures, ...materiales.failures);

        setChildData({
          cursos,
          unidadesPorCurso: unidades.map,
          materialesPorCurso: materiales.map,
          boleta,
          calificaciones,
          asistencias,
          tickets,
        });
        setFocusCursoId((prev) => {
          if (prev && cursos.some((curso) => String(curso.id) === String(prev))) return prev;
          return cursos[0] ? String(cursos[0].id) : "";
        });
        setDataError(
          failures.length
            ? {
                message: failures[0],
                detail:
                  failures.length > 1
                    ? `${failures.length} consultas fallaron. Algunos datos pueden estar incompletos.`
                    : "Algunos datos del representado pueden estar incompletos.",
              }
            : null
        );
      } catch (requestError) {
        if (!cancelled) {
          setChildData(EMPTY_CHILD_DATA);
          setDataError(getApiError(requestError));
        }
      } finally {
        if (!cancelled) setChildLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedHijo, childReloadKey]);

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
    loadShell();
    loadNotifications();
  }, [loadShell, loadNotifications]);

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

  const handleSelectChild = (id, nextView = null) => {
    const target = String(id);
    if (target !== String(selectedHijoId)) {
      setChildLoading(true);
      setFocusCursoId("");
    }
    setSelectedHijoId(target);
    setSidebarOpen(false);
    if (nextView) setView(nextView);
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

  const reloadChild = () => setChildReloadKey((value) => value + 1);

  const handleRefresh = () => {
    loadShell({ silent: true });
    reloadChild();
    loadNotifications();
  };

  const bimestres = useMemo(
    () =>
      deriveBimestres({
        boleta: childData.boleta,
        calificaciones: childData.calificaciones,
        unidadesPorCurso: childData.unidadesPorCurso,
      }),
    [childData.boleta, childData.calificaciones, childData.unidadesPorCurso]
  );

  const publicadas = useMemo(
    () => Object.values(childData.unidadesPorCurso).flatMap((unidades) => sortUnidades(unidades)),
    [childData.unidadesPorCurso]
  );

  const anioNombre =
    selectedHijo?.anioNombre ||
    childData.boleta?.anioNombre ||
    childData.cursos[0]?.anioNombre ||
    "Año escolar";
  const seccionEtiqueta =
    selectedHijo?.seccionEtiqueta || childData.boleta?.seccionEtiqueta || "";
  const situacion = selectedHijo?.situacionFinal || childData.boleta?.situacionFinal || null;
  const sinMatricula = Boolean(selectedHijo) && !seccionEtiqueta && childData.cursos.length === 0;
  const unreadNotifications = notifications.filter((item) => !item.leida).slice(0, 4);
  const activeTickets = childData.tickets.filter(isActiveTicket).length;
  const meta = VIEW_META[view] || VIEW_META.resumen;

  return (
    <div className="admin apoderado">
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

        <div className="sidebar__badge sidebar__badge--apoderado">
          <Users size={14} /> Panel apoderado
        </div>

        <div className="apoderado-child-picker">
          <div className="apoderado-child-picker__head">
            <Users size={13} /> Representado
          </div>
          {hijos.length ? (
            <select
              className="apoderado-child-picker__select"
              value={selectedHijoId}
              onChange={(event) => handleSelectChild(event.target.value)}
              aria-label="Seleccionar representado"
            >
              {hijos.map((hijo) => (
                <option key={hijo.estudianteId} value={hijo.estudianteId}>
                  {hijoName(hijo)}
                  {hijo.seccionEtiqueta ? ` · ${hijo.seccionEtiqueta}` : ""}
                </option>
              ))}
            </select>
          ) : (
            <span className="apoderado-child-picker__empty">Sin representados</span>
          )}
          {selectedHijo ? (
            <div className="apoderado-child-picker__meta">
              <span>
                {PARENTESCO_LABELS[selectedHijo.parentesco] ||
                  estadoLabel(selectedHijo.parentesco) ||
                  "Apoderado"}
              </span>
              {selectedHijo.responsablePrincipal ? (
                <span className="apoderado-child-picker__flag">Principal</span>
              ) : null}
            </div>
          ) : null}
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
                    {item.key === "tickets" && activeTickets > 0 ? (
                      <span className="nav-item__badge">{activeTickets}</span>
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
              {seccionEtiqueta ? `Sección ${seccionEtiqueta}` : "Sin sección"} ·{" "}
              {childData.cursos.length} curso(s)
            </span>
          </button>

          <div className="sidebar__user">
            <span className="avatar">{initials(session?.nombres, session?.apellidos)}</span>
            <span className="sidebar__user-info">
              <strong>{session ? `${session.nombres} ${session.apellidos}` : "Apoderado"}</strong>
              <small>{roleLabel(session?.rol)}</small>
            </span>
            <button
              type="button"
              className="icon-btn icon-btn--light"
              onClick={handleLogout}
              title="Cerrar sesión"
            >
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
              <p className="topbar__eyebrow">Panel apoderado</p>
              <h1 className="topbar__title">{meta.title}</h1>
              <p className="topbar__sub">{meta.subtitle}</p>
            </div>
          </div>

          <div className="topbar__actions">
            {selectedHijo ? (
              <button
                type="button"
                className="topbar__child"
                onClick={() => handleNavigate("hijos")}
                title="Ver o cambiar representado"
              >
                <span className="avatar avatar--sm">{hijoInitials(selectedHijo)}</span>
                <span>
                  <strong>{hijoName(selectedHijo)}</strong>
                  <small>{seccionEtiqueta ? `Sección ${seccionEtiqueta}` : "Sin matrícula"}</small>
                </span>
              </button>
            ) : null}

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
                  <button
                    type="button"
                    className="notif-panel__foot"
                    onClick={() => handleNavigate("notificaciones")}
                  >
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
                <strong>{session?.nombres || "Apoderado"}</strong>
                <small>{roleLabel(session?.rol)}</small>
              </span>
            </div>
          </div>
        </header>

        <main className="admin__content">
          {shellError ? (
            <div className="alert alert--error alert--inline" role="alert">
              <CircleX size={18} />
              <div>
                <p>{shellError.message}</p>
                {shellError.detail ? <small>{shellError.detail}</small> : null}
              </div>
              <button type="button" className="btn btn--ghost btn--sm" onClick={handleRefresh}>
                Reintentar
              </button>
            </div>
          ) : null}

          {dataError ? (
            <div className="alert alert--error alert--inline" role="alert">
              <CircleX size={18} />
              <div>
                <p>{dataError.message}</p>
                {dataError.detail ? <small>{dataError.detail}</small> : null}
              </div>
              <button type="button" className="btn btn--ghost btn--sm" onClick={reloadChild}>
                Reintentar
              </button>
            </div>
          ) : null}

          {shellLoading ? (
            <div className="loading-state">
              <span className="spinner spinner--dark" />
              <p>Cargando tus representados…</p>
            </div>
          ) : !hijos.length ? (
            <section className="card">
              <div className="empty empty--tall">
                <span className="empty__icon">
                  <Users size={26} />
                </span>
                <p className="empty__title">Sin representados vinculados</p>
                <p className="empty__text">
                  Tu cuenta no tiene estudiantes activos vinculados. Cuando Secretaría registre el vínculo
                  familiar, aparecerán aquí con su información académica.
                </p>
                <button type="button" className="btn btn--soft btn--sm" onClick={handleRefresh}>
                  <RefreshCw size={15} /> Volver a consultar
                </button>
              </div>
            </section>
          ) : (
            <>
              {sinMatricula ? (
                <div className="info-strip info-strip--soft apoderado-no-matricula">
                  <GraduationCap size={18} />
                  <div>
                    <strong>Representado sin matrícula vigente</strong>
                    <p>
                      {hijoName(selectedHijo)} no tiene una matrícula en el año escolar abierto. Cuando
                      Secretaría lo inscriba en una sección, verás aquí sus cursos, notas y asistencia.
                    </p>
                  </div>
                </div>
              ) : null}

              {childLoading ? (
                <div className="loading-state">
                  <span className="spinner spinner--dark" />
                  <p>Cargando información del representado…</p>
                </div>
              ) : (
                <>
                  {view === "resumen" ? (
                    <OverviewView
                      hijo={selectedHijo}
                      session={session}
                      data={childData}
                      bimestres={bimestres}
                      tickets={childData.tickets}
                      comunicados={comunicados}
                      onNavigate={handleNavigate}
                    />
                  ) : null}

                  {view === "hijos" ? (
                    <ChildrenView
                      hijos={hijos}
                      selectedHijoId={selectedHijoId}
                      onSelect={handleSelectChild}
                      onNavigate={handleNavigate}
                    />
                  ) : null}

                  {view === "cursos" ? (
                    <CoursesView
                      hijo={selectedHijo}
                      cursos={childData.cursos}
                      unidadesPorCurso={childData.unidadesPorCurso}
                      materialesPorCurso={childData.materialesPorCurso}
                      calificaciones={childData.calificaciones}
                      onNavigate={handleNavigate}
                    />
                  ) : null}

                  {view === "planificacion" ? (
                    <PlanningView
                      hijo={selectedHijo}
                      cursos={childData.cursos}
                      unidadesPorCurso={childData.unidadesPorCurso}
                      bimestres={bimestres}
                      initialCursoId={focusCursoId}
                    />
                  ) : null}

                  {view === "calificaciones" ? (
                    <GradesView
                      hijo={selectedHijo}
                      cursos={childData.cursos}
                      bimestres={bimestres}
                      initialData={childData.calificaciones}
                    />
                  ) : null}

                  {view === "asistencia" ? (
                    <AttendanceView
                      hijo={selectedHijo}
                      bimestres={bimestres}
                      initialData={childData.asistencias}
                    />
                  ) : null}

                  {view === "materiales" ? (
                    <MaterialsView
                      hijo={selectedHijo}
                      cursos={childData.cursos}
                      materialesPorCurso={childData.materialesPorCurso}
                      initialCursoId={focusCursoId}
                      onReload={reloadChild}
                      showToast={showToast}
                    />
                  ) : null}

                  {view === "boleta" ? (
                    <BoletaView boleta={childData.boleta} hijo={selectedHijo} />
                  ) : null}

                  {view === "tickets" ? (
                    <TicketsView
                      hijo={selectedHijo}
                      tickets={childData.tickets}
                      asistencias={childData.asistencias}
                      canCreate={Boolean(seccionEtiqueta)}
                      onReload={reloadChild}
                      showToast={showToast}
                    />
                  ) : null}

                  {view === "comunicados" ? (
                    <AnnouncementsView comunicados={comunicados} hijos={hijos} />
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
            </>
          )}
        </main>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
