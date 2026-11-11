import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  LibraryBig,
  NotebookPen,
  UserRound,
} from "lucide-react";
import { formatDate, formatNote } from "../../../utils/format";
import { courseTone, gradeTone, sortUnidades } from "../estudianteUtils";

export default function CoursesView({
  cursos = [],
  unidadesPorCurso = {},
  materialesPorCurso = {},
  calificaciones,
  onNavigate,
}) {
  const promediosCurso = calificaciones?.promediosCurso || [];

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Mis cursos</h2>
          <p className="page__sub">
            {cursos.length
              ? `${cursos.length} curso(s) en tu sección, con sus unidades publicadas y materiales disponibles.`
              : "Tu sección aún no tiene cursos registrados para el año vigente."}
          </p>
        </div>
        <div className="page__actions">
          <button type="button" className="btn btn--soft" onClick={() => onNavigate("planificacion")}>
            <ClipboardList size={16} /> Planificación
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onNavigate("calificaciones")}>
            <NotebookPen size={16} /> Calificaciones
          </button>
        </div>
      </div>

      {cursos.length ? (
        <section className="estudiante-course-grid">
          {cursos.map((curso, index) => {
            const unidades = sortUnidades(unidadesPorCurso[curso.id] || []);
            const materiales = materialesPorCurso[curso.id] || [];
            const promedio = promediosCurso.find(
              (item) => String(item.cursoId) === String(curso.id)
            )?.promedio;
            const tone = courseTone(index);

            return (
              <article key={curso.id} className="estudiante-course-card">
                <div className="estudiante-course-card__head">
                  <span className={`estudiante-course-card__icon is-${tone}`}>
                    <BookOpen size={22} />
                  </span>
                  <div className="estudiante-course-card__title">
                    <h3>{curso.materiaNombre}</h3>
                    <p>
                      Sección {curso.seccionEtiqueta} · {curso.anioNombre}
                    </p>
                    <span className="estudiante-course-card__docente">
                      <UserRound size={13} /> {curso.docenteNombre || "Docente por asignar"}
                    </span>
                  </div>
                  <span className={`estudiante-note is-${gradeTone(promedio)}`}>
                    {formatNote(promedio)}
                  </span>
                </div>

                <div className="estudiante-course-card__metrics">
                  <div>
                    <span className={`estudiante-metric__icon is-${tone}`}>
                      <ClipboardList size={16} />
                    </span>
                    <strong>{unidades.length}</strong>
                    <small>Unidad(es)</small>
                  </div>
                  <div>
                    <span className={`estudiante-metric__icon is-${tone}`}>
                      <LibraryBig size={16} />
                    </span>
                    <strong>{unidades.reduce((total, unidad) => total + (unidad.contenidos?.length || 0), 0)}</strong>
                    <small>Contenido(s)</small>
                  </div>
                  <div>
                    <span className={`estudiante-metric__icon is-${tone}`}>
                      <FolderOpen size={16} />
                    </span>
                    <strong>{materiales.length}</strong>
                    <small>Material(es)</small>
                  </div>
                </div>

                <div className="estudiante-course-card__units">
                  <span className="estudiante-course-card__label">Unidades publicadas</span>
                  {unidades.length ? (
                    unidades.map((unidad) => (
                      <div key={unidad.id} className="estudiante-unit-chip">
                        <b>U{unidad.numero}</b>
                        <span>
                          <strong>{unidad.titulo}</strong>
                          <small>
                            {unidad.bimestreNombre} · {formatDate(unidad.fechaInicio)} –{" "}
                            {formatDate(unidad.fechaFin)}
                          </small>
                        </span>
                        <span className="estudiante-unit-chip__contents">
                          {unidad.contenidos?.length || 0}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="estudiante-course-card__empty">
                      <CalendarDays size={16} />
                      <span>El docente aún no publica unidades para este curso.</span>
                    </div>
                  )}
                </div>

                <div className="estudiante-course-card__actions">
                  <button
                    type="button"
                    className="estudiante-action is-primary"
                    onClick={() => onNavigate("planificacion", curso.id)}
                  >
                    <ClipboardList size={15} /> Planificación
                  </button>
                  <button
                    type="button"
                    className="estudiante-action is-accent"
                    onClick={() => onNavigate("materiales", curso.id)}
                  >
                    <FolderOpen size={15} /> Materiales
                  </button>
                  <button
                    type="button"
                    className="estudiante-action is-secondary"
                    onClick={() => onNavigate("calificaciones", curso.id)}
                  >
                    <NotebookPen size={15} /> Notas
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <GraduationCap size={26} />
            </span>
            <p className="empty__title">Sin cursos en tu sección</p>
            <p className="empty__text">
              Cuando Secretaría registre tu matrícula y el administrador asigne cursos a tu sección, aparecerán aquí.
            </p>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => onNavigate("resumen")}>
              Volver al resumen <ChevronRight size={15} />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
