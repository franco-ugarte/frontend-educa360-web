import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FolderOpen,
  GraduationCap,
  Layers,
  NotebookPen,
  Sparkles,
} from "lucide-react";
import { DIA_LABELS, UNIDAD_CLASS, estadoLabel, formatDate, percent } from "../../../utils/format";
import { courseLabel, sortUnidades } from "../docenteUtils";

const JS_DIA = {
  1: "LUNES",
  2: "MARTES",
  3: "MIERCOLES",
  4: "JUEVES",
  5: "VIERNES",
  6: "SABADO",
};

export default function OverviewView({
  cursos,
  unidadesPorCurso,
  horariosPorCurso,
  materialesPorCurso,
  anios,
  secciones,
  onNavigate,
}) {
  const allUnits = Object.values(unidadesPorCurso).flat();
  const allMaterials = Object.values(materialesPorCurso).flat();
  const publicadas = allUnits.filter((unidad) => unidad.estado === "PUBLICADA");
  const borradores = allUnits.filter((unidad) => unidad.estado === "BORRADOR");
  const materialesPublicados = allMaterials.filter((material) => material.publicado);

  const currentYear = anios[0] || null;
  const todayDia = JS_DIA[new Date().getDay()];

  const todayBlocks = cursos
    .flatMap((curso) =>
      (horariosPorCurso[curso.id] || [])
        .filter((bloque) => bloque.dia === todayDia)
        .map((bloque) => ({ ...bloque, curso }))
    )
    .sort((a, b) => String(a.horaInicio).localeCompare(String(b.horaInicio)));

  const recentUnits = sortUnidades(allUnits)
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);

  const stats = [
    {
      label: "Cursos asignados",
      value: cursos.length,
      icon: BookOpen,
      tone: "primary",
      hint: `${secciones.length} sección(es)`,
    },
    {
      label: "Unidades publicadas",
      value: publicadas.length,
      icon: ClipboardCheck,
      tone: "success",
      hint: `${allUnits.length} planificadas`,
    },
    {
      label: "Unidades en borrador",
      value: borradores.length,
      icon: ClipboardList,
      tone: "accent",
      hint: "Pendientes de publicar",
    },
    {
      label: "Materiales publicados",
      value: materialesPublicados.length,
      icon: FolderOpen,
      tone: "secondary",
      hint: `${allMaterials.length} cargados`,
    },
  ];

  const quickActions = [
    {
      label: "Planificar una unidad",
      text: "Crea unidades y ordena contenidos",
      icon: ClipboardList,
      view: "planificacion",
      tone: "primary",
    },
    {
      label: "Registrar asistencia",
      text: "Marca la hoja de una clase",
      icon: ClipboardCheck,
      view: "asistencia",
      tone: "success",
    },
    {
      label: "Calificar una unidad",
      text: "Notas por criterio y acta",
      icon: NotebookPen,
      view: "calificaciones",
      tone: "secondary",
    },
    {
      label: "Publicar material",
      text: "Comparte archivos con tus alumnos",
      icon: FolderOpen,
      view: "materiales",
      tone: "accent",
    },
  ];

  return (
    <div className="page">
      <section className="hero-card">
        <div className="hero-card__glow" />
        <div className="hero-card__content">
          <span className="eyebrow eyebrow--light">
            <Sparkles size={14} /> Planificación, asistencia y evaluación
          </span>
          <h2>{currentYear ? `Tus cursos del ${currentYear.nombre}` : "Tus cursos asignados"}</h2>
          <p>
            {cursos.length
              ? `Acompaña ${cursos.length} curso(s) con planificación por bimestre, hoja de asistencia, notas y materiales de clase.`
              : "Aún no tienes cursos asignados. Cuando el administrador te asigne materias y secciones, aparecerán aquí."}
          </p>
          <div className="hero-card__actions">
            <button type="button" className="btn btn--accent" onClick={() => onNavigate("planificacion")}>
              <ClipboardList size={17} /> Ir a planificación
            </button>
            <button type="button" className="btn btn--glass" onClick={() => onNavigate("asistencia")}>
              <ClipboardCheck size={17} /> Registrar asistencia
            </button>
          </div>
        </div>

        <div className="hero-card__panel">
          <span className="hero-card__panel-label">
            <CalendarDays size={15} /> Resumen docente
          </span>
          {currentYear ? (
            <>
              <strong>{currentYear.nombre}</strong>
              <span className="badge badge--success">Año con cursos activos</span>
              <div className="hero-card__panel-grid">
                <div>
                  <small>Cursos</small>
                  <b>{cursos.length}</b>
                </div>
                <div>
                  <small>Secciones</small>
                  <b>{secciones.length}</b>
                </div>
                <div>
                  <small>Unidades</small>
                  <b>{allUnits.length}</b>
                </div>
                <div>
                  <small>Materiales</small>
                  <b>{allMaterials.length}</b>
                </div>
              </div>
            </>
          ) : (
            <>
              <strong>Sin cursos</strong>
              <p className="hero-card__panel-empty">
                Pide al administrador que registre tu asignación de materias para este año escolar.
              </p>
              <button type="button" className="btn btn--accent btn--sm" onClick={() => onNavigate("cursos")}>
                Ver mis cursos <ArrowUpRight size={15} />
              </button>
            </>
          )}
        </div>
      </section>

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

      <div className="overview-grid">
        <div className="overview-main">
          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Agenda de hoy</h3>
                <p className="card__sub">
                  {todayDia ? `Bloques de ${DIA_LABELS[todayDia] || todayDia}` : "Sin clases programadas para hoy"} ·{" "}
                  {todayBlocks.length} bloque(s).
                </p>
              </div>
              <button type="button" className="link-btn" onClick={() => onNavigate("cursos")}>
                Ver horario <ChevronRight size={14} />
              </button>
            </div>
            <div className="card__body card__body--flush">
              {todayBlocks.length ? (
                <div className="docente-agenda">
                  {todayBlocks.map((bloque) => (
                    <article key={bloque.id} className="docente-agenda__item">
                      <span className="docente-agenda__time">
                        <Clock size={15} />
                        <strong>{String(bloque.horaInicio || "").slice(0, 5)}</strong>
                        <small>{String(bloque.horaFin || "").slice(0, 5)}</small>
                      </span>
                      <span className="docente-agenda__body">
                        <strong>{bloque.curso.materiaNombre}</strong>
                        <small>
                          Sección {bloque.curso.seccionEtiqueta} · {bloque.curso.anioNombre}
                        </small>
                      </span>
                      <button
                        type="button"
                        className="btn btn--soft btn--sm"
                        onClick={() => onNavigate("asistencia", bloque.curso.id)}
                      >
                        <ClipboardCheck size={15} /> Asistencia
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty empty--compact">
                  <span className="empty__icon">
                    <CalendarDays size={22} />
                  </span>
                  <p className="empty__title">Sin clases hoy</p>
                  <p className="empty__text">Puedes registrar asistencia de una fecha anterior desde la sección Asistencia.</p>
                  <button type="button" className="btn btn--soft btn--sm" onClick={() => onNavigate("asistencia")}>
                    Abrir hoja de clase
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Unidades recientes</h3>
                <p className="card__sub">Últimas planificaciones creadas en tus cursos.</p>
              </div>
              <button type="button" className="link-btn" onClick={() => onNavigate("planificacion")}>
                Ver planificación <ChevronRight size={14} />
              </button>
            </div>
            <div className="card__body card__body--flush">
              {recentUnits.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Unidad</th>
                        <th>Curso</th>
                        <th>Bimestre</th>
                        <th>Fechas</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentUnits.map((unidad) => {
                        const curso = cursos.find((item) => String(item.id) === String(unidad.cursoId));
                        return (
                          <tr key={unidad.id}>
                            <td>
                              <div className="table__user">
                                <span className="docente-unit-number">U{unidad.numero}</span>
                                <span>
                                  <strong>{unidad.titulo}</strong>
                                  <small>{unidad.contenidos?.length || 0} contenido(s)</small>
                                </span>
                              </div>
                            </td>
                            <td>
                              <strong>{unidad.materiaNombre}</strong>
                              <small className="muted">Sección {unidad.seccionEtiqueta}</small>
                            </td>
                            <td className="muted">{unidad.bimestreNombre}</td>
                            <td className="muted">
                              {formatDate(unidad.fechaInicio)} — {formatDate(unidad.fechaFin)}
                            </td>
                            <td>
                              <span className={`badge ${UNIDAD_CLASS[unidad.estado] || "badge--neutral"}`}>
                                {estadoLabel(unidad.estado)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty empty--compact">
                  <span className="empty__icon">
                    <Layers size={22} />
                  </span>
                  <p className="empty__title">Sin unidades planificadas</p>
                  <p className="empty__text">Crea la primera unidad de un curso desde Planificación.</p>
                  <button type="button" className="btn btn--soft btn--sm" onClick={() => onNavigate("planificacion")}>
                    Planificar ahora
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="overview-side">
          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Mis cursos</h3>
                <p className="card__sub">Materias y secciones a tu cargo.</p>
              </div>
            </div>
            <div className="card__body">
              {cursos.length ? (
                <div className="mini-feed">
                  {cursos.map((curso) => {
                    const unidades = unidadesPorCurso[curso.id] || [];
                    const materiales = materialesPorCurso[curso.id] || [];
                    return (
                      <button
                        key={curso.id}
                        type="button"
                        className="mini-feed__item docente-mini-course"
                        onClick={() => onNavigate("cursos", curso.id)}
                      >
                        <span className="mini-feed__icon">
                          <BookOpen size={15} />
                        </span>
                        <span>
                          <strong>{courseLabel(curso)}</strong>
                          <small>
                            {unidades.length} unidad(es) · {materiales.length} material(es)
                          </small>
                          <em>{curso.anioNombre}</em>
                        </span>
                        <ChevronRight size={15} className="docente-mini-course__arrow" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="empty empty--compact">
                  <span className="empty__icon">
                    <GraduationCap size={20} />
                  </span>
                  <p className="empty__title">Sin cursos</p>
                  <p className="empty__text">Cuando te asignen un curso aparecerá aquí.</p>
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Planificación</h3>
                <p className="card__sub">Avance de publicación de unidades.</p>
              </div>
            </div>
            <div className="card__body">
              {allUnits.length ? (
                <div className="bars">
                  <div className="bar-row">
                    <div className="bar-row__top">
                      <span>Publicadas</span>
                      <strong>{publicadas.length}</strong>
                    </div>
                    <div className="bar">
                      <span
                        className="bar__fill bar__fill--docente"
                        style={{ width: `${percent(publicadas.length, allUnits.length)}%` }}
                      />
                    </div>
                  </div>
                  <div className="bar-row">
                    <div className="bar-row__top">
                      <span>En borrador</span>
                      <strong>{borradores.length}</strong>
                    </div>
                    <div className="bar">
                      <span
                        className="bar__fill bar__fill--secretaria"
                        style={{ width: `${percent(borradores.length, allUnits.length)}%` }}
                      />
                    </div>
                  </div>
                  <p className="hint">
                    {publicadas.length === allUnits.length
                      ? "Todas tus unidades están visibles para los alumnos."
                      : `${borradores.length} unidad(es) aún no son visibles para los alumnos.`}
                  </p>
                </div>
              ) : (
                <p className="hint">Aún no hay unidades para calcular el avance.</p>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Accesos rápidos</h3>
                <p className="card__sub">Atajos a tus tareas frecuentes.</p>
              </div>
            </div>
            <div className="card__body">
              <div className="quick-grid">
                {quickActions.map(({ label, text, icon: Icon, view, tone }) => (
                  <button key={label} type="button" className="quick-card" onClick={() => onNavigate(view)}>
                    <span className={`quick-card__icon quick-card__icon--${tone}`}>
                      <Icon size={18} />
                    </span>
                    <span>
                      <strong>{label}</strong>
                      <small>{text}</small>
                    </span>
                    <ArrowUpRight size={15} className="quick-card__arrow" />
                  </button>
                ))}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
