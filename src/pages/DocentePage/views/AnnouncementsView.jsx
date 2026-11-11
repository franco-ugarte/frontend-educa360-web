import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleX,
  Megaphone,
  Pencil,
  Send,
  Trash,
  Users,
} from "lucide-react";
import { docenteService, getApiError } from "../../../services/api";
import { ConfirmDialog, Modal } from "../../../components/ui/Modal";
import { formatDateTime, initials } from "../../../utils/format";
import { deriveSecciones } from "../docenteUtils";

export default function AnnouncementsView({ cursos, initialCursoId, sessionId, showToast }) {
  const secciones = useMemo(() => deriveSecciones(cursos), [cursos]);
  const initialCourse = cursos.find((curso) => String(curso.id) === String(initialCursoId));
  const [seccionId, setSeccionId] = useState(
    String(initialCourse?.seccionId || secciones[0]?.id || "")
  );

  const [comunicados, setComunicados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [content, setContent] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [composerError, setComposerError] = useState(null);

  const [editTarget, setEditTarget] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!initialCursoId) return;
    const curso = cursos.find((item) => String(item.id) === String(initialCursoId));
    if (curso?.seccionId) setSeccionId(String(curso.seccionId));
  }, [initialCursoId, cursos]);

  const selectedSeccion = secciones.find((seccion) => String(seccion.id) === String(seccionId)) || null;

  const loadComunicados = useCallback(async () => {
    if (!selectedSeccion) {
      setComunicados([]);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const list = await docenteService.listarComunicados({
        anioId: selectedSeccion.anioId,
        seccionId: selectedSeccion.id,
      });
      setComunicados(Array.isArray(list) ? list : []);
    } catch (error) {
      setComunicados([]);
      setLoadError(getApiError(error));
    } finally {
      setLoading(false);
    }
  }, [selectedSeccion?.id, selectedSeccion?.anioId]);

  useEffect(() => {
    loadComunicados();
  }, [loadComunicados]);

  const handlePublish = async (event) => {
    event.preventDefault();
    if (!selectedSeccion) {
      setComposerError({ message: "Selecciona una sección donde dictes clase." });
      return;
    }
    if (!content.trim()) {
      setComposerError({ message: "Escribe el contenido del comunicado." });
      return;
    }
    setPublishing(true);
    setComposerError(null);
    try {
      await docenteService.crearComunicado({
        anioId: selectedSeccion.anioId,
        seccionId: selectedSeccion.id,
        contenido: content.trim(),
      });
      setContent("");
      showToast("success", "Comunicado publicado y notificado a la sección.");
      loadComunicados();
    } catch (error) {
      setComposerError(getApiError(error));
    } finally {
      setPublishing(false);
    }
  };

  const isOwner = (comunicado) => sessionId != null && String(comunicado.autorId) === String(sessionId);
  const isGeneral = (comunicado) => comunicado.seccionId == null;

  const openEdit = (comunicado) => {
    setEditTarget(comunicado);
    setEditContent(comunicado.contenido || "");
    setEditError(null);
  };

  const handleEdit = async (event) => {
    event.preventDefault();
    if (!editContent.trim()) {
      setEditError({ message: "El contenido no puede quedar vacío." });
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      await docenteService.actualizarComunicado(editTarget.id, {
        seccionId: editTarget.seccionId,
        contenido: editContent.trim(),
      });
      showToast("success", "Comunicado actualizado.");
      setEditTarget(null);
      loadComunicados();
    } catch (error) {
      setEditError(getApiError(error));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteBusy(true);
    try {
      await docenteService.eliminarComunicado(deleteTarget.id);
      showToast("success", "Comunicado dado de baja.");
      setDeleteTarget(null);
      loadComunicados();
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Comunicados por sección</h2>
          <p className="page__sub">
            Publica avisos en las secciones donde dictas clase. También puedes leer los comunicados generales del año.
          </p>
        </div>
        <div className="page__actions">
          <select className="select" value={seccionId} onChange={(event) => setSeccionId(event.target.value)}>
            {secciones.map((seccion) => (
              <option key={seccion.id} value={seccion.id}>
                Sección {seccion.etiqueta} · {seccion.anioNombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!secciones.length ? (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <Megaphone size={26} />
            </span>
            <p className="empty__title">Sin secciones asignadas</p>
            <p className="empty__text">
              Los comunicados se publican por sección. Cuando tengas un curso asignado podrás escribir aquí.
            </p>
          </div>
        </section>
      ) : (
        <div className="announcement-layout">
          <section className="card composer-card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Nuevo comunicado</h3>
                <p className="card__sub">
                  Se publicará para los alumnos y apoderados de {selectedSeccion?.etiqueta || "la sección"}.
                </p>
              </div>
              <span className="composer-card__icon">
                <Megaphone size={20} />
              </span>
            </div>
            <div className="card__body">
              {composerError ? (
                <div className="alert alert--error" role="alert">
                  <CircleX size={18} />
                  <div>
                    <p>{composerError.message}</p>
                    {composerError.fields?.length ? (
                      <ul className="alert__list">
                        {composerError.fields.map((field) => (
                          <li key={field}>{field}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <form className="composer" onSubmit={handlePublish}>
                <div className="field field--plain">
                  <span className="field__label">Audiencia</span>
                  <span className="docente-audience">
                    <Users size={15} /> Sección {selectedSeccion?.etiqueta} · {selectedSeccion?.anioNombre}
                  </span>
                </div>

                <label className="field field--plain">
                  <span className="field__label">Mensaje</span>
                  <textarea
                    className="textarea"
                    rows={7}
                    maxLength={5000}
                    value={content}
                    onChange={(event) => {
                      setContent(event.target.value);
                      if (composerError) setComposerError(null);
                    }}
                    placeholder="Escribe aquí el comunicado para tus alumnos y apoderados…"
                    disabled={publishing}
                  />
                </label>

                <div className="composer__foot">
                  <span className="char-count">{content.length} / 5000 caracteres</span>
                  <button type="submit" className="btn btn--primary" disabled={publishing}>
                    {publishing ? (
                      <>
                        <span className="spinner" /> Publicando…
                      </>
                    ) : (
                      <>
                        <Send size={16} /> Publicar comunicado
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="info-strip info-strip--soft">
                <Megaphone size={16} />
                <p>
                  Solo puedes publicar en secciones donde dictas clase. Los comunicados generales del año se leen aquí,
                  pero los administra el equipo directivo.
                </p>
              </div>
            </div>
          </section>

          <section className="card announcements-card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Historial de la sección</h3>
                <p className="card__sub">
                  {loading
                    ? "Cargando comunicados…"
                    : `${comunicados.length} comunicado(s) visibles para ${selectedSeccion?.etiqueta}.`}
                </p>
              </div>
            </div>
            <div className="card__body card__body--flush">
              {loadError ? (
                <div className="alert alert--error alert--inline" role="alert">
                  <CircleX size={18} />
                  <div>
                    <p>{loadError.message}</p>
                  </div>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={loadComunicados}>
                    Reintentar
                  </button>
                </div>
              ) : loading ? (
                <div className="loading-state loading-state--inline">
                  <span className="spinner spinner--dark" />
                  <p>Cargando comunicados…</p>
                </div>
              ) : comunicados.length ? (
                <div className="feed">
                  {comunicados.map((comunicado) => (
                    <article key={comunicado.id} className="feed-msg">
                      <div className="feed-msg__head">
                        <div className="table__user">
                          <span className="avatar avatar--sm">
                            {initials(
                              comunicado.autorNombre?.split(" ")[0],
                              comunicado.autorNombre?.split(" ").slice(1).join(" ")
                            )}
                          </span>
                          <span>
                            <strong>
                              {comunicado.autorNombre}
                              {isOwner(comunicado) ? <em className="tag-self">Tuyo</em> : null}
                            </strong>
                            <small>
                              {formatDateTime(comunicado.createdAt)}
                              {comunicado.seccionEtiqueta ? ` · Sección ${comunicado.seccionEtiqueta}` : ""}
                            </small>
                          </span>
                        </div>
                        <div className="feed-msg__tools">
                          <span className={`badge ${isGeneral(comunicado) ? "badge--primary" : "badge--secondary"}`}>
                            {isGeneral(comunicado) ? "General" : `Sección ${comunicado.seccionEtiqueta}`}
                          </span>
                          {isOwner(comunicado) && !isGeneral(comunicado) ? (
                            <>
                              <button
                                type="button"
                                className="icon-btn icon-btn--soft"
                                onClick={() => openEdit(comunicado)}
                                title="Editar comunicado"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn icon-btn--soft icon-btn--danger"
                                onClick={() => setDeleteTarget(comunicado)}
                                title="Dar de baja"
                              >
                                <Trash size={15} />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <p className="feed-msg__content">{comunicado.contenido}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty empty--tall">
                  <span className="empty__icon">
                    <Megaphone size={26} />
                  </span>
                  <p className="empty__title">Sin comunicados</p>
                  <p className="empty__text">Publica el primero con el formulario de la izquierda.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <Modal
        open={Boolean(editTarget)}
        onClose={() => {
          if (!editSaving) setEditTarget(null);
        }}
        title="Editar comunicado"
        subtitle={editTarget ? `${editTarget.anioNombre} · ${formatDateTime(editTarget.createdAt)}` : ""}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setEditTarget(null)} disabled={editSaving}>
              Cancelar
            </button>
            <button type="submit" form="docente-comunicado-edit" className="btn btn--primary" disabled={editSaving}>
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

        <form id="docente-comunicado-edit" className="form" onSubmit={handleEdit}>
          <label className="field field--plain">
            <span className="field__label">Mensaje</span>
            <textarea
              className="textarea"
              rows={8}
              maxLength={5000}
              value={editContent}
              onChange={(event) => {
                setEditContent(event.target.value);
                if (editError) setEditError(null);
              }}
              disabled={editSaving}
              required
            />
            <small className="char-count">{editContent.length} / 5000 caracteres</small>
          </label>

          <div className="info-strip info-strip--soft">
            <Megaphone size={16} />
            <p>El comunicado mantiene su sección y año. La edición no genera una nueva notificación.</p>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Dar de baja comunicado"
        danger
        message="El comunicado dejará de ser visible para la sección. La baja es lógica: el registro se conserva."
        confirmLabel="Dar de baja"
        loading={deleteBusy}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
