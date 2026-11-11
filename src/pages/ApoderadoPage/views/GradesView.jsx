import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CircleX,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  NotebookPen,
  Search,
} from "lucide-react";
import { apoderadoService, getApiError } from "../../../services/api";
import { formatNote } from "../../../utils/format";
import { courseTone, gradeTone, hijoName } from "../apoderadoUtils";

function sortUnits(units = []) {
  return [...units].sort(
    (a, b) =>
      Number(a.bimestreNumero || 0) - Number(b.bimestreNumero || 0) ||
      Number(a.unidadNumero || 0) - Number(b.unidadNumero || 0)
  );
}

export default function GradesView({ hijo, cursos = [], bimestres = [], initialData }) {
  const [scope, setScope] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [data, setData] = useState(initialData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setScope("");
    setCourseFilter("");
  }, [hijo?.estudianteId]);

  useEffect(() => {
    let cancelled = false;

    if (!scope || !hijo) {
      setData(initialData || null);
      setError(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);
    apoderadoService
      .calificaciones(hijo.estudianteId, { bimestreId: Number(scope) })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setData(null);
          setError(getApiError(requestError));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scope, initialData, reloadKey, hijo]);

  const detalle = data?.detalle || [];
  const promediosUnidad = data?.promediosUnidad || [];
  const promediosCurso = data?.promediosCurso || [];

  const courseRows = useMemo(() => {
    const map = new Map();
    cursos.forEach((curso, index) => {
      map.set(String(curso.id), {
        curso,
        tone: courseTone(index),
        promedio: null,
      });
    });
    promediosCurso.forEach((item) => {
      const key = String(item.cursoId);
      if (!map.has(key)) {
        map.set(key, {
          curso: { id: item.cursoId, materiaNombre: item.materiaNombre },
          tone: courseTone(map.size),
          promedio: item.promedio,
        });
      } else {
        map.get(key).promedio = item.promedio;
      }
    });
    return [...map.values()];
  }, [cursos, promediosCurso]);

  const visibleCourses = useMemo(
    () =>
      courseFilter
        ? courseRows.filter((row) => String(row.curso.id) === String(courseFilter))
        : courseRows,
    [courseRows, courseFilter]
  );

  const unitsByCourse = useMemo(() => {
    const map = new Map();
    promediosUnidad.forEach((unit) => {
      const key = String(unit.cursoId);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(unit);
    });
    return map;
  }, [promediosUnidad]);

  const notesByUnit = useMemo(() => {
    const map = new Map();
    detalle.forEach((nota) => {
      const key = String(nota.unidadId);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(nota);
    });
    return map;
  }, [detalle]);

  const totalNotas = detalle.length;
  const coursesWithNotes = promediosCurso.length;
  const promedioGeneral = data?.promedioGeneral ?? null;
  const scopeLabel = data?.bimestreNombre || "Año escolar completo";

  const stats = [
    {
      label: "Promedio general",
      value: formatNote(promedioGeneral),
      icon: NotebookPen,
      tone: gradeTone(promedioGeneral) === "danger" ? "danger" : "primary",
      hint: scopeLabel,
    },
    {
      label: "Cursos con notas",
      value: coursesWithNotes,
      icon: BookOpen,
      tone: "secondary",
      hint: `${cursos.length} curso(s) en total`,
    },
    {
      label: "Unidades evaluadas",
      value: promediosUnidad.length,
      icon: ClipboardList,
      tone: "accent",
      hint: scopeLabel,
    },
    {
      label: "Notas registradas",
      value: totalNotas,
      icon: ClipboardCheck,
      tone: "success",
      hint: "Criterios calificados",
    },
  ];

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Calificaciones de {hijoName(hijo)}</h2>
          <p className="page__sub">
            Notas de unidades publicadas · {scopeLabel}. La nota aprobatoria es 11.00 sobre 20.
          </p>
        </div>
        <div className="page__actions">
          <select className="select" value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="">Todo el año</option>
            {bimestres.map((bimestre) => (
              <option key={bimestre.id} value={bimestre.id}>
                {bimestre.nombre}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={courseFilter}
            onChange={(event) => setCourseFilter(event.target.value)}
          >
            <option value="">Todos los cursos</option>
            {cursos.map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.materiaNombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="alert alert--error alert--inline" role="alert">
          <CircleX size={18} />
          <div>
            <p>{error.message}</p>
            <small>No se pudieron cargar las notas de este bimestre.</small>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="loading-state">
          <span className="spinner spinner--dark" />
          <p>Cargando calificaciones del bimestre…</p>
        </div>
      ) : !data ? (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <NotebookPen size={26} />
            </span>
            <p className="empty__title">Sin calificaciones disponibles</p>
            <p className="empty__text">
              Las notas aparecerán cuando los docentes registren calificaciones en unidades publicadas.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className="apoderado-summary-grid">
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

          {visibleCourses.length ? (
            <div className="apoderado-grade-courses">
              {visibleCourses.map(({ curso, tone, promedio }) => {
                const units = sortUnits(unitsByCourse.get(String(curso.id)) || []);
                return (
                  <section key={curso.id} className="card apoderado-grade-course">
                    <div className="card__head">
                      <div className="apoderado-grade-course__title">
                        <span className={`apoderado-course-dot is-${tone}`}>
                          <BookOpen size={17} />
                        </span>
                        <div>
                          <h3 className="card__title">{curso.materiaNombre}</h3>
                          <p className="card__sub">
                            <GraduationCap size={12} /> {hijoName(hijo)}
                            {curso.seccionEtiqueta ? ` · Sección ${curso.seccionEtiqueta}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="apoderado-grade-course__score">
                        <small>Promedio</small>
                        <span className={`apoderado-note is-${gradeTone(promedio)}`}>
                          {formatNote(promedio)}
                        </span>
                      </div>
                    </div>

                    <div className="card__body">
                      {units.length ? (
                        <div className="apoderado-grade-units">
                          {units.map((unit) => {
                            const notes = notesByUnit.get(String(unit.unidadId)) || [];
                            return (
                              <article key={unit.unidadId} className="apoderado-grade-unit">
                                <div className="apoderado-grade-unit__head">
                                  <span className="apoderado-unit-number">U{unit.unidadNumero}</span>
                                  <div className="apoderado-grade-unit__title">
                                    <strong>{unit.unidadTitulo}</strong>
                                    <small>
                                      {unit.bimestreNombre} · {unit.cantidad} nota(s)
                                    </small>
                                  </div>
                                  <span className={`apoderado-note is-${gradeTone(unit.promedio)}`}>
                                    {formatNote(unit.promedio)}
                                  </span>
                                </div>

                                {notes.length ? (
                                  <div className="apoderado-grade-criteria">
                                    {notes.map((nota) => (
                                      <span key={nota.id} className="apoderado-grade-criterion">
                                        <small>{nota.criterio}</small>
                                        <strong className={`is-${gradeTone(nota.nota)}`}>
                                          {formatNote(nota.nota)}
                                        </strong>
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </article>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="apoderado-inline-empty">
                          <Search size={17} />
                          <span>
                            {promediosCurso.length
                              ? "Este curso no tiene notas en el ámbito seleccionado."
                              : "Aún no hay calificaciones registradas en unidades publicadas."}
                          </span>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <section className="card">
              <div className="empty empty--tall">
                <span className="empty__icon">
                  <ClipboardList size={26} />
                </span>
                <p className="empty__title">Sin cursos para mostrar</p>
                <p className="empty__text">Cambia el filtro de curso para revisar las calificaciones.</p>
              </div>
            </section>
          )}

          <div className="info-strip info-strip--soft">
            <NotebookPen size={16} />
            <p>
              Solo se muestran notas de unidades <strong>publicadas</strong>. El promedio general es el
              promedio de los promedios por curso del ámbito seleccionado.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
