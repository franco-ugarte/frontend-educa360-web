/**
 * Utilidades del panel ESTUDIANTE.
 *
 * El backend expone la información ya segmentada por el token (matrícula
 * vigente, cursos de su sección, notas y asistencias propias). Aquí solo
 * agrupamos, ordenamos y derivamos etiquetas para la interfaz.
 */

const ROMAN_ORDER = { I: 1, II: 2, III: 3, IV: 4 };

export const COURSE_TONES = ["primary", "secondary", "accent", "success", "info", "neutral"];

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

export function groupGradesByCourse(detalle = [], cursos = []) {
  const map = new Map();

  (detalle || []).forEach((nota) => {
    const courseKey = String(nota.cursoId);
    if (!map.has(courseKey)) {
      map.set(courseKey, {
        cursoId: nota.cursoId,
        materiaNombre:
          nota.materiaNombre ||
          cursos.find((curso) => String(curso.id) === courseKey)?.materiaNombre ||
          "Curso",
        unidades: new Map(),
      });
    }
    const course = map.get(courseKey);
    const unitKey = String(nota.unidadId);
    if (!course.unidades.has(unitKey)) {
      course.unidades.set(unitKey, {
        unidadId: nota.unidadId,
        unidadNumero: nota.unidadNumero,
        unidadTitulo: nota.unidadTitulo,
        bimestreNombre: nota.bimestreNombre,
        criterios: [],
      });
    }
    course.unidades.get(unitKey).criterios.push({
      id: nota.id,
      criterio: nota.criterio,
      nota: nota.nota,
      updatedAt: nota.updatedAt,
    });
  });

  return [...map.values()]
    .map((course) => ({
      ...course,
      unidades: [...course.unidades.values()].sort(
        (a, b) => Number(a.unidadNumero || 0) - Number(b.unidadNumero || 0)
      ),
    }))
    .sort((a, b) => String(a.materiaNombre).localeCompare(String(b.materiaNombre)));
}

export function announcementScope(comunicado) {
  return comunicado?.seccionEtiqueta ? `Sección ${comunicado.seccionEtiqueta}` : "General";
}

export function sortAnnouncements(comunicados = []) {
  return [...comunicados].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
}
