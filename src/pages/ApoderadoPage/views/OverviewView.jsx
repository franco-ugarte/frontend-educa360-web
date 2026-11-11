import {
  ArrowUpRight,
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  Gauge,
  GraduationCap,
  Megaphone,
  NotebookPen,
  Sparkles,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import {
  ASISTENCIA_CLASS,
  DIA_LABELS,
  SITUACION_CLASS,
  TICKET_CLASS,
  estadoLabel,
  formatDate,
  formatNote,
  percent,
} from "../../../utils/format";
import {
  announcementScope,
  attendanceTone,
  calcularSemaforo,
  courseTone,
  gradeTone,
  hijoFirstName,
  hijoName,
  sortAnnouncements,
  sortTickets,
  sortUnidades,
  ticketScopeLabel,
} from "../apoderadoUtils";

const SEMAFORO_SHORT = {
  red: "Riesgo",
  amber: "Observación",
  green: "Óptimo",
};

export default function OverviewView({
  hijo,
  session,
  data,
  bimestres = [],
  tickets = [],
  comunicados = [],
  onNavigate,
}) {
  const {
    cursos = [],
    unidadesPorCurso = {},
    materialesPorCurso = {},
    boleta,
    calificaciones,
    asistencias,
  } = data || {};

  const unidades = Object.values(unidadesPorCurso).flatMap((list) => sortUnidades(list));
  const materiales = Object.values(materialesPorCurso).flat();
  const contenidos = unidades.reduce((total, unidad) => total + (unidad.contenidos?.length || 0), 0);
  const promedioGeneral = calificaciones?.promedioGeneral ?? boleta?.promedioGeneral ?? null;
  const porcentajeAsistencia = asistencias?.porcentaje ?? boleta?.asistenciaPorcentaje ?? null;
  const nombre = hijoName(hijo);
  const primerNombre = hijoFirstName(hijo);
  const guardianNombre = session?.nombres || "Apoderado";
  const anioNombre = hijo?.anioNombre || boleta?.anioNombre || cursos[0]?.anioNombre || "Año escolar";
  const seccion = hijo?.seccionEtiqueta || boleta?.seccionEtiqueta || cursos[0]?.seccionEtiqueta || "";
  const situacion = hijo?.situacionFinal || boleta?.situacionFinal || null;

  const promediosCurso = calificaciones?.promediosCurso || [];
  const maxCursoPromedio = Math.max(20, ...promediosCurso.map((curso) => Number(curso.promedio) || 0));
  const attendanceLevel = attendanceTone(porcentajeAsistencia);
  const activeTickets = sortTickets(tickets).filter(
    (ticket) => ticket.estado === "PENDIENTE" || ticket.estado === "APROBADO"
  );
  const pendientes = tickets.filter((ticket) => ticket.estado === "PENDIENTE").length;

  const stats = [
    {
      label: "Promedio general",
      value: formatNote(promedioGeneral),
      icon: NotebookPen,
      tone: "primary",
      hint: calificaciones?.bimestreNombre || "Promedio del año",
    },
    {
      label: "Asistencia",
      value: porcentajeAsistencia == null ? "—" : `${Number(porcentajeAsistencia).toFixed(0)}%`,
      icon: CalendarCheck2,
      tone: attendanceLevel === "danger" ? "danger" : "success",
      hint: asistencias ? `${asistencias.efectivas} de ${asistencias.total} clases` : "Sin registros",
    },
    {
      label: "Cursos",
      value: cursos.length,
      icon: BookOpen,
      tone: "secondary",
      hint: seccion ? `Sección ${seccion}` : "Sin sección",
    },
    {
      label: "Unidades publicadas",
      value: unidades.length,
      icon: ClipboardList,
      tone: "success",
      hint: `${contenidos} contenido(s)`,
    },
    {
      label: "Materiales",
      value: materiales.length,
      icon: FolderOpen,
      tone: "accent",
      hint: materiales.length ? "Disponibles para descargar" : "Sin archivos publicados",
    },
    {
      label: "Justificaciones",
      value: pendientes,
      icon: Ticket,
      tone: pendientes ? "accent" : "info",
      hint: pendientes ? "Pendientes de revisión" : `${activeTickets.length} activa(s)`,
    },
  ];

  const recientes = (asistencias?.detalle || []).slice(0, 6);
  const ultimosComunicados = sortAnnouncements(comunicados).slice(0, 4);
  const ultimosTickets = sortTickets(tickets).slice(0, 4);
  const semaforo = calcularSemaforo({
    promedio: promedioGeneral,
    asistencia: porcentajeAsistencia,
  });

  const quickActions = [
    {
      label: "Ver calificaciones",
      text: "Notas por curso y criterio",
      icon: NotebookPen,
      view: "calificaciones",
      tone: "primary",
    },
    {
      label: "Revisar asistencia",
      text: "Historial por fecha y bloque",
      icon: ClipboardCheck,
      view: "asistencia",
      tone: "secondary",
    },
    {
      label: "Justificar una falta",
      text: "Crea un ticket de inasistencia",
      icon: Ticket,
      view: "tickets",
      tone: "accent",
    },
    {
      label: "Abrir la boleta",
      text: "Resumen anual del representado",
      icon: GraduationCap,
      view: "boleta",
      tone: "success",
    },
  ];

  return (
    <div className="page">
      <section className="hero-card">
        <div className="hero-card__glow" />
        <div className="hero-card__content">
          <span className="eyebrow eyebrow--light">
            <Sparkles size={14} /> Seguimiento académico de tu representado
          </span>
          <h2>Hola, {guardianNombre.split(" ")[0]}</h2>
          <p>
            {hijo
              ? `Estás revisando a ${nombre}${seccion ? `, sección ${seccion}` : ""} durante el ${anioNombre}. Consulta sus cursos, notas, asistencia, materiales y justificaciones desde este panel.`
              : "Cuando vincules a un representado, aquí verás su información académica."}
          </p>
          <div className="hero-card__actions">
            <button type="button" className="btn btn--accent" onClick={() => onNavigate("calificaciones")}>
              <NotebookPen size={17} /> Ver calificaciones
            </button>
            <button type="button" className="btn btn--glass" onClick={() => onNavigate("tickets")}>
              <Ticket size={17} /> Justificaciones
            </button>
          </div>
        </div>

        <div className="hero-card__panel">
          <span className="hero-card__panel-label">
            <CalendarDays size={15} /> Matrícula del representado
          </span>
          {hijo ? (
            <>
              <strong>{anioNombre}</strong>
              {situacion ? (
                <span className={`badge ${SITUACION_CLASS[situacion] || "badge--neutral"}`}>
                  {estadoLabel(situacion)}
                </span>
              ) : (
                <span className="badge badge--neutral">Sin definir</span>
              )}
              <div className="hero-card__panel-grid">
                <div>
                  <small>Sección</small>
                  <b>{seccion || "—"}</b>
                </div>
                <div>
                  <small>Promedio</small>
                  <b>{formatNote(promedioGeneral)}</b>
                </div>
                <div>
                  <small>Asistencia</small>
                  <b>{porcentajeAsistencia == null ? "—" : `${Number(porcentajeAsistencia).toFixed(0)}%`}</b>
                </div>
                <div>
                  <small>Cursos</small>
                  <b>{cursos.length}</b>
                </div>
              </div>
            </>
          ) : (
            <>
              <strong>Sin representado</strong>
              <p className="hero-card__panel-empty">
                Selecciona o vincula un estudiante para ver su información académica.
              </p>
            </>
          )}
          <button type="button" className="btn btn--accent btn--sm" onClick={() => onNavigate("hijos")}>
            <Users size={15} /> Cambiar representado <ArrowUpRight size={14} />
          </button>
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

      {semaforo ? (
        <section
          className={`semaforo-card semaforo-card--${semaforo.level}`}
          aria-label={`Semáforo académico: ${semaforo.label}`}
        >
          <div className="semaforo-card__visual" aria-hidden="true">
            <div className="semaforo-stack">
              {["red", "amber", "green"].map((tone) => (
                <span
                  key={tone}
                  className={`semaforo-lamp semaforo-lamp--${tone}${
                    semaforo.level === tone ? " is-on" : ""
                  }`}
                />
              ))}
            </div>
            <span className="semaforo-card__caption">{SEMAFORO_SHORT[semaforo.level]}</span>
          </div>

          <div className="semaforo-card__body">
            <span className="semaforo-card__eyebrow">
              <Gauge size={14} /> Semáforo académico
            </span>
            <div className="semaforo-card__headline">
              <h3>{semaforo.label}</h3>
              <span className="semaforo-card__pill">
                {semaforo.factors.length > 1
                  ? "Notas y asistencia"
                  : semaforo.factors[0] === "notas"
                    ? "Según notas"
                    : "Según asistencia"}
              </span>
            </div>
            <p className="semaforo-card__text">{semaforo.detail}</p>

            <div className="semaforo-factors">
              <div className={`semaforo-factor is-${semaforo.noteLevel || "neutral"}`}>
                <span className="semaforo-factor__icon">
                  <NotebookPen size={15} />
                </span>
                <div className="semaforo-factor__info">
                  <small>Promedio general</small>
                  <strong>
                    {formatNote(promedioGeneral)} <em>/ 20</em>
                  </strong>
                </div>
                <span className="semaforo-factor__tag">
                  {SEMAFORO_SHORT[semaforo.noteLevel] || "Sin datos"}
                </span>
              </div>

              <div className={`semaforo-factor is-${semaforo.attendanceLevel || "neutral"}`}>
                <span className="semaforo-factor__icon">
                  <CalendarCheck2 size={15} />
                </span>
                <div className="semaforo-factor__info">
                  <small>Asistencia</small>
                  <strong>
                    {porcentajeAsistencia == null
                      ? "—"
                      : `${Number(porcentajeAsistencia).toFixed(1)} %`}
                  </strong>
                </div>
                <span className="semaforo-factor__tag">
                  {SEMAFORO_SHORT[semaforo.attendanceLevel] || "Sin datos"}
                </span>
              </div>
            </div>

            <div className="semaforo-scale" aria-hidden="true">
              <span className="semaforo-scale__label">Notas</span>
              <span>
                <i className="is-red" /> 0–11
              </span>
              <span>
                <i className="is-amber" /> 12–16
              </span>
              <span>
                <i className="is-green" /> 17–20
              </span>
              <span className="semaforo-scale__sep" />
              <span className="semaforo-scale__label">Asistencia</span>
              <span>
                <i className="is-red" /> &lt; 70 %
              </span>
              <span>
                <i className="is-amber" /> 70–84.99 %
              </span>
              <span>
                <i className="is-green" /> ≥ 85 %
              </span>
            </div>
          </div>
        </section>
      ) : null}

      <div className="overview-grid">
        <div className="overview-main">
          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Cursos del representado</h3>
                <p className="card__sub">Materias de la sección, unidades y materiales publicados.</p>
              </div>
              <button type="button" className="link-btn" onClick={() => onNavigate("cursos")}>
                Ver detalle <ChevronRight size={14} />
              </button>
            </div>
            <div className="card__body card__body--flush">
              {cursos.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Curso</th>
                        <th>Unidades</th>
                        <th>Contenidos</th>
                        <th>Materiales</th>
                        <th className="apoderado-cell-right">Promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cursos.map((curso, index) => {
                        const units = unidadesPorCurso[curso.id] || [];
                        const files = materialesPorCurso[curso.id] || [];
                        const promedio = promediosCurso.find(
                          (item) => String(item.cursoId) === String(curso.id)
                        )?.promedio;
                        return (
                          <tr key={curso.id}>
                            <td>
                              <div className="table__user">
                                <span className={`apoderado-course-dot is-${courseTone(index)}`}>
                                  <BookOpen size={15} />
                                </span>
                                <span>
                                  <strong>{curso.materiaNombre}</strong>
                                  <small>Sección {curso.seccionEtiqueta || seccion || "—"}</small>
                                </span>
                              </div>
                            </td>
                            <td className="muted">{units.length}</td>
                            <td className="muted">
                              {units.reduce((total, unidad) => total + (unidad.contenidos?.length || 0), 0)}
                            </td>
                            <td className="muted">{files.length}</td>
                            <td className="apoderado-cell-right">
                              <span className={`apoderado-note is-${gradeTone(promedio)}`}>
                                {formatNote(promedio)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty empty--compact">
                  <span className="empty__icon">
                    <BookOpen size={22} />
                  </span>
                  <p className="empty__title">Sin cursos asignados</p>
                  <p className="empty__text">
                    La sección del representado aún no tiene cursos registrados para este año.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Asistencias recientes</h3>
                <p className="card__sub">Últimos registros de clase del representado.</p>
              </div>
              <button type="button" className="link-btn" onClick={() => onNavigate("asistencia")}>
                Ver historial <ChevronRight size={14} />
              </button>
            </div>
            <div className="card__body card__body--flush">
              {recientes.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Curso</th>
                        <th>Bloque</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recientes.map((registro) => (
                        <tr key={registro.id}>
                          <td>
                            <strong>{formatDate(registro.fecha)}</strong>
                            <small className="muted">
                              {DIA_LABELS[registro.dia] || registro.dia || "—"}
                            </small>
                          </td>
                          <td>{registro.materiaNombre}</td>
                          <td className="muted">
                            {String(registro.horaInicio || "").slice(0, 5)} –{" "}
                            {String(registro.horaFin || "").slice(0, 5)}
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                ASISTENCIA_CLASS[registro.estado] || "badge--neutral"
                              }`}
                            >
                              {estadoLabel(registro.estado)}
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
                  <p className="empty__title">Sin asistencias registradas</p>
                  <p className="empty__text">
                    Cuando los docentes registren la hoja de clase, verás aquí el detalle.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Justificaciones recientes</h3>
                <p className="card__sub">{pendientes} pendiente(s) de revisión por Secretaría.</p>
              </div>
              <button type="button" className="link-btn" onClick={() => onNavigate("tickets")}>
                Ver todas <ChevronRight size={14} />
              </button>
            </div>
            <div className="card__body">
              {ultimosTickets.length ? (
                <div className="mini-feed">
                  {ultimosTickets.map((ticket) => (
                    <div key={ticket.id} className="mini-feed__item">
                      <span className="mini-feed__icon">
                        <Ticket size={15} />
                      </span>
                      <span>
                        <strong>{formatDate(ticket.fechaInasistencia)}</strong>
                        <small>{ticketScopeLabel(ticket)}</small>
                        <em>{ticket.motivo}</em>
                      </span>
                      <span className={`badge ${TICKET_CLASS[ticket.estado] || "badge--neutral"}`}>
                        {estadoLabel(ticket.estado)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty empty--compact">
                  <span className="empty__icon">
                    <Ticket size={20} />
                  </span>
                  <p className="empty__title">Sin justificaciones</p>
                  <p className="empty__text">
                    Puedes crear un ticket de inasistencia desde la sección Justificaciones.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="overview-side">
          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Promedio por curso</h3>
                <p className="card__sub">
                  {calificaciones?.bimestreNombre || "Año escolar completo"} · escala vigesimal.
                </p>
              </div>
            </div>
            <div className="card__body">
              {promediosCurso.length ? (
                <div className="bars">
                  {promediosCurso.map((curso) => (
                    <div key={curso.cursoId} className="bar-row">
                      <div className="bar-row__top">
                        <span>{curso.materiaNombre}</span>
                        <strong>{formatNote(curso.promedio)}</strong>
                      </div>
                      <div className="bar">
                        <span
                          className="bar__fill bar__fill--apoderado"
                          style={{ width: `${percent(Number(curso.promedio) || 0, maxCursoPromedio)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="hint">La nota aprobatoria es 11.00 y la asistencia mínima es 70%.</p>
                </div>
              ) : (
                <p className="hint">Aún no hay notas registradas en unidades publicadas.</p>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Últimos comunicados</h3>
                <p className="card__sub">Avisos generales y de las secciones de tus hijos.</p>
              </div>
              <button type="button" className="link-btn" onClick={() => onNavigate("comunicados")}>
                Ver todos <ChevronRight size={14} />
              </button>
            </div>
            <div className="card__body">
              {ultimosComunicados.length ? (
                <div className="mini-feed">
                  {ultimosComunicados.map((comunicado) => (
                    <div key={comunicado.id} className="mini-feed__item">
                      <span className="mini-feed__icon">
                        <Megaphone size={15} />
                      </span>
                      <span>
                        <strong>{comunicado.contenido}</strong>
                        <small>{announcementScope(comunicado)}</small>
                        <em>{formatDate(comunicado.createdAt)}</em>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty empty--compact">
                  <span className="empty__icon">
                    <Megaphone size={20} />
                  </span>
                  <p className="empty__title">Sin comunicados</p>
                  <p className="empty__text">Los avisos nuevos aparecerán en esta lista.</p>
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Accesos rápidos</h3>
                <p className="card__sub">Atajos a la información del representado.</p>
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

          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Bimestres visibles</h3>
                <p className="card__sub">Periodos con información en la boleta.</p>
              </div>
            </div>
            <div className="card__body">
              {bimestres.length ? (
                <div className="apoderado-bimestre-list">
                  {bimestres.map((bimestre) => (
                    <span key={bimestre.id} className="apoderado-bimestre-chip">
                      <CalendarDays size={14} />
                      {bimestre.nombre}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="hint">Aún no hay bimestres publicados para este año escolar.</p>
              )}
              <div className="info-strip info-strip--soft apoderado-overview-note">
                <UserRound size={16} />
                <span>
                  Datos provenientes de la matrícula vigente de {primerNombre} y de unidades publicadas.
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
