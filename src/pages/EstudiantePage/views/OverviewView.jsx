import {
  ArrowUpRight,
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  Megaphone,
  NotebookPen,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  ASISTENCIA_CLASS,
  DIA_LABELS,
  SITUACION_CLASS,
  estadoLabel,
  formatDate,
  formatNote,
  percent,
} from "../../../utils/format";
import {
  announcementScope,
  attendanceTone,
  courseTone,
  gradeTone,
  sortAnnouncements,
  sortUnidades,
} from "../estudianteUtils";

export default function OverviewView({ data, bimestres, onNavigate }) {
  const {
    matricula,
    cursos = [],
    unidadesPorCurso = {},
    materialesPorCurso = {},
    boleta,
    comunicados = [],
    calificaciones,
    asistencias,
  } = data || {};

  const unidades = Object.values(unidadesPorCurso).flatMap((list) => sortUnidades(list));
  const materiales = Object.values(materialesPorCurso).flat();
  const contenidos = unidades.reduce((total, unidad) => total + (unidad.contenidos?.length || 0), 0);
  const promedioGeneral = calificaciones?.promedioGeneral ?? boleta?.promedioGeneral ?? null;
  const porcentajeAsistencia = asistencias?.porcentaje ?? boleta?.asistenciaPorcentaje ?? null;
  const nombre = matricula?.estudianteNombre || boleta?.estudianteNombre || "Estudiante";
  const primerNombre = nombre.split(" ")[0] || "Estudiante";
  const anioNombre = matricula?.anioNombre || boleta?.anioNombre || cursos[0]?.anioNombre || "Año escolar";
  const seccion = matricula?.seccionEtiqueta || boleta?.seccionEtiqueta || cursos[0]?.seccionEtiqueta || "";
  const situacion = matricula?.situacionFinal || boleta?.situacionFinal || null;

  const promediosCurso = calificaciones?.promediosCurso || [];
  const maxCursoPromedio = Math.max(20, ...promediosCurso.map((curso) => Number(curso.promedio) || 0));
  const asistenciaTone = attendanceTone(porcentajeAsistencia);

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
      tone: asistenciaTone === "danger" ? "accent" : "success",
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
      label: "Comunicados",
      value: comunicados.length,
      icon: Megaphone,
      tone: "info",
      hint: `${comunicados.filter((item) => !item.seccionEtiqueta).length} general(es)`,
    },
  ];

  const recientes = (asistencias?.detalle || []).slice(0, 6);
  const ultimosComunicados = sortAnnouncements(comunicados).slice(0, 4);

  const quickActions = [
    {
      label: "Ver planificación",
      text: "Unidades y contenidos publicados",
      icon: ClipboardList,
      view: "planificacion",
      tone: "primary",
    },
    {
      label: "Revisar calificaciones",
      text: "Notas por curso y criterio",
      icon: NotebookPen,
      view: "calificaciones",
      tone: "secondary",
    },
    {
      label: "Descargar materiales",
      text: "Archivos compartidos por tus docentes",
      icon: FolderOpen,
      view: "materiales",
      tone: "accent",
    },
    {
      label: "Abrir mi boleta",
      text: "Resumen anual de tu rendimiento",
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
            <Sparkles size={14} /> Tu año escolar en un vistazo
          </span>
          <h2>Hola, {primerNombre}</h2>
          <p>
            {matricula
              ? `Estás matriculado en ${seccion || "tu sección"} durante el ${anioNombre}. Consulta tus cursos, notas, asistencia y materiales desde este panel.`
              : "Aún no tienes una matrícula vigente. Cuando Secretaría te inscriba, aquí aparecerá toda tu información académica."}
          </p>
          <div className="hero-card__actions">
            <button type="button" className="btn btn--accent" onClick={() => onNavigate("calificaciones")}>
              <NotebookPen size={17} /> Ver calificaciones
            </button>
            <button type="button" className="btn btn--glass" onClick={() => onNavigate("boleta")}>
              <GraduationCap size={17} /> Mi boleta
            </button>
          </div>
        </div>

        <div className="hero-card__panel">
          <span className="hero-card__panel-label">
            <CalendarDays size={15} /> Mi matrícula
          </span>
          {matricula ? (
            <>
              <strong>{anioNombre}</strong>
              {situacion ? (
                <span className={`badge ${SITUACION_CLASS[situacion] || "badge--neutral"}`}>
                  {estadoLabel(situacion)}
                </span>
              ) : null}
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
                  <small>Matrícula</small>
                  <b>{formatDate(matricula.fechaMatricula)}</b>
                </div>
              </div>
            </>
          ) : (
            <>
              <strong>Sin matrícula</strong>
              <p className="hero-card__panel-empty">
                Cuando te inscriban en una sección del año abierto verás tus cursos y promedios en este panel.
              </p>
              <button type="button" className="btn btn--accent btn--sm" onClick={() => onNavigate("cursos")}>
                Ver mis cursos <ArrowUpRight size={15} />
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
                <h3 className="card__title">Mis cursos</h3>
                <p className="card__sub">Materias, docentes y promedio del año.</p>
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
                        <th>Docente</th>
                        <th>Unidades</th>
                        <th>Materiales</th>
                        <th className="estudiante-cell-right">Promedio</th>
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
                                <span className={`estudiante-course-dot is-${courseTone(index)}`}>
                                  <BookOpen size={15} />
                                </span>
                                <span>
                                  <strong>{curso.materiaNombre}</strong>
                                  <small>Sección {curso.seccionEtiqueta}</small>
                                </span>
                              </div>
                            </td>
                            <td className="muted">{curso.docenteNombre || "—"}</td>
                            <td className="muted">{units.length}</td>
                            <td className="muted">{files.length}</td>
                            <td className="estudiante-cell-right">
                              <span className={`estudiante-note is-${gradeTone(promedio)}`}>
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
                  <p className="empty__text">Tu sección aún no tiene cursos registrados para este año.</p>
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Asistencias recientes</h3>
                <p className="card__sub">Últimos registros de tus clases.</p>
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
                            <small className="muted">{DIA_LABELS[registro.dia] || registro.dia || "—"}</small>
                          </td>
                          <td>{registro.materiaNombre}</td>
                          <td className="muted">
                            {String(registro.horaInicio || "").slice(0, 5)} –{" "}
                            {String(registro.horaFin || "").slice(0, 5)}
                          </td>
                          <td>
                            <span className={`badge ${ASISTENCIA_CLASS[registro.estado] || "badge--neutral"}`}>
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
                  <p className="empty__text">Cuando tus docentes registren la hoja de clase, verás aquí el detalle.</p>
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
                          className="bar__fill bar__fill--estudiante"
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
                <p className="card__sub">Avisos de la institución y de tu sección.</p>
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
                <p className="card__sub">Atajos a tu información académica.</p>
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
                <p className="card__sub">Periodos con información en tu boleta.</p>
              </div>
            </div>
            <div className="card__body">
              {bimestres.length ? (
                <div className="estudiante-bimestre-list">
                  {bimestres.map((bimestre) => (
                    <span key={bimestre.id} className="estudiante-bimestre-chip">
                      <CalendarDays size={14} />
                      {bimestre.nombre}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="hint">Aún no hay bimestres publicados para tu año escolar.</p>
              )}
              <div className="info-strip info-strip--soft estudiante-overview-note">
                <UserRound size={16} />
                <span>Todos los datos provienen de tu matrícula vigente y de unidades publicadas.</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
