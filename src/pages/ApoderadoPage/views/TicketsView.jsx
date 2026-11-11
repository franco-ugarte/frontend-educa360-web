import { useMemo, useState } from "react";
import {
  CalendarDays,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Clock,
  Eye,
  FileCheck,
  FileUp,
  Paperclip,
  Plus,
  Search,
  Ticket,
  UserCheck,
} from "lucide-react";
import { apoderadoService, getApiError } from "../../../services/api";
import { Modal } from "../../../components/ui/Modal";
import {
  ASISTENCIA_CLASS,
  DIA_LABELS,
  TICKET_CLASS,
  estadoLabel,
  formatDate,
  formatDateTime,
  formatTime,
} from "../../../utils/format";
import {
  SUSTENTO_ACCEPT,
  attendanceOnDate,
  buildBlockOptions,
  findTicketConflict,
  hijoName,
  localISODate,
  sortTickets,
  ticketScopeLabel,
  validateSustentoFile,
} from "../apoderadoUtils";

const EMPTY_FORM = () => ({
  fechaInasistencia: localISODate(),
  bloqueId: "",
  motivo: "",
});

export default function TicketsView({
  hijo,
  tickets = [],
  asistencias,
  canCreate = false,
  onReload,
  showToast,
}) {
  const [estadoFilter, setEstadoFilter] = useState("TODOS");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [detailTarget, setDetailTarget] = useState(null);
  const [sustentoUrl, setSustentoUrl] = useState(null);
  const [sustentoError, setSustentoError] = useState(null);
  const [sustentoLoading, setSustentoLoading] = useState(false);
  const [sustentoFile, setSustentoFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const today = localISODate();
  const detalleAsistencias = asistencias?.detalle || [];

  const stats = {
    pendientes: tickets.filter((ticket) => ticket.estado === "PENDIENTE").length,
    aprobados: tickets.filter((ticket) => ticket.estado === "APROBADO").length,
    rechazados: tickets.filter((ticket) => ticket.estado === "RECHAZADO").length,
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sortTickets(tickets)
      .filter((ticket) => estadoFilter === "TODOS" || ticket.estado === estadoFilter)
      .filter((ticket) => {
        if (!term) return true;
        return [ticket.motivo, ticket.materiaNombre, ticket.estado, ticket.dia]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      });
  }, [tickets, estadoFilter, search]);

  const blockOptions = useMemo(
    () => buildBlockOptions(detalleAsistencias, form.fechaInasistencia),
    [detalleAsistencias, form.fechaInasistencia]
  );

  const dayRecords = useMemo(
    () => attendanceOnDate(detalleAsistencias, form.fechaInasistencia),
    [detalleAsistencias, form.fechaInasistencia]
  );

  const selectedBloqueId = form.bloqueId ? Number(form.bloqueId) : null;
  const conflict = findTicketConflict(tickets, form.fechaInasistencia, selectedBloqueId);

  const openCreate = () => {
    setForm(EMPTY_FORM());
    setFormError(null);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (creating) return;
    setCreateOpen(false);
    setFormError(null);
  };

  const openDetail = (ticket) => {
    setDetailTarget(ticket);
    setSustentoUrl(null);
    setSustentoError(null);
    setSustentoFile(null);
  };

  const closeDetail = () => {
    if (uploading) return;
    setDetailTarget(null);
    setSustentoUrl(null);
    setSustentoError(null);
    setSustentoFile(null);
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    if (!hijo) {
      setFormError({ message: "No hay un representado seleccionado." });
      return;
    }

    const motivo = form.motivo.trim();
    if (!form.fechaInasistencia) {
      setFormError({ message: "La fecha de inasistencia es obligatoria." });
      return;
    }
    if (form.fechaInasistencia > today) {
      setFormError({ message: "No se puede justificar una fecha futura." });
      return;
    }
    if (!motivo) {
      setFormError({ message: "El motivo es obligatorio." });
      return;
    }
    if (motivo.length > 500) {
      setFormError({ message: "El motivo no puede superar los 500 caracteres." });
      return;
    }
    if (selectedBloqueId != null && !blockOptions.some((option) => Number(option.id) === selectedBloqueId)) {
      setFormError({ message: "El bloque seleccionado no corresponde a la fecha indicada." });
      return;
    }
    if (conflict) {
      setFormError({
        message: `Ya existe un ticket ${conflict.estado} para esta fecha${
          conflict.bloqueId ? " y bloque" : " (día completo)"
        }. Revisa el historial antes de crear otro.`,
      });
      return;
    }

    setCreating(true);
    setFormError(null);
    try {
      await apoderadoService.crearTicket(hijo.estudianteId, {
        fechaInasistencia: form.fechaInasistencia,
        bloqueId: selectedBloqueId,
        motivo,
      });
      showToast("success", "Justificación creada. Secretaría revisará el ticket.");
      setCreateOpen(false);
      onReload?.();
    } catch (error) {
      setFormError(getApiError(error));
    } finally {
      setCreating(false);
    }
  };

  const handleSustentoUrl = async () => {
    if (!detailTarget) return;
    setSustentoLoading(true);
    setSustentoError(null);
    try {
      const result = await apoderadoService.urlSustento(detailTarget.id);
      setSustentoUrl(result.url);
    } catch (error) {
      setSustentoError(getApiError(error));
    } finally {
      setSustentoLoading(false);
    }
  };

  const handleUploadSustento = async (event) => {
    event.preventDefault();
    if (!detailTarget) return;
    const validation = validateSustentoFile(sustentoFile);
    if (validation) {
      setSustentoError({ message: validation });
      return;
    }

    const formData = new FormData();
    formData.append("archivo", sustentoFile);

    setUploading(true);
    setSustentoError(null);
    try {
      const updated = await apoderadoService.subirSustento(detailTarget.id, formData);
      setDetailTarget(updated);
      setSustentoFile(null);
      setSustentoUrl(null);
      showToast("success", "Sustento adjuntado al ticket.");
      onReload?.();
    } catch (error) {
      setSustentoError(getApiError(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Justificaciones de {hijoName(hijo)}</h2>
          <p className="page__sub">
            {stats.pendientes} pendiente(s) · {stats.aprobados} aprobada(s) · {stats.rechazados}{" "}
            rechazada(s). Solo Secretaría resuelve los tickets.
          </p>
        </div>
        <div className="page__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={openCreate}
            disabled={!canCreate}
            title={canCreate ? "Crear justificación" : "El representado no tiene matrícula vigente"}
          >
            <Plus size={16} /> Nueva justificación
          </button>
        </div>
      </div>

      {!canCreate ? (
        <div className="info-strip info-strip--soft">
          <Ticket size={16} />
          <p>
            El representado no tiene una matrícula vigente; no es posible crear justificaciones hasta que
            Secretaría lo inscriba en una sección.
          </p>
        </div>
      ) : null}

      <section className="grid grid--stats apoderado-ticket-stats">
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--accent">
            <ClipboardCheck size={20} />
          </span>
          <div>
            <strong className="stat-card__value">{stats.pendientes}</strong>
            <span className="stat-card__label">Pendientes</span>
          </div>
          <span className="stat-card__hint">En revisión</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--success">
            <CircleCheck size={20} />
          </span>
          <div>
            <strong className="stat-card__value">{stats.aprobados}</strong>
            <span className="stat-card__label">Aprobadas</span>
          </div>
          <span className="stat-card__hint">Faltas justificadas</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--danger">
            <CircleX size={20} />
          </span>
          <div>
            <strong className="stat-card__value">{stats.rechazados}</strong>
            <span className="stat-card__label">Rechazadas</span>
          </div>
          <span className="stat-card__hint">Sin efecto en asistencia</span>
        </article>
      </section>

      <div className="toolbar">
        <label className="search">
          <Search size={17} />
          <input
            type="search"
            placeholder="Buscar por motivo, curso o estado…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="toolbar__group">
          <select
            className="select"
            value={estadoFilter}
            onChange={(event) => setEstadoFilter(event.target.value)}
          >
            <option value="TODOS">Todos los estados</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="APROBADO">Aprobadas</option>
            <option value="RECHAZADO">Rechazadas</option>
          </select>
        </div>
      </div>

      <section className="card">
        <div className="card__body card__body--flush">
          {filtered.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha de falta</th>
                    <th>Alcance</th>
                    <th>Motivo</th>
                    <th>Estado</th>
                    <th>Sustento</th>
                    <th>Recibido</th>
                    <th className="table__actions-col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <strong>{formatDate(ticket.fechaInasistencia)}</strong>
                        <small className="muted">
                          {ticket.dia ? DIA_LABELS[ticket.dia] || ticket.dia : "Día completo"}
                        </small>
                      </td>
                      <td className="apoderado-cell-clamp muted">{ticketScopeLabel(ticket)}</td>
                      <td className="apoderado-cell-clamp">{ticket.motivo}</td>
                      <td>
                        <span className={`badge ${TICKET_CLASS[ticket.estado] || "badge--neutral"}`}>
                          {estadoLabel(ticket.estado)}
                        </span>
                      </td>
                      <td>
                        {ticket.storagePath ? (
                          <span className="badge badge--info">
                            <Paperclip size={11} /> Adjunto
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="muted">{formatDateTime(ticket.createdAt)}</td>
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
                <Ticket size={26} />
              </span>
              <p className="empty__title">Sin justificaciones en la vista</p>
              <p className="empty__text">
                {tickets.length
                  ? "Ajusta el estado o la búsqueda para ver otros tickets."
                  : "Crea una justificación cuando el representado falte a clases. Secretaría la revisará y, si se aprueba, la falta pasará a justificada."}
              </p>
              {canCreate ? (
                <button type="button" className="btn btn--primary btn--sm" onClick={openCreate}>
                  <Plus size={15} /> Crear justificación
                </button>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <div className="info-strip info-strip--soft">
        <UserCheck size={16} />
        <p>
          La fecha no puede ser futura. Un ticket cubre el <strong>día completo</strong> o un{" "}
          <strong>bloque concreto</strong>; no se permiten dos tickets activos solapados para la misma
          fecha. El sustento es opcional y admite PDF, JPG o PNG de hasta 5 MB.
        </p>
      </div>

      <Modal
        open={createOpen}
        onClose={closeCreate}
        title="Nueva justificación"
        subtitle={hijo ? `${hijoName(hijo)} · DNI ${hijo.dni || "—"}` : ""}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={closeCreate} disabled={creating}>
              Cancelar
            </button>
            <button
              type="submit"
              form="apoderado-ticket-form"
              className="btn btn--primary"
              disabled={creating || Boolean(conflict)}
            >
              {creating ? "Creando…" : "Crear justificación"}
            </button>
          </>
        }
      >
        <form id="apoderado-ticket-form" className="form" onSubmit={submitCreate}>
          {formError ? (
            <div className="alert alert--error" role="alert">
              <CircleX size={18} />
              <div>
                <p>{formError.message}</p>
              </div>
            </div>
          ) : null}

          <div className="form-grid form-grid--2">
            <label className="field field--plain">
              <span className="field__label">Fecha de inasistencia</span>
              <input
                className="input"
                type="date"
                value={form.fechaInasistencia}
                max={today}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, fechaInasistencia: event.target.value, bloqueId: "" }))
                }
                disabled={creating}
                required
              />
            </label>

            <div className="apoderado-ticket-scope-summary">
              <span className="field__label">Alcance seleccionado</span>
              <strong>
                {selectedBloqueId == null
                  ? "Día completo"
                  : blockOptions.find((option) => Number(option.id) === selectedBloqueId)?.materiaNombre ||
                    "Bloque"}
              </strong>
              <small>
                {selectedBloqueId == null
                  ? "Cubre todas las clases de la fecha."
                  : ticketScopeFromOption(blockOptions.find((option) => Number(option.id) === selectedBloqueId))}
              </small>
            </div>
          </div>

          <div className="apoderado-block-picker">
            <span className="field__label">¿Qué deseas justificar?</span>
            <button
              type="button"
              className={`apoderado-block-option ${selectedBloqueId == null ? "is-active" : ""}`}
              onClick={() => setForm((prev) => ({ ...prev, bloqueId: "" }))}
              disabled={creating}
            >
              <span className="apoderado-block-option__icon">
                <CalendarDays size={17} />
              </span>
              <span className="apoderado-block-option__text">
                <strong>Día completo</strong>
                <small>Todas las clases de la fecha seleccionada</small>
              </span>
              {selectedBloqueId == null ? <CircleCheck size={17} /> : null}
            </button>

            {blockOptions.map((option) => {
              const active = String(selectedBloqueId) === String(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`apoderado-block-option ${active ? "is-active" : ""}`}
                  onClick={() => setForm((prev) => ({ ...prev, bloqueId: String(option.id) }))}
                  disabled={creating}
                >
                  <span className="apoderado-block-option__icon">
                    <Clock size={17} />
                  </span>
                  <span className="apoderado-block-option__text">
                    <strong>{option.materiaNombre}</strong>
                    <small>
                      {DIA_LABELS[option.dia] || option.dia || "—"} ·{" "}
                      {formatTime(option.horaInicio)}–{formatTime(option.horaFin)}
                    </small>
                  </span>
                  <span
                    className={`badge ${ASISTENCIA_CLASS[option.estado] || "badge--neutral"}`}
                  >
                    {estadoLabel(option.estado)}
                  </span>
                  {active ? <CircleCheck size={17} /> : null}
                </button>
              );
            })}

            {!blockOptions.length ? (
              <div className="apoderado-inline-empty">
                <Clock size={17} />
                <span>
                  No hay bloques de clase registrados para esa fecha. Puedes justificar el día completo.
                </span>
              </div>
            ) : null}
          </div>

          {dayRecords.length ? (
            <div className="apoderado-day-records">
              <span className="field__label">Asistencia registrada ese día</span>
              <div className="apoderado-day-records__list">
                {dayRecords.map((registro) => (
                  <span key={registro.id} className="apoderado-day-record">
                    <b>{registro.materiaNombre}</b>
                    <small>
                      {formatTime(registro.horaInicio)}–{formatTime(registro.horaFin)}
                    </small>
                    <span className={`badge ${ASISTENCIA_CLASS[registro.estado] || "badge--neutral"}`}>
                      {estadoLabel(registro.estado)}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {conflict ? (
            <div className="alert alert--error alert--inline" role="alert">
              <CircleX size={18} />
              <div>
                <p>
                  Ya existe un ticket <strong>{estadoLabel(conflict.estado)}</strong> para esta fecha
                  {conflict.bloqueId ? " y bloque" : " de día completo"}.
                </p>
                <small>No se pueden solapar dos tickets activos. Elige otra fecha o bloque.</small>
              </div>
            </div>
          ) : null}

          <label className="field field--plain">
            <span className="field__label">Motivo de la inasistencia</span>
            <textarea
              className="textarea"
              rows={4}
              maxLength={500}
              value={form.motivo}
              onChange={(event) => setForm((prev) => ({ ...prev, motivo: event.target.value }))}
              placeholder="Describe el motivo (cita médica, trámite familiar, viaje, etc.)."
              disabled={creating}
              required
            />
            <small className="char-count">{form.motivo.length} / 500</small>
          </label>

          <div className="info-strip info-strip--soft">
            <Paperclip size={16} />
            <p>
              El sustento (PDF, JPG o PNG de hasta 5 MB) puede adjuntarse después, desde el detalle del
              ticket, mientras siga <strong>pendiente</strong>.
            </p>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(detailTarget)}
        onClose={closeDetail}
        title={`Justificación #${detailTarget?.id || ""}`}
        subtitle={detailTarget ? `${formatDate(detailTarget.fechaInasistencia)} · ${hijoName(hijo)}` : ""}
        size="lg"
        footer={
          <button type="button" className="btn btn--ghost" onClick={closeDetail} disabled={uploading}>
            Cerrar
          </button>
        }
      >
        {detailTarget ? (
          <div className="ticket-detail">
            <div className="student-file__grid">
              <div className="info-block">
                <span className="info-block__label">Representado</span>
                <strong>{detailTarget.estudianteNombre || hijoName(hijo)}</strong>
                <small className="muted">DNI {detailTarget.estudianteDni || hijo?.dni || "—"}</small>
              </div>
              <div className="info-block">
                <span className="info-block__label">Fecha de inasistencia</span>
                <strong>{formatDate(detailTarget.fechaInasistencia)}</strong>
              </div>
              <div className="info-block">
                <span className="info-block__label">Alcance</span>
                <strong>{ticketScopeLabel(detailTarget)}</strong>
              </div>
              <div className="info-block">
                <span className="info-block__label">Estado</span>
                <strong>
                  <span className={`badge ${TICKET_CLASS[detailTarget.estado] || "badge--neutral"}`}>
                    {estadoLabel(detailTarget.estado)}
                  </span>
                </strong>
              </div>
              <div className="info-block">
                <span className="info-block__label">Recibido</span>
                <strong>{formatDateTime(detailTarget.createdAt)}</strong>
              </div>
              <div className="info-block">
                <span className="info-block__label">Resuelto por</span>
                <strong>{detailTarget.resueltoPorNombre || "Pendiente"}</strong>
                {detailTarget.fechaResolucion ? (
                  <small className="muted">{formatDateTime(detailTarget.fechaResolucion)}</small>
                ) : null}
              </div>
            </div>

            <div className="ticket-detail__motivo">
              <span className="info-block__label">Motivo declarado</span>
              <p>{detailTarget.motivo}</p>
            </div>

            {detailTarget.estado !== "PENDIENTE" ? (
              <div className="ticket-detail__resolution apoderado-ticket-resolution">
                <div className="info-block">
                  <span className="info-block__label">Observaciones de Secretaría</span>
                  <strong>{detailTarget.observacionesAdmin || "Sin observaciones."}</strong>
                </div>
              </div>
            ) : null}

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
                    onClick={handleSustentoUrl}
                    disabled={sustentoLoading}
                  >
                    <FileCheck size={15} /> {sustentoLoading ? "Generando enlace…" : "Ver sustento"}
                  </button>
                )
              ) : (
                <p className="hint">Todavía no se adjuntó un archivo de sustento.</p>
              )}

              {sustentoError ? (
                <div className="alert alert--error" role="alert">
                  <CircleX size={16} />
                  <p>{sustentoError.message}</p>
                </div>
              ) : null}

              {detailTarget.estado === "PENDIENTE" ? (
                <form className="apoderado-upload" onSubmit={handleUploadSustento}>
                  <span className="info-block__label">
                    {detailTarget.storagePath ? "Reemplazar sustento" : "Adjuntar sustento"}
                  </span>
                  <label className="apoderado-upload__drop">
                    <FileUp size={20} />
                    <span>
                      <strong>{sustentoFile ? sustentoFile.name : "Selecciona un archivo"}</strong>
                      <small>PDF, JPG o PNG · máximo 5 MB</small>
                    </span>
                    <input
                      type="file"
                      accept={SUSTENTO_ACCEPT}
                      onChange={(event) => {
                        setSustentoError(null);
                        setSustentoFile(event.target.files?.[0] || null);
                      }}
                      disabled={uploading}
                    />
                  </label>
                  <div className="apoderado-upload__actions">
                    {sustentoFile ? (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => setSustentoFile(null)}
                        disabled={uploading}
                      >
                        Quitar
                      </button>
                    ) : null}
                    <button
                      type="submit"
                      className="btn btn--primary btn--sm"
                      disabled={uploading || !sustentoFile}
                    >
                      <FileUp size={15} />
                      {uploading ? "Subiendo…" : detailTarget.storagePath ? "Reemplazar" : "Adjuntar"}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="hint">
                  El sustento solo se adjunta o reemplaza mientras el ticket está pendiente.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function ticketScopeFromOption(option) {
  if (!option) return "";
  return `${DIA_LABELS[option.dia] || option.dia || "—"} · ${formatTime(option.horaInicio)}–${formatTime(
    option.horaFin
  )}`;
}
