import { useMemo, useState } from "react";
import { BookOpen, CircleX, LibraryBig, Pencil, Plus, Power, Search } from "lucide-react";
import { adminService, getApiError } from "../../../services/api";
import { ConfirmDialog, Modal } from "../../../components/ui/Modal";

const EMPTY_FORM = { nombre: "", descripcion: "" };

export default function SubjectsView({ data, onReload, showToast }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("TODAS");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const materias = data.materias || [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return materias.filter((materia) => {
      const matchesTerm =
        !term ||
        materia.nombre.toLowerCase().includes(term) ||
        (materia.descripcion || "").toLowerCase().includes(term);
      const matchesStatus =
        status === "TODAS" ||
        (status === "ACTIVAS" && materia.activa) ||
        (status === "ARCHIVADAS" && !materia.activa);
      return matchesTerm && matchesStatus;
    });
  }, [materias, search, status]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (materia) => {
    setEditTarget(materia);
    setForm({ nombre: materia.nombre, descripcion: materia.descripcion || "" });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.nombre.trim()) {
      setFormError({ message: "El nombre de la materia es obligatorio." });
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = { nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null };
      if (editTarget) {
        await adminService.actualizarMateria(editTarget.id, payload);
        showToast("success", `Materia ${payload.nombre} actualizada.`);
      } else {
        await adminService.crearMateria(payload);
        showToast("success", `Materia ${payload.nombre} creada.`);
      }
      setModalOpen(false);
      onReload();
    } catch (error) {
      setFormError(getApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (materia) => {
    setConfirmLoading(true);
    try {
      const updated = await adminService.cambiarActivaMateria(materia.id, !materia.activa);
      showToast("success", `${materia.nombre} ${updated.activa ? "reactivada" : "archivada"}.`);
      setConfirmTarget(null);
      onReload();
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setConfirmLoading(false);
    }
  };

  const courseCount = (materiaId) => (data.cursos || []).filter((curso) => curso.materiaId === materiaId).length;

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Catálogo de materias</h2>
          <p className="page__sub">
            {materias.filter((materia) => materia.activa).length} activas de {materias.length} registradas.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          <Plus size={17} /> Nueva materia
        </button>
      </div>

      <div className="toolbar-tabs">
        <label className="search">
          <Search size={17} />
          <input
            type="search"
            placeholder="Buscar materia…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="segmented">
          {[
            { key: "TODAS", label: "Todas" },
            { key: "ACTIVAS", label: "Activas" },
            { key: "ARCHIVADAS", label: "Archivadas" },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              className={`segmented__item ${status === option.key ? "segmented__item--active" : ""}`}
              onClick={() => setStatus(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className="subject-grid">
          {filtered.map((materia) => (
            <article key={materia.id} className={`subject-card ${materia.activa ? "" : "subject-card--muted"}`}>
              <div className="subject-card__top">
                <span className={`subject-card__icon ${materia.activa ? "" : "subject-card__icon--muted"}`}>
                  <LibraryBig size={20} />
                </span>
                <span className={`badge ${materia.activa ? "badge--success" : "badge--neutral"}`}>
                  {materia.activa ? "Activa" : "Archivada"}
                </span>
              </div>
              <h3>{materia.nombre}</h3>
              <p>{materia.descripcion || "Sin descripción registrada."}</p>
              <div className="subject-card__foot">
                <span className="subject-card__count">
                  <BookOpen size={15} /> {courseCount(materia.id)} cursos
                </span>
                <div className="table__actions">
                  <button
                    type="button"
                    className="icon-btn icon-btn--soft"
                    onClick={() => openEdit(materia)}
                    title="Editar materia"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    className={`icon-btn icon-btn--soft ${materia.activa ? "icon-btn--danger" : "icon-btn--success"}`}
                    onClick={() => setConfirmTarget(materia)}
                    title={materia.activa ? "Archivar materia" : "Reactivar materia"}
                  >
                    <Power size={15} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <LibraryBig size={26} />
            </span>
            <p className="empty__title">Sin materias</p>
            <p className="empty__text">
              {materias.length
                ? "Ninguna materia coincide con los filtros."
                : "Crea la primera materia del catálogo institucional."}
            </p>
            {!materias.length ? (
              <button type="button" className="btn btn--soft btn--sm" onClick={openCreate}>
                <Plus size={15} /> Crear materia
              </button>
            ) : null}
          </div>
        </section>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          if (!saving) setModalOpen(false);
        }}
        title={editTarget ? "Editar materia" : "Nueva materia"}
        subtitle="La materia es el catálogo de lo que se enseña; no depende del año."
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" form="subject-form" className="btn btn--primary" disabled={saving}>
              {saving ? "Guardando…" : editTarget ? "Guardar cambios" : "Crear materia"}
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

        <form id="subject-form" className="form" onSubmit={handleSubmit}>
          <label className="field field--plain">
            <span className="field__label">Nombre</span>
            <input
              className="input"
              value={form.nombre}
              onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
              placeholder="Matemática"
              disabled={saving}
            />
          </label>
          <label className="field field--plain">
            <span className="field__label">Descripción (opcional)</span>
            <textarea
              className="textarea"
              rows={3}
              value={form.descripcion}
              onChange={(event) => setForm((prev) => ({ ...prev, descripcion: event.target.value }))}
              placeholder="Breve descripción de la materia"
              disabled={saving}
            />
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title={confirmTarget?.activa ? "Archivar materia" : "Reactivar materia"}
        danger={Boolean(confirmTarget?.activa)}
        message={
          confirmTarget
            ? confirmTarget.activa
              ? `La materia ${confirmTarget.nombre} se archivará: no podrá asignarse a nuevos cursos, pero los existentes se conservan.`
              : `La materia ${confirmTarget.nombre} volverá a estar disponible para nuevas asignaciones.`
            : ""
        }
        confirmLabel={confirmTarget?.activa ? "Archivar" : "Reactivar"}
        loading={confirmLoading}
        onConfirm={() => toggleActive(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
      />
    </div>
  );
}
