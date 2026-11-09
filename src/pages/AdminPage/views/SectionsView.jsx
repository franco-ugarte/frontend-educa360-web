import { useMemo, useState } from "react";
import { CircleX, GraduationCap, MapPin, Pencil, Plus, School } from "lucide-react";
import { adminService, getApiError } from "../../../services/api";
import { Modal } from "../../../components/ui/Modal";
import { fullName } from "../../../utils/format";

const GRADOS = [1, 2, 3, 4, 5];

const EMPTY_FORM = { grado: "1", letra: "A", aula: "", tutorId: "", anioId: "" };

export default function SectionsView({ data, onReload, showToast }) {
  const anios = useMemo(
    () => [...(data.anios || [])].sort((a, b) => (b.anio || 0) - (a.anio || 0)),
    [data.anios]
  );
  const openYear = anios.find((anio) => anio.estado === "ABIERTO") || anios[0] || null;

  const [filterYear, setFilterYear] = useState(openYear?.id || "");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const effectiveYear = filterYear || openYear?.id || "";
  const secciones = (data.secciones || []).filter(
    (seccion) => !effectiveYear || String(seccion.anioId) === String(effectiveYear)
  );
  const docentes = data.docentes || [];

  const openCreate = () => {
    setEditTarget(null);
    setForm({
      ...EMPTY_FORM,
      anioId: String(effectiveYear || ""),
      letra: "A",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (seccion) => {
    setEditTarget(seccion);
    setForm({
      grado: String(seccion.grado),
      letra: seccion.letra,
      aula: seccion.aula || "",
      tutorId: seccion.tutorId ? String(seccion.tutorId) : "",
      anioId: String(seccion.anioId),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.anioId) {
      setFormError({ message: "Selecciona un año escolar." });
      return;
    }
    if (!/^[A-Z]$/.test(form.letra)) {
      setFormError({ message: "La letra debe ser una sola mayúscula (A, B, C…)." });
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        grado: Number(form.grado),
        letra: form.letra,
        aula: form.aula.trim() || null,
        tutorId: form.tutorId ? Number(form.tutorId) : null,
        anioId: Number(form.anioId),
      };
      if (editTarget) {
        await adminService.actualizarSeccion(editTarget.id, payload);
        showToast("success", `Sección ${form.grado}°${form.letra} actualizada.`);
      } else {
        await adminService.crearSeccion(payload);
        showToast("success", `Sección ${form.grado}°${form.letra} creada.`);
      }
      setModalOpen(false);
      onReload();
    } catch (error) {
      setFormError(getApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const cursoCount = (seccionId) => (data.cursos || []).filter((curso) => curso.seccionId === seccionId).length;

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Secciones</h2>
          <p className="page__sub">Grupos de alumnos por año escolar. La sección no se mueve de año.</p>
        </div>
        <div className="page__actions">
          <select className="select" value={effectiveYear} onChange={(event) => setFilterYear(event.target.value)}>
            {anios.map((anio) => (
              <option key={anio.id} value={anio.id}>
                {anio.nombre}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn--primary" onClick={openCreate} disabled={!anios.length}>
            <Plus size={17} /> Nueva sección
          </button>
        </div>
      </div>

      {!anios.length ? (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <School size={26} />
            </span>
            <p className="empty__title">Primero crea un año escolar</p>
            <p className="empty__text">Las secciones siempre pertenecen a un año académico.</p>
          </div>
        </section>
      ) : secciones.length ? (
        <div className="section-grid">
          {secciones
            .slice()
            .sort((a, b) => a.grado - b.grado || a.letra.localeCompare(b.letra))
            .map((seccion) => (
              <article key={seccion.id} className="section-card">
                <div className="section-card__top">
                  <span className="section-card__badge">{seccion.etiqueta}</span>
                  <button
                    type="button"
                    className="icon-btn icon-btn--soft"
                    onClick={() => openEdit(seccion)}
                    title="Editar sección"
                  >
                    <Pencil size={15} />
                  </button>
                </div>
                <h3>{seccion.grado}° {seccion.letra}</h3>
                <p className="section-card__year">{seccion.anioNombre}</p>
                <div className="section-card__meta">
                  <span>
                    <MapPin size={15} /> {seccion.aula || "Aula sin asignar"}
                  </span>
                  <span>
                    <GraduationCap size={15} /> {seccion.tutorNombre || "Sin tutor"}
                  </span>
                  <span>
                    <School size={15} /> {cursoCount(seccion.id)} cursos
                  </span>
                </div>
              </article>
            ))}
        </div>
      ) : (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <School size={26} />
            </span>
            <p className="empty__title">Sin secciones en este año</p>
            <p className="empty__text">Crea la primera sección (por ejemplo, 3°A) para este año escolar.</p>
            <button type="button" className="btn btn--soft btn--sm" onClick={openCreate}>
              <Plus size={15} /> Crear sección
            </button>
          </div>
        </section>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          if (!saving) setModalOpen(false);
        }}
        title={editTarget ? `Editar sección ${editTarget.etiqueta}` : "Nueva sección"}
        subtitle="Solo secundaria: grados 1 a 5. El aula es texto libre."
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" form="section-form" className="btn btn--primary" disabled={saving}>
              {saving ? "Guardando…" : editTarget ? "Guardar cambios" : "Crear sección"}
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

        <form id="section-form" className="form" onSubmit={handleSubmit}>
          <div className="form-grid form-grid--2">
            <label className="field field--plain">
              <span className="field__label">Grado</span>
              <select className="select" name="grado" value={form.grado} onChange={handleChange} disabled={saving}>
                {GRADOS.map((grado) => (
                  <option key={grado} value={String(grado)}>
                    {grado}° de secundaria
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--plain">
              <span className="field__label">Letra</span>
              <input
                className="input input--short"
                name="letra"
                value={form.letra}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, letra: event.target.value.toUpperCase().slice(0, 1) }))
                }
                maxLength={1}
                placeholder="A"
                disabled={saving}
              />
            </label>
          </div>

          <div className="form-grid form-grid--2">
            <label className="field field--plain">
              <span className="field__label">Año escolar</span>
              <select
                className="select"
                name="anioId"
                value={form.anioId}
                onChange={handleChange}
                disabled={saving || Boolean(editTarget)}
              >
                <option value="">Selecciona un año</option>
                {anios.map((anio) => (
                  <option key={anio.id} value={anio.id}>
                    {anio.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--plain">
              <span className="field__label">Aula (opcional)</span>
              <input
                className="input"
                name="aula"
                value={form.aula}
                onChange={handleChange}
                placeholder="A-201"
                disabled={saving}
              />
            </label>
          </div>

          <label className="field field--plain">
            <span className="field__label">Docente tutor (opcional)</span>
            <select className="select" name="tutorId" value={form.tutorId} onChange={handleChange} disabled={saving}>
              <option value="">Sin tutor asignado</option>
              {docentes.map((docente) => (
                <option key={docente.id} value={docente.id}>
                  {fullName(docente)} {docente.titulo ? `· ${docente.titulo}` : ""}
                </option>
              ))}
            </select>
          </label>
        </form>
      </Modal>
    </div>
  );
}
