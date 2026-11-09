import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  CircleX,
  ClipboardList,
  RotateCcw,
  Search,
  UserMinus,
  UserCheck,
} from "lucide-react";
import { getApiError, secretariaService } from "../../../services/api";
import { ConfirmDialog, Modal } from "../../../components/ui/Modal";
import {
  SITUACION_CLASS,
  estadoLabel,
  formatDate,
  fullName,
  initials,
} from "../../../utils/format";

const today = new Date().toISOString().slice(0, 10);

export default function EnrollmentsView({ data, onReload, showToast }) {
  const anios = data.anios || [];
  const secciones = data.secciones || [];
  const estudiantes = data.estudiantes || [];

  const [yearFilter, setYearFilter] = useState(String(anios[0]?.id || ""));
  const [sectionFilter, setSectionFilter] = useState("");
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ estudianteId: "", anioId: "", seccionId: "", fechaMatricula: today, observacion: "" });
  const [createError, setCreateError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [sectionTarget, setSectionTarget] = useState(null);
  const [sectionForm, setSectionForm] = useState({ seccionId: "" });
  const [sectionError, setSectionError] = useState(null);
  const [sectionSaving, setSectionSaving] = useState(false);

  const [retireTarget, setRetireTarget] = useState(null);
  const [retireLoading, setRetireLoading] = useState(false);
  const [reingresoTarget, setReingresoTarget] = useState(null);
  const [reingresoLoading, setReingresoLoading] = useState(false);

  const effectiveYear = yearFilter || String(anios[0]?.id || "");
  const seccionesDelAnio = secciones.filter((seccion) => String(seccion.anioId) === String(effectiveYear));

  const matriculas = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data.matriculas || [])
      .filter((matricula) => !effectiveYear || String(matricula.anioId) === String(effectiveYear))
      .filter((matricula) => !sectionFilter || String(matricula.seccionId) === String(sectionFilter))
      .filter((matricula) => {
        if (!term) return true;
        return [matricula.estudianteNombre, matricula.estudianteDni, matricula.seccionEtiqueta]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .slice()
      .sort((a, b) => String(a.estudianteNombre).localeCompare(String(b.estudianteNombre)));
  }, [data.matriculas, effectiveYear, sectionFilter, search]);

  const cursoYear = anios.find((anio) => String(anio.id) === String(effectiveYear));

  const openCreate = () => {
    const initialYear = effectiveYear || String(anios[0]?.id || "");
    setCreateForm({
      estudianteId: "",
      anioId: initialYear,
      seccionId: "",
      fechaMatricula: today,
      observacion: "",
    });
    setCreateError(null);
    setCreateOpen(true);
  };

  const createSections = secciones.filter((seccion) => String(seccion.anioId) === String(createForm.anioId));

  const availableStudents = useMemo(() => {
    const yearId = createForm.anioId;
    const enrolled = new Set(
      (data.matriculas || [])
        .filter((matricula) => String(matricula.anioId) === String(yearId))
        .map((matricula) => String(matricula.estudianteId))
    );
    return estudiantes
      .filter((estudiante) => estudiante.estado === "ACTIVO")
      .filter((estudiante) => !enrolled.has(String(estudiante.id)))
      .slice()
      .sort((a, b) => String(a.apellidos).localeCompare(String(b.apellidos)));
  }, [data.matriculas, estudiantes, createForm.anioId]);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!createForm.estudianteId) {
      setCreateError({ message: "Selecciona al estudiante que deseas matricular." });
      return;
    }
    if (!createForm.seccionId) {
      setCreateError({ message: "Selecciona la sección de destino." });
      return;
    }
    if (!createForm.fechaMatricula) {
      setCreateError({ message: "La fecha de matrícula es obligatoria." });
      return;
    }
    setSaving(true);
    setCreateError(null);
    try {
      await secretariaService.crearMatricula({
        estudianteId: Number(createForm.estudianteId),
        seccionId: Number(createForm.seccionId),
        fechaMatricula: createForm.fechaMatricula,
        observacion: createForm.observacion.trim() || null,
      });
      showToast("success", "Matrícula registrada correctamente.");
      setCreateOpen(false);
      onReload();
    } catch (error) {
      setCreateError(getApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const openSectionChange = (matricula) => {
    setSectionTarget(matricula);
    setSectionForm({ seccionId: "" });
    setSectionError(null);
  };

  const handleSectionChange = async (event) => {
    event.preventDefault();
    if (!sectionForm.seccionId) {
      setSectionError({ message: "Selecciona la nueva sección." });
      return;
    }
    setSectionSaving(true);
    setSectionError(null);
    try {
      await secretariaService.cambiarSeccionMatricula(sectionTarget.id, Number(sectionForm.seccionId));
      showToast("success", `Sección de ${sectionTarget.estudianteNombre} actualizada.`);
      setSectionTarget(null);
      onReload();
    } catch (error) {
      setSectionError(getApiError(error));
    } finally {
      setSectionSaving(false);
    }
  };

  const handleRetire = async () => {
    setRetireLoading(true);
    try {
      await secretariaService.retirarMatricula(retireTarget.id);
      showToast("success", `${retireTarget.estudianteNombre} quedó retirado del año ${retireTarget.anioNombre}.`);
      setRetireTarget(null);
      onReload();
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setRetireLoading(false);
    }
  };

  const handleReingreso = async () => {
    setReingresoLoading(true);
    try {
      await secretariaService.cambiarEstadoEstudiante(reingresoTarget.estudianteId, "ACTIVO");
      showToast("success", `Reingreso registrado para ${reingresoTarget.estudianteNombre}.`);
      setReingresoTarget(null);
      onReload();
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setReingresoLoading(false);
    }
  };

  const sectionOptionsForTarget = secciones.filter(
    (seccion) =>
      sectionTarget &&
      String(seccion.anioId) === String(sectionTarget.anioId) &&
      String(seccion.id) !== String(sectionTarget.seccionId)
  );

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Matrículas</h2>
          <p className="page__sub">
            {matriculas.length} matrículas en la vista actual · {cursoYear?.nombre || "Selecciona un año"}.
          </p>
        </div>
        <div className="page__actions">
          <select
            className="select"
            value={effectiveYear}
            onChange={(event) => {
              setYearFilter(event.target.value);
              setSectionFilter("");
            }}
          >
            {anios.map((anio) => (
              <option key={anio.id} value={anio.id}>
                {anio.nombre}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn--primary" onClick={openCreate} disabled={!anios.length}>
            <ClipboardList size={17} /> Nueva matrícula
          </button>
        </div>
      </div>

      {!anios.length ? (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <ClipboardList size={26} />
            </span>
            <p className="empty__title">Sin estructura académica visible</p>
            <p className="empty__text">
              Secretaría no administra años ni secciones. Cuando el administrador cree el año y las secciones, y
              exista al menos una matrícula, la estructura aparecerá aquí.
            </p>
          </div>
        </section>
      ) : (
        <>
          <div className="toolbar">
            <label className="search">
              <Search size={17} />
              <input
                type="search"
                placeholder="Buscar por estudiante, DNI o sección…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <div className="toolbar__group">
              <select className="select" value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)}>
                <option value="">Todas las secciones</option>
                {seccionesDelAnio.map((seccion) => (
                  <option key={seccion.id} value={seccion.id}>
                    Sección {seccion.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <section className="card">
            <div className="card__body card__body--flush">
              {matriculas.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Estudiante</th>
                        <th>DNI</th>
                        <th>Sección</th>
                        <th>Año</th>
                        <th>Fecha</th>
                        <th>Situación</th>
                        <th>Observación</th>
                        <th className="table__actions-col">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matriculas.map((matricula) => {
                        const retirada = matricula.situacionFinal === "RETIRADO";
                        return (
                          <tr key={matricula.id}>
                            <td>
                              <div className="table__user">
                                <span className="avatar avatar--sm">
                                  {initials(
                                    matricula.estudianteNombre?.split(" ")[0],
                                    matricula.estudianteNombre?.split(" ").slice(1).join(" ")
                                  )}
                                </span>
                                <span>
                                  <strong>{matricula.estudianteNombre}</strong>
                                  <small>Matrícula #{matricula.id}</small>
                                </span>
                              </div>
                            </td>
                            <td className="mono">{matricula.estudianteDni}</td>
                            <td>
                              <strong>{matricula.seccionEtiqueta}</strong>
                            </td>
                            <td className="muted">{matricula.anioNombre}</td>
                            <td>{formatDate(matricula.fechaMatricula)}</td>
                            <td>
                              <span className={`badge ${SITUACION_CLASS[matricula.situacionFinal] || "badge--neutral"}`}>
                                {estadoLabel(matricula.situacionFinal)}
                              </span>
                            </td>
                            <td className="secretaria-cell-clamp muted">{matricula.observacion || "—"}</td>
                            <td>
                              <div className="table__actions">
                                {!retirada ? (
                                  <>
                                    <button
                                      type="button"
                                      className="icon-btn icon-btn--soft"
                                      onClick={() => openSectionChange(matricula)}
                                      title="Cambiar de sección"
                                    >
                                      <ArrowLeftRight size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      className="icon-btn icon-btn--soft icon-btn--danger"
                                      onClick={() => setRetireTarget(matricula)}
                                      title="Retirar del año"
                                    >
                                      <UserMinus size={16} />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    className="icon-btn icon-btn--soft"
                                    onClick={() => setReingresoTarget(matricula)}
                                    title="Reingresar al estudiante"
                                  >
                                    <RotateCcw size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty empty--tall">
                  <span className="empty__icon">
                    <Search size={26} />
                  </span>
                  <p className="empty__title">
                    {data.matriculas?.length ? "Sin coincidencias" : "Sin matrículas registradas"}
                  </p>
                  <p className="empty__text">
                    {data.matriculas?.length
                      ? "Ajusta el año, la sección o la búsqueda."
                      : "Inscribe al primer estudiante en una sección del año de trabajo."}
                  </p>
                  {!data.matriculas?.length ? (
                    <button type="button" className="btn btn--soft btn--sm" onClick={openCreate}>
                      <ClipboardList size={15} /> Nueva matrícula
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <Modal
        open={createOpen}
        onClose={() => {
          if (!saving) setCreateOpen(false);
        }}
        title="Nueva matrícula"
        subtitle="El año se toma de la sección elegida. La matrícula nace EN_CURSO."
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" form="enrollment-create-form" className="btn btn--primary" disabled={saving}>
              {saving ? "Matriculando…" : "Registrar matrícula"}
            </button>
          </>
        }
      >
        {createError ? (
          <div className="alert alert--error" role="alert">
            <CircleX size={18} />
            <div>
              <p>{createError.message}</p>
              {createError.fields?.length ? (
                <ul className="alert__list">
                  {createError.fields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}

        <form id="enrollment-create-form" className="form" onSubmit={handleCreate}>
          <label className="field field--plain">
            <span className="field__label">Año escolar</span>
            <select
              className="select"
              value={createForm.anioId}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, anioId: event.target.value, seccionId: "", estudianteId: "" }))
              }
              disabled={saving}
            >
              {anios.map((anio) => (
                <option key={anio.id} value={anio.id}>
                  {anio.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="field field--plain">
            <span className="field__label">Estudiante activo sin matrícula en el año</span>
            <select
              className="select"
              value={createForm.estudianteId}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, estudianteId: event.target.value }))}
              disabled={saving || !availableStudents.length}
            >
              <option value="">
                {availableStudents.length ? "Selecciona un estudiante" : "No hay estudiantes disponibles"}
              </option>
              {availableStudents.map((estudiante) => (
                <option key={estudiante.id} value={estudiante.id}>
                  {fullName(estudiante)} · DNI {estudiante.dni}
                </option>
              ))}
            </select>
          </label>

          <label className="field field--plain">
            <span className="field__label">Sección</span>
            <select
              className="select"
              value={createForm.seccionId}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, seccionId: event.target.value }))}
              disabled={saving || !createSections.length}
            >
              <option value="">
                {createSections.length ? "Selecciona la sección" : "No hay secciones visibles para este año"}
              </option>
              {createSections.map((seccion) => (
                <option key={seccion.id} value={seccion.id}>
                  {seccion.etiqueta}
                </option>
              ))}
            </select>
          </label>

          <label className="field field--plain">
            <span className="field__label">Fecha de matrícula</span>
            <input
              className="input"
              type="date"
              value={createForm.fechaMatricula}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, fechaMatricula: event.target.value }))}
              disabled={saving}
              required
            />
          </label>

          <label className="field field--plain">
            <span className="field__label">Observación (opcional)</span>
            <textarea
              className="textarea"
              rows={3}
              maxLength={500}
              value={createForm.observacion}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, observacion: event.target.value }))}
              placeholder="Notas internas de la matrícula…"
              disabled={saving}
            />
          </label>

          <div className="info-strip info-strip--soft">
            <UserCheck size={16} />
            <p>
              Solo se matriculan alumnos <strong>ACTIVOS</strong> y una sola vez por año. Si necesitas moverlo de
              sección, usa la acción «Cambiar de sección».
            </p>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(sectionTarget)}
        onClose={() => {
          if (!sectionSaving) setSectionTarget(null);
        }}
        title="Cambiar de sección"
        subtitle={sectionTarget ? `${sectionTarget.estudianteNombre} · ${sectionTarget.anioNombre}` : ""}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setSectionTarget(null)} disabled={sectionSaving}>
              Cancelar
            </button>
            <button type="submit" form="section-change-form" className="btn btn--primary" disabled={sectionSaving}>
              {sectionSaving ? "Guardando…" : "Cambiar sección"}
            </button>
          </>
        }
      >
        {sectionError ? (
          <div className="alert alert--error" role="alert">
            <CircleX size={18} />
            <p>{sectionError.message}</p>
          </div>
        ) : null}

        <form id="section-change-form" className="form" onSubmit={handleSectionChange}>
          <div className="student-file__grid">
            <div className="info-block">
              <span className="info-block__label">Sección actual</span>
              <strong>{sectionTarget?.seccionEtiqueta}</strong>
            </div>
            <div className="info-block">
              <span className="info-block__label">Año</span>
              <strong>{sectionTarget?.anioNombre}</strong>
            </div>
          </div>

          <label className="field field--plain">
            <span className="field__label">Nueva sección</span>
            <select
              className="select"
              value={sectionForm.seccionId}
              onChange={(event) => setSectionForm({ seccionId: event.target.value })}
              disabled={sectionSaving || !sectionOptionsForTarget.length}
            >
              <option value="">
                {sectionOptionsForTarget.length ? "Selecciona la nueva sección" : "No hay otra sección en este año"}
              </option>
              {sectionOptionsForTarget.map((seccion) => (
                <option key={seccion.id} value={seccion.id}>
                  {seccion.etiqueta}
                </option>
              ))}
            </select>
          </label>

          <div className="info-strip info-strip--soft">
            <ArrowLeftRight size={16} />
            <p>
              Solo se permite antes del primer día de clases del año y mientras la matrícula no tenga asistencias ni
              calificaciones. Si ya inició clases, el sistema rechazará el cambio.
            </p>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(retireTarget)}
        title="Retirar del año"
        danger
        message={
          retireTarget
            ? `Se marcará la matrícula de ${retireTarget.estudianteNombre} como RETIRADA y el estudiante quedará RETIRADO. Para volver a incorporarlo, usa «Reingresar».`
            : ""
        }
        confirmLabel="Retirar estudiante"
        loading={retireLoading}
        onConfirm={handleRetire}
        onClose={() => setRetireTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(reingresoTarget)}
        title="Reingresar estudiante"
        message={
          reingresoTarget
            ? `El estudiante ${reingresoTarget.estudianteNombre} volverá a estar ACTIVO y su matrícula del año se reactivará si corresponde.`
            : ""
        }
        confirmLabel="Reingresar"
        loading={reingresoLoading}
        onConfirm={handleReingreso}
        onClose={() => setReingresoTarget(null)}
      />
    </div>
  );
}
