import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FolderOpen,
  NotebookPen,
  Users,
} from "lucide-react";
import { DIA_LABELS, UNIDAD_CLASS, estadoLabel } from "../../../utils/format";
import { courseLabel, sortHorario, sortUnidades } from "../docenteUtils";

const ACTIONS = [
  { key: "planificacion", label: "Planificar", icon: ClipboardList, tone: "primary" },
  { key: "asistencia", label: "Asistencia", icon: ClipboardCheck, tone: "success" },
  { key: "calificaciones", label: "Notas", icon: NotebookPen, tone: "secondary" },
  { key: "materiales", label: "Materiales", icon: FolderOpen, tone: "accent" },
];

export default function CoursesView({
  cursos,
  unidadesPorCurso,
  horariosPorCurso,
  materialesPorCurso,
  onNavigate,
}) {
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Mis cursos</h2>
          <p className="page__sub">
            {cursos.length
              ? `${cursos.length} curso(s) asignados. Entra a cada uno para planificar, tomar asistencia, calificar o subir materiales.`
              : "Todavía no tienes cursos asignados en el año escolar."}
          </p>
        </div>
        <div className="page__actions">
          <button type="button" className="btn btn--primary" onClick={() => onNavigate("planificacion")}>
            <ClipboardList size={17} /> Ir a planificación
          </button>
        </div>
      </div>

      {cursos.length ? (
        <div className="docente-course-grid">
          {cursos.map((curso) => {
            const unidades = sortUnidades(unidadesPorCurso[curso.id] || []);
            const publicadas = unidades.filter((unidad) => unidad.estado === "PUBLICADA");
            const materiales = materialesPorCurso[curso.id] || [];
            const horario = sortHorario(horariosPorCurso[curso.id] || []);
            const proximas = horario.slice(0, 4);

            return (
              <article key={curso.id} className="docente-course-card">
                <div className="docente-course-card__head">
                  <span className="docente-course-card__icon">
                    <BookOpen size={22} />
                  </span>
                  <div className="docente-course-card__title">
                    <h3>{curso.materiaNombre}</h3>
                    <p>{courseLabel(curso)}</p>
                  </div>
                  <span className="badge badge--primary">{curso.anioNombre}</span>
                </div>

                <div className="docente-course-card__metrics">
                  <div>
                    <span className="docente-metric__icon docente-metric__icon--primary">
                      <Users size={15} />
                    </span>
                    <small>Sección</small>
                    <strong>{curso.seccionEtiqueta}</strong>
                  </div>
                  <div>
                    <span className="docente-metric__icon docente-metric__icon--secondary">
                      <ClipboardList size={15} />
                    </span>
                    <small>Unidades</small>
                    <strong>
                      {unidades.length}
                      <em>{publicadas.length} pub.</em>
                    </strong>
                  </div>
                  <div>
                    <span className="docente-metric__icon docente-metric__icon--accent">
                      <FolderOpen size={15} />
                    </span>
                    <small>Materiales</small>
                    <strong>{materiales.length}</strong>
                  </div>
                </div>

                <div className="docente-course-card__schedule">
                  <div className="docente-course-card__schedule-head">
                    <span>
                      <CalendarDays size={15} /> Horario semanal
                    </span>
                    <small>{horario.length} bloque(s)</small>
                  </div>
                  {proximas.length ? (
                    <div className="docente-schedule-list">
                      {proximas.map((bloque) => (
                        <div key={bloque.id} className="docente-schedule-row">
                          <span className="docente-schedule-row__day">{DIA_LABELS[bloque.dia] || bloque.dia}</span>
                          <span className="docente-schedule-row__time">
                            <Clock size={13} />
                            {String(bloque.horaInicio || "").slice(0, 5)} —{" "}
                            {String(bloque.horaFin || "").slice(0, 5)}
                          </span>
                        </div>
                      ))}
                      {horario.length > proximas.length ? (
                        <span className="docente-schedule-more">+{horario.length - proximas.length} bloque(s) más</span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="hint">El administrador aún no registró bloques para este curso.</p>
                  )}
                </div>

                {unidades.length ? (
                  <div className="docente-course-card__units">
                    {unidades.slice(0, 3).map((unidad) => (
                      <span key={unidad.id} className="docente-unit-chip">
                        <b>U{unidad.numero}</b>
                        <span>{unidad.titulo}</span>
                        <em className={`badge ${UNIDAD_CLASS[unidad.estado] || "badge--neutral"}`}>
                          {estadoLabel(unidad.estado)}
                        </em>
                      </span>
                    ))}
                    {unidades.length > 3 ? (
                      <span className="docente-schedule-more">+{unidades.length - 3} unidad(es)</span>
                    ) : null}
                  </div>
                ) : (
                  <div className="docente-course-card__empty">
                    <ClipboardList size={16} />
                    <span>Sin unidades planificadas todavía.</span>
                  </div>
                )}

                <div className="docente-course-card__actions">
                  {ACTIONS.map(({ key, label, icon: Icon, tone }) => (
                    <button
                      key={key}
                      type="button"
                      className={`docente-action docente-action--${tone}`}
                      onClick={() => onNavigate(key, curso.id)}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <BookOpen size={26} />
            </span>
            <p className="empty__title">Sin cursos asignados</p>
            <p className="empty__text">
              El administrador debe asignarte una materia y una sección para que puedas planificar, registrar asistencia
              y calificar.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
