import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  School,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import {
  ESTUDIANTE_CLASS,
  SITUACION_CLASS,
  TICKET_CLASS,
  estadoLabel,
  formatDate,
  fullName,
  initials,
  percent,
  relativeTime,
} from "../../../utils/format";

export default function OverviewView({ data, currentYear, onNavigate }) {
  const estudiantes = data.estudiantes || [];
  const matriculas = data.matriculas || [];
  const apoderados = data.apoderados || [];
  const tickets = data.tickets || [];
  const secciones = data.secciones || [];

  const activos = estudiantes.filter((estudiante) => estudiante.estado === "ACTIVO");
  const enCurso = matriculas.filter((matricula) => matricula.situacionFinal === "EN_CURSO");
  const pendientes = tickets.filter((ticket) => ticket.estado === "PENDIENTE");
  const resueltos = tickets.filter((ticket) => ticket.estado !== "PENDIENTE");

  const stats = [
    { label: "Estudiantes activos", value: activos.length, icon: GraduationCap, tone: "primary", hint: `${estudiantes.length} en total` },
    { label: "Matrículas en curso", value: enCurso.length, icon: ClipboardList, tone: "secondary", hint: `${matriculas.length} registradas` },
    { label: "Familias", value: apoderados.length, icon: Users, tone: "success", hint: "Apoderados registrados" },
    { label: "Justificaciones pendientes", value: pendientes.length, icon: ClipboardCheck, tone: "accent", hint: `${resueltos.length} resueltas` },
  ];

  const estados = ["ACTIVO", "TRASLADADO", "RETIRADO", "EGRESADO"].map((estado) => ({
    estado,
    count: estudiantes.filter((estudiante) => estudiante.estado === estado).length,
  }));
  const totalEstudiantes = estudiantes.length || 1;

  const recientes = [...matriculas]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);

  const quickActions = [
    { label: "Nuevo estudiante", text: "Registra una cuenta y su ficha", icon: UserPlus, view: "estudiantes", tone: "primary" },
    { label: "Nueva matrícula", text: "Inscribe al alumno en una sección", icon: ClipboardList, view: "matriculas", tone: "secondary" },
    { label: "Registrar familia", text: "Apoderado + estudiante + vínculo", icon: Users, view: "familias", tone: "success" },
    { label: "Resolver tickets", text: "Aprueba o rechaza justificaciones", icon: ClipboardCheck, view: "tickets", tone: "accent" },
  ];

  return (
    <div className="page">
      <section className="hero-card">
        <div className="hero-card__glow" />
        <div className="hero-card__content">
          <span className="eyebrow eyebrow--light">
            <Sparkles size={14} /> Atención a familias y comunidad educativa
          </span>
          <h2>{currentYear ? `Año de trabajo ${currentYear.nombre}` : "Estructura académica pendiente"}</h2>
          <p>
            {currentYear
              ? "Gestiona matrículas, registra familias, consulta expedientes y resuelve las justificaciones de inasistencia desde un solo panel."
              : "Aún no hay secciones con matrículas registradas. Cuando el administrador publique la estructura del año, podrás inscribir alumnos."}
          </p>
          <div className="hero-card__actions">
            <button type="button" className="btn btn--accent" onClick={() => onNavigate("matriculas")}>
              <ClipboardList size={17} /> Nueva matrícula
            </button>
            <button type="button" className="btn btn--glass" onClick={() => onNavigate("familias")}>
              <Users size={17} /> Registrar familia
            </button>
          </div>
        </div>

        <div className="hero-card__panel">
          <span className="hero-card__panel-label">
            <CalendarDays size={15} /> Resumen del año
          </span>
          {currentYear ? (
            <>
              <strong>{currentYear.nombre}</strong>
              <span className="badge badge--success">Año de trabajo</span>
              <div className="hero-card__panel-grid">
                <div>
                  <small>Secciones</small>
                  <b>{secciones.filter((seccion) => String(seccion.anioId) === String(currentYear.id)).length}</b>
                </div>
                <div>
                  <small>Matrículas</small>
                  <b>{matriculas.filter((m) => String(m.anioId) === String(currentYear.id)).length}</b>
                </div>
                <div>
                  <small>En curso</small>
                  <b>{enCurso.filter((m) => String(m.anioId) === String(currentYear.id)).length}</b>
                </div>
                <div>
                  <small>Pendientes</small>
                  <b>{pendientes.length}</b>
                </div>
              </div>
            </>
          ) : (
            <>
              <strong>Sin años visibles</strong>
              <p className="hero-card__panel-empty">
                Solicita al administrador que cree el año escolar y sus secciones. Las secciones aparecen aquí
                cuando tienen al menos una matrícula.
              </p>
              <button type="button" className="btn btn--accent btn--sm" onClick={() => onNavigate("estudiantes")}>
                Registrar estudiantes <ArrowUpRight size={15} />
              </button>
            </>
          )}
        </div>
      </section>

      <section className="grid grid--stats">
        {stats.map(({ label, value, icon: Icon, tone, hint }) => (
          <article key={label} className="stat-card">
            <span className={`stat-card__icon stat-card__icon--${tone}`}>
              <Icon size={20} />
            </span>
            <div>
              <strong className="stat-card__value">{value}</strong>
              <span className="stat-card__label">{label}</span>
            </div>
            <span className="stat-card__hint">{hint}</span>
          </article>
        ))}
      </section>

      <div className="overview-grid">
        <div className="overview-main">
          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Justificaciones pendientes</h3>
                <p className="card__sub">Tickets que esperan la revisión de secretaría.</p>
              </div>
              <button type="button" className="link-btn" onClick={() => onNavigate("tickets")}>
                Ver bandeja <ChevronRight size={14} />
              </button>
            </div>
            <div className="card__body card__body--flush">
              {pendientes.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Estudiante</th>
                        <th>Fecha de falta</th>
                        <th>Motivo</th>
                        <th>Recibido</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendientes.slice(0, 5).map((ticket) => (
                        <tr key={ticket.id}>
                          <td>
                            <div className="table__user">
                              <span className="avatar avatar--sm">
                                {initials(
                                  ticket.estudianteNombre?.split(" ")[0],
                                  ticket.estudianteNombre?.split(" ").slice(1).join(" ")
                                )}
                              </span>
                              <span>
                                <strong>{ticket.estudianteNombre}</strong>
                                <small>DNI {ticket.estudianteDni}</small>
                              </span>
                            </div>
                          </td>
                          <td>{formatDate(ticket.fechaInasistencia)}</td>
                          <td className="secretaria-cell-clamp">{ticket.motivo}</td>
                          <td className="muted">{relativeTime(ticket.createdAt)}</td>
                          <td>
                            <span className={`badge ${TICKET_CLASS[ticket.estado] || "badge--neutral"}`}>
                              {estadoLabel(ticket.estado)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty empty--compact">
                  <span className="empty__icon">
                    <ClipboardCheck size={22} />
                  </span>
                  <p className="empty__title">Sin tickets pendientes</p>
                  <p className="empty__text">Todas las justificaciones recibidas ya fueron resueltas.</p>
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Matrículas recientes</h3>
                <p className="card__sub">Últimos alumnos inscritos en el año de trabajo.</p>
              </div>
              <button type="button" className="link-btn" onClick={() => onNavigate("matriculas")}>
                Ver todas <ChevronRight size={14} />
              </button>
            </div>
            <div className="card__body card__body--flush">
              {recientes.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Estudiante</th>
                        <th>Sección</th>
                        <th>Año</th>
                        <th>Fecha</th>
                        <th>Situación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recientes.map((matricula) => (
                        <tr key={matricula.id}>
                          <td>
                            <div className="table__user">
                              <span className="avatar avatar--sm">
                                {initials(
                                  matricula.estudianteNombre?.split(" ")[0],
                                  matricula.estudianteNombre?.split(" ").slice(1).join(" ")
                                )}
                              </span>
                              <span>
                                <strong>{matricula.estudianteNombre}</strong>
                                <small>DNI {matricula.estudianteDni}</small>
                              </span>
                            </div>
                          </td>
                          <td>{matricula.seccionEtiqueta}</td>
                          <td className="muted">{matricula.anioNombre}</td>
                          <td>{formatDate(matricula.fechaMatricula)}</td>
                          <td>
                            <span className={`badge ${SITUACION_CLASS[matricula.situacionFinal] || "badge--neutral"}`}>
                              {estadoLabel(matricula.situacionFinal)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty empty--compact">
                  <span className="empty__icon">
                    <School size={22} />
                  </span>
                  <p className="empty__title">Sin matrículas</p>
                  <p className="empty__text">Inscribe al primer alumno desde la sección Matrículas.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="overview-side">
          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Estudiantes por estado</h3>
                <p className="card__sub">Distribución del estado académico.</p>
              </div>
            </div>
            <div className="card__body">
              <div className="bars">
                {estados.map(({ estado, count }) => (
                  <div key={estado} className="bar-row">
                    <div className="bar-row__top">
                      <span>{estadoLabel(estado)}</span>
                      <strong>{count}</strong>
                    </div>
                    <div className="bar">
                      <span
                        className={`bar__fill ${
                          estado === "ACTIVO"
                            ? "bar__fill--estudiante"
                            : estado === "RETIRADO"
                              ? "bar__fill--docente"
                              : "bar__fill--secretaria"
                        }`}
                        style={{ width: `${percent(count, totalEstudiantes)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {!estudiantes.length ? <p className="hint">Aún no hay estudiantes registrados.</p> : null}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Últimos estudiantes</h3>
                <p className="card__sub">Fichas creadas recientemente.</p>
              </div>
            </div>
            <div className="card__body">
              {estudiantes.length ? (
                <div className="mini-feed">
                  {[...estudiantes]
                    .sort((a, b) => String(a.apellidos || "").localeCompare(String(b.apellidos || "")))
                    .slice(0, 5)
                    .map((estudiante) => (
                      <div key={estudiante.id} className="mini-feed__item">
                        <span className="mini-feed__icon">
                          <GraduationCap size={15} />
                        </span>
                        <span>
                          <strong>{fullName(estudiante)}</strong>
                          <small>
                            {estudiante.seccionEtiqueta ? `Sección ${estudiante.seccionEtiqueta}` : "Sin matrícula vigente"}
                          </small>
                          <em>
                            <span className={`badge ${ESTUDIANTE_CLASS[estudiante.estado] || "badge--neutral"}`}>
                              {estadoLabel(estudiante.estado)}
                            </span>
                          </em>
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="empty empty--compact">
                  <span className="empty__icon">
                    <GraduationCap size={20} />
                  </span>
                  <p className="empty__title">Sin estudiantes</p>
                  <p className="empty__text">Crea la primera ficha desde la sección Estudiantes.</p>
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
