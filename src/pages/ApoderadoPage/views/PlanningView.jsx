import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  GraduationCap,
  Layers,
} from "lucide-react";
import { formatDate } from "../../../utils/format";
import { bimestreOrder, hijoName, sortUnidades } from "../apoderadoUtils";

function groupByBimestre(unidades = []) {
  const map = new Map();
  unidades.forEach((unidad) => {
    const key = String(unidad.bimestreId);
    if (!map.has(key)) {
      map.set(key, {
        id: unidad.bimestreId,
        nombre: unidad.bimestreNombre || "Bimestre",
        unidades: [],
      });
    }
    map.get(key).unidades.push(unidad);
  });
  return [...map.values()].sort(
    (a, b) => bimestreOrder(a.nombre) - bimestreOrder(b.nombre)
  );
}

export default function PlanningView({
  hijo,
  cursos = [],
  unidadesPorCurso = {},
  bimestres = [],
  initialCursoId,
}) {
  const [cursoId, setCursoId] = useState(String(initialCursoId || cursos[0]?.id || ""));
  const [bimestreFilter, setBimestreFilter] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());

  useEffect(() => {
    if (initialCursoId) setCursoId(String(initialCursoId));
  }, [initialCursoId]);

  useEffect(() => {
    if (cursos.length && !cursos.some((curso) => String(curso.id) === String(cursoId))) {
      setCursoId(String(cursos[0].id));
    }
  }, [cursos, cursoId]);

  useEffect(() => {
    setExpanded(new Set());
    setBimestreFilter("");
  }, [cursoId]);

  const selectedCurso = cursos.find((curso) => String(curso.id) === String(cursoId)) || null;
  const unidades = useMemo(
    () => sortUnidades(unidadesPorCurso[cursoId] || []),
    [unidadesPorCurso, cursoId]
  );

  const filtered = useMemo(
    () =>
      bimestreFilter
        ? unidades.filter((unidad) => String(unidad.bimestreId) === String(bimestreFilter))
        : unidades,
    [unidades, bimestreFilter]
  );

  const grouped = useMemo(() => groupByBimestre(filtered), [filtered]);
  const totalContenidos = unidades.reduce(
    (total, unidad) => total + (unidad.contenidos?.length || 0),
    0
  );

  const toggle = (unidadId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(unidadId)) next.delete(unidadId);
      else next.add(unidadId);
      return next;
    });
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Planificación de {hijoName(hijo)}</h2>
          <p className="page__sub">
            {selectedCurso
              ? `${selectedCurso.materiaNombre} · Sección ${selectedCurso.seccionEtiqueta || "—"} · ${selectedCurso.anioNombre || "Año escolar"}`
              : "Selecciona un curso para ver sus unidades publicadas."}
          </p>
        </div>
        <div className="page__actions">
          <select className="select" value={cursoId} onChange={(event) => setCursoId(event.target.value)}>
            {cursos.map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.materiaNombre} · {curso.seccionEtiqueta}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={bimestreFilter}
            onChange={(event) => setBimestreFilter(event.target.value)}
          >
            <option value="">Todos los bimestres</option>
            {bimestres.map((bimestre) => (
              <option key={bimestre.id} value={bimestre.id}>
                {bimestre.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!cursos.length ? (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <BookOpen size={26} />
            </span>
            <p className="empty__title">Sin cursos asignados</p>
            <p className="empty__text">
              Cuando la matrícula del representado esté registrada y su sección tenga cursos, verás aquí
              su planificación.
            </p>
          </div>
        </section>
      ) : (
        <>
          <div className="toolbar apoderado-plan-toolbar">
            <div className="toolbar__group">
              <span className="apoderado-plan-chip">
                <ClipboardList size={15} /> {unidades.length} unidad(es) publicada(s)
              </span>
              <span className="apoderado-plan-chip">
                <Layers size={15} /> {totalContenidos} contenido(s)
              </span>
              <span className="apoderado-plan-chip">
                <GraduationCap size={15} /> {hijoName(hijo)}
              </span>
            </div>
          </div>

          {grouped.length ? (
            <div className="apoderado-plan-groups">
              {grouped.map((group) => (
                <section key={group.id} className="apoderado-plan-group">
                  <div className="apoderado-plan-group__head">
                    <div>
                      <h3>{group.nombre}</h3>
                      <p>{group.unidades.length} unidad(es) en este bimestre</p>
                    </div>
                    <span className="badge badge--secondary">{group.unidades[0]?.materiaNombre}</span>
                  </div>

                  <div className="apoderado-plan-list">
                    {group.unidades.map((unidad) => {
                      const contents = [...(unidad.contenidos || [])].sort(
                        (a, b) => Number(a.orden) - Number(b.orden)
                      );
                      const isOpen = expanded.has(unidad.id);
                      return (
                        <article key={unidad.id} className={`apoderado-unit-card ${isOpen ? "is-open" : ""}`}>
                          <div className="apoderado-unit-card__head">
                            <span className="apoderado-unit-number">U{unidad.numero}</span>
                            <div className="apoderado-unit-card__title">
                              <h4>{unidad.titulo}</h4>
                              <p>{unidad.descripcion || "Sin descripción adicional."}</p>
                            </div>
                            <span className="badge badge--neutral">{contents.length} contenido(s)</span>
                            <button
                              type="button"
                              className="icon-btn icon-btn--soft"
                              onClick={() => toggle(unidad.id)}
                              title={isOpen ? "Ocultar contenidos" : "Ver contenidos"}
                            >
                              {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>

                          <div className="apoderado-unit-card__meta">
                            <span>
                              <CalendarDays size={14} /> {formatDate(unidad.fechaInicio)} —{" "}
                              {formatDate(unidad.fechaFin)}
                            </span>
                            <span>{unidad.bimestreNombre}</span>
                          </div>

                          {isOpen ? (
                            <div className="apoderado-unit-card__contents">
                              {contents.length ? (
                                <div className="apoderado-content-list">
                                  {contents.map((contenido) => (
                                    <div key={contenido.id} className="apoderado-content-row">
                                      <span className="apoderado-content-row__order">{contenido.orden}</span>
                                      <div>
                                        <strong>{contenido.titulo}</strong>
                                        {contenido.descripcion ? <small>{contenido.descripcion}</small> : null}
                                        {contenido.fechaPrevista ? (
                                          <em>
                                            <CalendarDays size={12} /> {formatDate(contenido.fechaPrevista)}
                                          </em>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="apoderado-inline-empty">
                                  <Layers size={17} />
                                  <span>Esta unidad aún no tiene contenidos publicados.</span>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <section className="card">
              <div className="empty empty--tall">
                <span className="empty__icon">
                  <ClipboardList size={26} />
                </span>
                <p className="empty__title">
                  {unidades.length ? "Sin unidades en este bimestre" : "Sin unidades publicadas"}
                </p>
                <p className="empty__text">
                  {unidades.length
                    ? "Cambia el filtro de bimestre para ver otras unidades del curso."
                    : "El docente aún no publica unidades para este curso. Cuando lo haga, aparecerán aquí con sus contenidos."}
                </p>
              </div>
            </section>
          )}
        </>
      )}

      <div className="info-strip info-strip--soft apoderado-plan-note">
        <Layers size={16} />
        <p>
          Solo se muestran unidades en estado <strong>publicada</strong>. El orden de los contenidos es el
          definido por el docente en la planificación del bimestre.
        </p>
      </div>
    </div>
  );
}
