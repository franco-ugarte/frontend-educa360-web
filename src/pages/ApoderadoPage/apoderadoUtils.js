/**
 * Utilidades del panel APODERADO.
 *
 * El backend entrega la información ya acotada a los representados activos
 * del token: el apoderado no puede consultar hijos ajenos. Aquí agrupamos,
 * ordenamos y derivamos etiquetas para la interfaz.
 */

import { DIA_LABELS } from "../../utils/format";

const ROMAN_ORDER = { I: 1, II: 2, III: 3, IV: 4 };

export const COURSE_TONES = ["primary", "secondary", "accent", "success", "info", "neutral"];

export const ACTIVE_TICKET_STATES = ["PENDIENTE", "APROBADO"];

const SUSTENTO_MIMES = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export const SUSTENTO_ACCEPT = ".pdf,.jpg,.jpeg,.png";
export const SUSTENTO_MAX_BYTES = 5 * 1024 * 1024;

export function courseTone(index = 0) {
  return COURSE_TONES[index % COURSE_TONES.length];
}

export function bimestreOrder(nombre) {
  const text = String(nombre || "").trim();
  const roman = text.match(/\b(I{1,3}|IV)\b$/i);
  if (roman) return ROMAN_ORDER[roman[1].toUpperCase()] || 0;
  const number = text.match(/(\d+)\s*$/);
  return number ? Number(number[1]) : 0;
}

export function sortBimestres(bimestres = []) {
  return [...bimestres].sort(
    (a, b) =>
      Number(a.numero || bimestreOrder(a.nombre)) -
        Number(b.numero || bimestreOrder(b.nombre)) ||
      String(a.nombre || "").localeCompare(String(b.nombre || ""))
  );
}

/**
 * Los bimestres visibles se toman de la boleta anual (que trae todos los
 * bimestres del año). Si aún no hay boleta, se reconstruyen desde las notas
 * y desde las unidades publicadas.
 */
export function deriveBimestres({ boleta, calificaciones, unidadesPorCurso } = {}) {
  const map = new Map();

  const push = (bimestreId, nombre, numero) => {
    if (bimestreId == null) return;
    const key = String(bimestreId);
    if (!map.has(key)) {
      map.set(key, {
        id: bimestreId,
        nombre: nombre || `Bimestre ${numero || ""}`.trim(),
        numero: Number(numero || bimestreOrder(nombre)),
      });
    }
  };

  (boleta?.bimestres || []).forEach((bimestre) =>
    push(bimestre.bimestreId, bimestre.nombre, bimestre.numero)
  );

  (calificaciones?.promediosUnidad || []).forEach((unidad) =>
    push(unidad.bimestreId, unidad.bimestreNombre, unidad.bimestreNumero)
  );

  Object.values(unidadesPorCurso || {}).forEach((unidades) => {
    (unidades || []).forEach((unidad) => {
      push(unidad.bimestreId, unidad.bimestreNombre, null);
    });
  });

  return sortBimestres([...map.values()]);
}

export function sortUnidades(unidades = []) {
  return [...unidades].sort(
    (a, b) =>
      bimestreOrder(a.bimestreNombre) - bimestreOrder(b.bimestreNombre) ||
      Number(a.numero || 0) - Number(b.numero || 0)
  );
}

export function courseLabel(curso) {
  if (!curso) return "Curso";
  return `${curso.materiaNombre || "Materia"} · ${curso.seccionEtiqueta || ""}`.trim();
}

/** Nota vigesimal aprobatoria: 11.00 (regla del backend). */
export function gradeTone(value) {
  if (value === null || value === undefined || value === "") return "neutral";
  const note = Number(value);
  if (Number.isNaN(note)) return "neutral";
  if (note >= 17) return "success";
  if (note >= 14) return "info";
  if (note >= 11) return "accent";
  return "danger";
}

/** Asistencia mínima para aprobar: 70%. */
export function attendanceTone(value) {
  if (value === null || value === undefined || value === "") return "neutral";
  const percentage = Number(value);
  if (Number.isNaN(percentage)) return "neutral";
  if (percentage >= 90) return "success";
  if (percentage >= 70) return "info";
  if (percentage >= 50) return "accent";
  return "danger";
}

/* ==========================================================================
   SEMÁFORO ACADÉMICO
   Escala aprobatoria 11/20: rojo 0–11, ámbar 12–16, verde 17–20.
   Asistencia: rojo <70 %, ámbar 70–84.99 %, verde ≥85 %.
   El color final es el peor de los factores.
   ========================================================================== */

