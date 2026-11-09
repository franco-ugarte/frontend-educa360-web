import { useMemo, useState } from "react";
import { BookOpen, CalendarDays, CircleX, Clock, GraduationCap, Plus, Trash } from "lucide-react";
import { adminService, getApiError } from "../../../services/api";
import { ConfirmDialog, Modal } from "../../../components/ui/Modal";
import { fullName } from "../../../utils/format";

const DIAS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
const DIA_LABEL = {
  LUNES: "Lunes",
  MARTES: "Martes",
  MIERCOLES: "Miércoles",
  JUEVES: "Jueves",
  VIERNES: "Viernes",
  SABADO: "Sábado",
};

export default function CoursesView({ data, onReload, showToast }) {
  const anios = useMemo(
    () => [...(data.anios || [])].sort((a, b) => (b.anio || 0) - (a.anio || 0)),
    [data.anios]
  );
  const openYear = anios.find((anio) => anio.estado === "ABIERTO") || anios[0] || null;
  const [filterYear, setFilterYear] = useState(openYear?.id || "");
  const [filterSection, setFilterSection] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ anioId: "", docenteId: "", materiaId: "", seccionId: "" });
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [scheduleCourse, setScheduleCourse] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const effectiveYear = filterYear || openYear?.id || "";
  const cursos = (data.cursos || []).filter((curso) => {
    const matchesYear = !effectiveYear || String(curso.anioId) === String(effectiveYear);
    const matchesSection = !filterSection || curso.seccionId === Number(filterSection);
    return matchesYear && matchesSection;
  });

  const seccionesDelAnio = (data.secciones || []).filter(
    (seccion) => !filterYear || seccion.anioId === Number(filterYear)
  );
  const docenteSel = (data.docentes || []).find((docente) => String(docente.id) === String(form.docenteId));
  const materiasDocente = docenteSel?.materias || [];

  const openCreate = () => {
    setForm({
      anioId: String(effectiveYear || ""),
      docenteId: "",
      materiaId: "",
      seccionId: filterSection || "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "anioId") next.seccionId = "";
      if (name === "docenteId") next.materiaId = "";
      return next;
    });
    if (formError) setFormError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.docenteId || !form.materiaId || !form.seccionId) {
      setFormError({ message: "Selecciona docente, materia y sección." });
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await adminService.crearCurso({
        docenteId: Number(form.docenteId),
        materiaId: Number(form.materiaId),
        seccionId: Number(form.seccionId),
      });
      const seccion = (data.secciones || []).find((item) => item.id === Number(form.seccionId));
      showToast("success", `Curso de ${materiasDocente.find((m) => String(m.id) === form.materiaId)?.nombre || "materia"} en ${seccion?.etiqueta || "la sección"} creado.`);
      setModalOpen(false);
      onReload();
    } catch (error) {
      setFormError(getApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const openSchedule = async (curso) => {
    setScheduleCourse(curso);
    setSchedule([]);
    setScheduleLoading(true);
    try {
      const bloques = await adminService.listarHorario(curso.id);
      setSchedule(bloques || []);
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await adminService.eliminarCurso(deleteTarget.id);
      showToast("success", `Curso de ${deleteTarget.materiaNombre} eliminado.`);
      setDeleteTarget(null);
      onReload();
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const groupedSchedule = DIAS.map((dia) => ({
    dia,
    bloques: schedule.filter((bloque) => bloque.dia === dia).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
  })).filter((group) => group.bloques.length);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Cursos</h2>
          <p className="page__sub">
            {cursos.length} cursos · Cada curso une una materia, una sección y un docente.
          </p>
        </div>
        <div className="page__actions">
          <select
            className="select"
            value={effectiveYear}
            onChange={(event) => {
              setFilterYear(event.target.value);
              setFilterSection("");
            }}
          >
            {anios.map((anio) => (
              <option key={anio.id} value={anio.id}>
                {anio.nombre}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={filterSection}
            onChange={(event) => setFilterSection(event.target.value)}
          >
            <option value="">Todas las secciones</option>
            {seccionesDelAnio.map((seccion) => (
              <option key={seccion.id} value={seccion.id}>
                {seccion.etiqueta}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn--primary" onClick={openCreate} disabled={!anios.length}>
            <Plus size={17} /> Nuevo curso
          </button>
        </div>
      </div>

      <section className="card">
        {cursos.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Materia</th>
                  <th>Sección</th>
                  <th>Docente</th>
                  <th>Año</th>
                  <th className="table__actions-col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cursos.map((curso) => (
                  <tr key={curso.id}>
                    <td>
                      <div className="table__user">
                        <span className="table__icon">
                          <BookOpen size={17} />
                        </span>
                        <span>
                          <strong>{curso.materiaNombre}</strong>
                          <small>Curso #{curso.id}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge--secondary">{curso.seccionEtiqueta}</span>
                    </td>
                    <td>{curso.docenteNombre}</td>
                    <td className="muted">{curso.anioNombre}</td>
                    <td>
                      <div className="table__actions">
                        <button
                          type="button"
                          className="icon-btn icon-btn--soft"
                          onClick={() => openSchedule(curso)}
                          title="Ver horario"
                        >
                          <Clock size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn--soft icon-btn--danger"
                          onClick={() => setDeleteTarget(curso)}
                          title="Eliminar curso"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty empty--tall">
            <span className="empty__icon">
              <GraduationCap size={26} />
            </span>
            <p className="empty__title">Sin cursos registrados</p>
            <p className="empty__text">
              {anios.length
                ? "Crea el primer curso de este año escolar."
                : "Primero crea un año escolar y sus secciones."}
            </p>
            {anios.length ? (
              <button type="button" className="btn btn--soft btn--sm" onClick={openCreate}>
                <Plus size={15} /> Crear curso
              </button>
            ) : null}
          </div>
        )}
      </section>

      <Modal
        open={modalOpen}
        onClose={() => {
          if (!saving) setModalOpen(false);
        }}
        title="Nuevo curso"
        subtitle="El docente debe tener la materia habilitada para poder dictar el curso."
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" form="course-form" className="btn btn--primary" disabled={saving}>
              {saving ? "Creando…" : "Crear curso"}
            </button>
          </>
        }
      >
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

        <form id="course-form" className="form" onSubmit={handleSubmit}>
          <div className="form-grid form-grid--2">
            <label className="field field--plain">
              <span className="field__label">Año escolar</span>
              <select className="select" name="anioId" value={form.anioId} onChange={handleFormChange} disabled={saving}>
                <option value="">Selecciona un año</option>
                {anios.map((anio) => (
                  <option key={anio.id} value={anio.id}>
                    {anio.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--plain">
              <span className="field__label">Sección</span>
              <select
                className="select"
                name="seccionId"
                value={form.seccionId}
                onChange={handleFormChange}
                disabled={saving || !form.anioId}
              >
                <option value="">Selecciona una sección</option>
                {(data.secciones || [])
                  .filter((seccion) => String(seccion.anioId) === String(form.anioId))
                  .map((seccion) => (
                    <option key={seccion.id} value={seccion.id}>
                      {seccion.etiqueta}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <label className="field field--plain">
            <span className="field__label">Docente</span>
            <select
              className="select"
              name="docenteId"
              value={form.docenteId}
              onChange={handleFormChange}
              disabled={saving}
            >
              <option value="">Selecciona un docente</option>
              {(data.docentes || []).map((docente) => (
                <option key={docente.id} value={docente.id}>
                  {fullName(docente)}
                </option>
              ))}
            </select>
          </label>

          <label className="field field--plain">
            <span className="field__label">Materia</span>
            <select
              className="select"
              name="materiaId"
              value={form.materiaId}
              onChange={handleFormChange}
              disabled={saving || !form.docenteId}
            >
              <option value="">
                {form.docenteId
                  ? materiasDocente.length
                    ? "Selecciona una materia"
                    : "El docente no tiene materias habilitadas"
                  : "Primero selecciona un docente"}
              </option>
              {materiasDocente.map((materia) => (
                <option key={materia.id} value={materia.id}>
                  {materia.nombre}
                </option>
              ))}
            </select>
          </label>

          {docenteSel ? (
            <div className="info-strip info-strip--soft">
              <GraduationCap size={16} />
              <p>
                {materiasDocente.length
                  ? `Materias habilitadas: ${materiasDocente.map((materia) => materia.nombre).join(", ")}.`
                  : "Este docente aún no tiene materias. Asígnaselas desde Usuarios → botón «Asignar materias» antes de crear el curso."}
              </p>
            </div>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={Boolean(scheduleCourse)}
        onClose={() => setScheduleCourse(null)}
        title={scheduleCourse ? `Horario · ${scheduleCourse.materiaNombre} ${scheduleCourse.seccionEtiqueta}` : "Horario"}
        subtitle="Plantilla semanal del curso. La asistencia se registra por bloque y fecha."
        size="md"
      >
        {scheduleLoading ? (
          <div className="loading-state loading-state--inline">
            <span className="spinner spinner--dark" />
            <p>Cargando horario…</p>
          </div>
        ) : groupedSchedule.length ? (
          <div className="schedule">
            {groupedSchedule.map((group) => (
              <div key={group.dia} className="schedule__day">
                <span className="schedule__label">{DIA_LABEL[group.dia]}</span>
                <div className="schedule__blocks">
                  {group.bloques.map((bloque) => (
                    <span key={bloque.id} className="schedule__block">
                      <Clock size={14} /> {bloque.horaInicio?.slice(0, 5)} — {bloque.horaFin?.slice(0, 5)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty empty--compact">
            <span className="empty__icon">
              <CalendarDays size={20} />
            </span>
            <p className="empty__title">Sin horario configurado</p>
            <p className="empty__text">El docente aún no tiene bloques asignados para este curso.</p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar curso"
        danger
        message={
          deleteTarget
            ? `Se eliminará el curso de ${deleteTarget.materiaNombre} en ${deleteTarget.seccionEtiqueta}. Solo es posible si no tiene unidades, asistencias, notas ni materiales.`
            : ""
        }
        confirmLabel="Eliminar curso"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
