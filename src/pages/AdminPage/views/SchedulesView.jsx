import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  CircleX,
  Clock,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { adminService, getApiError } from "../../../services/api";
import { Modal } from "../../../components/ui/Modal";
import { DIA_LABELS, formatTime } from "../../../utils/format";
import ScheduleEditor from "./ScheduleEditor";

const DIAS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
const MATERIA_TONES = ["primary", "secondary", "accent", "success", "info", "neutral"];

function blockMinutes(bloque) {
  const toMinutes = (value) => {
    const [hours, minutes] = String(value || "").split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };
  const start = toMinutes(bloque.horaInicio);
  const end = toMinutes(bloque.horaFin);
  return start != null && end != null && end > start ? end - start : 0;
}

function hoursLabel(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export default function SchedulesView({ data, showToast }) {
  const anios = useMemo(
    () => [...(data.anios || [])].sort((a, b) => (b.anio || 0) - (a.anio || 0)),
    [data.anios]
  );
  const openYear = anios.find((anio) => anio.estado === "ABIERTO") || anios[0] || null;
  const [yearId, setYearId] = useState(openYear?.id || "");
  const [sectionId, setSectionId] = useState("");
  const [bloques, setBloques] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingCurso, setEditingCurso] = useState(null);

  useEffect(() => {
    if (!yearId && openYear) setYearId(openYear.id);
  }, [openYear, yearId]);

  const effectiveYear = yearId || openYear?.id || "";
  const secciones = useMemo(
    () =>
      (data.secciones || []).filter(
        (seccion) => String(seccion.anioId) === String(effectiveYear)
      ),
    [data.secciones, effectiveYear]
  );

  useEffect(() => {
    if (!secciones.length) {
      setSectionId("");
      return;
    }
    if (!secciones.some((seccion) => String(seccion.id) === String(sectionId))) {
      setSectionId(secciones[0].id);
    }
  }, [secciones, sectionId]);

  const activeSection =
    secciones.find((seccion) => String(seccion.id) === String(sectionId)) || secciones[0] || null;

  useEffect(() => {
    if (!activeSection) {
      setBloques([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    adminService
      .listarHorarioSeccion(activeSection.id)
      .then((list) => {
        if (!cancelled) setBloques(Array.isArray(list) ? list : []);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setBloques([]);
          setError(getApiError(requestError));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeSection, reloadKey]);

  const cursos = useMemo(
    () =>
      (data.cursos || [])
        .filter((curso) => String(curso.seccionId) === String(activeSection?.id))
        .sort((a, b) => String(a.materiaNombre).localeCompare(String(b.materiaNombre))),
    [data.cursos, activeSection]
  );

  const courseById = useMemo(() => {
    const map = new Map();
    cursos.forEach((curso) => map.set(String(curso.id), curso));
    return map;
  }, [cursos]);

  const toneByMateria = useMemo(() => {
    const ids = [...new Set(cursos.map((curso) => String(curso.materiaId)))];
    return new Map(ids.map((id, index) => [id, MATERIA_TONES[index % MATERIA_TONES.length]]));
  }, [cursos]);

  const toneForCurso = (cursoId) => {
    const curso = courseById.get(String(cursoId));
    return toneByMateria.get(String(curso?.materiaId)) || "neutral";
  };

  const board = useMemo(
    () =>
      DIAS.map((dia) => ({
        dia,
        bloques: bloques
          .filter((bloque) => bloque.dia === dia)
          .sort((a, b) => String(a.horaInicio).localeCompare(String(b.horaInicio))),
      })),
    [bloques]
  );

  const cursosConHorario = useMemo(
    () => new Set(bloques.map((bloque) => String(bloque.cursoId))).size,
    [bloques]
  );
  const cursosSinHorario = useMemo(
    () => cursos.filter((curso) => !bloques.some((bloque) => String(bloque.cursoId) === String(curso.id))),
    [cursos, bloques]
  );
  const totalMinutos = useMemo(
    () => bloques.reduce((total, bloque) => total + blockMinutes(bloque), 0),
    [bloques]
  );

  const handleYearChange = (event) => {
    setYearId(event.target.value);
    setSectionId("");
  };

  const openEditor = (curso) => {
    if (!curso) return;
    setEditingCurso(curso);
  };

  const openEditorForCursoId = (cursoId) => {
    openEditor(courseById.get(String(cursoId)));
  };

  const handleSaved = () => {
    showToast("success", "Horario actualizado correctamente.");
    setEditingCurso(null);
    setReloadKey((value) => value + 1);
  };

  const stats = [
    {
      label: "Bloques semanales",
      value: bloques.length,
      icon: CalendarRange,
      tone: "primary",
      hint: DIAS.map((dia) => bloques.some((bloque) => bloque.dia === dia)).filter(Boolean).length
        ? "Sesiones repartidas en la semana"
        : "Sin sesiones registradas",
    },
    {
      label: "Cursos con horario",
      value: cursosConHorario,
      icon: BookOpen,
      tone: "success",
      hint: `${cursos.length} curso(s) en la sección`,
    },
    {
      label: "Cursos sin horario",
      value: cursosSinHorario.length,
      icon: Clock,
      tone: cursosSinHorario.length ? "accent" : "info",
      hint: cursosSinHorario.length ? "Requieren programación" : "Todos programados",
    },
    {
      label: "Carga semanal",
      value: hoursLabel(totalMinutos),
      icon: Clock,
      tone: "secondary",
      hint: "Tiempo de clase de la sección",
    },
  ];

  return (
    <div className="page schedules-page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Horarios</h2>
          <p className="page__sub">
            {activeSection
              ? `Semana de ${activeSection.etiqueta}${activeSection.aula ? ` · Aula ${activeSection.aula}` : ""}. Cada bloque es una sesión semanal.`
              : "Selecciona un año y una sección para armar su horario."}
          </p>
        </div>
        <div className="page__actions schedules-toolbar">
          <select
            className="select"
            value={effectiveYear}
            onChange={handleYearChange}
            aria-label="Año escolar"
          >
            {anios.map((anio) => (
              <option key={anio.id} value={anio.id}>
                {anio.nombre}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={activeSection?.id || ""}
            onChange={(event) => setSectionId(event.target.value)}
            disabled={!secciones.length}
            aria-label="Sección"
          >
            {secciones.length ? (
              secciones.map((seccion) => (
                <option key={seccion.id} value={seccion.id}>
                  {seccion.etiqueta}
                </option>
              ))
            ) : (
              <option value="">Sin secciones</option>
            )}
          </select>
          <button
            type="button"
            className="icon-btn icon-btn--soft"
            onClick={() => setReloadKey((value) => value + 1)}
            title="Actualizar horario"
            aria-label="Actualizar horario"
          >
            <RefreshCw size={17} />
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => window.print()}
            disabled={!activeSection}
          >
            <Printer size={15} /> Imprimir
          </button>
        </div>
      </div>

      {error ? (
        <div className="alert alert--error alert--inline" role="alert">
          <CircleX size={18} />
          <div>
            <p>{error.message}</p>
            <small>No se pudo cargar el horario de la sección.</small>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {!anios.length ? (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <CalendarDays size={26} />
            </span>
            <p className="empty__title">Sin año escolar</p>
            <p className="empty__text">Crea un año escolar en “Año escolar” para comenzar.</p>
          </div>
        </section>
      ) : null}

      {anios.length && !secciones.length ? (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <CalendarDays size={26} />
            </span>
            <p className="empty__title">Sin secciones en este año</p>
            <p className="empty__text">Crea una sección en “Secciones” antes de programar horarios.</p>
          </div>
        </section>
      ) : null}

      {activeSection && !loading && !error ? (
        <>
          <section className="grid grid--stats">
            {stats.map(({ label, value, icon: Icon, tone, hint }) => (
              <article key={label} className="stat-card">
                <span className={`stat-card__icon stat-card__icon--${tone}`}>
                  <Icon size={20} />
                </span>
                <div>
                  <strong className="stat-card__value">{value}</strong>
                  <span className="stat-card__label">{label}</span>
                </div>
                <span className="stat-card__hint">{hint}</span>
              </article>
            ))}
          </section>

          {loading ? null : bloques.length ? (
            <>
              <section className="schedules-board">
                {board.map(({ dia, bloques: delDia }) => (
                  <div key={dia} className="schedules-day">
                    <div className="schedules-day__head">
                      <span>{DIA_LABELS[dia] || dia}</span>
                      <b>{delDia.length}</b>
                    </div>
                    <div className="schedules-day__body">
                      {delDia.length ? (
                        delDia.map((bloque) => (
                          <button
                            key={bloque.bloqueId}
                            type="button"
                            className={`schedules-block is-${toneForCurso(bloque.cursoId)}`}
                            onClick={() => openEditorForCursoId(bloque.cursoId)}
                            title={`Editar horario de ${bloque.materiaNombre}`}
                          >
                            <span className="schedules-block__time">
                              <Clock size={13} />
                              {formatTime(bloque.horaInicio)} – {formatTime(bloque.horaFin)}
                              <Pencil size={12} className="schedules-block__edit" />
                            </span>
                            <strong>{bloque.materiaNombre}</strong>
                            <small>
                              <UserRound size={12} /> {bloque.docenteNombre}
                            </small>
                          </button>
                        ))
                      ) : (
                        <span className="schedules-day__empty">Sin clases</span>
                      )}
                    </div>
                  </div>
                ))}
              </section>

              <div className="info-strip info-strip--soft">
                <Pencil size={16} />
                <p>
                  Haz clic en cualquier bloque para editar la hoja semanal de ese curso. Los cambios
                  se guardan completos y el backend valida los choques de sección y docente.
                </p>
              </div>
            </>
          ) : (
            <section className="card">
              <div className="empty empty--tall">
                <span className="empty__icon">
                  <CalendarRange size={26} />
                </span>
                <p className="empty__title">La sección aún no tiene horario</p>
                <p className="empty__text">
                  {cursos.length
                    ? "Asigna bloques a sus cursos para armar la semana."
                    : "Primero crea cursos para esta sección en “Cursos”."}
                </p>
                {cursos.length ? (
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => openEditor(cursos[0])}
                  >
                    <Plus size={15} /> Programar {cursos[0].materiaNombre}
                  </button>
                ) : null}
              </div>
            </section>
          )}

          {cursosSinHorario.length ? (
            <section className="card">
              <div className="card__head">
                <div>
                  <h3 className="card__title">Cursos sin horario</h3>
                  <p className="card__sub">
                    Asígnales una semana para que el docente pueda registrar asistencia.
                  </p>
                </div>
              </div>
              <div className="card__body">
                <div className="schedules-missing">
                  {cursosSinHorario.map((curso) => (
                    <div
                      key={curso.id}
                      className={`schedules-missing__item is-${toneForCurso(curso.id)}`}
                    >
                      <span className="schedules-missing__icon">
                        <BookOpen size={16} />
                      </span>
                      <span>
                        <strong>{curso.materiaNombre}</strong>
                        <small>{curso.docenteNombre}</small>
                      </span>
                      <button
                        type="button"
                        className="btn btn--soft btn--sm"
                        onClick={() => openEditor(curso)}
                      >
                        <Plus size={14} /> Asignar horario
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {loading ? (
        <div className="loading-state">
          <span className="spinner spinner--dark" />
          <p>Cargando horario de la sección…</p>
        </div>
      ) : null}

      <Modal
        open={Boolean(editingCurso)}
        onClose={() => setEditingCurso(null)}
        title={
          editingCurso
            ? `Horario · ${editingCurso.materiaNombre} ${editingCurso.seccionEtiqueta || ""}`
            : "Horario"
        }
        subtitle="Plantilla semanal del curso. Los cambios reemplazan la hoja completa."
        size="lg"
      >
        {editingCurso ? (
          <ScheduleEditor
            curso={editingCurso}
            onCancel={() => setEditingCurso(null)}
            onSaved={handleSaved}
          />
        ) : null}
      </Modal>
    </div>
  );
}
