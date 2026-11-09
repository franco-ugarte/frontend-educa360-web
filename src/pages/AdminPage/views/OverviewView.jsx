import {
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  GraduationCap,
  Layers,
  LibraryBig,
  Megaphone,
  School,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import {
  ESTADO_CLASS,
  ROLE_CLASS,
  ROLE_SHORT,
  estadoLabel,
  formatDate,
  initials,
  percent,
  relativeTime,
  fullName,
} from "../../../utils/format";

const STATS = [
  { key: "usuarios", label: "Cuentas activas", icon: Users, tone: "primary" },
  { key: "docentes", label: "Docentes", icon: GraduationCap, tone: "secondary" },
  { key: "estudiantes", label: "Estudiantes", icon: School, tone: "info" },
  { key: "secciones", label: "Secciones", icon: Layers, tone: "success" },
  { key: "cursos", label: "Cursos", icon: BookOpen, tone: "accent" },
  { key: "materias", label: "Materias activas", icon: LibraryBig, tone: "neutral" },
];

export default function OverviewView({
  data,
  currentYear,
  notifications,
  unread,
  onNavigate,
}) {
  const usuarios = data.usuarios || [];
  const roles = ["ADMIN", "SECRETARIA", "DOCENTE", "ESTUDIANTE", "APODERADO"];

  const values = {
    usuarios: usuarios.filter((user) => user.activo).length,
    docentes: data.docentes.length,
    estudiantes: data.estudiantes.length,
    secciones: data.secciones.length,
    cursos: data.cursos.length,
    materias: data.materias.filter((materia) => materia.activa).length,
  };

  const roleCounts = roles.map((role) => ({
    role,
    count: usuarios.filter((user) => user.rol === role).length,
  }));
  const totalUsers = usuarios.length || 1;

  const recentUsers = [...usuarios]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);

  const recentNotifications = notifications.slice(0, 4);
  const bimestres = data.bimestres || [];
  const bimestresAbiertos = bimestres.filter((bimestre) => bimestre.estado === "ABIERTO").length;

  const quickActions = [
    { label: "Nuevo usuario", text: "Crea cuentas de personal", icon: UserPlus, view: "usuarios", tone: "primary" },
    { label: "Año escolar", text: "Gestiona años y bimestres", icon: CalendarDays, view: "academico", tone: "secondary" },
    { label: "Sección", text: "Organiza los grupos", icon: School, view: "secciones", tone: "success" },
    { label: "Comunicado", text: "Informa a la comunidad", icon: Megaphone, view: "comunicados", tone: "accent" },
  ];

  return (
    <div className="page">
      <section className="hero-card">
        <div className="hero-card__glow" />
        <div className="hero-card__content">
          <span className="eyebrow eyebrow--light">
            <Sparkles size={14} /> Colegio Nuestra Señora de Monserrat
          </span>
          <h2>
            {currentYear
              ? `Año escolar ${currentYear.anio}`
              : "Configura el primer año escolar"}
          </h2>
          <p>
            {currentYear
              ? "Gestiona la estructura académica, las cuentas de la comunidad y la comunicación institucional desde un solo panel."
              : "Crea un año escolar, define sus bimestres y comienza a construir la estructura académica."}
          </p>
          <div className="hero-card__actions">
            <button type="button" className="btn btn--accent" onClick={() => onNavigate("comunicados")}>
              <Megaphone size={17} /> Publicar comunicado
            </button>
            <button type="button" className="btn btn--glass" onClick={() => onNavigate("usuarios")}>
              <UserPlus size={17} /> Crear usuario
            </button>
          </div>
        </div>

        <div className="hero-card__panel">
          <span className="hero-card__panel-label">
            <CalendarDays size={15} /> Estado del año
          </span>
          {currentYear ? (
            <>
              <strong>{currentYear.nombre}</strong>
              <span className={`badge ${ESTADO_CLASS[currentYear.estado] || "badge--neutral"}`}>
                {estadoLabel(currentYear.estado)}
              </span>
              <div className="hero-card__panel-grid">
                <div>
                  <small>Inicio de clases</small>
                  <b>{formatDate(currentYear.fechaInicio)}</b>
                </div>
                <div>
                  <small>Bimestres</small>
                  <b>{bimestres.length}</b>
                </div>
                <div>
                  <small>Secciones</small>
                  <b>{data.secciones.filter((seccion) => seccion.anioId === currentYear.id).length}</b>
                </div>
                <div>
                  <small>Bimestre abierto</small>
                  <b>{bimestresAbiertos ? "Sí" : "No"}</b>
                </div>
              </div>
            </>
          ) : (
            <>
              <strong>Sin año escolar</strong>
              <p className="hero-card__panel-empty">
                Aún no existe un año registrado. Crea el primero para habilitar secciones y cursos.
              </p>
              <button type="button" className="btn btn--accent btn--sm" onClick={() => onNavigate("academico")}>
                Crear año <ArrowUpRight size={15} />
              </button>
            </>
          )}
        </div>
      </section>

      <section className="grid grid--stats">
        {STATS.map(({ key, label, icon: Icon, tone }) => (
          <article key={key} className="stat-card">
            <span className={`stat-card__icon stat-card__icon--${tone}`}>
              <Icon size={20} />
            </span>
            <div>
              <strong className="stat-card__value">{values[key]}</strong>
              <span className="stat-card__label">{label}</span>
            </div>
            <span className="stat-card__hint">
              {key === "usuarios" ? `${usuarios.length} registradas` : "Datos reales"}
            </span>
          </article>
        ))}
      </section>

      <div className="overview-grid">
        <div className="overview-main">
          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Calendario académico</h3>
                <p className="card__sub">Bimestres del año seleccionado y su estado actual.</p>
              </div>
              <button type="button" className="link-btn" onClick={() => onNavigate("academico")}>
                Gestionar <ChevronRight size={14} />
              </button>
            </div>
            <div className="card__body">
              {bimestres.length ? (
                <div className="timeline">
                  {bimestres
                    .slice()
                    .sort((a, b) => a.numero - b.numero)
                    .map((bimestre) => (
                      <div key={bimestre.id} className="timeline__item">
                        <span className={`timeline__dot timeline__dot--${bimestre.estado?.toLowerCase()}`} />
                        <div className="timeline__content">
                          <strong>{bimestre.nombre}</strong>
                          <small>
                            {formatDate(bimestre.fechaInicio)} — {formatDate(bimestre.fechaFin)}
                          </small>
                        </div>
                        <span className={`badge ${ESTADO_CLASS[bimestre.estado] || "badge--neutral"}`}>
                          {estadoLabel(bimestre.estado)}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="empty">
                  <span className="empty__icon">
                    <CalendarDays size={22} />
                  </span>
                  <p className="empty__title">Sin bimestres registrados</p>
                  <p className="empty__text">Crea el año escolar y sus cuatro bimestres para comenzar.</p>
                  <button type="button" className="btn btn--soft btn--sm" onClick={() => onNavigate("academico")}>
                    Configurar calendario
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Usuarios recientes</h3>
                <p className="card__sub">Últimas cuentas creadas en el sistema.</p>
              </div>
              <button type="button" className="link-btn" onClick={() => onNavigate("usuarios")}>
                Ver todos <ChevronRight size={14} />
              </button>
            </div>
            <div className="card__body card__body--flush">
              {recentUsers.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>Creado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentUsers.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="table__user">
                              <span className="avatar avatar--sm">{initials(user.nombres, user.apellidos)}</span>
                              <span>
                                <strong>{fullName(user)}</strong>
                                <small>{user.email}</small>
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${ROLE_CLASS[user.rol] || "badge--neutral"}`}>
                              {ROLE_SHORT[user.rol] || user.rol}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${user.activo ? "badge--success" : "badge--danger"}`}>
                              {user.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="muted">{relativeTime(user.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">
                  <span className="empty__icon">
                    <Users size={22} />
                  </span>
                  <p className="empty__title">Sin usuarios</p>
                  <p className="empty__text">Crea la primera cuenta desde la sección Usuarios.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="overview-side">
          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Comunidad por rol</h3>
                <p className="card__sub">Distribución de cuentas registradas.</p>
              </div>
            </div>
            <div className="card__body">
              <div className="bars">
                {roleCounts.map(({ role, count }) => (
                  <div key={role} className="bar-row">
                    <div className="bar-row__top">
                      <span>{ROLE_SHORT[role] || role}</span>
                      <strong>{count}</strong>
                    </div>
                    <div className="bar">
                      <span
                        className={`bar__fill bar__fill--${role.toLowerCase()}`}
                        style={{ width: `${percent(count, totalUsers)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {!usuarios.length ? <p className="hint">Aún no hay cuentas registradas.</p> : null}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Notificaciones</h3>
                <p className="card__sub">{unread} sin leer.</p>
              </div>
              <button type="button" className="link-btn" onClick={() => onNavigate("notificaciones")}>
                Ver todas
              </button>
            </div>
            <div className="card__body">
              {recentNotifications.length ? (
                <div className="mini-feed">
                  {recentNotifications.map((notification) => (
                    <div key={notification.id} className={`mini-feed__item ${notification.leida ? "" : "is-unread"}`}>
                      <span className="mini-feed__icon">
                        <Bell size={15} />
                      </span>
                      <span>
                        <strong>{notification.titulo}</strong>
                        <small>{notification.mensaje}</small>
                        <em>{relativeTime(notification.createdAt)}</em>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty empty--compact">
                  <span className="empty__icon">
                    <CircleCheck size={20} />
                  </span>
                  <p className="empty__title">Todo al día</p>
                  <p className="empty__text">No hay notificaciones pendientes.</p>
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Accesos rápidos</h3>
                <p className="card__sub">Atajos a las tareas frecuentes.</p>
              </div>
            </div>
            <div className="card__body">
              <div className="quick-grid">
                {quickActions.map(({ label, text, icon: Icon, view, tone }) => (
                  <button key={label} type="button" className="quick-card" onClick={() => onNavigate(view)}>
                    <span className={`quick-card__icon quick-card__icon--${tone}`}>
                      <Icon size={18} />
                    </span>
                    <span>
                      <strong>{label}</strong>
                      <small>{text}</small>
                    </span>
                    <ArrowUpRight size={15} className="quick-card__arrow" />
                  </button>
                ))}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
