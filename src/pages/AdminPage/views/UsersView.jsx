import { useMemo, useState } from "react";
import {
  CircleX,
  KeyRound,
  LibraryBig,
  Plus,
  Power,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { adminService, getApiError, getSession } from "../../../services/api";
import { ROLE_CLASS, ROLE_LABELS, ROLE_SHORT, formatDate, fullName, initials } from "../../../utils/format";
import { ConfirmDialog, Modal } from "../../../components/ui/Modal";

const ROLE_OPTIONS = ["ADMIN", "DOCENTE", "SECRETARIA"];

const EMPTY_FORM = {
  rol: "DOCENTE",
  nombres: "",
  apellidos: "",
  email: "",
  dni: "",
  password: "",
  telefono: "",
  titulo: "",
};

export default function UsersView({ data, onReload, showToast }) {
  const session = getSession();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("TODOS");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetForm, setResetForm] = useState({ password: "", repeat: "" });
  const [resetError, setResetError] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [subjectsTarget, setSubjectsTarget] = useState(null);
  const [subjectIds, setSubjectIds] = useState([]);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectsError, setSubjectsError] = useState(null);
  const [subjectsSaving, setSubjectsSaving] = useState(false);

  const users = data.usuarios || [];
  const materias = data.materias || [];

  const findDocenteProfile = (user) =>
    (data.docentes || []).find((docente) => docente.email === user.email) || null;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesTerm =
        !term ||
        `${user.nombres} ${user.apellidos}`.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.dni.includes(term);
      const matchesRole = roleFilter === "TODOS" || user.rol === roleFilter;
      const matchesStatus =
        statusFilter === "TODOS" ||
        (statusFilter === "ACTIVOS" && user.activo) ||
        (statusFilter === "INACTIVOS" && !user.activo);
      return matchesTerm && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const activos = users.filter((user) => user.activo).length;

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setCreateOpen(true);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError(null);
  };

  const validateForm = () => {
    if (!form.nombres.trim() || !form.apellidos.trim()) return "Nombres y apellidos son obligatorios.";
    if (!form.email.trim()) return "El correo institucional es obligatorio.";
    if (!/^\d{8}$/.test(form.dni.trim())) return "El DNI debe tener exactamente 8 dígitos.";
    if (form.password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    if (form.telefono && !/^\+?\d{7,15}$/.test(form.telefono.trim())) {
      return "El teléfono debe tener entre 7 y 15 dígitos (puede iniciar con +).";
    }
    return null;
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    const validation = validateForm();
    if (validation) {
      setFormError({ message: validation });
      return;
    }

    const usuario = {
      email: form.email.trim(),
      password: form.password,
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      dni: form.dni.trim(),
      telefonos: form.telefono.trim() ? [form.telefono.trim()] : [],
    };

    setSubmitting(true);
    setFormError(null);
    try {
      if (form.rol === "ADMIN") {
        await adminService.crearAdmin(usuario);
      } else if (form.rol === "DOCENTE") {
        await adminService.crearDocente({ usuario, perfil: { titulo: form.titulo.trim() || null } });
      } else {
        await adminService.crearSecretaria({ usuario, perfil: {} });
      }
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      showToast("success", `Cuenta de ${ROLE_LABELS[form.rol]} creada correctamente.`);
      onReload();
    } catch (error) {
      setFormError(getApiError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (user) => {
    if (user.activo) {
      setConfirmTarget(user);
      return;
    }
    await applyActive(user, true);
  };

  const applyActive = async (user, activo) => {
    setConfirmLoading(true);
    try {
      await adminService.cambiarActivoUsuario(user.id, activo);
      showToast("success", `${fullName(user)} ${activo ? "reactivó" : "desactivó"} su acceso.`);
      setConfirmTarget(null);
      onReload();
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setConfirmLoading(false);
    }
  };

  const openReset = (user) => {
    setResetTarget(user);
    setResetForm({ password: "", repeat: "" });
    setResetError(null);
  };

  const handleReset = async (event) => {
    event.preventDefault();
    if (resetForm.password.length < 8) {
      setResetError({ message: "La nueva contraseña debe tener al menos 8 caracteres." });
      return;
    }
    if (resetForm.password !== resetForm.repeat) {
      setResetError({ message: "Las contraseñas no coinciden." });
      return;
    }
    setResetLoading(true);
    setResetError(null);
    try {
      await adminService.resetPassword(resetTarget.id, resetForm.password);
      showToast("success", `Contraseña de ${fullName(resetTarget)} actualizada.`);
      setResetTarget(null);
    } catch (error) {
      setResetError(getApiError(error));
    } finally {
      setResetLoading(false);
    }
  };

  const availableSubjects = useMemo(() => {
    const term = subjectSearch.trim().toLowerCase();
    return materias.filter((materia) => {
      const selectable = materia.activa || subjectIds.includes(materia.id);
      if (!selectable) return false;
      return !term || materia.nombre.toLowerCase().includes(term);
    });
  }, [materias, subjectSearch, subjectIds]);

  const openSubjects = (user) => {
    const profile = findDocenteProfile(user);
    if (!profile) {
      showToast("error", "No se encontró el perfil docente de esta cuenta.");
      return;
    }
    setSubjectsTarget({ user, profile });
    setSubjectIds((profile.materias || []).map((materia) => materia.id));
    setSubjectSearch("");
    setSubjectsError(null);
  };

  const toggleSubject = (materiaId) => {
    setSubjectIds((prev) =>
      prev.includes(materiaId) ? prev.filter((id) => id !== materiaId) : [...prev, materiaId]
    );
    if (subjectsError) setSubjectsError(null);
  };

  const handleSaveSubjects = async (event) => {
    event.preventDefault();
    setSubjectsSaving(true);
    setSubjectsError(null);
    try {
      await adminService.habilitarMateriasDocente(subjectsTarget.profile.id, subjectIds);
      showToast(
        "success",
        subjectIds.length
          ? `${subjectIds.length} materia(s) habilitadas para ${fullName(subjectsTarget.user)}.`
          : `Se quitaron todas las materias a ${fullName(subjectsTarget.user)}.`
      );
      setSubjectsTarget(null);
      onReload();
    } catch (error) {
      setSubjectsError(getApiError(error));
    } finally {
      setSubjectsSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Directorio de usuarios</h2>
          <p className="page__sub">
            {users.length} cuentas registradas · {activos} con acceso activo
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          <Plus size={17} /> Nuevo usuario
        </button>
      </div>

      <section className="card">
        <div className="toolbar">
          <label className="search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Buscar por nombre, correo o DNI…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <div className="toolbar__group">
            <select className="select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="TODOS">Todos los roles</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVOS">Solo activos</option>
              <option value="INACTIVOS">Solo inactivos</option>
            </select>
          </div>
        </div>

        {filtered.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>DNI</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th className="table__actions-col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const isSelf = session?.id === user.id;
                  const docenteProfile = user.rol === "DOCENTE" ? findDocenteProfile(user) : null;
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="table__user">
                          <span className="avatar avatar--sm">{initials(user.nombres, user.apellidos)}</span>
                          <span>
                            <strong>
                              {fullName(user)} {isSelf ? <em className="tag-self">Tú</em> : null}
                            </strong>
                            <small>
                              {user.email}
                              {docenteProfile
                                ? ` · ${docenteProfile.materias?.length || 0} materias`
                                : ""}
                            </small>
                          </span>
                        </div>
                      </td>
                      <td className="mono">{user.dni}</td>
                      <td>
                        <span className={`badge ${ROLE_CLASS[user.rol] || "badge--neutral"}`}>
                          {ROLE_SHORT[user.rol] || user.rol}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${user.activo ? "badge--success" : "badge--danger"}`}>
                          {user.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="muted">{formatDate(user.createdAt)}</td>
                      <td>
                        <div className="table__actions">
                          {docenteProfile ? (
                            <button
                              type="button"
                              className="icon-btn icon-btn--soft"
                              onClick={() => openSubjects(user)}
                              title="Asignar materias"
                            >
                              <LibraryBig size={16} />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className={`icon-btn icon-btn--soft ${user.activo ? "icon-btn--danger" : "icon-btn--success"}`}
                            onClick={() => toggleActive(user)}
                            disabled={isSelf && user.activo}
                            title={
                              isSelf && user.activo
                                ? "No puedes desactivar tu propia cuenta"
                                : user.activo
                                  ? "Desactivar acceso"
                                  : "Reactivar acceso"
                            }
                          >
                            <Power size={16} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn icon-btn--soft"
                            onClick={() => openReset(user)}
                            title="Restablecer contraseña"
                          >
                            <KeyRound size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <span className="empty__icon">
              <Users size={22} />
            </span>
            <p className="empty__title">Sin resultados</p>
            <p className="empty__text">
              {users.length
                ? "Ningún usuario coincide con los filtros seleccionados."
                : "Crea la primera cuenta para comenzar."}
            </p>
            {!users.length ? (
              <button type="button" className="btn btn--soft btn--sm" onClick={openCreate}>
                <UserPlus size={16} /> Crear usuario
              </button>
            ) : null}
          </div>
        )}
      </section>

      <Modal
        open={createOpen}
        onClose={() => {
          if (!submitting) setCreateOpen(false);
        }}
        title="Nuevo usuario"
        subtitle="Crea una cuenta de acceso para el personal del colegio."
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setCreateOpen(false)} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" form="create-user-form" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Creando…" : "Crear cuenta"}
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

        <form id="create-user-form" className="form" onSubmit={handleCreate}>
          <div className="role-selector">
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role}
                type="button"
                className={`role-option ${form.rol === role ? "role-option--active" : ""}`}
                onClick={() => setForm((prev) => ({ ...prev, rol: role }))}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>

          <div className="form-grid form-grid--2">
            <label className="field field--plain">
              <span className="field__label">Nombres</span>
              <input
                className="input"
                name="nombres"
                value={form.nombres}
                onChange={handleFormChange}
                placeholder="Ana María"
                disabled={submitting}
              />
            </label>
            <label className="field field--plain">
              <span className="field__label">Apellidos</span>
              <input
                className="input"
                name="apellidos"
                value={form.apellidos}
                onChange={handleFormChange}
                placeholder="Ruiz Pérez"
                disabled={submitting}
              />
            </label>
          </div>

          <div className="form-grid form-grid--2">
            <label className="field field--plain">
              <span className="field__label">Correo institucional</span>
              <input
                className="input"
                type="email"
                name="email"
                value={form.email}
                onChange={handleFormChange}
                placeholder="nombre@educa360.pe"
                disabled={submitting}
              />
            </label>
            <label className="field field--plain">
              <span className="field__label">DNI</span>
              <input
                className="input"
                name="dni"
                value={form.dni}
                onChange={handleFormChange}
                placeholder="8 dígitos"
                maxLength={8}
                inputMode="numeric"
                disabled={submitting}
              />
            </label>
          </div>

          <div className="form-grid form-grid--2">
            <label className="field field--plain">
              <span className="field__label">Contraseña temporal</span>
              <input
                className="input"
                type="password"
                name="password"
                value={form.password}
                onChange={handleFormChange}
                placeholder="Mínimo 8 caracteres"
                disabled={submitting}
              />
            </label>
            <label className="field field--plain">
              <span className="field__label">Teléfono (opcional)</span>
              <input
                className="input"
                name="telefono"
                value={form.telefono}
                onChange={handleFormChange}
                placeholder="+51999999999"
                disabled={submitting}
              />
            </label>
          </div>

          {form.rol === "DOCENTE" ? (
            <label className="field field--plain">
              <span className="field__label">Título profesional (opcional)</span>
              <input
                className="input"
                name="titulo"
                value={form.titulo}
                onChange={handleFormChange}
                placeholder="Licenciado en Educación"
                disabled={submitting}
              />
            </label>
          ) : null}

          <p className="hint">
            El rol es inmutable. Las materias del docente se habilitan después desde la sección Cursos.
          </p>
        </form>
      </Modal>

      <Modal
        open={Boolean(resetTarget)}
        onClose={() => {
          if (!resetLoading) setResetTarget(null);
        }}
        title="Restablecer contraseña"
        subtitle={resetTarget ? `Cuenta de ${fullName(resetTarget)}` : ""}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setResetTarget(null)} disabled={resetLoading}>
              Cancelar
            </button>
            <button type="submit" form="reset-password-form" className="btn btn--primary" disabled={resetLoading}>
              {resetLoading ? "Guardando…" : "Actualizar contraseña"}
            </button>
          </>
        }
      >
        {resetError ? (
          <div className="alert alert--error" role="alert">
            <CircleX size={18} />
            <p>{resetError.message}</p>
          </div>
        ) : null}
        <form id="reset-password-form" className="form" onSubmit={handleReset}>
          <label className="field field--plain">
            <span className="field__label">Nueva contraseña</span>
            <input
              className="input"
              type="password"
              value={resetForm.password}
              onChange={(event) => setResetForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="Mínimo 8 caracteres"
              disabled={resetLoading}
            />
          </label>
          <label className="field field--plain">
            <span className="field__label">Repetir contraseña</span>
            <input
              className="input"
              type="password"
              value={resetForm.repeat}
              onChange={(event) => setResetForm((prev) => ({ ...prev, repeat: event.target.value }))}
              placeholder="Repite la contraseña"
              disabled={resetLoading}
            />
          </label>
          <p className="hint">Al ser una API stateless, los tokens emitidos siguen vigentes hasta su expiración.</p>
        </form>
      </Modal>

      <Modal
        open={Boolean(subjectsTarget)}
        onClose={() => {
          if (!subjectsSaving) setSubjectsTarget(null);
        }}
        title="Materias del docente"
        subtitle={
          subjectsTarget
            ? `Habilita las materias que ${fullName(subjectsTarget.user)} puede enseñar.`
            : ""
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setSubjectsTarget(null)}
              disabled={subjectsSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="subjects-form"
              className="btn btn--primary"
              disabled={subjectsSaving}
            >
              {subjectsSaving ? "Guardando…" : `Guardar (${subjectIds.length})`}
            </button>
          </>
        }
      >
        {subjectsError ? (
          <div className="alert alert--error" role="alert">
            <CircleX size={18} />
            <p>{subjectsError.message}</p>
          </div>
        ) : null}

        <form id="subjects-form" className="form" onSubmit={handleSaveSubjects}>
          <label className="search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Buscar materia…"
              value={subjectSearch}
              onChange={(event) => setSubjectSearch(event.target.value)}
              disabled={subjectsSaving}
            />
          </label>

          {availableSubjects.length ? (
            <div className="subject-picker">
              {availableSubjects.map((materia) => {
                const checked = subjectIds.includes(materia.id);
                const blocked = !materia.activa && !checked;
                return (
                  <label
                    key={materia.id}
                    className={`picker-option ${checked ? "picker-option--selected" : ""} ${
                      blocked ? "picker-option--disabled" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSubject(materia.id)}
                      disabled={subjectsSaving || blocked}
                    />
                    <span>
                      <strong>{materia.nombre}</strong>
                      <small>{materia.descripcion || "Sin descripción registrada"}</small>
                    </span>
                    {!materia.activa ? <span className="badge badge--neutral">Archivada</span> : null}
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="empty empty--compact">
              <span className="empty__icon">
                <LibraryBig size={20} />
              </span>
              <p className="empty__title">Sin materias disponibles</p>
              <p className="empty__text">
                {materias.length
                  ? "Ninguna materia coincide con la búsqueda."
                  : "Crea materias en el catálogo antes de asignarlas."}
              </p>
            </div>
          )}

          <div className="info-strip info-strip--soft">
            <LibraryBig size={16} />
            <p>
              Se reemplaza el conjunto completo de habilitaciones. Un docente necesita al menos una
              materia habilitada para que puedas crearle un curso.
            </p>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title="Desactivar acceso"
        message={
          confirmTarget
            ? `La cuenta de ${fullName(confirmTarget)} dejará de poder iniciar sesión de inmediato. Sus datos e historial se conservan.`
            : ""
        }
        confirmLabel="Desactivar cuenta"
        danger
        loading={confirmLoading}
        onConfirm={() => applyActive(confirmTarget, false)}
        onClose={() => setConfirmTarget(null)}
      />
    </div>
  );
}
