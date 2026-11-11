import axios from "axios";

const rawBase = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
const API_BASE = `${rawBase.replace(/\/+$/, "")}/v1`;

export const TOKEN_KEY = "educa360.token";
export const USER_KEY = "educa360.user";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 25000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Si la petición lleva un FormData (archivos), borra cualquier Content-Type residual
  // para que el navegador genere el multipart/form-data con su boundary correspondiente
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isLogin = url.includes("/auth/login");
    if (error.response?.status === 401 && !isLogin) {
      clearSession();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);

/* ------------------------------------------------------------------ */
/* Sesión                                                              */
/* ------------------------------------------------------------------ */

export function saveSession(auth) {
  const expiresAt = Date.now() + Number(auth.expiresIn || 0) * 1000;
  const user = { ...auth.user, expiresAt };
  localStorage.setItem(TOKEN_KEY, auth.token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export function getSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY) || "null");
    if (!user) return null;
    if (user.expiresAt && Date.now() >= user.expiresAt) {
      clearSession();
      return null;
    }
    return { token, ...user };
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getApiError(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const retryAfter = error?.response?.headers?.["retry-after"];

  let message = data?.message;
  if (!message) {
    if (status === 429) {
      message = `Demasiados intentos. Intenta de nuevo en ${retryAfter || 15} minuto(s).`;
    } else if (status === 403) {
      message = "No tienes permisos para realizar esta acción.";
    } else if (status === 404) {
      message = "El recurso solicitado no existe.";
    } else if (status === 409) {
      message = "La operación entra en conflicto con una regla de negocio.";
    } else if (status >= 500) {
      message = "Ocurrió un error en el servidor. Intenta nuevamente.";
    } else if (error?.code === "ERR_NETWORK") {
      message = "No se pudo conectar con el servidor. Verifica que el backend esté en línea.";
    } else {
      message = "No se pudo completar la operación.";
    }
  }

  const fields = Array.isArray(data?.fields)
    ? data.fields
        .map((f) => (typeof f === "string" ? f : `${f.field || f.campo || ""}: ${f.message || f.mensaje || ""}`))
        .filter(Boolean)
    : [];

  return { status, message, fields, retryAfter };
}

/* ------------------------------------------------------------------ */
/* Auth                                                               */
/* ------------------------------------------------------------------ */

export const authService = {
  login: (payload) => api.post("/auth/login", payload).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
};

/* ------------------------------------------------------------------ */
/* Administración                                                     */
/* ------------------------------------------------------------------ */

