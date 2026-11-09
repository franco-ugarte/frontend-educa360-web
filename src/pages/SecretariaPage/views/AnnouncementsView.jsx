import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleX,
  Megaphone,
  Pencil,
  Send,
  Trash,
  Users,
} from "lucide-react";
import { getApiError, secretariaService } from "../../../services/api";
import { ConfirmDialog, Modal } from "../../../components/ui/Modal";
import { formatDateTime, initials } from "../../../utils/format";

export default function AnnouncementsView({ data, sessionId, onReload, showToast }) {
  const anios = useMemo(
    () => [...(data.anios || [])].sort((a, b) => (b.anio || 0) - (a.anio || 0)),
    [data.anios]
  );

  const [filterYear, setFilterYear] = useState(String(anios[0]?.id || ""));
  const [content, setContent] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [composerError, setComposerError] = useState(null);
  const [comunicados, setComunicados] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editTarget, setEditTarget] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const effectiveYear = filterYear || String(anios[0]?.id || "");
  const selectedYear = anios.find((anio) => String(anio.id) === String(effectiveYear));

  const loadComunicados = useCallback(async () => {
    setLoading(true);
    try {
      const params = effectiveYear ? { anioId: Number(effectiveYear) } : {};
      const list = await secretariaService.listarComunicados(params);
      setComunicados(Array.isArray(list) ? list : []);
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setLoading(false);
    }
  }, [effectiveYear, showToast]);

  useEffect(() => {
    loadComunicados();
  }, [loadComunicados]);

  const handlePublish = async (event) => {
    event.preventDefault();
    if (!effectiveYear) {
      setComposerError({ message: "No hay un año escolar disponible para publicar." });
      return;
    }
    if (!content.trim()) {
      setComposerError({ message: "Escribe el contenido del comunicado." });
      return;
    }
    setPublishing(true);
    setComposerError(null);
    try {
      await secretariaService.crearComunicado({
        anioId: Number(effectiveYear),
        seccionId: null,
        contenido: content.trim(),
      });
      setContent("");
      showToast("success", "Comunicado general publicado y notificado a la comunidad.");
      loadComunicados();
      onReload();
    } catch (error) {
      setComposerError(getApiError(error));
    } finally {
      setPublishing(false);
    }
  };

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
      await secretariaService.actualizarComunicado(editTarget.id, {
        seccionId: null,
        contenido: editContent.trim(),
      });
      showToast("success", "Comunicado actualizado.");
      setEditTarget(null);
      loadComunicados();
      onReload();
    } catch (error) {
      setEditError(getApiError(error));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await secretariaService.eliminarComunicado(deleteTarget.id);
      showToast("success", "Comunicado dado de baja.");
      setDeleteTarget(null);
      loadComunicados();
      onReload();
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const isOwner = (comunicado) =>
    sessionId != null && String(comunicado.autorId) === String(sessionId);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Comunicados</h2>
          <p className="page__sub">
            Mensajes generales para toda la institución. Solo puedes editar o dar de baja los que tú publicaste.
          </p>
        </div>
        <div className="page__actions">
          <select className="select" value={effectiveYear} onChange={(event) => setFilterYear(event.target.value)}>
            {anios.map((anio) => (
              <option key={anio.id} value={anio.id}>
                {anio.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!anios.length ? (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <Megaphone size={26} />
            </span>
            <p className="empty__title">Sin años visibles</p>
            <p className="empty__text">
              Secretaría no administra años escolares. Cuando exista una matrícula o un comunicado del año, podrás
              publicar aquí.
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
                  Se publicará para toda la institución en {selectedYear?.nombre || "el año seleccionado"}.
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
                  <span className="secretaria-audience">
                    <Users size={15} /> Toda la institución (general)
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
                    placeholder="Escribe aquí el comunicado para la comunidad educativa…"
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
                  Secretaría solo publica comunicados generales. Para dirigir un mensaje a una sección, solicítalo al
                  administrador o al docente tutor.
                </p>
              </div>
            </div>
          </section>

          <section className="card announcements-card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Historial</h3>
                <p className="card__sub">{comunicados.length} comunicados activos en el año seleccionado.</p>
              </div>
            </div>
            <div className="card__body card__body--flush">
              {loading ? (
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
                              {formatDateTime(comunicado.createdAt)} · {comunicado.anioNombre}
                            </small>
                          </span>
                        </div>
                        <div className="feed-msg__tools">
                          <span className="badge badge--primary">Toda la institución</span>
                          {isOwner(comunicado) ? (
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
            <button type="submit" form="comunicado-edit-form" className="btn btn--primary" disabled={editSaving}>
              {editSaving ? "Guardando…" : "Guardar cambios"}
            </button>
          </>
        }
      >
        {editError ? (
          <div className="alert alert--error" role="alert">
            <CircleX size={18} />
            <p>{editError.message}</p>
          </div>
        ) : null}

        <form id="comunicado-edit-form" className="form" onSubmit={handleEdit}>
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
            <p>El comunicado mantiene su año y audiencia general. La edición no genera una nueva notificación.</p>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Dar de baja comunicado"
        danger
        message="El comunicado dejará de ser visible para la comunidad. La baja es lógica: el registro se conserva."
        confirmLabel="Dar de baja"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
