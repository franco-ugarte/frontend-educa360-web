export const ROLE_LABELS = {
  ADMIN: "Administrador",
  SECRETARIA: "Secretaría",
  DOCENTE: "Docente",
  ESTUDIANTE: "Estudiante",
  APODERADO: "Apoderado",
};

export const ROLE_SHORT = {
  ADMIN: "ADMIN",
  SECRETARIA: "SECRETARÍA",
  DOCENTE: "DOCENTE",
  ESTUDIANTE: "ESTUDIANTE",
  APODERADO: "APODERADO",
};

export const ROLE_CLASS = {
  ADMIN: "badge--primary",
  SECRETARIA: "badge--accent",
  DOCENTE: "badge--secondary",
  ESTUDIANTE: "badge--info",
  APODERADO: "badge--success",
};

export const ESTADO_CLASS = {
  ABIERTO: "badge--success",
  PLANIFICADO: "badge--accent",
  CERRADO: "badge--neutral",
};

export const SITUACION_CLASS = {
  EN_CURSO: "badge--info",
  APROBADO: "badge--success",
  DESAPROBADO: "badge--danger",
  RETIRADO: "badge--neutral",
};

export const ESTUDIANTE_CLASS = {
  ACTIVO: "badge--success",
  TRASLADADO: "badge--info",
  RETIRADO: "badge--neutral",
  EGRESADO: "badge--secondary",
};

export const TICKET_CLASS = {
  PENDIENTE: "badge--accent",
  APROBADO: "badge--success",
  RECHAZADO: "badge--danger",
};

export const ASISTENCIA_CLASS = {
  PRESENTE: "badge--success",
  TARDANZA: "badge--accent",
  FALTA: "badge--danger",
  JUSTIFICADA: "badge--info",
};

export const PARENTESCO_LABELS = {
  PADRE: "Padre",
  MADRE: "Madre",
  TUTOR: "Tutor",
  HERMANO: "Hermano/a",
  OTRO: "Otro",
};

export const DIA_LABELS = {
  LUNES: "Lunes",
  MARTES: "Martes",
  MIERCOLES: "Miércoles",
  JUEVES: "Jueves",
  VIERNES: "Viernes",
  SABADO: "Sábado",
};

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("es-PE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value) {
  if (!value) return "—";
  const date = typeof value === "string" && !value.includes("T")
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

export function formatTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

export function formatLongDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return longDateFormatter.format(date);
}

export function relativeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `Hace ${days} d`;
  return formatDate(date);
}

export function initials(nombres = "", apellidos = "") {
  const a = nombres.trim().charAt(0);
  const b = apellidos.trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
}

export function fullName(persona) {
  if (!persona) return "—";
  return `${persona.nombres || ""} ${persona.apellidos || ""}`.trim() || persona.email || "—";
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || role || "—";
}

export function estadoLabel(estado) {
  if (!estado) return "—";
  return estado
    .toString()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
