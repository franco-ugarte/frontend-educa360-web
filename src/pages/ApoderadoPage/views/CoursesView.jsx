import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  LibraryBig,
  NotebookPen,
} from "lucide-react";
import { formatDate, formatNote } from "../../../utils/format";
import { courseTone, gradeTone, hijoName, sortUnidades } from "../apoderadoUtils";

export default function CoursesView({
  hijo,
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
          <h2 className="page__title">Cursos de {hijoName(hijo)}</h2>
          <p className="page__sub">
            {cursos.length
              ? `${cursos.length} curso(s) en la sección, con sus unidades publicadas y materiales disponibles.`
              : "La sección del representado aún no tiene cursos registrados para el año vigente."}
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
        <section className="apoderado-course-grid">
          {cursos.map((curso, index) => {
            const unidades = sortUnidades(unidadesPorCurso[curso.id] || []);
            const materiales = materialesPorCurso[curso.id] || [];
            const promedio = promediosCurso.find(
              (item) => String(item.cursoId) === String(curso.id)
            )?.promedio;
            const tone = courseTone(index);

            return (
              <article key={curso.id} className="apoderado-course-card">
                <div className="apoderado-course-card__head">
                  <span className={`apoderado-course-card__icon is-${tone}`}>
                    <BookOpen size={22} />
                  </span>
                  <div className="apoderado-course-card__title">
                    <h3>{curso.materiaNombre}</h3>
                    <p>
                      Sección {curso.seccionEtiqueta || "—"} · {curso.anioNombre || "Año escolar"}
                    </p>
                    <span className="apoderado-course-card__owner">
                      <GraduationCap size={13} /> {hijoName(hijo)}
                    </span>
                  </div>
                  <span className={`apoderado-note is-${gradeTone(promedio)}`}>
                    {formatNote(promedio)}
                  </span>
                </div>

                <div className="apoderado-course-card__metrics">
                  <div>
                    <span className={`apoderado-metric__icon is-${tone}`}>
                      <ClipboardList size={16} />
                    </span>
                    <strong>{unidades.length}</strong>
                    <small>Unidad(es)</small>
                  </div>
                  <div>
                    <span className={`apoderado-metric__icon is-${tone}`}>
                      <LibraryBig size={16} />
                    </span>
                    <strong>
                      {unidades.reduce((total, unidad) => total + (unidad.contenidos?.length || 0), 0)}
                    </strong>
                    <small>Contenido(s)</small>
                  </div>
                  <div>
                    <span className={`apoderado-metric__icon is-${tone}`}>
                      <FolderOpen size={16} />
                    </span>
                    <strong>{materiales.length}</strong>
                    <small>Material(es)</small>
                  </div>
                </div>

                <div className="apoderado-course-card__units">
                  <span className="apoderado-course-card__label">Unidades publicadas</span>
                  {unidades.length ? (
                    unidades.map((unidad) => (
                      <div key={unidad.id} className="apoderado-unit-chip">
                        <b>U{unidad.numero}</b>
                        <span>
                          <strong>{unidad.titulo}</strong>
                          <small>
                            {unidad.bimestreNombre} · {formatDate(unidad.fechaInicio)} –{" "}
                            {formatDate(unidad.fechaFin)}
                          </small>
                        </span>
                        <span className="apoderado-unit-chip__contents">
                          {unidad.contenidos?.length || 0}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="apoderado-course-card__empty">
                      <CalendarDays size={16} />
                      <span>El docente aún no publica unidades para este curso.</span>
                    </div>
                  )}
                </div>

                <div className="apoderado-course-card__actions">
                  <button
                    type="button"
                    className="apoderado-action is-primary"
                    onClick={() => onNavigate("planificacion", curso.id)}
                  >
                    <ClipboardList size={15} /> Planificación
                  </button>
                  <button
                    type="button"
                    className="apoderado-action is-accent"
                    onClick={() => onNavigate("materiales", curso.id)}
                  >
                    <FolderOpen size={15} /> Materiales
                  </button>
                  <button
                    type="button"
                    className="apoderado-action is-secondary"
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
            <p className="empty__title">Sin cursos en la sección</p>
            <p className="empty__text">
              Cuando el administrador asigne cursos a la sección del representado, aparecerán aquí.
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
