import { useMemo, useState } from "react";
import {
  CalendarDays,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Eye,
  FileCheck,
  Paperclip,
  Search,
} from "lucide-react";
import { getApiError, secretariaService } from "../../../services/api";
import { Modal } from "../../../components/ui/Modal";
import {
  DIA_LABELS,
  TICKET_CLASS,
  estadoLabel,
  formatDate,
  formatDateTime,
  formatTime,
  initials,
} from "../../../utils/format";

export default function TicketsView({ data, onReload, showToast }) {
  const [estadoFilter, setEstadoFilter] = useState("PENDIENTE");
  const [fechaFilter, setFechaFilter] = useState("");
  const [search, setSearch] = useState("");
  const [detailTarget, setDetailTarget] = useState(null);
  const [resolveForm, setResolveForm] = useState({ estado: "APROBADO", observacionesAdmin: "" });
  const [resolveError, setResolveError] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [sustentoUrl, setSustentoUrl] = useState(null);
  const [sustentoError, setSustentoError] = useState(null);
  const [sustentoLoading, setSustentoLoading] = useState(false);

  const tickets = data.tickets || [];

  const stats = {
    pendientes: tickets.filter((ticket) => ticket.estado === "PENDIENTE").length,
    aprobados: tickets.filter((ticket) => ticket.estado === "APROBADO").length,
    rechazados: tickets.filter((ticket) => ticket.estado === "RECHAZADO").length,
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tickets
      .filter((ticket) => estadoFilter === "TODOS" || ticket.estado === estadoFilter)
      .filter((ticket) => !fechaFilter || ticket.fechaInasistencia === fechaFilter)
      .filter((ticket) => {
        if (!term) return true;
        return [ticket.estudianteNombre, ticket.estudianteDni, ticket.apoderadoNombre, ticket.motivo, ticket.materiaNombre]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .slice()
      .sort((a, b) => {
        if (a.estado === "PENDIENTE" && b.estado !== "PENDIENTE") return -1;
        if (a.estado !== "PENDIENTE" && b.estado === "PENDIENTE") return 1;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }, [tickets, estadoFilter, fechaFilter, search]);

  const openDetail = (ticket) => {
    setDetailTarget(ticket);
    setResolveForm({ estado: "APROBADO", observacionesAdmin: "" });
    setResolveError(null);
    setSustentoUrl(null);
    setSustentoError(null);
  };

  const closeDetail = () => {
    if (resolving) return;
    setDetailTarget(null);
    setSustentoUrl(null);
    setSustentoError(null);
  };

  const handleSustento = async () => {
    setSustentoLoading(true);
    setSustentoError(null);
    try {
      const result = await secretariaService.urlSustentoTicket(detailTarget.id);
      setSustentoUrl(result.url);
    } catch (error) {
      setSustentoError(getApiError(error));
    } finally {
      setSustentoLoading(false);
    }
  };

  const handleResolve = async (event) => {
    event.preventDefault();
    setResolving(true);
    setResolveError(null);
    try {
      await secretariaService.resolverTicket(detailTarget.id, {
        estado: resolveForm.estado,
        observacionesAdmin: resolveForm.observacionesAdmin.trim() || null,
      });
      showToast(
        "success",
        resolveForm.estado === "APROBADO"
          ? "Ticket aprobado. Las faltas del alcance quedaron justificadas."
          : "Ticket rechazado. La asistencia no se modificó."
      );
      setDetailTarget(null);
      onReload();
    } catch (error) {
      setResolveError(getApiError(error));
    } finally {
      setResolving(false);
    }
  };

  const scopeLabel = (ticket) => {
    if (!ticket.bloqueId) return "Día completo";
    const dia = ticket.dia ? DIA_LABELS[ticket.dia] || estadoLabel(ticket.dia) : "";
    return [
      ticket.materiaNombre,
      dia,
      ticket.horaInicio && `${formatTime(ticket.horaInicio)}–${formatTime(ticket.horaFin)}`,
    ]
      .filter(Boolean)
      .join(" · ");
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Justificaciones</h2>
          <p className="page__sub">
            {stats.pendientes} pendientes · {stats.aprobados} aprobadas · {stats.rechazados} rechazadas.
          </p>
        </div>
        <div className="page__actions">
          <span className="badge badge--accent">{stats.pendientes} por resolver</span>
        </div>
      </div>

      <section className="grid grid--stats secretaria-ticket-stats">
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--accent">
            <ClipboardCheck size={20} />
          </span>
          <div>
            <strong className="stat-card__value">{stats.pendientes}</strong>
            <span className="stat-card__label">Pendientes</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--success">
            <CircleCheck size={20} />
          </span>
          <div>
            <strong className="stat-card__value">{stats.aprobados}</strong>
            <span className="stat-card__label">Aprobadas</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--primary">
            <CircleX size={20} />
          </span>
          <div>
            <strong className="stat-card__value">{stats.rechazados}</strong>
            <span className="stat-card__label">Rechazadas</span>
          </div>
        </article>
      </section>

      <div className="toolbar">
        <label className="search">
          <Search size={17} />
          <input
            type="search"
            placeholder="Buscar por estudiante, apoderado o motivo…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="toolbar__group">
          <select className="select" value={estadoFilter} onChange={(event) => setEstadoFilter(event.target.value)}>
            <option value="TODOS">Todos los estados</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="APROBADO">Aprobadas</option>
            <option value="RECHAZADO">Rechazadas</option>
          </select>
          <input
            className="input input--date"
            type="date"
            value={fechaFilter}
            onChange={(event) => setFechaFilter(event.target.value)}
            title="Filtrar por fecha de inasistencia"
          />
        </div>
      </div>

      <section className="card">
        <div className="card__body card__body--flush">
          {filtered.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Apoderado</th>
                    <th>Fecha de falta</th>
                    <th>Alcance</th>
                    <th>Motivo</th>
                    <th>Estado</th>
                    <th className="table__actions-col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <div className="table__user">
                          <span className="avatar avatar--sm">
                            {initials(
                              ticket.estudianteNombre?.split(" ")[0],
                              ticket.estudianteNombre?.split(" ").slice(1).join(" ")
                            )}
                          </span>
                          <span>
                            <strong>{ticket.estudianteNombre}</strong>
                            <small>DNI {ticket.estudianteDni}</small>
                          </span>
                        </div>
                      </td>
                      <td>{ticket.apoderadoNombre}</td>
                      <td>{formatDate(ticket.fechaInasistencia)}</td>
                      <td className="secretaria-cell-clamp muted">{scopeLabel(ticket)}</td>
                      <td className="secretaria-cell-clamp">{ticket.motivo}</td>
                      <td>
                        <span className={`badge ${TICKET_CLASS[ticket.estado] || "badge--neutral"}`}>
                          {estadoLabel(ticket.estado)}
                        </span>
                      </td>
                      <td>
                        <div className="table__actions">
                          <button
                            type="button"
                            className="icon-btn icon-btn--soft"
                            onClick={() => openDetail(ticket)}
                            title="Ver detalle"
                          >
                            <Eye size={16} />
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
                <ClipboardCheck size={26} />
              </span>
              <p className="empty__title">Sin tickets en la vista</p>
              <p className="empty__text">
                {tickets.length
                  ? "Ajusta el estado, la fecha o la búsqueda."
                  : "Los apoderados crean tickets de justificación y aparecerán aquí para su revisión."}
              </p>
            </div>
          )}
        </div>
      </section>

      <Modal
        open={Boolean(detailTarget)}
        onClose={closeDetail}
        title={`Justificación #${detailTarget?.id || ""}`}
        subtitle={detailTarget ? `${detailTarget.estudianteNombre} · ${formatDate(detailTarget.fechaInasistencia)}` : ""}
        size="lg"
        footer={
          detailTarget?.estado === "PENDIENTE" ? (
            <>
              <button type="button" className="btn btn--ghost" onClick={closeDetail} disabled={resolving}>
                Cancelar
              </button>
              <button type="submit" form="ticket-resolve-form" className="btn btn--primary" disabled={resolving}>
                {resolving ? "Resolviendo…" : resolveForm.estado === "APROBADO" ? "Aprobar ticket" : "Rechazar ticket"}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn--ghost" onClick={closeDetail}>
              Cerrar
            </button>
          )
        }
      >
        {detailTarget ? (
          <div className="ticket-detail">
            <div className="student-file__grid">
              <div className="info-block">
                <span className="info-block__label">Estudiante</span>
                <strong>{detailTarget.estudianteNombre}</strong>
                <small className="secretaria-block-sub">DNI {detailTarget.estudianteDni}</small>
              </div>
              <div className="info-block">
                <span className="info-block__label">Apoderado</span>
                <strong>{detailTarget.apoderadoNombre}</strong>
              </div>
              <div className="info-block">
                <span className="info-block__label">Fecha de inasistencia</span>
                <strong>{formatDate(detailTarget.fechaInasistencia)}</strong>
              </div>
              <div className="info-block">
                <span className="info-block__label">Alcance</span>
                <strong>{scopeLabel(detailTarget)}</strong>
              </div>
              <div className="info-block">
                <span className="info-block__label">Recibido</span>
                <strong>{formatDateTime(detailTarget.createdAt)}</strong>
              </div>
              <div className="info-block">
                <span className="info-block__label">Estado</span>
                <strong>
                  <span className={`badge ${TICKET_CLASS[detailTarget.estado] || "badge--neutral"}`}>
                    {estadoLabel(detailTarget.estado)}
                  </span>
                </strong>
              </div>
            </div>

            <div className="ticket-detail__motivo">
              <span className="info-block__label">Motivo declarado</span>
              <p>{detailTarget.motivo}</p>
            </div>

            <div className="ticket-detail__sustento">
              <span className="info-block__label">Sustento adjunto</span>
              {detailTarget.storagePath ? (
                sustentoUrl ? (
                  <div className="ticket-detail__link">
                    <a href={sustentoUrl} target="_blank" rel="noreferrer" className="link-btn">
                      <Paperclip size={15} /> Abrir sustento (enlace firmado)
                    </a>
                    <small>El enlace expira en pocos minutos.</small>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn--soft btn--sm"
                    onClick={handleSustento}
                    disabled={sustentoLoading}
                  >
                    <FileCheck size={15} /> {sustentoLoading ? "Generando enlace…" : "Ver sustento"}
                  </button>
                )
              ) : (
                <p className="hint">El apoderado no adjuntó un archivo de sustento.</p>
              )}
              {sustentoError ? (
                <div className="alert alert--error" role="alert">
                  <CircleX size={16} />
                  <p>{sustentoError.message}</p>
                </div>
              ) : null}
            </div>

            {detailTarget.estado === "PENDIENTE" ? (
              <form id="ticket-resolve-form" className="form ticket-detail__resolve" onSubmit={handleResolve}>
                {resolveError ? (
                  <div className="alert alert--error" role="alert">
                    <CircleX size={18} />
                    <p>{resolveError.message}</p>
                  </div>
                ) : null}

                <label className="field field--plain">
                  <span className="field__label">Resolución</span>
                  <select
                    className="select"
                    value={resolveForm.estado}
                    onChange={(event) => setResolveForm((prev) => ({ ...prev, estado: event.target.value }))}
                    disabled={resolving}
                  >
                    <option value="APROBADO">Aprobar · las faltas pasan a JUSTIFICADA</option>
                    <option value="RECHAZADO">Rechazar · la asistencia no cambia</option>
                  </select>
                </label>

                <label className="field field--plain">
                  <span className="field__label">Observaciones (opcional)</span>
                  <textarea
                    className="textarea"
                    rows={3}
                    maxLength={500}
                    value={resolveForm.observacionesAdmin}
                    onChange={(event) =>
                      setResolveForm((prev) => ({ ...prev, observacionesAdmin: event.target.value }))
                    }
                    placeholder="Documento válido, falta de sustento, etc."
                    disabled={resolving}
                  />
                  <small className="char-count">{resolveForm.observacionesAdmin.length} / 500</small>
                </label>

                <div className="info-strip info-strip--soft">
                  <CalendarDays size={16} />
                  <p>
                    La resolución es definitiva. Un ticket ya aprobado o rechazado no se puede volver a resolver.
                  </p>
                </div>
              </form>
            ) : (
              <div className="ticket-detail__resolution">
                <div className="info-block">
                  <span className="info-block__label">Resuelto por</span>
                  <strong>{detailTarget.resueltoPorNombre || "—"}</strong>
                </div>
                <div className="info-block">
                  <span className="info-block__label">Fecha de resolución</span>
                  <strong>{formatDateTime(detailTarget.fechaResolucion)}</strong>
                </div>
                <div className="info-block">
                  <span className="info-block__label">Observaciones</span>
                  <strong>{detailTarget.observacionesAdmin || "—"}</strong>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
