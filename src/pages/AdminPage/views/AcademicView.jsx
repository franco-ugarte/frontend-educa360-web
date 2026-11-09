import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CircleX, Clock, Lock, Plus, ShieldCheck } from "lucide-react";
import { adminService, getApiError } from "../../../services/api";
import { ESTADO_CLASS, estadoLabel, formatDate } from "../../../utils/format";
import { ConfirmDialog, Modal } from "../../../components/ui/Modal";

const YEAR_STATE_ACTION = {
  PLANIFICADO: { label: "Abrir año", next: "ABIERTO", tone: "btn--primary" },
  ABIERTO: { label: "Cerrar año", next: "CERRADO", tone: "btn--accent" },
  CERRADO: { label: "Reabrir año", next: "ABIERTO", tone: "btn--soft" },
};

const BIM_STATE_ACTION = {
  PLANIFICADO: { label: "Abrir", next: "ABIERTO" },
  ABIERTO: { label: "Cerrar", next: "CERRADO" },
  CERRADO: { label: "Reabrir", next: "ABIERTO" },
};

function currentYearValue() {
  return new Date().getFullYear();
}

export default function AcademicView({ data, onReload, showToast }) {
  const anios = useMemo(
    () => [...(data.anios || [])].sort((a, b) => (b.anio || 0) - (a.anio || 0)),
    [data.anios]
  );

  const [selectedId, setSelectedId] = useState(() => {
    const openYear = (data.anios || []).find((anio) => anio.estado === "ABIERTO");
    return openYear?.id || data.anios?.[0]?.id || null;
  });
  const [bimestres, setBimestres] = useState(data.bimestres || []);
  const [bimLoading, setBimLoading] = useState(false);

  const [yearModal, setYearModal] = useState(false);
  const [yearForm, setYearForm] = useState(() => ({
    anio: String(currentYearValue()),
    nombre: `Año Escolar ${currentYearValue()}`,
    fechaInicio: `${currentYearValue()}-03-01`,
  }));
  const [yearError, setYearError] = useState(null);
  const [yearSaving, setYearSaving] = useState(false);

  const [bimModal, setBimModal] = useState(false);
  const [bimForm, setBimForm] = useState({ numero: "1", fechaInicio: "", fechaFin: "" });
  const [bimError, setBimError] = useState(null);
  const [bimSaving, setBimSaving] = useState(false);
  const [confirmYear, setConfirmYear] = useState(null);
  const [confirmBim, setConfirmBim] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const selected = anios.find((anio) => anio.id === selectedId) || null;

  useEffect(() => {
    if (!selectedId && anios.length) {
      const openYear = anios.find((anio) => anio.estado === "ABIERTO");
      setSelectedId(openYear?.id || anios[0].id);
    }
  }, [anios, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setBimestres([]);
      return;
    }
    let active = true;
    setBimLoading(true);
    adminService
      .listarBimestres(selectedId)
      .then((list) => {
        if (active) setBimestres(list || []);
      })
      .catch((error) => {
        if (active) {
          setBimestres([]);
          showToast("error", getApiError(error).message);
        }
      })
      .finally(() => {
        if (active) setBimLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId, showToast]);

  const openYearModal = () => {
    const year = currentYearValue();
    setYearForm({ anio: String(year), nombre: `Año Escolar ${year}`, fechaInicio: `${year}-03-01` });
    setYearError(null);
    setYearModal(true);
  };

  const handleYearChange = (event) => {
    const { name, value } = event.target;
    setYearForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "anio" && /^\d{4}$/.test(value)) {
        next.nombre = `Año Escolar ${value}`;
        next.fechaInicio = `${value}-03-01`;
      }
      return next;
    });
    if (yearError) setYearError(null);
  };

  const handleCreateYear = async (event) => {
    event.preventDefault();
    if (!/^\d{4}$/.test(yearForm.anio) || !yearForm.nombre.trim() || !yearForm.fechaInicio) {
      setYearError({ message: "Completa el año, el nombre y la fecha de inicio." });
      return;
    }
    setYearSaving(true);
    setYearError(null);
    try {
      const created = await adminService.crearAnio({
        anio: Number(yearForm.anio),
        nombre: yearForm.nombre.trim(),
        fechaInicio: yearForm.fechaInicio,
      });
      setYearModal(false);
      setSelectedId(created.id);
      showToast("success", `Año escolar ${created.anio} creado en estado PLANIFICADO.`);
      onReload();
    } catch (error) {
      setYearError(getApiError(error));
    } finally {
      setYearSaving(false);
    }
  };

  const changeYearState = async (anio, estado) => {
    setConfirmLoading(true);
    try {
      await adminService.cambiarEstadoAnio(anio.id, estado);
      showToast("success", `${anio.nombre} pasó a estado ${estadoLabel(estado)}.`);
      setConfirmYear(null);
      onReload();
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setConfirmLoading(false);
    }
  };

  const openBimModal = () => {
    const used = bimestres.map((bimestre) => bimestre.numero);
    const next = [1, 2, 3, 4].find((numero) => !used.includes(numero)) || 1;
    setBimForm({
      numero: String(next),
      fechaInicio: selected?.fechaInicio || "",
      fechaFin: "",
    });
    setBimError(null);
    setBimModal(true);
  };

  const handleCreateBimestre = async (event) => {
    event.preventDefault();
    if (!bimForm.fechaInicio || !bimForm.fechaFin) {
      setBimError({ message: "Ingresa las fechas de inicio y fin del bimestre." });
      return;
    }
    setBimSaving(true);
    setBimError(null);
    try {
      await adminService.crearBimestre(selected.id, {
        numero: Number(bimForm.numero),
        fechaInicio: bimForm.fechaInicio,
        fechaFin: bimForm.fechaFin,
      });
      setBimModal(false);
      const list = await adminService.listarBimestres(selected.id);
      setBimestres(list || []);
      showToast("success", `Bimestre ${bimForm.numero} creado.`);
      onReload();
    } catch (error) {
      setBimError(getApiError(error));
    } finally {
      setBimSaving(false);
    }
  };

  const changeBimestreState = async (bimestre, estado) => {
    setConfirmLoading(true);
    try {
      await adminService.cambiarEstadoBimestre(bimestre.id, estado);
      const list = await adminService.listarBimestres(selected.id);
      setBimestres(list || []);
      showToast("success", `${bimestre.nombre} pasó a estado ${estadoLabel(estado)}.`);
      setConfirmBim(null);
      onReload();
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Calendario académico</h2>
          <p className="page__sub">Solo un año y un bimestre pueden estar abiertos a la vez.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openYearModal}>
          <Plus size={17} /> Nuevo año
        </button>
      </div>

      <div className="split">
        <section className="card year-panel">
          <div className="card__head">
            <div>
              <h3 className="card__title">Años escolares</h3>
              <p className="card__sub">{anios.length} registrados.</p>
            </div>
          </div>
          <div className="card__body card__body--tight">
            {anios.length ? (
              <div className="year-list">
                {anios.map((anio) => (
                  <button
                    key={anio.id}
                    type="button"
                    className={`year-card ${selectedId === anio.id ? "year-card--active" : ""}`}
                    onClick={() => setSelectedId(anio.id)}
                  >
                    <span className="year-card__top">
                      <strong>{anio.anio}</strong>
                      <span className={`badge ${ESTADO_CLASS[anio.estado] || "badge--neutral"}`}>
                        {estadoLabel(anio.estado)}
                      </span>
                    </span>
                    <span className="year-card__name">{anio.nombre}</span>
                    <span className="year-card__meta">
                      <CalendarDays size={14} /> Inicio {formatDate(anio.fechaInicio)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty empty--compact">
                <span className="empty__icon">
                  <CalendarDays size={20} />
                </span>
                <p className="empty__title">Sin años registrados</p>
                <p className="empty__text">Crea el primer año escolar para comenzar.</p>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          {selected ? (
            <>
              <div className="card__head">
                <div>
                  <h3 className="card__title">{selected.nombre}</h3>
                  <p className="card__sub">
                    Inicio de clases el {formatDate(selected.fechaInicio)} · Estado{" "}
                    {estadoLabel(selected.estado).toLowerCase()}
                  </p>
                </div>
                <div className="card__actions">
                  <span className={`badge ${ESTADO_CLASS[selected.estado] || "badge--neutral"}`}>
                    {estadoLabel(selected.estado)}
                  </span>
                  {YEAR_STATE_ACTION[selected.estado] ? (
                    <button
                      type="button"
                      className={`btn ${YEAR_STATE_ACTION[selected.estado].tone} btn--sm`}
                      onClick={() =>
                        setConfirmYear({
                          anio: selected,
                          estado: YEAR_STATE_ACTION[selected.estado].next,
                          label: YEAR_STATE_ACTION[selected.estado].label,
                        })
                      }
                    >
                      {YEAR_STATE_ACTION[selected.estado].label}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="card__body">
                <div className="section-heading">
                  <div>
                    <h4>Bimestres</h4>
                    <p className="card__sub">Ventanas de evaluación dentro del año escolar.</p>
                  </div>
                  <button type="button" className="btn btn--soft btn--sm" onClick={openBimModal}>
                    <Plus size={15} /> Añadir bimestre
                  </button>
                </div>

                {bimLoading ? (
                  <div className="loading-state loading-state--inline">
                    <span className="spinner spinner--dark" />
                    <p>Cargando bimestres…</p>
                  </div>
                ) : bimestres.length ? (
                  <div className="bimestre-list">
                    {[...bimestres]
                      .sort((a, b) => a.numero - b.numero)
                      .map((bimestre) => (
                        <div key={bimestre.id} className="bimestre-row">
                          <span className={`bimestre-row__icon bimestre-row__icon--${bimestre.estado?.toLowerCase()}`}>
                            {bimestre.estado === "ABIERTO" ? (
                              <ShieldCheck size={17} />
                            ) : bimestre.estado === "CERRADO" ? (
                              <Lock size={17} />
                            ) : (
                              <Clock size={17} />
                            )}
                          </span>
                          <div className="bimestre-row__info">
                            <strong>{bimestre.nombre}</strong>
                            <small>
                              {formatDate(bimestre.fechaInicio)} — {formatDate(bimestre.fechaFin)}
                            </small>
                          </div>
                          <span className={`badge ${ESTADO_CLASS[bimestre.estado] || "badge--neutral"}`}>
                            {estadoLabel(bimestre.estado)}
                          </span>
                          {BIM_STATE_ACTION[bimestre.estado] ? (
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() =>
                                setConfirmBim({
                                  bimestre,
                                  estado: BIM_STATE_ACTION[bimestre.estado].next,
                                  label: BIM_STATE_ACTION[bimestre.estado].label,
                                })
                              }
                            >
                              {BIM_STATE_ACTION[bimestre.estado].label}
                            </button>
                          ) : null}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="empty">
                    <span className="empty__icon">
                      <CalendarDays size={22} />
                    </span>
                    <p className="empty__title">Sin bimestres</p>
                    <p className="empty__text">Añade los cuatro bimestres del año escolar.</p>
                  </div>
                )}

                <div className="info-strip">
                  <Clock size={16} />
                  <p>
                    Abrir un bimestre requiere que el año esté <strong>ABIERTO</strong>. Cerrar el año exige
                    que todos los bimestres estén cerrados.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="empty empty--tall">
              <span className="empty__icon">
                <CalendarDays size={26} />
              </span>
              <p className="empty__title">Selecciona un año escolar</p>
              <p className="empty__text">Elige un año de la lista o crea uno nuevo para gestionar sus bimestres.</p>
              <button type="button" className="btn btn--soft btn--sm" onClick={openYearModal}>
                <Plus size={15} /> Crear año escolar
              </button>
            </div>
          )}
        </section>
      </div>

      <Modal
        open={yearModal}
        onClose={() => {
          if (!yearSaving) setYearModal(false);
        }}
        title="Nuevo año escolar"
        subtitle="El año nace en estado PLANIFICADO y se abre cuando la estructura esté lista."
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setYearModal(false)} disabled={yearSaving}>
              Cancelar
            </button>
            <button type="submit" form="year-form" className="btn btn--primary" disabled={yearSaving}>
              {yearSaving ? "Creando…" : "Crear año"}
            </button>
          </>
        }
      >
        {yearError ? (
          <div className="alert alert--error" role="alert">
            <CircleX size={18} />
            <p>{yearError.message}</p>
          </div>
        ) : null}
        <form id="year-form" className="form" onSubmit={handleCreateYear}>
          <div className="form-grid form-grid--2">
            <label className="field field--plain">
              <span className="field__label">Año calendario</span>
              <input
                className="input"
                name="anio"
                value={yearForm.anio}
                onChange={handleYearChange}
                maxLength={4}
                inputMode="numeric"
                placeholder="2026"
                disabled={yearSaving}
              />
            </label>
            <label className="field field--plain">
              <span className="field__label">Fecha de inicio de clases</span>
              <input
                className="input"
                type="date"
                name="fechaInicio"
                value={yearForm.fechaInicio}
                onChange={handleYearChange}
                disabled={yearSaving}
              />
            </label>
          </div>
          <label className="field field--plain">
            <span className="field__label">Nombre del año</span>
            <input
              className="input"
              name="nombre"
              value={yearForm.nombre}
              onChange={handleYearChange}
              placeholder="Año Escolar 2026"
              disabled={yearSaving}
            />
          </label>
        </form>
      </Modal>

      <Modal
        open={bimModal}
        onClose={() => {
          if (!bimSaving) setBimModal(false);
        }}
        title="Nuevo bimestre"
        subtitle={selected ? `Se añadirá a ${selected.nombre}` : ""}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setBimModal(false)} disabled={bimSaving}>
              Cancelar
            </button>
            <button type="submit" form="bimestre-form" className="btn btn--primary" disabled={bimSaving}>
              {bimSaving ? "Creando…" : "Crear bimestre"}
            </button>
          </>
        }
      >
        {bimError ? (
          <div className="alert alert--error" role="alert">
            <CircleX size={18} />
            <p>{bimError.message}</p>
          </div>
        ) : null}
        <form id="bimestre-form" className="form" onSubmit={handleCreateBimestre}>
          <label className="field field--plain">
            <span className="field__label">Número de bimestre</span>
            <select
              className="select"
              value={bimForm.numero}
              onChange={(event) => setBimForm((prev) => ({ ...prev, numero: event.target.value }))}
              disabled={bimSaving}
            >
              {[1, 2, 3, 4].map((numero) => (
                <option key={numero} value={String(numero)}>
                  Bimestre {numero}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid form-grid--2">
            <label className="field field--plain">
              <span className="field__label">Fecha de inicio</span>
              <input
                className="input"
                type="date"
                value={bimForm.fechaInicio}
                onChange={(event) => setBimForm((prev) => ({ ...prev, fechaInicio: event.target.value }))}
                disabled={bimSaving}
              />
            </label>
            <label className="field field--plain">
              <span className="field__label">Fecha de fin</span>
              <input
                className="input"
                type="date"
                value={bimForm.fechaFin}
                onChange={(event) => setBimForm((prev) => ({ ...prev, fechaFin: event.target.value }))}
                disabled={bimSaving}
              />
            </label>
          </div>
          <p className="hint">El nombre se genera automáticamente y los bimestres no pueden solaparse.</p>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmYear)}
        title={confirmYear?.label || "Cambiar estado"}
        message={
          confirmYear
            ? `El año ${confirmYear.anio.nombre} pasará a estado ${estadoLabel(confirmYear.estado)}.`
            : ""
        }
        confirmLabel={confirmYear?.label || "Confirmar"}
        loading={confirmLoading}
        onConfirm={() => changeYearState(confirmYear.anio, confirmYear.estado)}
        onClose={() => setConfirmYear(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmBim)}
        title={`${confirmBim?.label || "Cambiar estado"} bimestre`}
        message={
          confirmBim
            ? `${confirmBim.bimestre.nombre} pasará a estado ${estadoLabel(confirmBim.estado)}.`
            : ""
        }
        confirmLabel={confirmBim?.label || "Confirmar"}
        loading={confirmLoading}
        onConfirm={() => changeBimestreState(confirmBim.bimestre, confirmBim.estado)}
        onClose={() => setConfirmBim(null)}
      />
    </div>
  );
}