const SEMAFORO_RANK = { red: 0, amber: 1, green: 2 };

const SEMAFORO_LABEL = {
  red: "En riesgo",
  amber: "En observación",
  green: "Buen rendimiento",
};

const SEMAFORO_FACTOR_LABEL = {
  notas: "las calificaciones",
  asistencia: "la asistencia",
};

export function noteSemaforo(value) {
  if (value === null || value === undefined || value === "") return null;
  const note = Number(value);
  if (Number.isNaN(note)) return null;
  if (note < 12) return "red";
  if (note < 17) return "amber";
  return "green";
}

export function attendanceSemaforo(value) {
  if (value === null || value === undefined || value === "") return null;
  const percentage = Number(value);
  if (Number.isNaN(percentage)) return null;
  if (percentage < 70) return "red";
  if (percentage < 85) return "amber";
  return "green";
}

/**
 * Combina nota y asistencia en un único estado. Devuelve `null` cuando no hay
 * ningún dato disponible y, si lo hay, qué factor(es) arrastran el color.
 */
export function calcularSemaforo({ promedio, asistencia } = {}) {
  const noteLevel = noteSemaforo(promedio);
  const attendanceLevel = attendanceSemaforo(asistencia);
  const levels = [noteLevel, attendanceLevel].filter(Boolean);
  if (!levels.length) return null;

  const level = levels.reduce(
    (worst, current) => (SEMAFORO_RANK[current] < SEMAFORO_RANK[worst] ? current : worst),
    levels[0]
  );

  const factors = [];
  if (noteLevel === level) factors.push("notas");
  if (attendanceLevel === level) factors.push("asistencia");

  const hasNota = noteLevel != null;
  const hasAsistencia = attendanceLevel != null;

  let detail;
  if (!hasAsistencia) {
    detail = "Aún no hay registros de asistencia: el color refleja solo las calificaciones.";
  } else if (!hasNota) {
    detail = "Aún no hay notas publicadas: el color refleja solo la asistencia.";
  } else if (level === "green") {
    detail = "Notas y asistencia están dentro del rango esperado.";
  } else {
    detail = `El color refleja ${factors
      .map((factor) => SEMAFORO_FACTOR_LABEL[factor])
      .join(" y ")}.`;
  }

  return {
    level,
    label: SEMAFORO_LABEL[level],
    detail,
    noteLevel,
    attendanceLevel,
    factors,
    hasNota,
    hasAsistencia,
  };
}

export function hijoName(hijo) {
  if (!hijo) return "Representado";
  return `${hijo.nombres || ""} ${hijo.apellidos || ""}`.trim() || "Representado";
}

export function hijoFirstName(hijo) {
  return hijoName(hijo).split(" ")[0] || "Representado";
}

export function hijoInitials(hijo) {
  const a = String(hijo?.nombres || "").trim().charAt(0);
  const b = String(hijo?.apellidos || "").trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
}

/**
 * El APODERADO no tiene endpoint de cursos: la lista se deriva de la boleta
 * (que incluye todos los cursos de la sección), de los promedios por curso o,
 * en última instancia, de las asistencias registradas.
 */
export function deriveCursos({ hijo, boleta, calificaciones, asistencias } = {}) {
  const map = new Map();

  const seccionEtiqueta = hijo?.seccionEtiqueta || boleta?.seccionEtiqueta || "";
  const anioNombre =
    hijo?.anioNombre ||
    boleta?.anioNombre ||
    (calificaciones?.anio ? `Año ${calificaciones.anio}` : asistencias?.anio ? `Año ${asistencias.anio}` : "Año escolar");

  const push = (cursoId, materiaNombre) => {
    if (cursoId == null) return;
    const key = String(cursoId);
    if (!map.has(key)) {
      map.set(key, {
        id: cursoId,
        materiaNombre: materiaNombre || "Curso",
        seccionEtiqueta,
        anioNombre,
      });
    }
  };

  const source = boleta?.cursos?.length
    ? boleta.cursos.map((curso) => [curso.cursoId, curso.materiaNombre])
    : calificaciones?.promediosCurso?.length
      ? calificaciones.promediosCurso.map((curso) => [curso.cursoId, curso.materiaNombre])
      : (asistencias?.detalle || []).map((item) => [item.cursoId, item.materiaNombre]);

  source.forEach(([cursoId, materiaNombre]) => push(cursoId, materiaNombre));

  return [...map.values()].sort((a, b) =>
    String(a.materiaNombre).localeCompare(String(b.materiaNombre))
  );
}