export const adminService = {
  // Cuentas
  listarUsuarios: (params = {}) => api.get("/admin/usuarios", { params }).then((r) => r.data),
  obtenerUsuario: (id) => api.get(`/admin/usuarios/${id}`).then((r) => r.data),
  crearAdmin: (payload) => api.post("/admin/usuarios", payload).then((r) => r.data),
  actualizarUsuario: (id, payload) => api.put(`/admin/usuarios/${id}`, payload).then((r) => r.data),
  cambiarActivoUsuario: (id, activo) =>
    api.patch(`/admin/usuarios/${id}/activo`, { activo }).then((r) => r.data),
  resetPassword: (id, password) =>
    api.patch(`/admin/usuarios/${id}/password`, { password }).then((r) => r.data),

  // Docentes y secretarías
  listarDocentes: () => api.get("/admin/docentes").then((r) => r.data),
  crearDocente: (payload) => api.post("/admin/docentes", payload).then((r) => r.data),
  listarMateriasDocente: (id) => api.get(`/admin/docentes/${id}/materias`).then((r) => r.data),
  habilitarMateriasDocente: (id, materiaIds) =>
    api.put(`/admin/docentes/${id}/materias`, { materiaIds }).then((r) => r.data),
  crearSecretaria: (payload) => api.post("/admin/secretarias", payload).then((r) => r.data),

  // Años escolares
  listarAnios: () => api.get("/admin/anios").then((r) => r.data),
  crearAnio: (payload) => api.post("/admin/anios", payload).then((r) => r.data),
  actualizarAnio: (id, payload) => api.put(`/admin/anios/${id}`, payload).then((r) => r.data),
  cambiarEstadoAnio: (id, estado) =>
    api.patch(`/admin/anios/${id}/estado`, { estado }).then((r) => r.data),

  // Bimestres
  listarBimestres: (anioId) =>
    api.get(`/admin/anios/${anioId}/bimestres`).then((r) => r.data),
  crearBimestre: (anioId, payload) =>
    api.post(`/admin/anios/${anioId}/bimestres`, payload).then((r) => r.data),
  actualizarBimestre: (id, payload) =>
    api.put(`/admin/bimestres/${id}`, payload).then((r) => r.data),
  cambiarEstadoBimestre: (id, estado) =>
    api.patch(`/admin/bimestres/${id}/estado`, { estado }).then((r) => r.data),

  // Materias
  listarMaterias: () => api.get("/admin/materias").then((r) => r.data),
  crearMateria: (payload) => api.post("/admin/materias", payload).then((r) => r.data),
  actualizarMateria: (id, payload) => api.put(`/admin/materias/${id}`, payload).then((r) => r.data),
  cambiarActivaMateria: (id, activa) =>
    api.patch(`/admin/materias/${id}/activa`, { activa }).then((r) => r.data),

  // Secciones
  listarSecciones: (anioId) =>
    api.get("/admin/secciones", { params: anioId ? { anioId } : {} }).then((r) => r.data),
  crearSeccion: (payload) => api.post("/admin/secciones", payload).then((r) => r.data),
  actualizarSeccion: (id, payload) => api.put(`/admin/secciones/${id}`, payload).then((r) => r.data),

  // Cursos y horarios
  listarCursos: (params = {}) => api.get("/admin/cursos", { params }).then((r) => r.data),
  crearCurso: (payload) => api.post("/admin/cursos", payload).then((r) => r.data),
  eliminarCurso: (id) => api.delete(`/admin/cursos/${id}`),
  listarHorario: (id) => api.get(`/admin/cursos/${id}/horario`).then((r) => r.data),
  reemplazarHorario: (id, bloques) =>
    api.put(`/admin/cursos/${id}/horario`, { bloques }).then((r) => r.data),
  listarHorarioSeccion: (seccionId) =>
    api.get(`/admin/secciones/${seccionId}/horario`).then((r) => r.data),

  // Comunicados
  listarComunicados: (params = {}) =>
    api.get("/admin/comunicados", { params }).then((r) => r.data),
  crearComunicado: (payload) => api.post("/admin/comunicados", payload).then((r) => r.data),
  eliminarComunicado: (id) => api.delete(`/admin/comunicados/${id}`),

  // Alumnos (lectura para métricas del panel)
  listarEstudiantes: (params = {}) =>
    api.get("/secretaria/estudiantes", { params }).then((r) => r.data),

  // Reportes y cierre
  previewCierre: (anioId) => api.get(`/admin/anios/${anioId}/cierre/preview`).then((r) => r.data),
  cerrarAnio: (anioId) => api.post(`/admin/anios/${anioId}/cerrar`).then((r) => r.data),
  reporteAsistencia: (params = {}) =>
    api.get("/admin/reportes/asistencia", { params }).then((r) => r.data),
  reporteCalificaciones: (params = {}) =>
    api.get("/admin/reportes/calificaciones", { params }).then((r) => r.data),
};

/* ------------------------------------------------------------------ */
/* Secretaría                                                         */
/* ------------------------------------------------------------------ */

