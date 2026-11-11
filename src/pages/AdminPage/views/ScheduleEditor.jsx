import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CircleX,
  Clock,
  Info,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { adminService, getApiError } from "../../../services/api";
import { DIA_LABELS, formatTime } from "../../../utils/format";

const DIAS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];

let blockSeq = 0;
const nextKey = () => `nuevo-${blockSeq += 1}`;

function toMinutes(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function toTime(minutes) {
  const safe = Math.min(Math.max(Number(minutes) || 0, 0), 23 * 60 + 59);
  const hours = String(Math.floor(safe / 60)).padStart(2, "0");
  const mins = String(safe % 60).padStart(2, "0");
  return `${hours}:${mins}`;
}

function minutesLabel(total) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (!hours) return `${minutes} min`;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

function durationLabel(inicio, fin) {
  const start = toMinutes(inicio);
  const end = toMinutes(fin);
  if (start == null || end == null || end <= start) return "—";
  return minutesLabel(end - start);
}

function validateBloques(bloques) {
  for (let index = 0; index < bloques.length; index += 1) {
    const bloque = bloques[index];
    if (!bloque.dia || !bloque.horaInicio || !bloque.horaFin) {
      return `Completa el día y las horas del bloque ${index + 1}.`;
    }
    const start = toMinutes(bloque.horaInicio);
    const end = toMinutes(bloque.horaFin);
    if (start == null || end == null) {
      return `Revisa las horas del bloque ${index + 1}.`;
    }
    if (end <= start) {
      return `El bloque ${index + 1} del ${DIA_LABELS[bloque.dia] || bloque.dia} debe terminar después de empezar.`;
    }
  }

  for (let i = 0; i < bloques.length; i += 1) {
    for (let j = i + 1; j < bloques.length; j += 1) {
      const a = bloques[i];
      const b = bloques[j];
      if (a.dia !== b.dia) continue;
      const startA = toMinutes(a.horaInicio);
      const endA = toMinutes(a.horaFin);
      const startB = toMinutes(b.horaInicio);
      const endB = toMinutes(b.horaFin);
      if (startA === startB) {
        return `Hay dos bloques el ${DIA_LABELS[a.dia] || a.dia} que empiezan a la misma hora.`;
      }
      if (startA < endB && startB < endA) {
        return `Los bloques del ${DIA_LABELS[a.dia] || a.dia} entre ${a.horaInicio} y ${b.horaFin} se solapan.`;
      }
    }
  }

  return null;
}

function sortBloques(bloques) {
  return [...bloques].sort(
    (a, b) =>
      DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia) ||
      String(a.horaInicio).localeCompare(String(b.horaInicio))
  );
}