export function announcementScope(comunicado) {
  return comunicado?.seccionEtiqueta ? `Sección ${comunicado.seccionEtiqueta}` : "General";
}

export function sortAnnouncements(comunicados = []) {
  return [...comunicados].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
}

export function isActiveTicket(ticket) {
  return Boolean(ticket && ACTIVE_TICKET_STATES.includes(ticket.estado));
}

export function sortTickets(tickets = []) {
  const weight = { PENDIENTE: 0, APROBADO: 1, RECHAZADO: 2 };
  return [...tickets].sort((a, b) => {
    const wa = weight[a.estado] ?? 9;
    const wb = weight[b.estado] ?? 9;
    if (wa !== wb) return wa - wb;
    return (
      String(b.fechaInasistencia || "").localeCompare(String(a.fechaInasistencia || "")) ||
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  });
}

export function ticketScopeLabel(ticket) {
  if (!ticket) return "—";
  if (!ticket.bloqueId) return "Día completo";
  const time =
    ticket.horaInicio && ticket.horaFin
      ? `${String(ticket.horaInicio).slice(0, 5)}–${String(ticket.horaFin).slice(0, 5)}`
      : "";
  return [ticket.materiaNombre, ticket.dia ? DIA_LABELS[ticket.dia] || ticket.dia : "", time]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Regla de solape del backend: un ticket de día completo choca con cualquier
 * ticket activo de esa fecha; uno de bloque choca con el mismo bloque o con
 * uno de día completo. Dos bloques distintos del mismo día conviven.
 */
export function findTicketConflict(tickets = [], fecha, bloqueId = null) {
  if (!fecha) return null;
  const activos = tickets.filter(
    (ticket) => isActiveTicket(ticket) && ticket.fechaInasistencia === fecha
  );
  return (
    activos.find((ticket) => {
      if (bloqueId == null || bloqueId === "") return true;
      return ticket.bloqueId == null || String(ticket.bloqueId) === String(bloqueId);
    }) || null
  );
}

/**
 * Los bloques de un día se derivan de las asistencias registradas de ese día
 * (no existe endpoint de horario para el apoderado). Si no hay registros, el
 * ticket sólo puede ser de día completo.
 */
export function buildBlockOptions(detalle = [], fecha) {
  if (!fecha) return [];
  const map = new Map();
  (detalle || [])
    .filter((item) => item.fecha === fecha && item.bloqueId != null)
    .forEach((item) => {
      const key = String(item.bloqueId);
      if (!map.has(key)) {
        map.set(key, {
          id: item.bloqueId,
          materiaNombre: item.materiaNombre,
          dia: item.dia,
          horaInicio: item.horaInicio,
          horaFin: item.horaFin,
          estado: item.estado,
        });
      }
    });
  return [...map.values()].sort((a, b) =>
    String(a.horaInicio || "").localeCompare(String(b.horaInicio || ""))
  );
}

export function attendanceOnDate(detalle = [], fecha) {
  if (!fecha) return [];
  return [...(detalle || [])]
    .filter((item) => item.fecha === fecha)
    .sort((a, b) => String(a.horaInicio || "").localeCompare(String(b.horaInicio || "")));
}

/** Fecha local en formato YYYY-MM-DD (evita corrimientos por UTC). */
export function localISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatHora(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

/** Validación espejo del backend: PDF/JPG/JPEG/PNG y máximo 5 MB. */
export function validateSustentoFile(file) {
  if (!file) return "Selecciona un archivo de sustento.";
  const name = String(file.name || "");
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "El archivo debe tener una extensión (.pdf, .jpg o .png).";
  const extension = name.slice(dot + 1).toLowerCase();
  const expected = SUSTENTO_MIMES[extension];
  if (!expected) return "Formato no permitido. Sube un PDF, JPG o PNG.";
  const mime = String(file.type || "").toLowerCase();
  if (mime && mime !== expected && !(extension === "jpg" && mime === "image/jpg")) {
    return "El tipo de archivo no corresponde a la extensión.";
  }
  if (file.size > SUSTENTO_MAX_BYTES) return "El sustento no puede superar los 5 MB.";
  return null;
}
