import { useMemo, useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  CircleCheck,
  ClipboardList,
  GraduationCap,
  LibraryBig,
  Megaphone,
  RefreshCw,
} from "lucide-react";
import { formatDateTime, relativeTime } from "../../utils/format.js";

const TYPE_META = {
  COMUNICADO: { icon: Megaphone, label: "Comunicado", tone: "primary" },
  TICKET_RESUELTO: { icon: ClipboardList, label: "Justificación", tone: "accent" },
  CALIFICACION: { icon: BookOpen, label: "Calificación", tone: "secondary" },
  ASISTENCIA: { icon: CalendarDays, label: "Asistencia", tone: "info" },
  MATERIAL: { icon: LibraryBig, label: "Material", tone: "success" },
  CIERRE: { icon: GraduationCap, label: "Cierre", tone: "neutral" },
};

export default function NotificationsView({
  notifications,
  unread,
  loading,
  onReload,
  onMarkOne,
  onMarkAll,
}) {
  const [filter, setFilter] = useState("TODAS");

  const filtered = useMemo(() => {
    if (filter === "NO_LEIDAS") return notifications.filter((item) => !item.leida);
    return notifications;
  }, [notifications, filter]);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Bandeja de notificaciones</h2>
          <p className="page__sub">
            {unread} sin leer de {notifications.length} avisos recibidos.
          </p>
        </div>
        <div className="page__actions">
          <button type="button" className="btn btn--ghost" onClick={onReload} disabled={loading}>
            <RefreshCw size={16} className={loading ? "spin" : ""} /> Actualizar
          </button>
          <button type="button" className="btn btn--primary" onClick={onMarkAll} disabled={!unread}>
            <CircleCheck size={16} /> Marcar todas como leídas
          </button>
        </div>
      </div>

      <div className="toolbar-tabs">
        <div className="segmented">
          <button
            type="button"
            className={`segmented__item ${filter === "TODAS" ? "segmented__item--active" : ""}`}
            onClick={() => setFilter("TODAS")}
          >
            Todas ({notifications.length})
          </button>
          <button
            type="button"
            className={`segmented__item ${filter === "NO_LEIDAS" ? "segmented__item--active" : ""}`}
            onClick={() => setFilter("NO_LEIDAS")}
          >
            Sin leer ({unread})
          </button>
        </div>
      </div>

      <section className="card">
        {loading ? (
          <div className="loading-state">
            <span className="spinner spinner--dark" />
            <p>Cargando notificaciones…</p>
          </div>
        ) : filtered.length ? (
          <div className="notif-list">
            {filtered.map((notification) => {
              const meta = TYPE_META[notification.tipo] || {
                icon: Bell,
                label: notification.tipo,
                tone: "neutral",
              };
              const Icon = meta.icon;
              return (
                <article
                  key={notification.id}
                  className={`notif-row ${notification.leida ? "" : "notif-row--unread"}`}
                >
                  <span className={`notif-row__icon notif-row__icon--${meta.tone}`}>
                    <Icon size={19} />
                  </span>
                  <div className="notif-row__body">
                    <div className="notif-row__head">
                      <span className="notif-row__type">{meta.label}</span>
                      {!notification.leida ? <span className="notif-dot" /> : null}
                      <span className="notif-row__date">{relativeTime(notification.createdAt)}</span>
                    </div>
                    <strong>{notification.titulo}</strong>
                    <p>{notification.mensaje}</p>
                    <small>{formatDateTime(notification.createdAt)}</small>
                  </div>
                  {!notification.leida ? (
                    <button
                      type="button"
                      className="btn btn--soft btn--sm"
                      onClick={() => onMarkOne(notification)}
                    >
                      <CircleCheck size={15} /> Marcar leída
                    </button>
                  ) : (
                    <span className="notif-row__read">
                      <CircleCheck size={16} /> Leída
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty empty--tall">
            <span className="empty__icon">
              <CircleCheck size={26} />
            </span>
            <p className="empty__title">
              {filter === "NO_LEIDAS" ? "No tienes avisos pendientes" : "Sin notificaciones"}
            </p>
            <p className="empty__text">
              {filter === "NO_LEIDAS"
                ? "Todas tus notificaciones están marcadas como leídas."
                : "Cuando ocurra un evento que te afecte, aparecerá aquí."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
