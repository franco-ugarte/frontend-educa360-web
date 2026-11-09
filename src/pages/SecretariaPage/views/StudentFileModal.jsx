import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CircleX,
  FolderOpen,
  GraduationCap,
  BookOpen,
  Users,
} from "lucide-react";
import { getApiError, secretariaService } from "../../../services/api";
import { Modal } from "../../../components/ui/Modal";
import {
  ASISTENCIA_CLASS,
  ESTUDIANTE_CLASS,
  DIA_LABELS,
  PARENTESCO_LABELS,
  SITUACION_CLASS,
  estadoLabel,
  formatDate,
  formatTime,
  fullName,
  initials,
} from "../../../utils/format";

const TABS = [
  { key: "ficha", label: "Ficha", icon: FolderOpen },
  { key: "asistencias", label: "Asistencias", icon: CalendarDays },
  { key: "calificaciones", label: "Calificaciones", icon: BookOpen },
  { key: "historial", label: "Historial", icon: GraduationCap },
];

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function StudentFileModal({ student, onClose }) {
  const [tab, setTab] = useState("ficha");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [asistencias, setAsistencias] = useState(null);
  const [calificaciones, setCalificaciones] = useState(null);
  const [historial, setHistorial] = useState(null);

  useEffect(() => {
    if (!student) return undefined;
    let alive = true;
    setTab("ficha");
    setLoading(true);
    setError(null);
    setAsistencias(null);
    setCalificaciones(null);
    setHistorial(null);

    Promise.allSettled([
      secretariaService.asistenciasEstudiante(student.id),
      secretariaService.calificacionesEstudiante(student.id),
      secretariaService.historialEstudiante(student.id),
    ]).then(([asistenciaResult, calificacionResult, historialResult]) => {
      if (!alive) return;
      const failures = [];

      if (asistenciaResult.status === "fulfilled") setAsistencias(asistenciaResult.value);
      else failures.push(`Asistencias: ${getApiError(asistenciaResult.reason).message}`);

      if (calificacionResult.status === "fulfilled") setCalificaciones(calificacionResult.value);
      else failures.push(`Calificaciones: ${getApiError(calificacionResult.reason).message}`);

      if (historialResult.status === "fulfilled") setHistorial(historialResult.value);
      else failures.push(`Historial: ${getApiError(historialResult.reason).message}`);

      setError(failures.length ? { message: failures[0], detail: failures.length > 1 ? failures.slice(1).join(" ") : null } : null);
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [student]);

  const promedioGeneral = numberValue(calificaciones?.promedioGeneral);
  const asistenciaPct = numberValue(asistencias?.porcentaje);

  const promediosCurso = useMemo(() => {
    return (calificaciones?.promediosCurso || []).slice().sort((a, b) =>
      String(a.materiaNombre).localeCompare(String(b.materiaNombre))
    );
  }, [calificaciones]);

  const detalleNotas = useMemo(() => {
    return (calificaciones?.detalle || []).slice().sort((a, b) => {
      const curso = String(a.materiaNombre).localeCompare(String(b.materiaNombre));
      if (curso !== 0) return curso;
      return (a.unidadNumero || 0) - (b.unidadNumero || 0);
    });
  }, [calificaciones]);

  if (!student) return null;

  return (
    <Modal
      open={Boolean(student)}
      onClose={onClose}
      title={`Expediente de ${fullName(student)}`}
      subtitle={`DNI ${student.dni} · ${student.seccionEtiqueta ? `Sección ${student.seccionEtiqueta}` : "Sin matrícula vigente"}`}
      size="lg"
      footer={
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Cerrar
        </button>
      }
    >
      <div className="student-file">
        <div className="student-file__banner">
          <span className="avatar avatar--lg">{initials(student.nombres, student.apellidos)}</span>
          <div className="student-file__identity">
            <strong>{fullName(student)}</strong>
            <small>{student.email}</small>
            <div className="student-file__badges">
              <span className={`badge ${ESTUDIANTE_CLASS[student.estado] || "badge--neutral"}`}>
                {estadoLabel(student.estado)}
              </span>
              {student.situacionFinal ? (
                <span className={`badge ${SITUACION_CLASS[student.situacionFinal] || "badge--neutral"}`}>
                  Matrícula {estadoLabel(student.situacionFinal)}
                </span>
              ) : null}
              {student.activo === false ? <span className="badge badge--danger">Cuenta inactiva</span> : null}
            </div>
          </div>
          <div className="student-file__quick">
            <div>
              <small>Promedio general</small>
              <b>{promedioGeneral === null ? "—" : promedioGeneral.toFixed(2)}</b>
            </div>
            <div>
              <small>Asistencia</small>
              <b>{asistenciaPct === null ? "—" : `${asistenciaPct.toFixed(1)}%`}</b>
            </div>
          </div>
        </div>

        <div className="toolbar-tabs">
          <div className="segmented">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                className={`segmented__item ${tab === key ? "segmented__item--active" : ""}`}
                onClick={() => setTab(key)}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="alert alert--error" role="alert">
            <CircleX size={18} />
            <div>
              <p>{error.message}</p>
              {error.detail ? <small>{error.detail}</small> : null}
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="loading-state loading-state--inline">
            <span className="spinner spinner--dark" />
            <p>Cargando expediente…</p>
          </div>
        ) : (
          <>
            {tab === "ficha" ? (
              <div className="student-file__panel">
                <div className="student-file__grid">
                  <div className="info-block">
                    <span className="info-block__label">Fecha de nacimiento</span>
                    <strong>{formatDate(student.fechaNacimiento)}</strong>
                  </div>
                  <div className="info-block">
                    <span className="info-block__label">Año escolar</span>
                    <strong>{student.anioNombre || "Sin matrícula"}</strong>
                  </div>
                  <div className="info-block">
                    <span className="info-block__label">Sección</span>
                    <strong>{student.seccionEtiqueta || "Sin sección"}</strong>
                  </div>
                  <div className="info-block">
                    <span className="info-block__label">Fecha de matrícula</span>
                    <strong>{formatDate(student.fechaMatricula)}</strong>
                  </div>
                  <div className="info-block">
                    <span className="info-block__label">Situación final</span>
                    <strong>{student.situacionFinal ? estadoLabel(student.situacionFinal) : "—"}</strong>
                  </div>
                  <div className="info-block">
                    <span className="info-block__label">DNI</span>
                    <strong className="mono">{student.dni}</strong>
                  </div>
                </div>

                <div className="student-file__section">
                  <div className="student-file__section-head">
                    <h4>
                      <Users size={16} /> Apoderados vinculados
                    </h4>
                    <small>{student.apoderados?.length || 0} vínculos activos</small>
                  </div>
                  {student.apoderados?.length ? (
                    <div className="apoderado-list">
                      {student.apoderados.map((apoderado) => (
                        <div key={apoderado.id} className="apoderado-chip">
                          <span className="avatar avatar--sm">
                            {initials(apoderado.nombres?.split(" ")[0], apoderado.nombres?.split(" ").slice(1).join(" "))}
                          </span>
                          <span>
                            <strong>{apoderado.nombres}</strong>
                            <small>
                              {PARENTESCO_LABELS[apoderado.parentesco] || apoderado.parentesco}
                              {apoderado.responsablePrincipal ? " · Responsable principal" : ""}
                            </small>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="hint">Este estudiante todavía no tiene un apoderado vinculado.</p>
                  )}
                </div>
              </div>
            ) : null}

            {tab === "asistencias" ? (
              <div className="student-file__panel">
                {asistencias ? (
                  <>
                    <div className="student-file__metrics">
                      <div>
                        <small>Registros</small>
                        <b>{asistencias.total ?? 0}</b>
                      </div>
                      <div>
                        <small>Presente</small>
                        <b>{asistencias.presentes ?? 0}</b>
                      </div>
                      <div>
                        <small>Tardanza</small>
                        <b>{asistencias.tardanzas ?? 0}</b>
                      </div>
                      <div>
                        <small>Justificadas</small>
                        <b>{asistencias.justificadas ?? 0}</b>
                      </div>
                      <div>
                        <small>Faltas</small>
                        <b>{asistencias.faltas ?? 0}</b>
                      </div>
                      <div>
                        <small>Porcentaje</small>
                        <b>{asistenciaPct === null ? "—" : `${asistenciaPct.toFixed(1)}%`}</b>
                      </div>
                    </div>

                    {asistencias.detalle?.length ? (
                      <div className="table-wrap secretaria-scroll">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Materia</th>
                              <th>Bloque</th>
                              <th>Estado</th>
                              <th>Observación</th>
                            </tr>
                          </thead>
                          <tbody>
                            {asistencias.detalle.map((item) => (
                              <tr key={item.id}>
                                <td>{formatDate(item.fecha)}</td>
                                <td>{item.materiaNombre || "—"}</td>
                                <td className="muted">
                                  {item.dia
                                    ? `${DIA_LABELS[item.dia] || item.dia} · ${formatTime(item.horaInicio)}–${formatTime(item.horaFin)}`
                                    : "Día completo"}
                                </td>
                                <td>
                                  <span className={`badge ${ASISTENCIA_CLASS[item.estado] || "badge--neutral"}`}>
                                    {estadoLabel(item.estado)}
                                  </span>
                                </td>
                                <td className="muted">{item.observacion || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="empty empty--compact">
                        <span className="empty__icon">
                          <CalendarDays size={20} />
                        </span>
                        <p className="empty__title">Sin asistencias registradas</p>
                        <p className="empty__text">El año seleccionado todavía no tiene registros de asistencia.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="hint">No se pudo cargar la asistencia.</p>
                )}
              </div>
            ) : null}

            {tab === "calificaciones" ? (
              <div className="student-file__panel">
                {calificaciones ? (
                  <>
                    <div className="student-file__metrics">
                      <div>
                        <small>Promedio general</small>
                        <b>{promedioGeneral === null ? "—" : promedioGeneral.toFixed(2)}</b>
                      </div>
                      <div>
                        <small>Cursos con notas</small>
                        <b>{promediosCurso.length}</b>
                      </div>
                      <div>
                        <small>Notas registradas</small>
                        <b>{detalleNotas.length}</b>
                      </div>
                    </div>

                    {promediosCurso.length ? (
                      <div className="student-file__section">
                        <div className="student-file__section-head">
                          <h4>
                            <BookOpen size={16} /> Promedio por curso
                          </h4>
                        </div>
                        <div className="promedio-grid">
                          {promediosCurso.map((curso) => (
                            <div key={curso.cursoId} className="promedio-card">
                              <span>{curso.materiaNombre}</span>
                              <strong>{numberValue(curso.promedio)?.toFixed(2) ?? "—"}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {detalleNotas.length ? (
                      <div className="table-wrap secretaria-scroll">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Materia</th>
                              <th>Bimestre</th>
                              <th>Unidad</th>
                              <th>Criterio</th>
                              <th>Nota</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detalleNotas.map((nota) => (
                              <tr key={nota.id}>
                                <td>{nota.materiaNombre}</td>
                                <td className="muted">{nota.bimestreNombre}</td>
                                <td className="muted">
                                  {nota.unidadNumero ? `${nota.unidadNumero}. ${nota.unidadTitulo || ""}` : "—"}
                                </td>
                                <td>{nota.criterio}</td>
                                <td>
                                  <strong className="secretaria-note">
                                    {numberValue(nota.nota)?.toFixed(2) ?? "—"}
                                  </strong>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="empty empty--compact">
                        <span className="empty__icon">
                          <BookOpen size={20} />
                        </span>
                        <p className="empty__title">Sin calificaciones</p>
                        <p className="empty__text">Todavía no hay notas registradas para este estudiante.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="hint">No se pudieron cargar las calificaciones.</p>
                )}
              </div>
            ) : null}

            {tab === "historial" ? (
              <div className="student-file__panel">
                {historial ? (
                  historial.anios?.length ? (
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Año</th>
                            <th>Sección</th>
                            <th>Situación</th>
                            <th>Promedio</th>
                            <th>Asistencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historial.anios.map((anio) => (
                            <tr key={anio.matriculaId}>
                              <td>
                                <strong>{anio.anioNombre}</strong>
                                <small className="secretaria-block-sub">{anio.grado ? `${anio.grado}° de secundaria` : ""}</small>
                              </td>
                              <td>{anio.seccionEtiqueta}</td>
                              <td>
                                <span className={`badge ${SITUACION_CLASS[anio.situacionFinal] || "badge--neutral"}`}>
                                  {estadoLabel(anio.situacionFinal)}
                                </span>
                              </td>
                              <td>
                                <strong>{numberValue(anio.promedioGeneral)?.toFixed(2) ?? "—"}</strong>
                              </td>
                              <td>
                                <strong>
                                  {numberValue(anio.asistenciaPorcentaje)?.toFixed(1) ?? "0.0"}%
                                </strong>
                                <small className="secretaria-block-sub">
                                  {anio.asistenciasEfectivas ?? 0} / {anio.totalAsistencias ?? 0} efectivas
                                </small>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty empty--compact">
                      <span className="empty__icon">
                        <GraduationCap size={20} />
                      </span>
                      <p className="empty__title">Sin historial</p>
                      <p className="empty__text">El alumno todavía no tiene matrículas cerradas.</p>
                    </div>
                  )
                ) : (
                  <p className="hint">No se pudo cargar el historial.</p>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </Modal>
  );
}