export const secretariaService = {
  // Estudiantes
  listarEstudiantes: (params = {}) =>
    api.get("/secretaria/estudiantes", { params }).then((r) => r.data),
  obtenerEstudiante: (id) => api.get(`/secretaria/estudiantes/${id}`).then((r) => r.data),
  crearEstudiante: (payload) =>
    api.post("/secretaria/estudiantes", payload).then((r) => r.data),
  actualizarEstudiante: (id, payload) =>
    api.put(`/secretaria/estudiantes/${id}`, payload).then((r) => r.data),
  cambiarEstadoEstudiante: (id, estado) =>
    api.patch(`/secretaria/estudiantes/${id}/estado`, { estado }).then((r) => r.data),

  // Matrículas
  listarMatriculas: (params = {}) =>
    api.get("/secretaria/matriculas", { params }).then((r) => r.data),
  obtenerMatricula: (id) => api.get(`/secretaria/matriculas/${id}`).then((r) => r.data),
  crearMatricula: (payload) =>
    api.post("/secretaria/matriculas", payload).then((r) => r.data),
  cambiarSeccionMatricula: (id, seccionId) =>
    api.patch(`/secretaria/matriculas/${id}/seccion`, { seccionId }).then((r) => r.data),
  retirarMatricula: (id) =>
    api.patch(`/secretaria/matriculas/${id}/retiro`).then((r) => r.data),

  // Apoderados y familias
  listarApoderados: (q) =>
    api.get("/secretaria/apoderados", { params: q ? { q } : {} }).then((r) => r.data),
  crearApoderado: (payload) =>
    api.post("/secretaria/apoderados", payload).then((r) => r.data),
  buscarApoderadoPorDni: (dni) =>
    api.get(`/secretaria/apoderados/por-dni/${dni}`).then((r) => r.data),
  vincularRepresentado: (id, payload) =>
    api.post(`/secretaria/apoderados/${id}/representados`, payload).then((r) => r.data),
  desvincularRepresentado: (id, estudianteId) =>
    api.delete(`/secretaria/apoderados/${id}/representados/${estudianteId}`),
  crearFamilia: (payload) =>
    api.post("/secretaria/familias", payload).then((r) => r.data),

  // Tickets de justificación
  listarTickets: (params = {}) =>
    api.get("/secretaria/tickets", { params }).then((r) => r.data),
  obtenerTicket: (id) => api.get(`/secretaria/tickets/${id}`).then((r) => r.data),
  resolverTicket: (id, payload) =>
    api.patch(`/secretaria/tickets/${id}/resolver`, payload).then((r) => r.data),
  urlSustentoTicket: (id) =>
    api.get(`/secretaria/tickets/${id}/sustento`).then((r) => r.data),

  // Comunicados generales
  listarComunicados: (params = {}) =>
    api.get("/secretaria/comunicados", { params }).then((r) => r.data),
  crearComunicado: (payload) =>
    api.post("/secretaria/comunicados", payload).then((r) => r.data),
  actualizarComunicado: (id, payload) =>
    api.put(`/secretaria/comunicados/${id}`, payload).then((r) => r.data),
  eliminarComunicado: (id) => api.delete(`/secretaria/comunicados/${id}`),

  // Expediente del alumno
  asistenciasEstudiante: (id, params = {}) =>
    api.get(`/secretaria/estudiantes/${id}/asistencias`, { params }).then((r) => r.data),
  calificacionesEstudiante: (id, params = {}) =>
    api.get(`/secretaria/estudiantes/${id}/calificaciones`, { params }).then((r) => r.data),
  historialEstudiante: (id) =>
    api.get(`/secretaria/estudiantes/${id}/historial`).then((r) => r.data),
};

/* ------------------------------------------------------------------ */
/* Docente                                                            */
/* ------------------------------------------------------------------ */

