import { useMemo, useState } from "react";
import {
  CircleX,
  FolderOpen,
  GraduationCap,
  Pencil,
  Plus,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { getApiError, secretariaService } from "../../../services/api";
import { Modal } from "../../../components/ui/Modal";
import {
  ESTUDIANTE_CLASS,
  SITUACION_CLASS,
  estadoLabel,
  formatDate,
  fullName,
  initials,
} from "../../../utils/format";
import StudentFileModal from "./StudentFileModal";

const ESTADOS = ["ACTIVO", "TRASLADADO", "RETIRADO", "EGRESADO"];

const EMPTY_FORM = {
  email: "",
  password: "",
  nombres: "",
  apellidos: "",
  dni: "",
  fechaNacimiento: "",
};

const today = new Date().toISOString().slice(0, 10);

export default function StudentsView({ data, onReload, showToast }) {
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("TODOS");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ fechaNacimiento: "", estado: "ACTIVO" });
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [fileTarget, setFileTarget] = useState(null);

  const estudiantes = data.estudiantes || [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return estudiantes
      .filter((estudiante) => estadoFilter === "TODOS" || estudiante.estado === estadoFilter)
      .filter((estudiante) => {
        if (!term) return true;
        return [estudiante.nombres, estudiante.apellidos, estudiante.email, estudiante.dni, estudiante.seccionEtiqueta]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .slice()
      .sort((a, b) => String(a.apellidos).localeCompare(String(b.apellidos)));
  }, [estudiantes, search, estadoFilter]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setCreateOpen(true);
  };

  const openEdit = (estudiante) => {
    setEditTarget(estudiante);
    setEditForm({
      fechaNacimiento: estudiante.fechaNacimiento || "",
      estado: estudiante.estado || "ACTIVO",
    });
    setEditError(null);
  };

  const handleCreateChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError(null);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!form.email.trim() || !form.nombres.trim() || !form.apellidos.trim()) {
      setFormError({ message: "Completa los datos de la cuenta del estudiante." });
      return;
    }
    if (!/^\d{8}$/.test(form.dni.trim())) {
      setFormError({ message: "El DNI debe tener exactamente 8 dígitos." });
      return;
    }
    if (form.password.length < 8) {
      setFormError({ message: "La contraseña debe tener al menos 8 caracteres." });
      return;
    }
    if (!form.fechaNacimiento) {
      setFormError({ message: "La fecha de nacimiento es obligatoria." });
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await secretariaService.crearEstudiante({
        usuario: {
          email: form.email.trim(),
          password: form.password,
          nombres: form.nombres.trim(),
          apellidos: form.apellidos.trim(),
          dni: form.dni.trim(),
        },
        perfil: { fechaNacimiento: form.fechaNacimiento },
      });
      showToast("success", "Estudiante registrado. Ahora puedes matricularlo en una sección.");
      setCreateOpen(false);
      onReload();
    } catch (error) {
      setFormError(getApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (event) => {
    event.preventDefault();
    if (!editForm.fechaNacimiento) {
      setEditError({ message: "La fecha de nacimiento es obligatoria." });
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      await secretariaService.actualizarEstudiante(editTarget.id, {
        fechaNacimiento: editForm.fechaNacimiento,
        estado: editForm.estado,
      });
      const reingreso = editTarget.estado !== "ACTIVO" && editForm.estado === "ACTIVO";
      showToast(
        "success",
        reingreso
          ? `Reingreso registrado para ${fullName(editTarget)}.`
          : `Ficha de ${fullName(editTarget)} actualizada.`
      );
      setEditTarget(null);
      onReload();
    } catch (error) {
      setEditError(getApiError(error));
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Estudiantes</h2>
          <p className="page__sub">
            {estudiantes.length} fichas registradas · {estudiantes.filter((e) => e.estado === "ACTIVO").length} activas.
          </p>
        </div>
        <div className="page__actions">
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            <UserPlus size={17} /> Nuevo estudiante
          </button>
        </div>
      </div>

      <div className="toolbar">
        <label className="search">
          <Search size={17} />
          <input
            type="search"
            placeholder="Buscar por nombre, DNI, email o sección…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="toolbar__group">
          <select className="select" value={estadoFilter} onChange={(event) => setEstadoFilter(event.target.value)}>
            <option value="TODOS">Todos los estados</option>
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>
                {estadoLabel(estado)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="card">
        <div className="card__body card__body--flush">
          {filtered.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>DNI</th>
                    <th>Nacimiento</th>
                    <th>Sección</th>
                    <th>Matrícula</th>
                    <th>Apoderados</th>
                    <th>Estado</th>
                    <th className="table__actions-col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((estudiante) => (
                    <tr key={estudiante.id}>
                      <td>
                        <div className="table__user">
                          <span className="avatar avatar--sm">{initials(estudiante.nombres, estudiante.apellidos)}</span>
                          <span>
                            <strong>
                              {fullName(estudiante)}
                              {estudiante.activo === false ? <em className="tag-self">Cuenta inactiva</em> : null}
                            </strong>
                            <small>{estudiante.email}</small>
                          </span>
                        </div>
                      </td>
                      <td className="mono">{estudiante.dni}</td>
                      <td>{formatDate(estudiante.fechaNacimiento)}</td>
                      <td>
                        {estudiante.seccionEtiqueta ? (
                          <>
                            <strong>{estudiante.seccionEtiqueta}</strong>
                            <small className="secretaria-block-sub">{estudiante.anioNombre}</small>
                          </>
                        ) : (
                          <span className="muted">Sin matrícula</span>
                        )}
                      </td>
                      <td>
                        {estudiante.situacionFinal ? (
                          <span className={`badge ${SITUACION_CLASS[estudiante.situacionFinal] || "badge--neutral"}`}>
                            {estadoLabel(estudiante.situacionFinal)}
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <div className="secretaria-people">
                          {estudiante.apoderados?.length ? (
                            estudiante.apoderados.slice(0, 2).map((apoderado) => (
                              <span key={apoderado.id} className="badge badge--neutral" title={apoderado.nombres}>
                                {apoderado.nombres?.split(" ")[0]}
                              </span>
                            ))
                          ) : (
                            <span className="muted">—</span>
                          )}
                          {estudiante.apoderados?.length > 2 ? (
                            <span className="secretaria-people__more">+{estudiante.apoderados.length - 2}</span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${ESTUDIANTE_CLASS[estudiante.estado] || "badge--neutral"}`}>
                          {estadoLabel(estudiante.estado)}
                        </span>
                      </td>
                      <td>
                        <div className="table__actions">
                          <button
                            type="button"
                            className="icon-btn icon-btn--soft"
                            onClick={() => setFileTarget(estudiante)}
                            title="Ver expediente"
                          >
                            <FolderOpen size={16} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn icon-btn--soft"
                            onClick={() => openEdit(estudiante)}
                            title="Editar ficha y estado"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty empty--tall">
              <span className="empty__icon">
                {estudiantes.length ? <Search size={26} /> : <GraduationCap size={26} />}
              </span>
              <p className="empty__title">{estudiantes.length ? "Sin coincidencias" : "Sin estudiantes registrados"}</p>
              <p className="empty__text">
                {estudiantes.length
                  ? "Ajusta la búsqueda o el filtro de estado académico."
                  : "Registra la primera cuenta de estudiante para comenzar a matricular."}
              </p>
              {!estudiantes.length ? (
                <button type="button" className="btn btn--soft btn--sm" onClick={openCreate}>
                  <Plus size={15} /> Nuevo estudiante
                </button>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <Modal
        open={createOpen}
        onClose={() => {
          if (!saving) setCreateOpen(false);
        }}
        title="Nuevo estudiante"
        subtitle="Crea la cuenta de acceso y la ficha del alumno. La matrícula se registra aparte."
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" form="student-create-form" className="btn btn--primary" disabled={saving}>
              {saving ? "Registrando…" : "Registrar estudiante"}
            </button>
          </>
        }
      >
        {formError ? (
          <div className="alert alert--error" role="alert">
            <CircleX size={18} />
            <div>
              <p>{formError.message}</p>
              {formError.fields?.length ? (
                <ul className="alert__list">
                  {formError.fields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}

        <form id="student-create-form" className="form" onSubmit={handleCreate}>
          <div className="form-grid form-grid--2">
            <label className="field field--plain">
              <span className="field__label">Nombres</span>
              <input
                className="input"
                name="nombres"
                value={form.nombres}
                onChange={handleCreateChange}
                placeholder="Ana Sofía"
                disabled={saving}
                required
              />
            </label>
            <label className="field field--plain">
              <span className="field__label">Apellidos</span>
              <input
                className="input"
                name="apellidos"
                value={form.apellidos}
                onChange={handleCreateChange}
                placeholder="Quispe Ramos"
                disabled={saving}
                required
              />
            </label>
          </div>

          <div className="form-grid form-grid--2">
            <label className="field field--plain">
              <span className="field__label">DNI</span>
              <input
                className="input"
                name="dni"
                value={form.dni}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, dni: event.target.value.replace(/\D/g, "").slice(0, 8) }));
                  if (formError) setFormError(null);
                }}
                placeholder="12345678"
                inputMode="numeric"
                maxLength={8}
                disabled={saving}
                required
              />
            </label>
            <label className="field field--plain">
              <span className="field__label">Fecha de nacimiento</span>
              <input
                className="input"
                type="date"
                name="fechaNacimiento"
                value={form.fechaNacimiento}
                max={today}
                onChange={handleCreateChange}
                disabled={saving}
                required
              />
            </label>
          </div>

          <label className="field field--plain">
            <span className="field__label">Correo institucional</span>
            <input
              className="input"
              type="email"
              name="email"
              value={form.email}
              onChange={handleCreateChange}
              placeholder="estudiante@educa360.pe"
              disabled={saving}
              required
            />
          </label>

          <label className="field field--plain">
            <span className="field__label">Contraseña temporal</span>
            <input
              className="input"
              type="password"
              name="password"
              value={form.password}
              onChange={handleCreateChange}
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              maxLength={72}
              disabled={saving}
              required
            />
          </label>

          <div className="info-strip info-strip--soft">
            <Users size={16} />
            <p>
              El estudiante no registra teléfonos propios: la comunicación se realiza con su apoderado. Puedes
              vincularlo desde la sección Familias.
            </p>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(editTarget)}
        onClose={() => {
          if (!editSaving) setEditTarget(null);
        }}
        title="Ficha del estudiante"
        subtitle={editTarget ? `${fullName(editTarget)} · DNI ${editTarget.dni}` : ""}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setEditTarget(null)} disabled={editSaving}>
              Cancelar
            </button>
            <button type="submit" form="student-edit-form" className="btn btn--primary" disabled={editSaving}>
              {editSaving ? "Guardando…" : "Guardar cambios"}
            </button>
          </>
        }
      >
        {editError ? (
          <div className="alert alert--error" role="alert">
            <CircleX size={18} />
            <p>{editError.message}</p>
          </div>
        ) : null}

        <form id="student-edit-form" className="form" onSubmit={handleEdit}>
          <label className="field field--plain">
            <span className="field__label">Fecha de nacimiento</span>
            <input
              className="input"
              type="date"
              value={editForm.fechaNacimiento}
              max={today}
              onChange={(event) => setEditForm((prev) => ({ ...prev, fechaNacimiento: event.target.value }))}
              disabled={editSaving}
              required
            />
          </label>

          <label className="field field--plain">
            <span className="field__label">Estado académico</span>
            <select
              className="select"
              value={editForm.estado}
              onChange={(event) => setEditForm((prev) => ({ ...prev, estado: event.target.value }))}
              disabled={editSaving}
            >
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estadoLabel(estado)}
                </option>
              ))}
            </select>
          </label>

          <div className="info-strip info-strip--soft">
            <GraduationCap size={16} />
            <p>
              <strong>ACTIVO</strong> es el reingreso: reactiva al alumno y su matrícula si estaba retirada.
              <strong> RETIRADO</strong> marca también la matrícula vigente. <strong>EGRESADO</strong> es terminal.
            </p>
          </div>
        </form>
      </Modal>

      <StudentFileModal student={fileTarget} onClose={() => setFileTarget(null)} />
    </div>
  );
}
