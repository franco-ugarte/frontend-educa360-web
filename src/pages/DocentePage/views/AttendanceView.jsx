import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Clock,
  RotateCcw,
  Save,
  Users,
} from "lucide-react";
import { docenteService, getApiError } from "../../../services/api";
import {
  ASISTENCIA_CLASS,
  DIA_LABELS,
  estadoLabel,
  formatDate,
  initials,
} from "../../../utils/format";
import {
  dateMatchesDia,
  sortHorario,
  suggestDateForBlock,
  todayISO,
} from "../docenteUtils";

function markFromRow(row) {
  if (!row) return { asistio: null, observacion: "" };
  if (row.estado === "JUSTIFICADA") {
    return { asistio: true, observacion: row.observacion || "", readOnly: true };
  }
  if (row.estado === "FALTA") {
    return { asistio: false, observacion: row.observacion || "" };
  }
  if (row.estado === "PRESENTE" || row.estado === "TARDANZA") {
    return { asistio: true, observacion: row.observacion || "" };
  }
  return { asistio: null, observacion: row.observacion || "" };
}

function initialMarks(sheet) {
  const next = {};
  (sheet?.asistencias || []).forEach((row) => {
    next[row.matriculaId] = markFromRow(row);
  });
  return next;
}

export default function AttendanceView({
  cursos,
  horariosPorCurso,
  unidadesPorCurso,
  initialCursoId,
  showToast,
}) {
  const initialCourse = String(initialCursoId || cursos[0]?.id || "");
  const initialBlocks = sortHorario(horariosPorCurso[initialCourse] || []);
  const initialBlock = initialBlocks[0] || null;

  const [cursoId, setCursoId] = useState(initialCourse);
  const [bloqueId, setBloqueId] = useState(initialBlock ? String(initialBlock.id) : "");
  const [fecha, setFecha] = useState(() =>
    initialBlock ? suggestDateForBlock(initialBlock, unidadesPorCurso[initialCourse] || []) : todayISO()
  );
  const [sheet, setSheet] = useState(null);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const bloques = useMemo(
    () => sortHorario(horariosPorCurso[cursoId] || []),
    [horariosPorCurso, cursoId]
  );
  const selectedCurso = cursos.find((curso) => String(curso.id) === String(cursoId)) || null;
  const selectedBloque = bloques.find((bloque) => String(bloque.id) === String(bloqueId)) || null;
  const today = todayISO();

  const diaOk = Boolean(selectedBloque && fecha && dateMatchesDia(fecha, selectedBloque.dia));
  const fechaFutura = Boolean(fecha && fecha > today);
  const canLoad = Boolean(selectedCurso && selectedBloque && fecha && diaOk && !fechaFutura);

  useEffect(() => {
    if (!selectedBloque) {
      setSheet(null);
      setMarks({});
      return undefined;
    }
    if (!canLoad) {
      setSheet(null);
      setMarks({});
      setLoadError(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    docenteService
      .listarAsistencia(selectedCurso.id, selectedBloque.id, fecha)
      .then((data) => {
        if (cancelled) return;
        setSheet(data);
        setMarks(initialMarks(data));
      })
      .catch((error) => {
        if (cancelled) return;
        setSheet(null);
        setMarks({});
        setLoadError(getApiError(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canLoad, selectedCurso?.id, selectedBloque?.id, fecha]);

  const changeCurso = (value) => {
    const nextBlocks = sortHorario(horariosPorCurso[value] || []);
    const nextBlock = nextBlocks[0] || null;
    setCursoId(value);
    setBloqueId(nextBlock ? String(nextBlock.id) : "");
    setFecha(nextBlock ? suggestDateForBlock(nextBlock, unidadesPorCurso[value] || []) : todayISO());
    setSheet(null);
    setMarks({});
    setLoadError(null);
  };

  const changeBloque = (value) => {
    const nextBlock = bloques.find((bloque) => String(bloque.id) === String(value)) || null;
    setBloqueId(value);
    setFecha(nextBlock ? suggestDateForBlock(nextBlock, unidadesPorCurso[cursoId] || []) : todayISO());
    setSheet(null);
    setMarks({});
    setLoadError(null);
  };

  const setMark = (matriculaId, asistio) => {
    setMarks((prev) => ({
      ...prev,
      [matriculaId]: { ...(prev[matriculaId] || { observacion: "" }), asistio },
    }));
  };

  const setObservation = (matriculaId, observacion) => {
    setMarks((prev) => ({
      ...prev,
      [matriculaId]: { ...(prev[matriculaId] || { asistio: null }), observacion },
    }));
  };

  const filas = sheet?.asistencias || [];
  const editableRows = filas.filter((row) => row.estado !== "JUSTIFICADA");
  const markedRows = editableRows.filter((row) => marks[row.matriculaId]?.asistio !== null && marks[row.matriculaId]?.asistio !== undefined);
  const presentCount = filas.filter((row) => marks[row.matriculaId]?.asistio === true).length;
  const absentCount = filas.filter((row) => marks[row.matriculaId]?.asistio === false).length;
  const unmarkedCount = filas.filter(
    (row) => row.estado !== "JUSTIFICADA" && (marks[row.matriculaId]?.asistio === null || marks[row.matriculaId]?.asistio === undefined)
  ).length;
  const justifiedCount = filas.filter((row) => row.estado === "JUSTIFICADA").length;

  const handleReset = () => {
    setMarks(initialMarks(sheet));
    showToast("info", "Cambios locales descartados. Se restauró la última hoja guardada.");
  };

  const handleSave = async () => {
    if (!selectedCurso || !selectedBloque) return;
    const asistencias = editableRows
      .filter((row) => marks[row.matriculaId]?.asistio !== null && marks[row.matriculaId]?.asistio !== undefined)
      .map((row) => ({
        matriculaId: row.matriculaId,
        asistio: Boolean(marks[row.matriculaId].asistio),
        observacion: marks[row.matriculaId]?.observacion?.trim() || null,
      }));

    if (!asistencias.length) {
      showToast("error", "Marca al menos un alumno como presente o ausente antes de guardar.");
      return;
    }

    setSaving(true);
    try {
      const updated = await docenteService.registrarAsistencia(selectedCurso.id, {
        bloqueId: selectedBloque.id,
        fecha,
        asistencias,
      });
      setSheet(updated);
      setMarks(initialMarks(updated));
      showToast("success", "Asistencia de la clase registrada.");
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Hoja de asistencia</h2>
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
              <ClipboardCheck size={26} />
            </span>
            <p className="empty__title">Sin cursos disponibles</p>
            <p className="empty__text">Necesitas un curso asignado para registrar asistencia.</p>
          </div>
        </section>
      ) : !bloques.length ? (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <CalendarDays size={26} />
            </span>
            <p className="empty__title">Curso sin horario</p>
            <p className="empty__text">
              El administrador todavía no registró bloques de horario para este curso. La asistencia se organiza por
              bloque y fecha, así que necesitas al menos uno.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className="card docente-attendance-toolbar-card">
            <div className="docente-attendance-toolbar">
              <label className="field field--plain">
                <span className="field__label">Bloque de horario</span>
                <select className="select" value={bloqueId} onChange={(event) => changeBloque(event.target.value)}>
                  {bloques.map((bloque) => (
                    <option key={bloque.id} value={bloque.id}>
                      {DIA_LABELS[bloque.dia] || bloque.dia} · {String(bloque.horaInicio || "").slice(0, 5)} —{" "}
                      {String(bloque.horaFin || "").slice(0, 5)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field field--plain">
                <span className="field__label">Fecha de la clase</span>
                <input
                  className="input"
                  type="date"
                  value={fecha}
                  max={today}
                  onChange={(event) => setFecha(event.target.value)}
                />
              </label>

              <div className="docente-attendance-toolbar__hint">
                <Clock size={16} />
                <span>
                  {selectedBloque
                    ? `${DIA_LABELS[selectedBloque.dia] || selectedBloque.dia} · ${String(
                        selectedBloque.horaInicio || ""
                      ).slice(0, 5)} — ${String(selectedBloque.horaFin || "").slice(0, 5)}`
                    : "Selecciona un bloque"}
                </span>
              </div>

              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleReset}
                disabled={!sheet || saving}
                title="Restaurar la última hoja guardada"
              >
                <RotateCcw size={16} /> Restaurar
              </button>
            </div>

            {!diaOk ? (
              <div className="alert alert--error alert--inline" role="alert">
                <CircleX size={18} />
                <div>
                  <p>
                    La fecha {formatDate(fecha)} no corresponde al día del bloque (
                    {DIA_LABELS[selectedBloque?.dia] || selectedBloque?.dia}). Elige una fecha que caiga en ese día.
                  </p>
                </div>
              </div>
            ) : null}

            {fechaFutura ? (
              <div className="alert alert--error alert--inline" role="alert">
                <CircleX size={18} />
                <div>
                  <p>No se puede registrar asistencia de una fecha futura.</p>
                </div>
              </div>
            ) : null}

            {loadError ? (
              <div className="alert alert--error alert--inline" role="alert">
                <CircleX size={18} />
                <div>
                  <p>{loadError.message}</p>
                  <small>Verifica que la fecha pertenezca a un bimestre abierto del año.</small>
                </div>
              </div>
            ) : null}
          </section>

          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Alumnos de la sección</h3>
                <p className="card__sub">
                  {loading
                    ? "Cargando la hoja de clase…"
                    : sheet
                      ? `${filas.length} alumno(s) · ${presentCount} presente(s) · ${absentCount} falta(s) · ${unmarkedCount} sin marcar`
                      : "Selecciona una fecha válida para cargar la hoja."}
                </p>
              </div>
              {sheet ? (
                <div className="docente-attendance-summary">
                  <span className="docente-attendance-summary__item is-present">
                    <CircleCheck size={15} /> {presentCount}
                  </span>
                  <span className="docente-attendance-summary__item is-absent">
                    <CircleX size={15} /> {absentCount}
                  </span>
                  <span className="docente-attendance-summary__item is-pending">
                    <Users size={15} /> {unmarkedCount}
                  </span>
                  {justifiedCount ? (
                    <span className="docente-attendance-summary__item is-justified">
                      <ClipboardCheck size={15} /> {justifiedCount} justificada(s)
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="card__body card__body--flush">
              {loading ? (
                <div className="loading-state loading-state--inline">
                  <span className="spinner spinner--dark" />
                  <p>Cargando asistencia del bloque…</p>
                </div>
              ) : !canLoad ? (
                <div className="empty empty--tall">
                  <span className="empty__icon">
                    <CalendarDays size={26} />
                  </span>
                  <p className="empty__title">Elige una fecha válida</p>
                  <p className="empty__text">
                    La fecha debe coincidir con el día del bloque y estar dentro de un bimestre abierto.
                  </p>
                </div>
              ) : sheet && filas.length ? (
                <div className="docente-attendance-list">
                  {filas.map((row) => {
                    const mark = marks[row.matriculaId] || markFromRow(row);
                    const readOnly = row.estado === "JUSTIFICADA";
                    return (
                      <article
                        key={row.matriculaId}
                        className={`docente-attendance-row ${readOnly ? "is-readonly" : ""}`}
                      >
                        <div className="docente-attendance-row__student">
                          <span className="avatar avatar--sm">
                            {initials(
                              row.estudianteNombre?.split(" ")[0],
                              row.estudianteNombre?.split(" ").slice(1).join(" ")
                            )}
                          </span>
                          <span>
                            <strong>{row.estudianteNombre}</strong>
                            <small>DNI {row.estudianteDni}</small>
                          </span>
                          <span className={`badge ${ASISTENCIA_CLASS[row.estado] || "badge--neutral"}`}>
                            {row.estado ? estadoLabel(row.estado) : "Sin registrar"}
                          </span>
                        </div>

                        <div className="docente-attendance-row__controls">
                          {readOnly ? (
                            <span className="docente-attendance-readonly">
                              <ClipboardCheck size={15} />
                              Justificada por secretaría
                            </span>
                          ) : (
                            <div className="docente-toggle">
                              <button
                                type="button"
                                className={`docente-toggle__btn is-present ${mark.asistio === true ? "is-active" : ""}`}
                                onClick={() => setMark(row.matriculaId, true)}
                                disabled={saving}
                              >
                                <CircleCheck size={15} /> Asistió
                              </button>
                              <button
                                type="button"
                                className={`docente-toggle__btn is-absent ${mark.asistio === false ? "is-active" : ""}`}
                                onClick={() => setMark(row.matriculaId, false)}
                                disabled={saving}
                              >
                                <CircleX size={15} /> Faltó
                              </button>
                            </div>
                          )}

                          <input
                            className="input docente-attendance-row__obs"
                            value={mark.observacion || ""}
                            onChange={(event) => setObservation(row.matriculaId, event.target.value)}
                            placeholder={readOnly ? "Observación de secretaría" : "Observación (opcional)"}
                            maxLength={500}
                            disabled={saving || readOnly}
                          />
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
                  <p className="empty__text">
                    Secretaría todavía no registró matrículas vigentes en esta sección.
                  </p>
                </div>
              )}
            </div>

            {sheet && filas.length ? (
              <div className="docente-attendance-footer">
                <span>
                  {markedRows.length} de {editableRows.length} alumno(s) marcados para guardar.
                  {justifiedCount ? " Las filas justificadas se conservan sin cambios." : ""}
                </span>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleSave}
                  disabled={saving || !markedRows.length}
                >
                  {saving ? (
                    <>
                      <span className="spinner" /> Guardando…
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Guardar asistencia
                    </>
                  )}
                </button>
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
