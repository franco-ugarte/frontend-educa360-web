import {
  BookOpen,
  CalendarCheck2,
  CircleX,
  FileText,
  GraduationCap,
  NotebookPen,
  Printer,
  UserRound,
} from "lucide-react";
import {
  ESTADO_CLASS,
  SITUACION_CLASS,
  estadoLabel,
  formatDate,
  formatNote,
} from "../../../utils/format";
import { attendanceTone, gradeTone, hijoName } from "../apoderadoUtils";

export default function BoletaView({ boleta, hijo }) {
  if (!boleta) {
    return (
      <div className="page">
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <FileText size={26} />
            </span>
            <p className="empty__title">Boleta no disponible</p>
            <p className="empty__text">
              La boleta se genera cuando el representado tiene una matrícula vigente y cursos asociados en
              el año escolar.
            </p>
          </div>
        </section>
      </div>
    );
  }

  const bimestres = boleta.bimestres || [];
  const cursos = boleta.cursos || [];
  const aprobados = cursos.filter((curso) => curso.aprobado).length;
  const attendanceLevel = attendanceTone(boleta.asistenciaPorcentaje);
  const situacion = boleta.situacionFinal || hijo?.situacionFinal || null;
  const anioNombre = boleta.anioNombre || hijo?.anioNombre || "Año escolar";
  const seccion = boleta.seccionEtiqueta || hijo?.seccionEtiqueta || "";
  const estudianteNombre = boleta.estudianteNombre || hijoName(hijo);

  const stats = [
    {
      label: "Promedio general",
      value: formatNote(boleta.promedioGeneral),
      icon: NotebookPen,
      tone: gradeTone(boleta.promedioGeneral) === "danger" ? "danger" : "primary",
      hint: "Promedio de los promedios anuales",
    },
    {
      label: "Asistencia anual",
      value:
        boleta.asistenciaPorcentaje == null
          ? "—"
          : `${Number(boleta.asistenciaPorcentaje).toFixed(1)}%`,
      icon: CalendarCheck2,
      tone: attendanceLevel === "danger" ? "danger" : "success",
      hint: `${boleta.asistenciasEfectivas ?? 0} de ${boleta.totalAsistencias ?? 0} bloques`,
    },
    {
      label: "Cursos aprobados",
      value: `${aprobados}/${cursos.length}`,
      icon: BookOpen,
      tone: aprobados === cursos.length && cursos.length ? "success" : "accent",
      hint: "Nota mínima 11.00",
    },
    {
      label: "Faltas",
      value: boleta.faltas ?? 0,
      icon: CircleX,
      tone: boleta.faltas ? "danger" : "neutral",
      hint: "Inasistencias injustificadas",
    },
  ];

  return (
    <div className="page apoderado-boleta">
      <div className="page__head">
        <div>
          <h2 className="page__title">Boleta anual de {estudianteNombre}</h2>
          <p className="page__sub">
            {anioNombre}
            {seccion ? ` · Sección ${seccion}` : ""} · Resumen calculado de notas y asistencia.
          </p>
        </div>
        <div className="page__actions apoderado-boleta-actions">
          {boleta.anioEstado ? (
            <span className={`badge ${ESTADO_CLASS[boleta.anioEstado] || "badge--neutral"}`}>
              Año {estadoLabel(boleta.anioEstado)}
            </span>
          ) : null}
          {situacion ? (
            <span className={`badge ${SITUACION_CLASS[situacion] || "badge--neutral"}`}>
              {estadoLabel(situacion)}
            </span>
          ) : null}
          <button type="button" className="btn btn--soft" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>

      <section className="card apoderado-boleta-head">
        <div className="apoderado-boleta-head__identity">
          <span className="apoderado-boleta-head__avatar">
            <GraduationCap size={26} />
          </span>
          <div>
            <h3>{estudianteNombre}</h3>
            <p>
              <UserRound size={13} /> DNI {boleta.estudianteDni || hijo?.dni || "—"}
              {seccion ? ` · Sección ${seccion}` : ""}
            </p>
            <p>
              <CalendarCheck2 size={13} /> Boleta calculada del año escolar
            </p>
          </div>
        </div>
        <div className="apoderado-boleta-head__situation">
          <small>Situación final</small>
          <span className={`badge ${SITUACION_CLASS[situacion] || "badge--neutral"}`}>
            {situacion ? estadoLabel(situacion) : "Sin definir"}
          </span>
        </div>
      </section>

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

      <section className="card">
        <div className="card__head">
          <div>
            <h3 className="card__title">Notas por curso y bimestre</h3>
            <p className="card__sub">
              {cursos.length} curso(s) · {bimestres.length} bimestre(s) en la boleta.
            </p>
          </div>
          <span className="badge badge--secondary">Escala vigesimal</span>
        </div>

        <div className="card__body card__body--flush">
          {cursos.length ? (
            <div className="table-wrap">
              <table className="table apoderado-boleta-table">
                <thead>
                  <tr>
                    <th>Curso</th>
                    {bimestres.map((bimestre) => (
                      <th key={bimestre.bimestreId} className="apoderado-boleta-col">
                        {bimestre.nombre}
                      </th>
                    ))}
                    <th className="apoderado-boleta-col">Promedio anual</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {cursos.map((curso) => (
                    <tr key={curso.cursoId}>
                      <td>
                        <div className="table__user">
                          <span className="table__icon">
                            <BookOpen size={16} />
                          </span>
                          <span>
                            <strong>{curso.materiaNombre}</strong>
                            <small>Promedio anual {formatNote(curso.promedioAnual)}</small>
                          </span>
                        </div>
                      </td>
                      {bimestres.map((bimestre) => {
                        const nota = (curso.bimestres || []).find(
                          (item) => String(item.bimestreId) === String(bimestre.bimestreId)
                        );
                        const value = nota?.promedio ?? null;
                        return (
                          <td key={bimestre.bimestreId} className="apoderado-boleta-col">
                            <span className={`apoderado-boleta-value is-${gradeTone(value)}`}>
                              {formatNote(value)}
                            </span>
                          </td>
                        );
                      })}
                      <td className="apoderado-boleta-col">
                        <span className={`apoderado-note is-${gradeTone(curso.promedioAnual)}`}>
                          {formatNote(curso.promedioAnual)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${curso.aprobado ? "badge--success" : "badge--danger"}`}>
                          {curso.aprobado ? "Aprobado" : "Desaprobado"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty empty--tall">
              <span className="empty__icon">
                <BookOpen size={26} />
              </span>
              <p className="empty__title">Sin cursos en la boleta</p>
              <p className="empty__text">
                La boleta aún no tiene cursos con información para este año escolar.
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="info-strip info-strip--soft">
        <FileText size={16} />
        <p>
          La boleta se <strong>calcula</strong> con las notas de unidades publicadas y la asistencia
          registrada; no se almacena. Si la situación aparece <strong>en curso</strong>, el año escolar
          todavía no ha cerrado.
        </p>
      </div>
    </div>
  );
}