export default function ScheduleEditor({ curso, onSaved, onCancel }) {
  const [bloques, setBloques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setLoadError(null);
    setFormError(null);

    adminService
      .listarHorario(curso.id)
      .then((list) => {
        if (cancelled) return;
        setBloques(
          (Array.isArray(list) ? list : []).map((bloque) => ({
            key: `b-${bloque.id}`,
            dia: bloque.dia,
            horaInicio: formatTime(bloque.horaInicio) || "08:00",
            horaFin: formatTime(bloque.horaFin) || "09:00",
          }))
        );
      })
      .catch((error) => {
        if (!cancelled) setLoadError(getApiError(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [curso.id, reloadKey]);

  const ordered = useMemo(() => sortBloques(bloques), [bloques]);

  const totalMinutes = useMemo(
    () =>
      bloques.reduce((total, bloque) => {
        const start = toMinutes(bloque.horaInicio);
        const end = toMinutes(bloque.horaFin);
        return total + (start != null && end != null && end > start ? end - start : 0);
      }, 0),
    [bloques]
  );

  const updateBloque = (key, field, value) => {
    setBloques((prev) =>
      prev.map((bloque) => (bloque.key === key ? { ...bloque, [field]: value } : bloque))
    );
    if (formError) setFormError(null);
  };

  const removeBloque = (key) => {
    setBloques((prev) => prev.filter((bloque) => bloque.key !== key));
    if (formError) setFormError(null);
  };

  const addBloque = () => {
    const counts = DIAS.map((dia) => bloques.filter((bloque) => bloque.dia === dia).length);
    const targetIndex = counts.indexOf(Math.min(...counts));
    const dia = DIAS[targetIndex] || DIAS[0];

    const ends = bloques
      .filter((bloque) => bloque.dia === dia)
      .map((bloque) => toMinutes(bloque.horaFin))
      .filter((value) => value != null);
    const lastEnd = ends.length ? Math.max(...ends) : 8 * 60;
    const start = lastEnd >= 20 * 60 ? 8 * 60 : lastEnd;

    setBloques((prev) => [
      ...prev,
      {
        key: nextKey(),
        dia,
        horaInicio: toTime(start),
        horaFin: toTime(start + 60),
      },
    ]);
    if (formError) setFormError(null);
  };

  const resetChanges = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  const handleSave = async () => {
    const problem = validateBloques(bloques);
    if (problem) {
      setFormError({ message: problem });
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const saved = await adminService.reemplazarHorario(
        curso.id,
        bloques.map((bloque) => ({
          dia: bloque.dia,
          horaInicio: bloque.horaInicio,
          horaFin: bloque.horaFin,
        }))
      );
      onSaved?.(Array.isArray(saved) ? saved : []);
    } catch (error) {
      setFormError(getApiError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="schedule-editor">
      <div className="schedule-editor__meta">
        <span className="schedule-editor__chip">
          <CalendarDays size={14} />
          {curso.seccionEtiqueta ? `Sección ${curso.seccionEtiqueta}` : "Sección —"}
        </span>
        <span className="schedule-editor__chip">
          <Clock size={14} />
          {bloques.length === 1 ? "1 bloque" : `${bloques.length} bloques`} ·{" "}
          {minutesLabel(totalMinutes)}
        </span>
        <span className="schedule-editor__chip schedule-editor__chip--soft">
          {curso.anioNombre || "Año escolar"}
        </span>
      </div>

      {loadError ? (
        <div className="alert alert--error" role="alert">
          <CircleX size={18} />
          <div>
            <p>{loadError.message}</p>
            <small>No se pudo cargar el horario actual del curso.</small>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetChanges}>
            <RefreshCw size={15} /> Reintentar
          </button>
        </div>
      ) : loading ? (
        <div className="loading-state loading-state--inline">
          <span className="spinner spinner--dark" />
          <p>Cargando horario del curso…</p>
        </div>
      ) : (
        <>
          {formError ? (
            <div className="alert alert--error" role="alert">
              <CircleX size={18} />
              <div>
                <p>{formError.message}</p>
                {formError.fields?.length ? (
                  <ul className="alert__list">
                    {formError.fields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="schedule-editor__toolbar">
            <div>
              <h4>Bloques de la semana</h4>
              <p>
                Cada bloque es una sesión semanal del curso. La asistencia se registra por bloque y
                fecha.
              </p>
            </div>
            <button type="button" className="btn btn--soft btn--sm" onClick={addBloque} disabled={saving}>
              <Plus size={15} /> Agregar bloque
            </button>
          </div>

          {ordered.length ? (
            <div className="schedule-editor__rows">
              {ordered.map((bloque, index) => (
                <div key={bloque.key} className="schedule-row">
                  <span className="schedule-row__index">{index + 1}</span>
                  <label className="schedule-row__field">
                    <span>Día</span>
                    <select
                      className="select"
                      value={bloque.dia}
                      onChange={(event) => updateBloque(bloque.key, "dia", event.target.value)}
                      disabled={saving}
                    >
                      {DIAS.map((dia) => (
                        <option key={dia} value={dia}>
                          {DIA_LABELS[dia] || dia}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="schedule-row__field">
                    <span>Inicio</span>
                    <input
                      type="time"
                      className="input"
                      step="300"
                      value={bloque.horaInicio}
                      onChange={(event) =>
                        updateBloque(bloque.key, "horaInicio", event.target.value)
                      }
                      disabled={saving}
                    />
                  </label>
                  <label className="schedule-row__field">
                    <span>Fin</span>
                    <input
                      type="time"
                      className="input"
                      step="300"
                      value={bloque.horaFin}
                      onChange={(event) => updateBloque(bloque.key, "horaFin", event.target.value)}
                      disabled={saving}
                    />
                  </label>
                  <span className="schedule-row__duration">
                    <Clock size={12} /> {durationLabel(bloque.horaInicio, bloque.horaFin)}
                  </span>
                  <button
                    type="button"
                    className="icon-btn icon-btn--soft icon-btn--danger"
                    onClick={() => removeBloque(bloque.key)}
                    disabled={saving}
                    aria-label="Quitar bloque"
                    title="Quitar bloque"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty empty--compact">
              <span className="empty__icon">
                <CalendarDays size={20} />
              </span>
              <p className="empty__title">Sin bloques en la semana</p>
              <p className="empty__text">
                Agrega el primer bloque para armar el horario semanal del curso.
              </p>
            </div>
          )}

          <div className="info-strip info-strip--soft">
            <Info size={16} />
            <p>
              El horario se guarda como una hoja semanal completa. Si el curso ya registró
              asistencias o el año está cerrado, el backend rechazará el cambio.
            </p>
          </div>

          <div className="schedule-editor__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onCancel}
              disabled={saving}
            >
              Cancelar
            </button>
            <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saving}>
              <Save size={16} /> {saving ? "Guardando…" : "Guardar horario"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