export const docenteService = {
  // Cursos y horario
  listarCursos: () => api.get("/docente/cursos").then((r) => r.data),
  listarHorario: (cursoId) =>
    api.get(`/docente/cursos/${cursoId}/horario`).then((r) => r.data),

  // Planificación: unidades
  listarUnidades: (cursoId) =>
    api.get(`/docente/cursos/${cursoId}/unidades`).then((r) => r.data),
  obtenerUnidad: (id) => api.get(`/docente/unidades/${id}`).then((r) => r.data),
  crearUnidad: (cursoId, payload) =>
    api.post(`/docente/cursos/${cursoId}/unidades`, payload).then((r) => r.data),
  actualizarUnidad: (id, payload) =>
    api.put(`/docente/unidades/${id}`, payload).then((r) => r.data),
  eliminarUnidad: (id) => api.delete(`/docente/unidades/${id}`),
  cambiarEstadoUnidad: (id, estado) =>
    api.patch(`/docente/unidades/${id}/estado`, { estado }).then((r) => r.data),

  // Planificación: contenidos
  listarContenidos: (unidadId) =>
    api.get(`/docente/unidades/${unidadId}/contenidos`).then((r) => r.data),
  crearContenido: (unidadId, payload) =>
    api.post(`/docente/unidades/${unidadId}/contenidos`, payload).then((r) => r.data),
  actualizarContenido: (id, payload) =>
    api.put(`/docente/contenidos/${id}`, payload).then((r) => r.data),
  eliminarContenido: (id) => api.delete(`/docente/contenidos/${id}`),
  reordenarContenidos: (unidadId, contenidoIds) =>
    api.put(`/docente/unidades/${unidadId}/contenidos/orden`, { contenidoIds }).then((r) => r.data),

  // Calificaciones
  listarCalificacionesUnidad: (unidadId) =>
    api.get(`/docente/unidades/${unidadId}/calificaciones`).then((r) => r.data),
  registrarCalificaciones: (unidadId, calificaciones) =>
    api.put(`/docente/unidades/${unidadId}/calificaciones`, { calificaciones }).then((r) => r.data),
  eliminarCalificacion: (id) => api.delete(`/docente/calificaciones/${id}`),
  actaCurso: (cursoId, bimestreId) =>
    api.get(`/docente/cursos/${cursoId}/actas`, { params: { bimestreId } }).then((r) => r.data),

  // Asistencia
  listarAsistencia: (cursoId, bloqueId, fecha) =>
    api
      .get(`/docente/cursos/${cursoId}/asistencia`, { params: { bloqueId, fecha } })
      .then((r) => r.data),
  registrarAsistencia: (cursoId, payload) =>
    api.put(`/docente/cursos/${cursoId}/asistencia`, payload).then((r) => r.data),

  // Materiales
  listarMateriales: (cursoId) =>
    api.get(`/docente/cursos/${cursoId}/materiales`).then((r) => r.data),
  crearMaterial: (cursoId, formData) =>
    api.post(`/docente/cursos/${cursoId}/materiales`, formData).then((r) => r.data),
  actualizarMaterial: (id, payload) =>
    api.put(`/docente/materiales/${id}`, payload).then((r) => r.data),
  reemplazarArchivoMaterial: (id, formData) =>
    api.put(`/docente/materiales/${id}/archivo`, formData).then((r) => r.data),
  cambiarPublicacionMaterial: (id, publicado) =>
    api.patch(`/docente/materiales/${id}/publicacion`, { publicado }).then((r) => r.data),
  eliminarMaterial: (id) => api.delete(`/docente/materiales/${id}`),
  urlDescargaMaterial: (id) =>
    api.get(`/materiales/${id}/download`).then((r) => r.data),

  // Comunicados por sección
  listarComunicados: (params = {}) =>
    api.get("/docente/comunicados", { params }).then((r) => r.data),
  crearComunicado: (payload) =>
    api.post("/docente/comunicados", payload).then((r) => r.data),
  actualizarComunicado: (id, payload) =>
    api.put(`/docente/comunicados/${id}`, payload).then((r) => r.data),
  eliminarComunicado: (id) => api.delete(`/docente/comunicados/${id}`),
};

/* ------------------------------------------------------------------ */
/* Estudiante                                                         */
/* ------------------------------------------------------------------ */

