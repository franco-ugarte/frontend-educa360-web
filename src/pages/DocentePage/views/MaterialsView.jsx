import { useMemo, useState } from "react";
import {
  CalendarDays,
  CircleX,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Paperclip,
  Pencil,
  Presentation,
  Trash,
  Upload,
  Video,
} from "lucide-react";
import { docenteService, getApiError } from "../../../services/api";
import { ConfirmDialog, Modal } from "../../../components/ui/Modal";
import { formatBytes, formatDate } from "../../../utils/format";
import { sortUnidades } from "../docenteUtils";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "jpg", "jpeg", "png", "mp4"];

const EMPTY_UPLOAD = { file: null, titulo: "", descripcion: "", contenidoId: "" };

function validateFile(file) {
  if (!file) return "Selecciona un archivo.";
  const extension = String(file.name || "").split(".").pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return `Extensión no permitida. Usa: ${ALLOWED_EXTENSIONS.join(", ")}.`;
  }
  if (file.size > MAX_BYTES) return "El archivo no puede superar los 25 MB.";
  return null;
}

function titleFromFileName(name) {
  return String(name || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .slice(0, 255);
}

function materialVisual(mimeType) {
  const mime = String(mimeType || "");
  if (mime.includes("pdf") || mime.includes("word")) {
    return { icon: FileText, tone: "danger" };
  }
  if (mime.includes("spreadsheet") || mime.includes("excel")) {
    return { icon: FileSpreadsheet, tone: "success" };
  }
  if (mime.includes("presentation") || mime.includes("powerpoint")) {
    return { icon: Presentation, tone: "accent" };
  }
  if (mime.startsWith("image/")) {
    return { icon: ImageIcon, tone: "secondary" };
  }
  if (mime.startsWith("video/")) {
    return { icon: Video, tone: "primary" };
  }
  return { icon: FileText, tone: "neutral" };
}

export default function MaterialsView({
  cursos,
  unidadesPorCurso,
  materialesPorCurso,
  initialCursoId,
  onReload,
  showToast,
}) {
  const [cursoId, setCursoId] = useState(String(initialCursoId || cursos[0]?.id || ""));
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState(EMPTY_UPLOAD);
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ titulo: "", descripcion: "", contenidoId: "", file: null });
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(null);
  const [downloadBusy, setDownloadBusy] = useState(null);

  const selectedCurso = cursos.find((curso) => String(curso.id) === String(cursoId)) || null;
  const materiales = materialesPorCurso[cursoId] || [];
  const unidades = useMemo(() => sortUnidades(unidadesPorCurso[cursoId] || []), [unidadesPorCurso, cursoId]);

  const contents = useMemo(
    () =>
      unidades.flatMap((unidad) =>
        (unidad.contenidos || []).map((contenido) => ({
          ...contenido,
          unidadTitulo: `U${unidad.numero} · ${unidad.titulo}`,
        }))
      ),
    [unidades]
  );

  const contentsByUnit = useMemo(() => {
    const map = new Map();
    unidades.forEach((unidad) => {
      map.set(
        unidad.id,
        [...(unidad.contenidos || [])].sort((a, b) => Number(a.orden) - Number(b.orden))
      );
    });
    return map;
  }, [unidades]);

  const openUpload = () => {
    setUploadForm(EMPTY_UPLOAD);
    setUploadError(null);
    setUploadOpen(true);
  };

  const closeUpload = () => {
    if (uploading) return;
    setUploadOpen(false);
    setUploadError(null);
  };

  const pickUploadFile = (file) => {
    setUploadForm((prev) => ({
      ...prev,
      file: file || null,
      titulo: prev.titulo || (file ? titleFromFileName(file.name) : ""),
    }));
  };

  const submitUpload = async (event) => {
    event.preventDefault();
    const fileError = validateFile(uploadForm.file);
    if (fileError) {
      setUploadError({ message: fileError });
      return;
    }
    if (!uploadForm.titulo.trim()) {
      setUploadError({ message: "El título del material es obligatorio." });
      return;
    }

    const formData = new FormData();
    formData.append("archivo", uploadForm.file);
    formData.append("titulo", uploadForm.titulo.trim());
    if (uploadForm.descripcion.trim()) formData.append("descripcion", uploadForm.descripcion.trim());
    if (uploadForm.contenidoId) formData.append("contenidoId", uploadForm.contenidoId);

    setUploading(true);
    setUploadError(null);
    try {
      await docenteService.crearMaterial(selectedCurso.id, formData);
      showToast("success", "Material cargado. Recuerda publicarlo para que lo vean los alumnos.");
      setUploadOpen(false);
      onReload();
    } catch (error) {
      setUploadError(getApiError(error));
    } finally {
      setUploading(false);
    }
  };

  const openEdit = (material) => {
    setEditTarget(material);
    setEditForm({
      titulo: material.titulo || "",
      descripcion: material.descripcion || "",
      contenidoId: material.contenidoId != null ? String(material.contenidoId) : "",
      file: null,
    });
    setEditError(null);
  };

  const closeEdit = () => {
    if (editSaving) return;
    setEditTarget(null);
    setEditError(null);
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!editForm.titulo.trim()) {
      setEditError({ message: "El título del material es obligatorio." });
      return;
    }
    if (editForm.file) {
      const fileError = validateFile(editForm.file);
      if (fileError) {
        setEditError({ message: fileError });
        return;
      }
    }

    setEditSaving(true);
    setEditError(null);
    try {
      await docenteService.actualizarMaterial(editTarget.id, {
        titulo: editForm.titulo.trim(),
        descripcion: editForm.descripcion.trim() || null,
        contenidoId: editForm.contenidoId ? Number(editForm.contenidoId) : null,
      });

      if (editForm.file) {
        const formData = new FormData();
        formData.append("archivo", editForm.file);
        try {
          await docenteService.reemplazarArchivoMaterial(editTarget.id, formData);
        } catch (replaceError) {
          showToast(
            "error",
            `Los datos se guardaron, pero el archivo no se pudo reemplazar: ${getApiError(replaceError).message}`
          );
          setEditTarget(null);
          onReload();
          return;
        }
      }

      showToast("success", editForm.file ? "Material y archivo actualizados." : "Material actualizado.");
      setEditTarget(null);
      onReload();
    } catch (error) {
      setEditError(getApiError(error));
    } finally {
      setEditSaving(false);
    }
  };

  const togglePublish = async (material) => {
    setActionBusy(material.id);
    try {
      await docenteService.cambiarPublicacionMaterial(material.id, !material.publicado);
      showToast(
        "success",
        material.publicado
          ? "Material despublicado: solo tú y el administrador pueden verlo."
          : "Material publicado: los alumnos ya pueden descargarlo."
      );
      onReload();
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setActionBusy(null);
    }
  };

  const downloadMaterial = async (material) => {
    setDownloadBusy(material.id);
    try {
      const data = await docenteService.urlDescargaMaterial(material.id);
      if (!data?.url) {
        showToast("error", "El servidor no devolvió una URL de descarga.");
        return;
      }
      const link = document.createElement("a");
      link.href = data.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = material.nombreOriginal || "";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setDownloadBusy(null);
    }
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await docenteService.eliminarMaterial(deleteTarget.id);
      showToast("success", "Material dado de baja.");
      setDeleteTarget(null);
      onReload();
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const renderContentOptions = (selected) => (
    <>
      <option value="">Sin contenido asociado</option>
      {unidades.map((unidad) => {
        const list = contentsByUnit.get(unidad.id) || [];
        if (!list.length) return null;
        return (
          <optgroup key={unidad.id} label={`U${unidad.numero} · ${unidad.titulo}`}>
            {list.map((contenido) => (
              <option key={contenido.id} value={contenido.id}>
                {contenido.orden}. {contenido.titulo}
              </option>
            ))}
          </optgroup>
        );
      })}
    </>
  );

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Materiales de clase</h2>
          <p className="page__sub">
            {selectedCurso
              ? `${selectedCurso.materiaNombre} · Sección ${selectedCurso.seccionEtiqueta} · ${materiales.length} material(es)`
              : "Selecciona un curso para ver sus materiales."}
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
          <button type="button" className="btn btn--primary" onClick={openUpload} disabled={!selectedCurso}>
            <Upload size={17} /> Subir material
          </button>
        </div>
      </div>

      {!cursos.length ? (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <FolderOpen size={26} />
            </span>
            <p className="empty__title">Sin cursos disponibles</p>
            <p className="empty__text">Necesitas un curso asignado para cargar materiales.</p>
          </div>
        </section>
      ) : (
        <>
          <div className="info-strip info-strip--soft">
            <Paperclip size={16} />
            <p>
              Formatos permitidos: PDF, Word, PowerPoint, Excel, JPG/PNG y MP4 · máximo 25 MB. El material nace como
              borrador y solo se comparte con los alumnos cuando lo publicas.
            </p>
          </div>

          <div className="docente-material-grid">
            {materiales.length ? (
              materiales.map((material) => {
                const visual = materialVisual(material.mimeType);
                const Icon = visual.icon;
                return (
                  <article key={material.id} className="docente-material-card">
                    <div className="docente-material-card__head">
                      <span className={`docente-material-card__icon docente-material-card__icon--${visual.tone}`}>
                        <Icon size={22} />
                      </span>
                      <div className="docente-material-card__title">
                        <h3>{material.titulo}</h3>
                        <small>{material.descripcion || "Sin descripción."}</small>
                      </div>
                      <span className={`badge ${material.publicado ? "badge--success" : "badge--neutral"}`}>
                        {material.publicado ? "Publicado" : "Borrador"}
                      </span>
                    </div>

                    <div className="docente-material-card__meta">
                      <span>
                        <Paperclip size={14} />
                        <b>{material.nombreOriginal}</b>
                      </span>
                      <span>{formatBytes(material.tamanoBytes)}</span>
                      <span>
                        <CalendarDays size={14} /> {formatDate(material.createdAt)}
                      </span>
                    </div>

                    <div className="docente-material-card__content">
                      {material.contenidoTitulo ? (
                        <>
                          <small>Contenido</small>
                          <strong>{material.contenidoTitulo}</strong>
                        </>
                      ) : (
                        <span className="muted">Material general del curso, sin contenido asociado.</span>
                      )}
                    </div>

                    <div className="docente-material-card__actions">
                      <button
                        type="button"
                        className="btn btn--soft btn--sm"
                        onClick={() => downloadMaterial(material)}
                        disabled={downloadBusy === material.id}
                      >
                        <Download size={15} /> {downloadBusy === material.id ? "Abriendo…" : "Descargar"}
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => togglePublish(material)}
                        disabled={actionBusy === material.id}
                      >
                        {material.publicado ? <EyeOff size={15} /> : <Eye size={15} />}
                        {material.publicado ? "Despublicar" : "Publicar"}
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--soft"
                        onClick={() => openEdit(material)}
                        title="Editar material"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--soft icon-btn--danger"
                        onClick={() => setDeleteTarget(material)}
                        title="Dar de baja"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <section className="card docente-material-empty">
                <div className="empty empty--tall">
                  <span className="empty__icon">
                    <FolderOpen size={26} />
                  </span>
                  <p className="empty__title">Sin materiales en este curso</p>
                  <p className="empty__text">
                    Sube el primer archivo de clase. Puedes asociarlo a un contenido de la planificación.
                  </p>
                  <button type="button" className="btn btn--soft btn--sm" onClick={openUpload}>
                    <Upload size={15} /> Subir material
                  </button>
                </div>
              </section>
            )}
          </div>
        </>
      )}

      <Modal
        open={uploadOpen}
        onClose={closeUpload}
        title="Subir material"
        subtitle={selectedCurso ? `${selectedCurso.materiaNombre} · Sección ${selectedCurso.seccionEtiqueta}` : ""}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={closeUpload} disabled={uploading}>
              Cancelar
            </button>
            <button type="submit" form="docente-material-upload" className="btn btn--primary" disabled={uploading}>
              {uploading ? (
                <>
                  <span className="spinner" /> Subiendo…
                </>
              ) : (
                <>
                  <Upload size={16} /> Subir material
                </>
              )}
            </button>
          </>
        }
      >
        {uploadError ? (
          <div className="alert alert--error" role="alert">
            <CircleX size={18} />
            <div>
              <p>{uploadError.message}</p>
              {uploadError.fields?.length ? (
                <ul className="alert__list">
                  {uploadError.fields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}

        <form id="docente-material-upload" className="form" onSubmit={submitUpload}>
          <label className="field field--plain">
            <span className="field__label">Archivo</span>
            <input
              className="input docente-file-input"
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4"
              onChange={(event) => pickUploadFile(event.target.files?.[0] || null)}
              disabled={uploading}
              required
            />
            <small className="hint">
              {uploadForm.file
                ? `${uploadForm.file.name} · ${formatBytes(uploadForm.file.size)}`
                : "PDF, Word, PowerPoint, Excel, JPG/PNG o MP4 · máximo 25 MB."}
            </small>
          </label>

          <label className="field field--plain">
            <span className="field__label">Título</span>
            <input
              className="input"
              value={uploadForm.titulo}
              onChange={(event) => setUploadForm((prev) => ({ ...prev, titulo: event.target.value }))}
              placeholder="Ej. Guía de ejercicios de fracciones"
              maxLength={255}
              disabled={uploading}
              required
            />
          </label>

          <label className="field field--plain">
            <span className="field__label">Descripción (opcional)</span>
            <textarea
              className="textarea"
              rows={3}
              value={uploadForm.descripcion}
              onChange={(event) => setUploadForm((prev) => ({ ...prev, descripcion: event.target.value }))}
              placeholder="Indicaciones para los alumnos…"
              maxLength={2000}
              disabled={uploading}
            />
          </label>

          <label className="field field--plain">
            <span className="field__label">Contenido asociado (opcional)</span>
            <select
              className="select"
              value={uploadForm.contenidoId}
              onChange={(event) => setUploadForm((prev) => ({ ...prev, contenidoId: event.target.value }))}
              disabled={uploading || !contents.length}
            >
              {renderContentOptions(uploadForm.contenidoId)}
            </select>
            <small className="hint">
              {contents.length
                ? "Asociarlo a un contenido lo ubica dentro de la planificación de la unidad."
                : "Este curso aún no tiene contenidos planificados."}
            </small>
          </label>

          <div className="info-strip info-strip--soft">
            <FolderOpen size={16} />
            <p>El material se guarda como borrador. Publícalo desde la tarjeta cuando esté listo.</p>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(editTarget)}
        onClose={closeEdit}
        title="Editar material"
        subtitle={editTarget ? editTarget.nombreOriginal : ""}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={closeEdit} disabled={editSaving}>
              Cancelar
            </button>
            <button type="submit" form="docente-material-edit" className="btn btn--primary" disabled={editSaving}>
              {editSaving ? "Guardando…" : "Guardar cambios"}
            </button>
          </>
        }
      >
        {editError ? (
          <div className="alert alert--error" role="alert">
            <CircleX size={18} />
            <div>
              <p>{editError.message}</p>
              {editError.fields?.length ? (
                <ul className="alert__list">
                  {editError.fields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}

        <form id="docente-material-edit" className="form" onSubmit={submitEdit}>
          <label className="field field--plain">
            <span className="field__label">Título</span>
            <input
              className="input"
              value={editForm.titulo}
              onChange={(event) => setEditForm((prev) => ({ ...prev, titulo: event.target.value }))}
              maxLength={255}
              disabled={editSaving}
              required
            />
          </label>

          <label className="field field--plain">
            <span className="field__label">Descripción (opcional)</span>
            <textarea
              className="textarea"
              rows={3}
              value={editForm.descripcion}
              onChange={(event) => setEditForm((prev) => ({ ...prev, descripcion: event.target.value }))}
              maxLength={2000}
              disabled={editSaving}
            />
          </label>

          <label className="field field--plain">
            <span className="field__label">Contenido asociado (opcional)</span>
            <select
              className="select"
              value={editForm.contenidoId}
              onChange={(event) => setEditForm((prev) => ({ ...prev, contenidoId: event.target.value }))}
              disabled={editSaving || !contents.length}
            >
              {renderContentOptions(editForm.contenidoId)}
            </select>
          </label>

          <label className="field field--plain">
            <span className="field__label">Reemplazar archivo (opcional)</span>
            <input
              className="input docente-file-input"
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4"
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, file: event.target.files?.[0] || null }))
              }
              disabled={editSaving}
            />
            <small className="hint">
              {editForm.file
                ? `${editForm.file.name} · ${formatBytes(editForm.file.size)}`
                : `Archivo actual: ${editTarget?.nombreOriginal || "—"} (${formatBytes(editTarget?.tamanoBytes)})`}
            </small>
          </label>

          <div className="info-strip info-strip--soft">
            <Upload size={16} />
            <p>Si seleccionas un archivo nuevo, reemplazará al anterior al guardar.</p>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Dar de baja material"
        danger
        message={
          deleteTarget
            ? `Se dará de baja "${deleteTarget.titulo}" y dejará de estar disponible para los alumnos. La baja es lógica.`
            : ""
        }
        confirmLabel="Dar de baja"
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
