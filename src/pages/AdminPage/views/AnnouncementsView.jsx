import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleX,
  Megaphone,
  Send,
  Trash,
  Users,
} from "lucide-react";
import { adminService, getApiError } from "../../../services/api";
import { ConfirmDialog } from "../../../components/ui/Modal";
import { formatDateTime, initials } from "../../../utils/format";

export default function AnnouncementsView({ data, showToast }) {
  const anios = useMemo(
    () => [...(data.anios || [])].sort((a, b) => (b.anio || 0) - (a.anio || 0)),
    [data.anios]
  );
  const openYear = anios.find((anio) => anio.estado === "ABIERTO") || anios[0] || null;

  const [filterYear, setFilterYear] = useState(openYear?.id || "");
  const [filterSection, setFilterSection] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [composerError, setComposerError] = useState(null);
  const [comunicados, setComunicados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const seccionesDelAnio = (data.secciones || []).filter(
    (seccion) => String(seccion.anioId) === String(filterYear)
  );
  const selectedYear = anios.find((anio) => String(anio.id) === String(filterYear));

  const loadComunicados = useCallback(async () => {
    if (!filterYear) {
      setComunicados([]);
      return;
    }
    setLoading(true);
    try {
      const params = { anioId: Number(filterYear) };
      if (filterSection) params.seccionId = Number(filterSection);
      const list = await adminService.listarComunicados(params);
      setComunicados(Array.isArray(list) ? list : []);
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterSection, showToast]);

  useEffect(() => {
    loadComunicados();
  }, [loadComunicados]);

  const handlePublish = async (event) => {
    event.preventDefault();
    if (!filterYear) {
      setComposerError({ message: "Primero debes registrar un año escolar." });
      return;
    }
    if (!content.trim()) {
      setComposerError({ message: "Escribe el contenido del comunicado." });
      return;
    }
    setPublishing(true);
    setComposerError(null);
    try {
      await adminService.crearComunicado({
        anioId: Number(filterYear),
        seccionId: audience ? Number(audience) : null,
        contenido: content.trim(),
      });
      setContent("");
      setAudience("");
      showToast("success", "Comunicado publicado y notificado a los destinatarios.");
      loadComunicados();
    } catch (error) {
      setComposerError(getApiError(error));
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await adminService.eliminarComunicado(deleteTarget.id);
      showToast("success", "Comunicado dado de baja.");
      setDeleteTarget(null);
      loadComunicados();
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const audienceLabel = (comunicado) =>
    comunicado.seccionEtiqueta ? `Sección ${comunicado.seccionEtiqueta}` : "Toda la institución";

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Comunicados</h2>
          <p className="page__sub">Mensajes generales o dirigidos a una sección del año seleccionado.</p>
        </div>
        <div className="page__actions">
          <select
            className="select"
            value={filterYear}
            onChange={(event) => {
              setFilterYear(event.target.value);
              setFilterSection("");
              setAudience("");
            }}
          >
            {anios.map((anio) => (
              <option key={anio.id} value={anio.id}>
                {anio.nombre}
              </option>
            ))}
          </select>
          <select className="select" value={filterSection} onChange={(event) => setFilterSection(event.target.value)}>
            <option value="">Todas las audiencias</option>
            {seccionesDelAnio.map((seccion) => (
              <option key={seccion.id} value={seccion.id}>
                Sección {seccion.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="announcement-layout">
        <section className="card composer-card">
          <div className="card__head">
            <div>
              <h3 className="card__title">Nuevo comunicado</h3>
              <p className="card__sub">
                Se publicará en {selectedYear?.nombre || "el año seleccionado"}.
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
                <p>{composerError.message}</p>
              </div>
            ) : null}

            <form className="composer" onSubmit={handlePublish}>
              <label className="field field--plain">
                <span className="field__label">Audiencia</span>
                <select
                  className="select"
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                  disabled={publishing}
                >
                  <option value="">Toda la institución (general)</option>
                  {seccionesDelAnio.map((seccion) => (
                    <option key={seccion.id} value={seccion.id}>
                      Sección {seccion.etiqueta}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field field--plain">
                <span className="field__label">Mensaje</span>
                <textarea
                  className="textarea"
                  rows={6}
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
                <button type="submit" className="btn btn--primary" disabled={publishing || !filterYear}>
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
              <Users size={16} />
              <p>
                El comunicado genera una notificación para cada destinatario y se entrega en tiempo real a
                quienes estén conectados.
              </p>
            </div>
          </div>
        </section>

        <section className="card announcements-card">
          <div className="card__head">
            <div>
              <h3 className="card__title">Historial</h3>
              <p className="card__sub">{comunicados.length} comunicados activos en la vista actual.</p>
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
                          <strong>{comunicado.autorNombre}</strong>
                          <small>
                            {formatDateTime(comunicado.createdAt)} · {comunicado.anioNombre}
                          </small>
                        </span>
                      </div>
                      <div className="feed-msg__tools">
                        <span className={`badge ${comunicado.seccionEtiqueta ? "badge--secondary" : "badge--primary"}`}>
                          {audienceLabel(comunicado)}
                        </span>
                        <button
                          type="button"
                          className="icon-btn icon-btn--soft icon-btn--danger"
                          onClick={() => setDeleteTarget(comunicado)}
                          title="Dar de baja"
                        >
                          <Trash size={15} />
                        </button>
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