export const estudianteService = {
  // Identidad académica
  miMatricula: () => api.get("/estudiante/matricula").then((r) => r.data),
  listarCursos: () => api.get("/estudiante/cursos").then((r) => r.data),

  // Contenido visible: sólo unidades PUBLICADA y materiales publicados
  listarUnidades: (cursoId) =>
    api.get(`/estudiante/cursos/${cursoId}/unidades`).then((r) => r.data),
  listarMateriales: (cursoId) =>
    api.get(`/estudiante/cursos/${cursoId}/materiales`).then((r) => r.data),
  urlDescargaMaterial: (id) =>
    api.get(`/materiales/${id}/download`).then((r) => r.data),

  // Notas, asistencia y boleta propias
  misCalificaciones: (params = {}) =>
    api.get("/estudiante/calificaciones", { params }).then((r) => r.data),
  misAsistencias: (params = {}) =>
    api.get("/estudiante/asistencias", { params }).then((r) => r.data),
  miBoleta: (params = {}) =>
    api.get("/estudiante/boleta", { params }).then((r) => r.data),

  // Comunicados generales y de su sección
  listarComunicados: () =>
    api.get("/estudiante/comunicados").then((r) => r.data),
};

/* ------------------------------------------------------------------ */
/* Apoderado                                                          */
/* ------------------------------------------------------------------ */

export const apoderadoService = {
  // Representados activos
  listarHijos: () => api.get("/apoderado/hijos").then((r) => r.data),

  // Datos académicos por hijo (el backend valida el vínculo)
  calificaciones: (hijoId, params = {}) =>
    api.get(`/apoderado/hijos/${hijoId}/calificaciones`, { params }).then((r) => r.data),
  asistencias: (hijoId, params = {}) =>
    api.get(`/apoderado/hijos/${hijoId}/asistencias`, { params }).then((r) => r.data),
  boleta: (hijoId, params = {}) =>
    api.get(`/apoderado/hijos/${hijoId}/boleta`, { params }).then((r) => r.data),

  // Contenido visible por curso: solo unidades publicadas y materiales publicados
  listarUnidades: (hijoId, cursoId) =>
    api.get(`/apoderado/hijos/${hijoId}/cursos/${cursoId}/unidades`).then((r) => r.data),
  listarMateriales: (hijoId, cursoId) =>
    api.get(`/apoderado/hijos/${hijoId}/cursos/${cursoId}/materiales`).then((r) => r.data),
  urlDescargaMaterial: (id) =>
    api.get(`/materiales/${id}/download`).then((r) => r.data),

  // Comunicados generales y de las secciones de los hijos activos
  listarComunicados: () =>
    api.get("/apoderado/comunicados").then((r) => r.data),

  // Tickets de justificación
  listarTickets: (hijoId, params = {}) =>
    api.get(`/apoderado/hijos/${hijoId}/tickets`, { params }).then((r) => r.data),
  crearTicket: (hijoId, payload) =>
    api.post(`/apoderado/hijos/${hijoId}/tickets`, payload).then((r) => r.data),
  subirSustento: (ticketId, formData) =>
    api.post(`/apoderado/tickets/${ticketId}/sustento`, formData).then((r) => r.data),
  urlSustento: (ticketId) =>
    api.get(`/apoderado/tickets/${ticketId}/sustento`).then((r) => r.data),
};

/* ------------------------------------------------------------------ */
/* Notificaciones                                                     */
/* ------------------------------------------------------------------ */

export const notificationService = {
  listar: (leida) =>
    api.get("/notificaciones", { params: leida === undefined ? {} : { leida } }).then((r) => r.data),
  contador: () => api.get("/notificaciones/contador").then((r) => r.data),
  marcarLeida: (id) => api.patch(`/notificaciones/${id}/leida`).then((r) => r.data),
  marcarTodasLeidas: () => api.patch("/notificaciones/leidas").then((r) => r.data),
};
