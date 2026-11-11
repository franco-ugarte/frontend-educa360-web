import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck2,
  CalendarDays,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Clock,
} from "lucide-react";
import { apoderadoService, getApiError } from "../../../services/api";
import {
  ASISTENCIA_CLASS,
  DIA_LABELS,
  estadoLabel,
  formatDate,
  percent,
} from "../../../utils/format";
import { attendanceTone, hijoName } from "../apoderadoUtils";

function sortDetail(detalle = []) {
  return [...detalle].sort(
    (a, b) =>
      new Date(b.fecha || 0) - new Date(a.fecha || 0) ||
      String(b.horaInicio || "").localeCompare(String(a.horaInicio || ""))
  );
}

export default function AttendanceView({ hijo, bimestres = [], initialData }) {
  const [scope, setScope] = useState("");
  const [data, setData] = useState(initialData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setScope("");
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
      .asistencias(hijo.estudianteId, { bimestreId: Number(scope) })
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

  const detalle = useMemo(() => sortDetail(data?.detalle || []), [data]);
  const porcentaje = data?.porcentaje ?? null;
  const tone = attendanceTone(porcentaje);
  const percentageValue = porcentaje == null ? 0 : Math.max(0, Math.min(100, Number(porcentaje)));
  const scopeLabel = data?.bimestreNombre || "Año escolar completo";

  const stats = [
    {
      label: "Registros de clase",
      value: data?.total ?? 0,
      icon: ClipboardCheck,
      tone: "primary",
      hint: scopeLabel,
    },
    {
      label: "Asistencias efectivas",
      value: data?.efectivas ?? 0,
      icon: CircleCheck,
      tone: "success",
      hint: "Presente, tardanza y justificada",
    },
    {
      label: "Faltas",
      value: data?.faltas ?? 0,
      icon: CircleX,
      tone: data?.faltas ? "danger" : "neutral",
      hint: "Inasistencias injustificadas",
    },
    {
      label: "Porcentaje",
      value: porcentaje == null ? "—" : `${Number(porcentaje).toFixed(1)}%`,
      icon: CalendarCheck2,
      tone: tone === "danger" ? "danger" : "info",
      hint: "Mínimo 70% para aprobar",
    },
  ];

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Asistencia de {hijoName(hijo)}</h2>
          <p className="page__sub">
            Historial de bloques registrados · {scopeLabel}. El mínimo para aprobar es 70%.
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
        </div>
      </div>

      {error ? (
        <div className="alert alert--error alert--inline" role="alert">
          <CircleX size={18} />
          <div>
            <p>{error.message}</p>
            <small>No se pudo cargar la asistencia de este bimestre.</small>
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
          <p>Cargando asistencia del bimestre…</p>
        </div>
      ) : !data ? (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <CalendarCheck2 size={26} />
            </span>
            <p className="empty__title">Sin registros de asistencia</p>
            <p className="empty__text">
              Cuando los docentes registren la hoja de clase, verás aquí el detalle por fecha y bloque.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className="apoderado-summary-grid">
            {stats.map(({ label, value, icon: Icon, tone: statTone, hint }) => (
              <article key={label} className="stat-card">
                <span className={`stat-card__icon stat-card__icon--${statTone}`}>
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

          <section className="card apoderado-attendance-summary">
            <div className="card__body">
              <div className="apoderado-attendance-head">
                <div>
                  <h3 className="card__title">Cumplimiento de asistencia</h3>
                  <p className="card__sub">
                    {data.efectivas} de {data.total} bloques efectivos · {data.faltas} falta(s)
                  </p>
                </div>
                <span className={`apoderado-attendance-percent is-${tone}`}>
                  {porcentaje == null ? "—" : `${Number(porcentaje).toFixed(1)}%`}
                </span>
              </div>

              <div className="apoderado-attendance-bar">
                <span
                  className={`apoderado-attendance-bar__fill is-${tone}`}
                  style={{ width: `${percentageValue}%` }}
                />
              </div>

              <div className="apoderado-attendance-breakdown">
                <span className="is-present">
                  <CircleCheck size={14} /> {data.presentes} presente(s)
                </span>
                <span className="is-late">
                  <Clock size={14} /> {data.tardanzas} tardanza(s)
                </span>
                <span className="is-justified">
                  <ClipboardCheck size={14} /> {data.justificadas} justificada(s)
                </span>
                <span className="is-absent">
                  <CircleX size={14} /> {data.faltas} falta(s)
                </span>
              </div>

              {porcentaje != null && Number(porcentaje) < 70 ? (
                <div className="alert alert--error alert--inline" role="alert">
                  <CircleX size={18} />
                  <div>
                    <p>La asistencia del representado está por debajo del mínimo de 70%.</p>
                    <small>
                      Regulariza las inasistencias o presenta la justificación correspondiente desde la
                      sección Justificaciones.
                    </small>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Historial por bloque</h3>
                <p className="card__sub">
                  {detalle.length} registro(s) · {scopeLabel}
                </p>
              </div>
              <span className="badge badge--secondary">{percent(data.efectivas, data.total)}% efectivo</span>
            </div>

            <div className="card__body card__body--flush">
              {detalle.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Curso</th>
                        <th>Bloque</th>
                        <th>Estado</th>
                        <th>Observación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.map((registro) => (
                        <tr key={registro.id}>
                          <td>
                            <div className="apoderado-attendance-date">
                              <strong>{formatDate(registro.fecha)}</strong>
                              <small>
                                <CalendarDays size={12} /> {DIA_LABELS[registro.dia] || registro.dia || "—"}
                              </small>
                            </div>
                          </td>
                          <td>{registro.materiaNombre}</td>
                          <td className="muted">
                            <span className="apoderado-attendance-time">
                              <Clock size={13} />
                              {String(registro.horaInicio || "").slice(0, 5)} –{" "}
                              {String(registro.horaFin || "").slice(0, 5)}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${ASISTENCIA_CLASS[registro.estado] || "badge--neutral"}`}>
                              {estadoLabel(registro.estado)}
                            </span>
                          </td>
                          <td className="muted">
                            {registro.observacion || "—"}
                            {registro.ticketId ? (
                              <span className="badge badge--info apoderado-attendance-ticket">Ticket</span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty empty--tall">
                  <span className="empty__icon">
                    <CalendarCheck2 size={26} />
                  </span>
                  <p className="empty__title">Sin registros en este bimestre</p>
                  <p className="empty__text">
                    Cambia el filtro para revisar otro periodo o espera a que se registren nuevas clases.
                  </p>
                </div>
              )}
            </div>
          </section>

          <div className="info-strip info-strip--soft">
            <ClipboardCheck size={16} />
            <p>
              Se consideran efectivas las asistencias <strong>presente</strong>, <strong>tardanza</strong> y{" "}
              <strong>justificada</strong>. Solo la falta injustificada reduce el porcentaje.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
