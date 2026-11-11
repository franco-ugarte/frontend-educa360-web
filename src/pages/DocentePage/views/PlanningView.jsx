import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleX,
  ClipboardList,
  Eye,
  EyeOff,
  Layers,
  Pencil,
  Plus,
  Trash,
} from "lucide-react";
import { docenteService, getApiError } from "../../../services/api";
import { ConfirmDialog, Modal } from "../../../components/ui/Modal";
import { UNIDAD_CLASS, estadoLabel, formatDate } from "../../../utils/format";
import { bimestreOrder, sortUnidades } from "../docenteUtils";

const EMPTY_UNIT_FORM = {
  bimestreId: "",
  titulo: "",
  descripcion: "",
  fechaInicio: "",
  fechaFin: "",
};

const EMPTY_CONTENT_FORM = {
  titulo: "",
  descripcion: "",
  fechaPrevista: "",
};

function unitPayload(form) {
  return {
    titulo: form.titulo.trim(),
    descripcion: form.descripcion.trim() || null,
    fechaInicio: form.fechaInicio || null,
    fechaFin: form.fechaFin || null,
  };
}

export default function PlanningView({
  cursos,
  unidadesPorCurso,
  bimestres,
  initialCursoId,
  onReload,
  showToast,
}) {
  const [cursoId, setCursoId] = useState(String(initialCursoId || cursos[0]?.id || ""));
  const [bimestreFilter, setBimestreFilter] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());
  const [reorderBusy, setReorderBusy] = useState(false);
  const [stateBusy, setStateBusy] = useState(null);

  const [unitModal, setUnitModal] = useState(null);
  const [unitForm, setUnitForm] = useState(EMPTY_UNIT_FORM);
  const [unitError, setUnitError] = useState(null);
  const [unitSaving, setUnitSaving] = useState(false);

  const [deleteUnit, setDeleteUnit] = useState(null);
  const [deleteUnitBusy, setDeleteUnitBusy] = useState(false);

  const [contentModal, setContentModal] = useState(null);
  const [contentForm, setContentForm] = useState(EMPTY_CONTENT_FORM);
  const [contentError, setContentError] = useState(null);
  const [contentSaving, setContentSaving] = useState(false);

  const [deleteContent, setDeleteContent] = useState(null);
  const [deleteContentBusy, setDeleteContentBusy] = useState(false);

  useEffect(() => {
    if (initialCursoId) setCursoId(String(initialCursoId));
  }, [initialCursoId]);

  const selectedCurso = cursos.find((curso) => String(curso.id) === String(cursoId)) || null;
  const cursoBimestres = useMemo(
    () =>
      bimestres
        .filter((bimestre) => String(bimestre.anioId) === String(selectedCurso?.anioId))
        .sort((a, b) => a.order - b.order),
    [bimestres, selectedCurso?.anioId]
  );

  useEffect(() => {
    setExpanded(new Set());
    setBimestreFilter("");
  }, [cursoId]);

  const unidades = useMemo(
    () => sortUnidades(unidadesPorCurso[cursoId] || []),
    [unidadesPorCurso, cursoId]
  );

  const filteredUnits = useMemo(
    () =>
      bimestreFilter
        ? unidades.filter((unidad) => String(unidad.bimestreId) === String(bimestreFilter))
        : unidades,
    [unidades, bimestreFilter]
  );

  const grouped = useMemo(() => {
    const map = new Map();
    filteredUnits.forEach((unidad) => {
      const key = String(unidad.bimestreId);
      if (!map.has(key)) {
        map.set(key, {
          id: unidad.bimestreId,
          nombre: unidad.bimestreNombre,
          order: bimestreOrder(unidad.bimestreNombre),
          unidades: [],
        });
      }
      map.get(key).unidades.push(unidad);
    });
    return [...map.values()].sort((a, b) => a.order - b.order);
  }, [filteredUnits]);

  const toggleExpanded = (unidadId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(unidadId)) next.delete(unidadId);
      else next.add(unidadId);
      return next;
    });
  };

  const openCreateUnit = () => {
    setUnitForm({
      ...EMPTY_UNIT_FORM,
      bimestreId: bimestreFilter || String(cursoBimestres[0]?.id || ""),
    });
    setUnitError(null);
    setUnitModal({ mode: "create" });
  };

  const openEditUnit = (unidad) => {
    setUnitForm({
      bimestreId: String(unidad.bimestreId || ""),
      titulo: unidad.titulo || "",
      descripcion: unidad.descripcion || "",
      fechaInicio: unidad.fechaInicio || "",
      fechaFin: unidad.fechaFin || "",
    });
    setUnitError(null);
    setUnitModal({ mode: "edit", unidad });
  };

  const closeUnitModal = () => {
    if (unitSaving) return;
    setUnitModal(null);
    setUnitError(null);
  };

  const submitUnit = async (event) => {
    event.preventDefault();
    if (!unitForm.titulo.trim()) {
      setUnitError({ message: "El título de la unidad es obligatorio." });
      return;
    }
    if (unitModal?.mode === "create" && !unitForm.bimestreId) {
      setUnitError({ message: "Selecciona el bimestre de la unidad." });
      return;
    }
    if (unitForm.fechaInicio && unitForm.fechaFin && unitForm.fechaFin < unitForm.fechaInicio) {
      setUnitError({ message: "La fecha de fin no puede ser anterior a la fecha de inicio." });
      return;
    }

    setUnitSaving(true);
    setUnitError(null);
    try {
      if (unitModal?.mode === "edit") {
        await docenteService.actualizarUnidad(unitModal.unidad.id, unitPayload(unitForm));
        showToast("success", "Unidad actualizada.");
      } else {
        await docenteService.crearUnidad(selectedCurso.id, {
          bimestreId: Number(unitForm.bimestreId),
          ...unitPayload(unitForm),
        });
        showToast("success", "Unidad creada en el bimestre seleccionado.");
      }
      setUnitModal(null);
      onReload();
    } catch (error) {
      setUnitError(getApiError(error));
    } finally {
      setUnitSaving(false);
    }
  };

  const toggleUnitState = async (unidad) => {
    const nextState = unidad.estado === "PUBLICADA" ? "BORRADOR" : "PUBLICADA";
    setStateBusy(unidad.id);
    try {
      await docenteService.cambiarEstadoUnidad(unidad.id, nextState);
      showToast(
        "success",
        nextState === "PUBLICADA"
          ? "Unidad publicada: los alumnos ya pueden verla."
          : "Unidad despublicada: volverá a ser visible solo para ti."
      );
      onReload();
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setStateBusy(null);
    }
  };

  const confirmDeleteUnit = async () => {
    setDeleteUnitBusy(true);
    try {
      await docenteService.eliminarUnidad(deleteUnit.id);
      showToast("success", "Unidad eliminada.");
      setDeleteUnit(null);
      onReload();
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setDeleteUnitBusy(false);
    }
  };

  const openCreateContent = (unidad) => {
    setContentForm(EMPTY_CONTENT_FORM);
    setContentError(null);
    setContentModal({ mode: "create", unidad });
  };

  const openEditContent = (unidad, contenido) => {
    setContentForm({
      titulo: contenido.titulo || "",
      descripcion: contenido.descripcion || "",
      fechaPrevista: contenido.fechaPrevista || "",
    });
    setContentError(null);
    setContentModal({ mode: "edit", unidad, contenido });
  };

  const closeContentModal = () => {
    if (contentSaving) return;
    setContentModal(null);
    setContentError(null);
  };

  const submitContent = async (event) => {
    event.preventDefault();
    if (!contentForm.titulo.trim()) {
      setContentError({ message: "El título del contenido es obligatorio." });
      return;
    }

    const payload = {
      titulo: contentForm.titulo.trim(),
      descripcion: contentForm.descripcion.trim() || null,
      fechaPrevista: contentForm.fechaPrevista || null,
    };

    setContentSaving(true);
    setContentError(null);
    try {
      if (contentModal?.mode === "edit") {
        await docenteService.actualizarContenido(contentModal.contenido.id, payload);
        showToast("success", "Contenido actualizado.");
      } else {
        await docenteService.crearContenido(contentModal.unidad.id, payload);
        showToast("success", "Contenido agregado a la unidad.");
        setExpanded((prev) => new Set(prev).add(contentModal.unidad.id));
      }
      setContentModal(null);
      onReload();
    } catch (error) {
      setContentError(getApiError(error));
    } finally {
      setContentSaving(false);
    }
  };

  const moveContent = async (unidad, contenido, direction) => {
    const current = [...(unidad.contenidos || [])].sort((a, b) => Number(a.orden) - Number(b.orden));
    const index = current.findIndex((item) => item.id === contenido.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= current.length) return;

    const reordered = [...current];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    setReorderBusy(true);
    try {
      await docenteService.reordenarContenidos(
        unidad.id,
        reordered.map((item) => item.id)
      );
      onReload();
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setReorderBusy(false);
    }
  };

  const confirmDeleteContent = async () => {
    setDeleteContentBusy(true);
    try {
      await docenteService.eliminarContenido(deleteContent.contenido.id);
      showToast("success", "Contenido eliminado.");
      setDeleteContent(null);
      onReload();
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setDeleteContentBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Planificación por bimestre</h2>
          <p className="page__sub">
            {selectedCurso
              ? `${selectedCurso.materiaNombre} · Sección ${selectedCurso.seccionEtiqueta} · ${selectedCurso.anioNombre}`
              : "Selecciona un curso para ver sus unidades."}
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
          <button
            type="button"
            className="btn btn--primary"
            onClick={openCreateUnit}
            disabled={!selectedCurso || !cursoBimestres.length}
            title={
              !cursoBimestres.length
                ? "Necesitas al menos una unidad existente para descubrir un bimestre"
                : "Crear unidad"
            }
          >
            <Plus size={17} /> Nueva unidad
          </button>
        </div>
      </div>

      {!cursos.length ? (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <ClipboardList size={26} />
            </span>
            <p className="empty__title">Sin cursos disponibles</p>
            <p className="empty__text">Cuando tengas cursos asignados podrás planificar sus unidades y contenidos.</p>
          </div>
        </section>
      ) : !cursoBimestres.length ? (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <CalendarDays size={26} />
            </span>
            <p className="empty__title">Bimestres aún no visibles</p>
            <p className="empty__text">
              Tu cuenta docente no puede listar los bimestres del año (es una función del administrador). Los
              bimestres aparecen aquí cuando existe al menos una unidad planificada en alguno de tus cursos. Solicita
              al administrador la primera unidad o la apertura del bimestre.
            </p>
          </div>
        </section>
      ) : (
        <>
          <div className="toolbar">
            <div className="toolbar__group">
              <select className="select" value={bimestreFilter} onChange={(event) => setBimestreFilter(event.target.value)}>
                <option value="">Todos los bimestres</option>
                {cursoBimestres.map((bimestre) => (
                  <option key={bimestre.id} value={bimestre.id}>
                    {bimestre.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="docente-toolbar-note">
              <Layers size={16} />
              {unidades.length} unidad(es) · {unidades.reduce((total, unidad) => total + (unidad.contenidos?.length || 0), 0)}{" "}
              contenido(s)
            </div>
          </div>

          {grouped.length ? (
            <div className="docente-plan-groups">
              {grouped.map((group) => (
                <section key={group.id} className="docente-plan-group">
                  <div className="docente-plan-group__head">
                    <div>
                      <h3>{group.nombre}</h3>
                      <p>{group.unidades.length} unidad(es) planificada(s)</p>
                    </div>
                    <span className="badge badge--secondary">{selectedCurso?.anioNombre}</span>
                  </div>

                  <div className="docente-plan-list">
                    {group.unidades.map((unidad) => {
                      const contents = [...(unidad.contenidos || [])].sort(
                        (a, b) => Number(a.orden) - Number(b.orden)
                      );
                      const isOpen = expanded.has(unidad.id);
                      return (
                        <article key={unidad.id} className={`docente-unit-card ${isOpen ? "is-open" : ""}`}>
                          <div className="docente-unit-card__head">
                            <span className="docente-unit-number">U{unidad.numero}</span>
                            <div className="docente-unit-card__title">
                              <h4>{unidad.titulo}</h4>
                              <p>{unidad.descripcion || "Sin descripción."}</p>
                            </div>
                            <div className="docente-unit-card__badges">
                              <span className={`badge ${UNIDAD_CLASS[unidad.estado] || "badge--neutral"}`}>
                                {estadoLabel(unidad.estado)}
                              </span>
                              <span className="badge badge--neutral">{contents.length} contenido(s)</span>
                            </div>
                            <div className="docente-unit-card__actions">
                              <button
                                type="button"
                                className="icon-btn icon-btn--soft"
                                onClick={() => toggleExpanded(unidad.id)}
                                title={isOpen ? "Ocultar contenidos" : "Ver contenidos"}
                              >
                                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                              <button
                                type="button"
                                className={`icon-btn icon-btn--soft ${unidad.estado === "PUBLICADA" ? "" : "icon-btn--success"}`}
                                onClick={() => toggleUnitState(unidad)}
                                disabled={stateBusy === unidad.id}
                                title={unidad.estado === "PUBLICADA" ? "Despublicar unidad" : "Publicar unidad"}
                              >
                                {unidad.estado === "PUBLICADA" ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                              <button
                                type="button"
                                className="icon-btn icon-btn--soft"
                                onClick={() => openEditUnit(unidad)}
                                title="Editar unidad"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn icon-btn--soft icon-btn--danger"
                                onClick={() => setDeleteUnit(unidad)}
                                title="Eliminar unidad"
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          </div>

                          <div className="docente-unit-card__meta">
                            <span>
                              <CalendarDays size={14} />
                              {formatDate(unidad.fechaInicio)} — {formatDate(unidad.fechaFin)}
                            </span>
                            <span>{unidad.bimestreNombre}</span>
                            <span>{contents.length} contenido(s)</span>
                          </div>

                          {isOpen ? (
                            <div className="docente-unit-card__contents">
                              <div className="docente-unit-card__contents-head">
                                <div>
                                  <strong>Contenidos de la unidad</strong>
                                  <small>El orden se refleja en la planificación visible.</small>
                                </div>
                                <button
                                  type="button"
                                  className="btn btn--soft btn--sm"
                                  onClick={() => openCreateContent(unidad)}
                                >
                                  <Plus size={15} /> Agregar contenido
                                </button>
                              </div>

                              {contents.length ? (
                                <div className="docente-content-list">
                                  {contents.map((contenido, index) => (
                                    <div key={contenido.id} className="docente-content-row">
                                      <span className="docente-content-row__order">{contenido.orden}</span>
                                      <div className="docente-content-row__body">
                                        <strong>{contenido.titulo}</strong>
                                        {contenido.descripcion ? <small>{contenido.descripcion}</small> : null}
                                        {contenido.fechaPrevista ? (
                                          <em>
                                            <CalendarDays size={12} /> {formatDate(contenido.fechaPrevista)}
                                          </em>
                                        ) : null}
                                      </div>
                                      <div className="docente-content-row__actions">
                                        <button
                                          type="button"
                                          className="icon-btn icon-btn--soft"
                                          onClick={() => moveContent(unidad, contenido, -1)}
                                          disabled={reorderBusy || index === 0}
                                          title="Subir contenido"
                                        >
                                          <ArrowUp size={15} />
                                        </button>
                                        <button
                                          type="button"
                                          className="icon-btn icon-btn--soft"
                                          onClick={() => moveContent(unidad, contenido, 1)}
                                          disabled={reorderBusy || index === contents.length - 1}
                                          title="Bajar contenido"
                                        >
                                          <ArrowDown size={15} />
                                        </button>
                                        <button
                                          type="button"
                                          className="icon-btn icon-btn--soft"
                                          onClick={() => openEditContent(unidad, contenido)}
                                          title="Editar contenido"
                                        >
                                          <Pencil size={15} />
                                        </button>
                                        <button
                                          type="button"
                                          className="icon-btn icon-btn--soft icon-btn--danger"
                                          onClick={() => setDeleteContent({ unidad, contenido })}
                                          title="Eliminar contenido"
                                        >
                                          <Trash size={15} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="docente-inline-empty">
                                  <Layers size={18} />
                                  <span>Esta unidad todavía no tiene contenidos. Agrega el primero.</span>
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
                  {unidades.length ? "Sin unidades en este bimestre" : "Sin unidades planificadas"}
                </p>
                <p className="empty__text">
                  {unidades.length
                    ? "Cambia el filtro de bimestre o crea una unidad nueva."
                    : "Crea la primera unidad del curso y luego agrega sus contenidos."}
                </p>
                <button type="button" className="btn btn--soft btn--sm" onClick={openCreateUnit}>
                  <Plus size={15} /> Nueva unidad
                </button>
              </div>
            </section>
          )}
        </>
      )}

      <Modal
        open={Boolean(unitModal)}
        onClose={closeUnitModal}
        title={unitModal?.mode === "edit" ? "Editar unidad" : "Nueva unidad"}
        subtitle={
          unitModal?.mode === "edit"
            ? `${unitModal.unidad?.bimestreNombre} · Unidad ${unitModal.unidad?.numero}`
            : selectedCurso
              ? `${selectedCurso.materiaNombre} · Sección ${selectedCurso.seccionEtiqueta}`
              : ""
        }
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={closeUnitModal} disabled={unitSaving}>
              Cancelar
            </button>
            <button type="submit" form="docente-unit-form" className="btn btn--primary" disabled={unitSaving}>
              {unitSaving ? "Guardando…" : unitModal?.mode === "edit" ? "Guardar cambios" : "Crear unidad"}
            </button>
          </>
        }
      >
        {unitError ? (
          <div className="alert alert--error" role="alert">
            <CircleX size={18} />
            <div>
              <p>{unitError.message}</p>
              {unitError.fields?.length ? (
                <ul className="alert__list">
                  {unitError.fields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}

        <form id="docente-unit-form" className="form" onSubmit={submitUnit}>
          {unitModal?.mode === "create" ? (
            <label className="field field--plain">
              <span className="field__label">Bimestre</span>
              <select
                className="select"
                value={unitForm.bimestreId}
                onChange={(event) => setUnitForm((prev) => ({ ...prev, bimestreId: event.target.value }))}
                disabled={unitSaving}
                required
              >
                <option value="">Selecciona el bimestre</option>
                {cursoBimestres.map((bimestre) => (
                  <option key={bimestre.id} value={bimestre.id}>
                    {bimestre.nombre} · {bimestre.anioNombre}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="docente-form-readonly">
              <span>Bimestre</span>
              <strong>{unitModal?.unidad?.bimestreNombre}</strong>
            </div>
          )}

          <label className="field field--plain">
            <span className="field__label">Título de la unidad</span>
            <input
              className="input"
              value={unitForm.titulo}
              onChange={(event) => setUnitForm((prev) => ({ ...prev, titulo: event.target.value }))}
              placeholder="Ej. Unidad 1: Fracciones"
              maxLength={255}
              disabled={unitSaving}
              required
            />
          </label>

          <label className="field field--plain">
            <span className="field__label">Descripción (opcional)</span>
            <textarea
              className="textarea"
              rows={3}
              value={unitForm.descripcion}
              onChange={(event) => setUnitForm((prev) => ({ ...prev, descripcion: event.target.value }))}
              placeholder="Propósito, aprendizajes esperados o alcance de la unidad…"
              maxLength={2000}
              disabled={unitSaving}
            />
          </label>

          <div className="form-grid form-grid--2">
            <label className="field field--plain">
              <span className="field__label">Fecha de inicio (opcional)</span>
              <input
                className="input"
                type="date"
                value={unitForm.fechaInicio}
                onChange={(event) => setUnitForm((prev) => ({ ...prev, fechaInicio: event.target.value }))}
                disabled={unitSaving}
              />
            </label>
            <label className="field field--plain">
              <span className="field__label">Fecha de fin (opcional)</span>
              <input
                className="input"
                type="date"
                value={unitForm.fechaFin}
                onChange={(event) => setUnitForm((prev) => ({ ...prev, fechaFin: event.target.value }))}
                disabled={unitSaving}
              />
            </label>
          </div>

          <div className="info-strip info-strip--soft">
            <CalendarDays size={16} />
            <p>
              El número de unidad se asigna automáticamente. El backend valida que las fechas caigan dentro del
              bimestre; si no las conoces, déjalas vacías.
            </p>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(contentModal)}
        onClose={closeContentModal}
        title={contentModal?.mode === "edit" ? "Editar contenido" : "Nuevo contenido"}
        subtitle={contentModal?.unidad ? `${contentModal.unidad.titulo} · ${contentModal.unidad.bimestreNombre}` : ""}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={closeContentModal} disabled={contentSaving}>
              Cancelar
            </button>
            <button type="submit" form="docente-content-form" className="btn btn--primary" disabled={contentSaving}>
              {contentSaving ? "Guardando…" : contentModal?.mode === "edit" ? "Guardar cambios" : "Agregar contenido"}
            </button>
          </>
        }
      >
        {contentError ? (
          <div className="alert alert--error" role="alert">
            <CircleX size={18} />
            <div>
              <p>{contentError.message}</p>
              {contentError.fields?.length ? (
                <ul className="alert__list">
                  {contentError.fields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}

        <form id="docente-content-form" className="form" onSubmit={submitContent}>
          <label className="field field--plain">
            <span className="field__label">Título del contenido</span>
            <input
              className="input"
              value={contentForm.titulo}
              onChange={(event) => setContentForm((prev) => ({ ...prev, titulo: event.target.value }))}
              placeholder="Ej. Suma y resta de fracciones"
              maxLength={255}
              disabled={contentSaving}
              required
            />
          </label>

          <label className="field field--plain">
            <span className="field__label">Descripción (opcional)</span>
            <textarea
              className="textarea"
              rows={3}
              value={contentForm.descripcion}
              onChange={(event) => setContentForm((prev) => ({ ...prev, descripcion: event.target.value }))}
              placeholder="Actividades, recursos o criterios del tema…"
              maxLength={2000}
              disabled={contentSaving}
            />
          </label>

          <label className="field field--plain">
            <span className="field__label">Fecha prevista (opcional)</span>
            <input
              className="input"
              type="date"
              value={contentForm.fechaPrevista}
              min={contentModal?.unidad?.fechaInicio || undefined}
              max={contentModal?.unidad?.fechaFin || undefined}
              onChange={(event) => setContentForm((prev) => ({ ...prev, fechaPrevista: event.target.value }))}
              disabled={contentSaving}
            />
            <small className="hint">
              Debe estar entre {formatDate(contentModal?.unidad?.fechaInicio)} y{" "}
              {formatDate(contentModal?.unidad?.fechaFin)} si la unidad tiene fechas.
            </small>
          </label>

          <div className="info-strip info-strip--soft">
            <Layers size={16} />
            <p>Los contenidos se ordenan automáticamente al final. Puedes reordenarlos con las flechas de la lista.</p>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteUnit)}
        title="Eliminar unidad"
        danger
        message={
          deleteUnit
            ? `Se eliminará "${deleteUnit.titulo}". No se puede borrar una unidad con calificaciones o con contenidos que tengan materiales activos.`
            : ""
        }
        confirmLabel="Eliminar unidad"
        loading={deleteUnitBusy}
        onConfirm={confirmDeleteUnit}
        onClose={() => setDeleteUnit(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteContent)}
        title="Eliminar contenido"
        danger
        message={
          deleteContent
            ? `Se eliminará "${deleteContent.contenido.titulo}" de la unidad. No se puede borrar si tiene materiales activos.`
            : ""
        }
        confirmLabel="Eliminar contenido"
        loading={deleteContentBusy}
        onConfirm={confirmDeleteContent}
        onClose={() => setDeleteContent(null)}
      />
    </div>
  );
}
