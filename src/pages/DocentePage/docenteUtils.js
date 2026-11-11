import { DIA_INDEX } from "../../utils/format.js";

const ROMAN_ORDER = { I: 1, II: 2, III: 3, IV: 4 };

export function isoDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayISO() {
  return isoDate(new Date());
}

export function parseISODate(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dateMatchesDia(fecha, dia) {
  const date = parseISODate(fecha);
  const target = DIA_INDEX[dia];
  if (!date || !target) return false;
  return date.getDay() === target;
}

/**
 * El backend exige que la fecha caiga en el mismo día del bloque y dentro de
 * un bimestre ABIERTO. Como el docente no puede listar bimestres, proponemos
 * la última fecha válida dentro de las unidades ya planificadas del curso.
 */
export function suggestDateForBlock(bloque, unidades = [], fallback = todayISO()) {
  const target = DIA_INDEX[bloque?.dia];
  if (!target) return fallback;

  const today = parseISODate(fallback) || new Date();
  const recentMatch = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - ((today.getDay() - target + 7) % 7)
  );
  let best = null;

  (unidades || []).forEach((unidad) => {
    const start = parseISODate(unidad.fechaInicio);
    const end = parseISODate(unidad.fechaFin);
    if (!start || !end) return;

    const limit = end.getTime() < today.getTime() ? end : today;
    if (limit.getTime() < start.getTime()) return;

    const delta = (limit.getDay() - target + 7) % 7;
    const candidate = new Date(limit.getFullYear(), limit.getMonth(), limit.getDate() - delta);
    if (candidate.getTime() < start.getTime()) return;

    const iso = isoDate(candidate);
    if (!best || iso > best) best = iso;
  });

  return best || isoDate(recentMatch);
}

export function bimestreOrder(nombre) {
  const text = String(nombre || "").trim();
  const roman = text.match(/\b(I{1,3}|IV)\b$/i);
  if (roman) return ROMAN_ORDER[roman[1].toUpperCase()] || 0;
  const number = text.match(/(\d+)\s*$/);
  return number ? Number(number[1]) : 0;
}

/**
 * El DOCENTE no tiene endpoint para listar bimestres (es exclusivo de ADMIN).
 * Reconstruimos los bimestres visibles a partir de las unidades planificadas
 * de sus cursos. Limitación: un bimestre sin ninguna unidad todavía no puede
 * seleccionarse para crear la primera unidad.
 */
export function deriveBimestres(cursos = [], unidadesPorCurso = {}) {
  const map = new Map();

  cursos.forEach((curso) => {
    (unidadesPorCurso[curso.id] || []).forEach((unidad) => {
      if (unidad.bimestreId == null) return;
      const key = String(unidad.bimestreId);
      if (!map.has(key)) {
        map.set(key, {
          id: unidad.bimestreId,
          nombre: unidad.bimestreNombre,
          anioId: curso.anioId,
          anioNombre: curso.anioNombre,
          order: bimestreOrder(unidad.bimestreNombre),
          cursoIds: [],
        });
      }
      const entry = map.get(key);
      if (!entry.cursoIds.includes(curso.id)) entry.cursoIds.push(curso.id);
    });
  });

  return [...map.values()].sort(
    (a, b) =>
      String(a.anioNombre || "").localeCompare(String(b.anioNombre || "")) ||
      a.order - b.order ||
      Number(a.id) - Number(b.id)
  );
}

export function bimestresDelAnio(bimestres = [], anioId) {
  if (anioId == null) return bimestres;
  return bimestres.filter((bimestre) => String(bimestre.anioId) === String(anioId));
}

export function deriveSecciones(cursos = []) {
  const map = new Map();

  cursos.forEach((curso) => {
    if (curso.seccionId == null) return;
    const key = String(curso.seccionId);
    if (!map.has(key)) {
      map.set(key, {
        id: curso.seccionId,
        etiqueta: curso.seccionEtiqueta,
        anioId: curso.anioId,
        anioNombre: curso.anioNombre,
        cursoIds: [],
      });
    }
    const entry = map.get(key);
    if (!entry.cursoIds.includes(curso.id)) entry.cursoIds.push(curso.id);
  });

  return [...map.values()].sort(
    (a, b) =>
      String(a.anioNombre || "").localeCompare(String(b.anioNombre || "")) ||
      String(a.etiqueta || "").localeCompare(String(b.etiqueta || ""))
  );
}

export function sortUnidades(unidades = []) {
  return [...unidades].sort(
    (a, b) =>
      bimestreOrder(a.bimestreNombre) - bimestreOrder(b.bimestreNombre) ||
      Number(a.numero || 0) - Number(b.numero || 0)
  );
}

export function sortHorario(bloques = []) {
  const order = { LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5, SABADO: 6 };
  return [...bloques].sort(
    (a, b) =>
      (order[a.dia] || 9) - (order[b.dia] || 9) ||
      String(a.horaInicio || "").localeCompare(String(b.horaInicio || ""))
  );
}

export function courseLabel(curso) {
  if (!curso) return "—";
  return `${curso.materiaNombre} · ${curso.seccionEtiqueta}`;
}

export function uniqueCoursesBySection(cursos = []) {
  return deriveSecciones(cursos);
}
