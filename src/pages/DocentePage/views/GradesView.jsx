import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CircleX,
  ClipboardList,
  NotebookPen,
  Plus,
  Trash,
  Users,
} from "lucide-react";
import { docenteService, getApiError } from "../../../services/api";
import { ConfirmDialog, Modal } from "../../../components/ui/Modal";
import {
  UNIDAD_CLASS,
  estadoLabel,
  formatNote,
  initials,
} from "../../../utils/format";
import { sortUnidades } from "../docenteUtils";

function averageOf(calificaciones = []) {
  const values = calificaciones
    .map((calificacion) => Number(calificacion.nota))
    .filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export default function GradesView({
  cursos,
  unidadesPorCurso,
  bimestres,
  initialCursoId,
  onNavigate,
  onReload,
  showToast,
}) {
  const initialCourse = String(initialCursoId || cursos[0]?.id || "");
  const initialUnits = sortUnidades(unidadesPorCurso[initialCourse] || []);

  const [cursoId, setCursoId] = useState(initialCourse);
  const [unidadId, setUnidadId] = useState(initialUnits[0] ? String(initialUnits[0].id) : "");
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sheetError, setSheetError] = useState(null);

  const [gradeOpen, setGradeOpen] = useState(false);
  const [criterion, setCriterion] = useState("");
  const [gradeValues, setGradeValues] = useState({});
  const [gradeError, setGradeError] = useState(null);
  const [gradeSaving, setGradeSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [actaBimestreId, setActaBimestreId] = useState("");
  const [acta, setActa] = useState(null);
  const [actaLoading, setActaLoading] = useState(false);
  const [actaError, setActaError] = useState(null);

  const selectedCurso = cursos.find((curso) => String(curso.id) === String(cursoId)) || null;

  const unidades = useMemo(
    () => sortUnidades(unidadesPorCurso[cursoId] || []),
    [unidadesPorCurso, cursoId]
  );

  const cursoBimestres = useMemo(
    () =>
      bimestres
        .filter((bimestre) => String(bimestre.anioId) === String(selectedCurso?.anioId))
        .sort((a, b) => a.order - b.order),
    [bimestres, selectedCurso?.anioId]
  );

  const selectedUnit = unidades.find((unidad) => String(unidad.id) === String(unidadId)) || null;

  useEffect(() => {
    if (!unidades.length) {
      setUnidadId("");
      return;
    }
    if (!unidades.some((unidad) => String(unidad.id) === String(unidadId))) {
      setUnidadId(String(unidades[0].id));
    }
  }, [unidades, unidadId]);

  const loadSheet = useCallback(async () => {
    if (!unidadId) {
      setSheet(null);
      return;
    }
    setLoading(true);
    setSheetError(null);
    try {
      const data = await docenteService.listarCalificacionesUnidad(unidadId);
      setSheet(data);
    } catch (error) {
      setSheet(null);
      setSheetError(getApiError(error));
    } finally {
      setLoading(false);
    }
  }, [unidadId]);

  useEffect(() => {
    loadSheet();
  }, [loadSheet]);

  const changeCurso = (value) => {
    const nextUnits = sortUnidades(unidadesPorCurso[value] || []);
    setCursoId(value);
    setUnidadId(nextUnits[0] ? String(nextUnits[0].id) : "");
    setSheet(null);
    setSheetError(null);
    setActa(null);
    setActaError(null);
    setActaBimestreId("");
  };

  const changeActaBimestre = (value) => {
    setActaBimestreId(value);
    setActa(null);
    setActaError(null);
  };

  const criteria = useMemo(() => {
    const set = new Set();
    (sheet?.alumnos || []).forEach((alumno) => {
      (alumno.calificaciones || []).forEach((calificacion) => {
        if (calificacion.criterio) set.add(calificacion.criterio);
      });
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [sheet]);

  const totalNotas = useMemo(
    () =>
      (sheet?.alumnos || []).reduce(
        (total, alumno) => total + (alumno.calificaciones?.length || 0),
        0
      ),
    [sheet]
  );

  const openGrade = () => {
    if (!sheet?.alumnos?.length) return;
    const last = criteria[0] || "";
    setCriterion(last);
    const next = {};
    (sheet?.alumnos || []).forEach((alumno) => {
      const found = (alumno.calificaciones || []).find(
        (calificacion) => calificacion.criterio?.toLowerCase() === last.toLowerCase()
      );
      if (found) next[alumno.matriculaId] = String(found.nota);
    });
    setGradeValues(next);
    setGradeError(null);
    setGradeOpen(true);
  };

  const handleCriterionChange = (value) => {
    setCriterion(value);
    const key = value.trim().toLowerCase();
    const next = {};
    (sheet?.alumnos || []).forEach((alumno) => {
      const found = (alumno.calificaciones || []).find(
        (calificacion) => calificacion.criterio?.toLowerCase() === key
      );
      if (found) next[alumno.matriculaId] = String(found.nota);
    });
    setGradeValues(next);
  };

  const closeGrade = () => {
    if (gradeSaving) return;
    setGradeOpen(false);
    setGradeError(null);
  };

  const saveGrades = async (event) => {
    event.preventDefault();
    if (!criterion.trim()) {
      setGradeError({ message: "Escribe el criterio de evaluación (ej. Examen, Práctica 1)." });
      return;
    }
    if (!sheet) return;

    const items = [];
    let invalid = null;

    sheet.alumnos.forEach((alumno) => {
      const raw = gradeValues[alumno.matriculaId];
      if (raw === undefined || raw === null || String(raw).trim() === "") return;

      const normalized = String(raw).trim().replace(",", ".");
      if (!/^\d{1,2}(\.\d{1,2})?$/.test(normalized)) {
        invalid = `La nota de ${alumno.estudianteNombre} debe ser un número entre 0 y 20 con hasta dos decimales.`;
        return;
      }
      const value = Number(normalized);
      if (value < 0 || value > 20) {
        invalid = `La nota de ${alumno.estudianteNombre} debe estar entre 0.00 y 20.00.`;
        return;
      }
      items.push({
        matriculaId: alumno.matriculaId,
        criterio: criterion.trim(),
        nota: Number(value.toFixed(2)),
      });
    });

    if (invalid) {
      setGradeError({ message: invalid });
      return;
    }
    if (!items.length) {
      setGradeError({ message: "Ingresa al menos una nota para guardar." });
      return;
    }

    setGradeSaving(true);
    setGradeError(null);
    try {
      const updated = await docenteService.registrarCalificaciones(selectedUnit.id, items);
      setSheet(updated);
      setGradeOpen(false);
      showToast("success", `${items.length} nota(s) guardada(s) en la unidad.`);
      onReload();
    } catch (error) {
      setGradeError(getApiError(error));
    } finally {
      setGradeSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await docenteService.eliminarCalificacion(deleteTarget.calificacion.id);
      showToast("success", "Nota eliminada.");
      setDeleteTarget(null);
      loadSheet();
      onReload();
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const loadActa = async () => {
    if (!selectedCurso || !actaBimestreId) {
      showToast("error", "Selecciona un bimestre para consultar el acta.");
      return;
    }
    setActaLoading(true);
    setActaError(null);
    try {
      const data = await docenteService.actaCurso(selectedCurso.id, Number(actaBimestreId));
      setActa(data);
    } catch (error) {
      setActa(null);
      setActaError(getApiError(error));
    } finally {
      setActaLoading(false);
    }
  };

  const actaUnits = useMemo(() => {
    const map = new Map();
    (acta?.alumnos || []).forEach((alumno) => {
      (alumno.unidades || []).forEach((unidad) => {
        if (!map.has(unidad.unidadId)) map.set(unidad.unidadId, unidad);
      });
    });
    return [...map.values()].sort((a, b) => Number(a.numero) - Number(b.numero));
  }, [acta]);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Calificaciones por unidad</h2>
          <p className="page__sub">
            {selectedCurso
              ? `${selectedCurso.materiaNombre} · Sección ${selectedCurso.seccionEtiqueta} · ${selectedCurso.anioNombre}`
              : "Selecciona un curso para comenzar."}
          </p>
        </div>
        <div className="page__actions">
          <select className="select" value={cursoId} onChange={(event) => changeCurso(event.target.value)}>
            {cursos.map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.materiaNombre} · {curso.seccionEtiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!cursos.length ? (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <NotebookPen size={26} />
            </span>
            <p className="empty__title">Sin cursos disponibles</p>
            <p className="empty__text">Necesitas un curso asignado para registrar calificaciones.</p>
          </div>
        </section>
      ) : !unidades.length ? (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <ClipboardList size={26} />
            </span>
            <p className="empty__title">Sin unidades para calificar</p>
            <p className="empty__text">
              Primero planifica una unidad en este curso. Las notas se registran por unidad y bimestre.
            </p>
            <button
              type="button"
              className="btn btn--soft btn--sm"
              onClick={() => onNavigate("planificacion", selectedCurso?.id)}
            >
              <ClipboardList size={15} /> Ir a planificación
            </button>
          </div>
        </section>
      ) : (
        <>
          <div className="toolbar">
            <div className="toolbar__group">
              <select className="select" value={unidadId} onChange={(event) => setUnidadId(event.target.value)}>
                {unidades.map((unidad) => (
                  <option key={unidad.id} value={unidad.id}>
                    {unidad.bimestreNombre} · U{unidad.numero} · {unidad.titulo}
                  </option>
                ))}
              </select>
            </div>
            <div className="docente-toolbar-actions">
              {selectedUnit ? (
                <>
                  <span className={`badge ${UNIDAD_CLASS[selectedUnit.estado] || "badge--neutral"}`}>
                    {estadoLabel(selectedUnit.estado)}
                  </span>
                  <span className="badge badge--secondary">{totalNotas} nota(s)</span>
                </>
              ) : null}
              <button
                type="button"
                className="btn btn--primary"
                onClick={openGrade}
                disabled={!sheet || !sheet.alumnos?.length || loading}
                title={sheet && !sheet.alumnos?.length ? "La sección no tiene alumnos matriculados" : "Registrar notas"}
              >
                <Plus size={16} /> Registrar notas
              </button>
            </div>
          </div>

          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">
                  {sheet ? `Unidad ${sheet.numero}: ${sheet.titulo}` : "Hoja de la unidad"}
                </h3>
                <p className="card__sub">
                  {sheet
                    ? `${sheet.materiaNombre} · Sección ${sheet.seccionEtiqueta} · ${sheet.bimestreNombre} · ${sheet.alumnos?.length || 0} alumno(s)`
                    : "Selecciona una unidad para cargar sus notas."}
                </p>
              </div>
              {sheet ? (
                <div className="docente-grade-summary">
                  <span>
                    <NotebookPen size={15} /> {totalNotas} nota(s)
                  </span>
                  <span>
                    <Users size={15} /> {sheet.alumnos?.length || 0} alumno(s)
                  </span>
                </div>
              ) : null}
            </div>

            <div className="card__body card__body--flush">
              {loading ? (
                <div className="loading-state loading-state--inline">
                  <span className="spinner spinner--dark" />
                  <p>Cargando calificaciones de la unidad…</p>
                </div>
              ) : sheetError ? (
                <div className="empty empty--tall">
                  <span className="empty__icon">
                    <CircleX size={26} />
                  </span>
                  <p className="empty__title">No se pudo cargar la hoja</p>
                  <p className="empty__text">{sheetError.message}</p>
                  <button type="button" className="btn btn--soft btn--sm" onClick={loadSheet}>
                    Reintentar
                  </button>
                </div>
              ) : sheet && sheet.alumnos?.length ? (
                <div className="docente-grade-list">
                  {sheet.alumnos.map((alumno) => {
                    const average = averageOf(alumno.calificaciones);
                    return (
                      <article key={alumno.matriculaId} className="docente-grade-row">
                        <div className="docente-grade-row__student">
                          <span className="avatar avatar--sm">
                            {initials(
                              alumno.estudianteNombre?.split(" ")[0],
                              alumno.estudianteNombre?.split(" ").slice(1).join(" ")
                            )}
                          </span>
                          <span>
                            <strong>{alumno.estudianteNombre}</strong>
                            <small>DNI {alumno.estudianteDni}</small>
                          </span>
                          <span className={`docente-average ${average !== null && average < 11 ? "is-low" : ""}`}>
                            <small>Promedio</small>
                            <strong>{average === null ? "—" : formatNote(average)}</strong>
                          </span>
                        </div>

                        <div className="docente-grade-row__notes">
                          {alumno.calificaciones?.length ? (
                            alumno.calificaciones.map((calificacion) => (
                              <span key={calificacion.id} className="docente-grade-note">
                                <span>
                                  <small>{calificacion.criterio}</small>
                                  <strong>{formatNote(calificacion.nota)}</strong>
                                </span>
                                <button
                                  type="button"
                                  className="icon-btn icon-btn--soft icon-btn--danger"
                                  onClick={() => setDeleteTarget({ alumno, calificacion })}
                                  title="Eliminar nota"
                                >
                                  <Trash size={14} />
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="docente-grade-empty">
                              <BookOpen size={15} /> Sin notas registradas
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="empty empty--tall">
                  <span className="empty__icon">
                    <Users size={26} />
                  </span>
                  <p className="empty__title">Sin alumnos matriculados</p>
                  <p className="empty__text">Secretaría todavía no registró matrículas vigentes en esta sección.</p>
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Acta del bimestre</h3>
                <p className="card__sub">Promedios por unidad y promedio final del bimestre por alumno.</p>
              </div>
              <div className="page__actions">
                <select className="select" value={actaBimestreId} onChange={(event) => changeActaBimestre(event.target.value)}>
                  <option value="">Selecciona un bimestre</option>
                  {cursoBimestres.map((bimestre) => (
                    <option key={bimestre.id} value={bimestre.id}>
                      {bimestre.nombre}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn btn--soft" onClick={loadActa} disabled={!actaBimestreId || actaLoading}>
                  {actaLoading ? (
                    <>
                      <span className="spinner spinner--dark" /> Consultando…
                    </>
                  ) : (
                    <>Consultar acta</>
                  )}
                </button>
              </div>
            </div>
            <div className="card__body card__body--flush">
              {actaError ? (
                <div className="alert alert--error alert--inline" role="alert">
                  <CircleX size={18} />
                  <p>{actaError.message}</p>
                </div>
              ) : null}

              {!cursoBimestres.length ? (
                <div className="empty empty--compact">
                  <span className="empty__icon">
                    <ClipboardList size={22} />
                  </span>
                  <p className="empty__title">Bimestres aún no visibles</p>
                  <p className="empty__text">
                    Los bimestres se descubren a partir de las unidades planificadas. Crea una unidad para habilitar el
                    acta.
                  </p>
                </div>
              ) : acta ? (
                acta.alumnos?.length ? (
                  <>
                    <div className="docente-acta-summary">
                      <span>
                        <small>Promedio del curso</small>
                        <strong>{formatNote(acta.promedioCurso)}</strong>
                      </span>
                      <span>
                        <small>Bimestre</small>
                        <strong>{acta.bimestreNombre}</strong>
                      </span>
                      <span>
                        <small>Alumnos</small>
                        <strong>{acta.alumnos.length}</strong>
                      </span>
                    </div>
                    <div className="table-wrap docente-acta-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Alumno</th>
                            {actaUnits.map((unidad) => (
                              <th key={unidad.unidadId} title={unidad.titulo}>
                                U{unidad.numero}
                              </th>
                            ))}
                            <th>Promedio bimestre</th>
                          </tr>
                        </thead>
                        <tbody>
                          {acta.alumnos.map((alumno) => (
                            <tr key={alumno.matriculaId}>
                              <td>
                                <div className="table__user">
                                  <span className="avatar avatar--sm">
                                    {initials(
                                      alumno.estudianteNombre?.split(" ")[0],
                                      alumno.estudianteNombre?.split(" ").slice(1).join(" ")
                                    )}
                                  </span>
                                  <span>
                                    <strong>{alumno.estudianteNombre}</strong>
                                    <small>DNI {alumno.estudianteDni}</small>
                                  </span>
                                </div>
                              </td>
                              {actaUnits.map((unidad) => {
                                const found = alumno.unidades?.find(
                                  (item) => String(item.unidadId) === String(unidad.unidadId)
                                );
                                return (
                                  <td key={unidad.unidadId} className="docente-acta-value">
                                    {formatNote(found?.promedio)}
                                  </td>
                                );
                              })}
                              <td className="docente-acta-value is-final">{formatNote(alumno.promedioBimestre)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="empty empty--compact">
                    <span className="empty__icon">
                      <Users size={22} />
                    </span>
                    <p className="empty__title">Acta sin alumnos</p>
                    <p className="empty__text">No hay matrículas vigentes en la sección para este bimestre.</p>
                  </div>
                )
              ) : (
                <div className="empty empty--compact">
                  <span className="empty__icon">
                    <ClipboardList size={22} />
                  </span>
                  <p className="empty__title">Consulta el acta</p>
                  <p className="empty__text">
                    Elige un bimestre y pulsa «Consultar acta» para ver los promedios consolidados.
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <Modal
        open={gradeOpen}
        onClose={closeGrade}
        title="Registrar notas"
        subtitle={
          selectedUnit
            ? `${selectedUnit.bimestreNombre} · Unidad ${selectedUnit.numero}: ${selectedUnit.titulo}`
            : ""
        }
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={closeGrade} disabled={gradeSaving}>
              Cancelar
            </button>
            <button type="submit" form="docente-grade-form" className="btn btn--primary" disabled={gradeSaving}>
              {gradeSaving ? "Guardando…" : "Guardar notas"}
            </button>
          </>
        }
      >
        {gradeError ? (
          <div className="alert alert--error" role="alert">
            <CircleX size={18} />
            <div>
              <p>{gradeError.message}</p>
              {gradeError.fields?.length ? (
                <ul className="alert__list">
                  {gradeError.fields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}

        <form id="docente-grade-form" className="form" onSubmit={saveGrades}>
          <label className="field field--plain">
            <span className="field__label">Criterio de evaluación</span>
            <input
              className="input"
              list="docente-criteria-list"
              value={criterion}
              onChange={(event) => handleCriterionChange(event.target.value)}
              placeholder="Ej. Examen parcial, Práctica 1, Trabajo grupal…"
              maxLength={120}
              disabled={gradeSaving}
              required
            />
            <datalist id="docente-criteria-list">
              {criteria.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <small className="hint">
              El criterio identifica la nota. Si repites un criterio para un alumno, la nota se actualiza.
            </small>
          </label>

          <div className="docente-grade-form-grid">
            {(sheet?.alumnos || []).map((alumno) => (
              <label key={alumno.matriculaId} className="docente-grade-input">
                <span>
                  <strong>{alumno.estudianteNombre}</strong>
                  <small>DNI {alumno.estudianteDni}</small>
                </span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="20"
                  step="0.01"
                  value={gradeValues[alumno.matriculaId] ?? ""}
                  onChange={(event) =>
                    setGradeValues((prev) => ({ ...prev, [alumno.matriculaId]: event.target.value }))
                  }
                  placeholder="0.00"
                  disabled={gradeSaving}
                />
              </label>
            ))}
          </div>

          <div className="info-strip info-strip--soft">
            <NotebookPen size={16} />
            <p>
              Escala vigesimal de 0.00 a 20.00 con hasta dos decimales. Solo se guardan las notas que escribas. El
              bimestre debe estar abierto para registrar o eliminar notas.
            </p>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar nota"
        danger
        message={
          deleteTarget
            ? `Se eliminará la nota "${deleteTarget.calificacion.criterio}" (${formatNote(
                deleteTarget.calificacion.nota
              )}) de ${deleteTarget.alumno.estudianteNombre}.`
            : ""
        }
        confirmLabel="Eliminar nota"
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
