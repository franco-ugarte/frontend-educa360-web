import { useMemo, useState } from "react";
import {
  CircleX,
  IdCard,
  Mail,
  Phone,
  Plus,
  Search,
  Unlink,
  UserPlus,
  Users,
} from "lucide-react";
import { getApiError, secretariaService } from "../../../services/api";
import { ConfirmDialog, Modal } from "../../../components/ui/Modal";
import { PARENTESCO_LABELS, fullName, initials } from "../../../utils/format";

const PARENTESCOS = ["PADRE", "MADRE", "TUTOR", "HERMANO", "OTRO"];

const EMPTY_APODERADO = { email: "", password: "", nombres: "", apellidos: "", telefono: "" };
const EMPTY_ESTUDIANTE = { email: "", password: "", nombres: "", apellidos: "", dni: "", fechaNacimiento: "" };

const today = new Date().toISOString().slice(0, 10);

export default function FamiliesView({ data, onReload, showToast }) {
  const [search, setSearch] = useState("");
  const [familyOpen, setFamilyOpen] = useState(false);
  const [lookupDni, setLookupDni] = useState("");
  const [lookup, setLookup] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [apoderadoForm, setApoderadoForm] = useState(EMPTY_APODERADO);
  const [estudianteForm, setEstudianteForm] = useState(EMPTY_ESTUDIANTE);
  const [parentesco, setParentesco] = useState("MADRE");
  const [responsablePrincipal, setResponsablePrincipal] = useState(true);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [linkTarget, setLinkTarget] = useState(null);
  const [linkForm, setLinkForm] = useState({ estudianteId: "", parentesco: "MADRE", responsablePrincipal: true });
  const [linkError, setLinkError] = useState(null);
  const [linkSaving, setLinkSaving] = useState(false);

  const [unlinkTarget, setUnlinkTarget] = useState(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);

  const apoderados = data.apoderados || [];
  const estudiantes = data.estudiantes || [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return apoderados
      .filter((apoderado) => {
        if (!term) return true;
        return [
          apoderado.nombres,
          apoderado.apellidos,
          apoderado.email,
          apoderado.dni,
          ...(apoderado.hijos || []).map((hijo) => hijo.nombres),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .slice()
      .sort((a, b) => String(a.apellidos).localeCompare(String(b.apellidos)));
  }, [apoderados, search]);

  const openFamily = () => {
    setLookupDni("");
    setLookup(null);
    setLookupError(null);
    setApoderadoForm(EMPTY_APODERADO);
    setEstudianteForm(EMPTY_ESTUDIANTE);
    setParentesco("MADRE");
    setResponsablePrincipal(true);
    setSaveError(null);
    setFamilyOpen(true);
  };

  const handleLookup = async () => {
    if (!/^\d{8}$/.test(lookupDni.trim())) {
      setLookupError({ message: "Ingresa un DNI de exactamente 8 dígitos." });
      return;
    }
    setLookupLoading(true);
    setLookupError(null);
    setLookup(null);
    try {
      const result = await secretariaService.buscarApoderadoPorDni(lookupDni.trim());
      setLookup(result);
      if (result.existe && result.apoderado) {
        setApoderadoForm((prev) => ({
          ...prev,
          nombres: result.apoderado.nombres || "",
          apellidos: result.apoderado.apellidos || "",
          email: result.apoderado.email || "",
          telefono: result.apoderado.telefonos?.[0] || "",
        }));
      } else {
        setApoderadoForm(EMPTY_APODERADO);
      }
    } catch (error) {
      setLookupError(getApiError(error));
    } finally {
      setLookupLoading(false);
    }
  };

  const handleFamilySubmit = async (event) => {
    event.preventDefault();
    if (!lookup) {
      setSaveError({ message: "Primero busca el DNI del apoderado para continuar." });
      return;
    }
    if (!estudianteForm.email.trim() || !estudianteForm.nombres.trim() || !estudianteForm.apellidos.trim()) {
      setSaveError({ message: "Completa los datos de la cuenta del estudiante." });
      return;
    }
    if (!/^\d{8}$/.test(estudianteForm.dni.trim())) {
      setSaveError({ message: "El DNI del estudiante debe tener exactamente 8 dígitos." });
      return;
    }
    if (estudianteForm.password.length < 8) {
      setSaveError({ message: "La contraseña del estudiante debe tener al menos 8 caracteres." });
      return;
    }
    if (!estudianteForm.fechaNacimiento) {
      setSaveError({ message: "La fecha de nacimiento del estudiante es obligatoria." });
      return;
    }

    if (!lookup.existe) {
      if (!apoderadoForm.email.trim() || !apoderadoForm.nombres.trim() || !apoderadoForm.apellidos.trim()) {
        setSaveError({ message: "Completa los datos de la cuenta del apoderado." });
        return;
      }
      if (apoderadoForm.password.length < 8) {
        setSaveError({ message: "La contraseña del apoderado debe tener al menos 8 caracteres." });
        return;
      }
      if (apoderadoForm.telefono.trim() && !/^\+?\d{7,15}$/.test(apoderadoForm.telefono.trim())) {
        setSaveError({ message: "El teléfono debe tener entre 7 y 15 dígitos, opcionalmente con +." });
        return;
      }
    }

    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        apoderadoId: lookup.existe ? lookup.apoderado.id : null,
        nuevoApoderado: lookup.existe
          ? null
          : {
              email: apoderadoForm.email.trim(),
              password: apoderadoForm.password,
              nombres: apoderadoForm.nombres.trim(),
              apellidos: apoderadoForm.apellidos.trim(),
              dni: lookupDni.trim(),
              telefonos: apoderadoForm.telefono.trim() ? [apoderadoForm.telefono.trim()] : [],
            },
        estudiante: {
          usuario: {
            email: estudianteForm.email.trim(),
            password: estudianteForm.password,
            nombres: estudianteForm.nombres.trim(),
            apellidos: estudianteForm.apellidos.trim(),
            dni: estudianteForm.dni.trim(),
          },
          fechaNacimiento: estudianteForm.fechaNacimiento,
        },
        parentesco,
        responsablePrincipal,
      };
      const result = await secretariaService.crearFamilia(payload);
      showToast(
        "success",
        `${result.estudianteNombres} quedó vinculado a ${result.apoderadoNombres}${
          result.apoderadoCreado ? " (apoderado creado)" : " (apoderado existente)"
        }.`
      );
      setFamilyOpen(false);
      onReload();
    } catch (error) {
      setSaveError(getApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const openLink = (apoderado) => {
    setLinkTarget(apoderado);
    setLinkForm({ estudianteId: "", parentesco: "MADRE", responsablePrincipal: true });
    setLinkError(null);
  };

  const availableStudents = useMemo(() => {
    if (!linkTarget) return [];
    const linked = new Set((linkTarget.hijos || []).map((hijo) => String(hijo.estudianteId)));
    return estudiantes
      .filter((estudiante) => !linked.has(String(estudiante.id)))
      .slice()
      .sort((a, b) => String(a.apellidos).localeCompare(String(b.apellidos)));
  }, [estudiantes, linkTarget]);

  const handleLink = async (event) => {
    event.preventDefault();
    if (!linkForm.estudianteId) {
      setLinkError({ message: "Selecciona al estudiante que deseas vincular." });
      return;
    }
    setLinkSaving(true);
    setLinkError(null);
    try {
      await secretariaService.vincularRepresentado(linkTarget.id, {
        estudianteId: Number(linkForm.estudianteId),
        parentesco: linkForm.parentesco,
        responsablePrincipal: linkForm.responsablePrincipal,
      });
      showToast("success", "Representado vinculado correctamente.");
      setLinkTarget(null);
      onReload();
    } catch (error) {
      setLinkError(getApiError(error));
    } finally {
      setLinkSaving(false);
    }
  };

  const handleUnlink = async () => {
    setUnlinkLoading(true);
    try {
      await secretariaService.desvincularRepresentado(unlinkTarget.apoderado.id, unlinkTarget.hijo.estudianteId);
      showToast("success", `Vínculo con ${unlinkTarget.hijo.nombres} dado de baja.`);
      setUnlinkTarget(null);
      onReload();
    } catch (error) {
      showToast("error", getApiError(error).message);
    } finally {
      setUnlinkLoading(false);
    }
  };

  const apoderadoExiste = lookup?.existe;
  const apoderadoEncontrado = lookup?.apoderado;

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Familias y apoderados</h2>
          <p className="page__sub">
            {apoderados.length} familias registradas · {apoderados.reduce((total, item) => total + (item.hijos?.length || 0), 0)} vínculos activos.
          </p>
        </div>
        <div className="page__actions">
          <button type="button" className="btn btn--primary" onClick={openFamily}>
            <Plus size={17} /> Registrar familia
          </button>
        </div>
      </div>

      <div className="toolbar">
        <label className="search">
          <Search size={17} />
          <input
            type="search"
            placeholder="Buscar apoderado por nombre, DNI, email o hijo…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      <section className="card">
        <div className="card__body card__body--flush">
          {filtered.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Apoderado</th>
                    <th>DNI</th>
                    <th>Contacto</th>
                    <th>Representados</th>
                    <th>Cuenta</th>
                    <th className="table__actions-col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((apoderado) => (
                    <tr key={apoderado.id}>
                      <td>
                        <div className="table__user">
                          <span className="avatar avatar--sm">{initials(apoderado.nombres, apoderado.apellidos)}</span>
                          <span>
                            <strong>{fullName(apoderado)}</strong>
                            <small>{apoderado.email}</small>
                          </span>
                        </div>
                      </td>
                      <td className="mono">{apoderado.dni}</td>
                      <td>
                        <div className="family-contact">
                          {apoderado.telefonos?.length ? (
                            apoderado.telefonos.map((telefono) => (
                              <span key={telefono}>
                                <Phone size={13} /> {telefono}
                              </span>
                            ))
                          ) : (
                            <span className="muted">Sin teléfono</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {apoderado.hijos?.length ? (
                          <div className="family-children">
                            {apoderado.hijos.map((hijo) => (
                              <div key={hijo.estudianteId} className="family-child">
                                <span>
                                  <strong>{hijo.nombres}</strong>
                                  <small>
                                    {PARENTESCO_LABELS[hijo.parentesco] || hijo.parentesco}
                                    {hijo.responsablePrincipal ? " · Principal" : ""}
                                  </small>
                                </span>
                                <button
                                  type="button"
                                  className="icon-btn icon-btn--soft icon-btn--danger icon-btn--xs"
                                  title="Desvincular representado"
                                  onClick={() => setUnlinkTarget({ apoderado, hijo })}
                                >
                                  <Unlink size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="muted">Sin representados</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${apoderado.activo ? "badge--success" : "badge--danger"}`}>
                          {apoderado.activo ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td>
                        <div className="table__actions">
                          <button
                            type="button"
                            className="icon-btn icon-btn--soft"
                            onClick={() => openLink(apoderado)}
                            title="Vincular representado"
                          >
                            <UserPlus size={16} />
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
                {apoderados.length ? <Search size={26} /> : <Users size={26} />}
              </span>
              <p className="empty__title">{apoderados.length ? "Sin coincidencias" : "Sin familias registradas"}</p>
              <p className="empty__text">
                {apoderados.length
                  ? "Ajusta la búsqueda para encontrar al apoderado."
                  : "Registra una familia para crear al apoderado, al estudiante y su vínculo en una sola operación."}
              </p>
              {!apoderados.length ? (
                <button type="button" className="btn btn--soft btn--sm" onClick={openFamily}>
                  <Plus size={15} /> Registrar familia
                </button>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <Modal
        open={familyOpen}
        onClose={() => {
          if (!saving) setFamilyOpen(false);
        }}
        title="Registrar familia"
        subtitle="Primero busca al apoderado por DNI. Si no existe, se creará junto con el estudiante."
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setFamilyOpen(false)} disabled={saving}>
              Cancelar
            </button>
            <button
              type="submit"
              form="family-create-form"
              className="btn btn--primary"
              disabled={saving || !lookup}
            >
              {saving ? "Registrando…" : "Registrar familia"}
            </button>
          </>
        }
      >
        <form id="family-create-form" className="form" onSubmit={handleFamilySubmit}>
          <div className="family-lookup">
            <label className="field field--plain">
              <span className="field__label">DNI del apoderado</span>
              <div className="family-lookup__row">
                <input
                  className="input"
                  value={lookupDni}
                  onChange={(event) => {
                    setLookupDni(event.target.value.replace(/\D/g, "").slice(0, 8));
                    setLookup(null);
                    setLookupError(null);
                  }}
                  placeholder="12345678"
                  inputMode="numeric"
                  maxLength={8}
                  disabled={saving || lookupLoading}
                />
                <button type="button" className="btn btn--soft" onClick={handleLookup} disabled={saving || lookupLoading}>
                  {lookupLoading ? "Buscando…" : "Buscar apoderado"}
                </button>
              </div>
            </label>
            <p className="hint">La búsqueda es exacta por DNI. No crea registros por sí sola.</p>
          </div>

          {lookupError ? (
            <div className="alert alert--error" role="alert">
              <CircleX size={18} />
              <p>{lookupError.message}</p>
            </div>
          ) : null}

          {apoderadoExiste && apoderadoEncontrado ? (
            <div className="family-found">
              <span className="avatar avatar--sm">{initials(apoderadoEncontrado.nombres, apoderadoEncontrado.apellidos)}</span>
              <div>
                <strong>{fullName(apoderadoEncontrado)}</strong>
                <small>
                  <IdCard size={13} /> DNI {apoderadoEncontrado.dni} · <Mail size={13} /> {apoderadoEncontrado.email}
                </small>
                <small>
                  {apoderadoEncontrado.hijos?.length
                    ? `${apoderadoEncontrado.hijos.length} representado(s) activo(s)`
                    : "Sin representados todavía"}
                </small>
              </div>
              <span className="badge badge--success">Apoderado existente</span>
            </div>
          ) : null}

          {lookup && !lookup.existe ? (
            <div className="family-section">
              <div className="family-section__head">
                <h4>
                  <Users size={16} /> Cuenta del nuevo apoderado
                </h4>
                <small>DNI {lookupDni}</small>
              </div>
              <div className="form-grid form-grid--2">
                <label className="field field--plain">
                  <span className="field__label">Nombres</span>
                  <input
                    className="input"
                    value={apoderadoForm.nombres}
                    onChange={(event) => setApoderadoForm((prev) => ({ ...prev, nombres: event.target.value }))}
                    disabled={saving}
                    required
                  />
                </label>
                <label className="field field--plain">
                  <span className="field__label">Apellidos</span>
                  <input
                    className="input"
                    value={apoderadoForm.apellidos}
                    onChange={(event) => setApoderadoForm((prev) => ({ ...prev, apellidos: event.target.value }))}
                    disabled={saving}
                    required
                  />
                </label>
              </div>
              <div className="form-grid form-grid--2">
                <label className="field field--plain">
                  <span className="field__label">Correo</span>
                  <input
                    className="input"
                    type="email"
                    value={apoderadoForm.email}
                    onChange={(event) => setApoderadoForm((prev) => ({ ...prev, email: event.target.value }))}
                    disabled={saving}
                    required
                  />
                </label>
                <label className="field field--plain">
                  <span className="field__label">Contraseña temporal</span>
                  <input
                    className="input"
                    type="password"
                    value={apoderadoForm.password}
                    onChange={(event) => setApoderadoForm((prev) => ({ ...prev, password: event.target.value }))}
                    minLength={8}
                    maxLength={72}
                    disabled={saving}
                    required
                  />
                </label>
              </div>
              <label className="field field--plain">
                <span className="field__label">Teléfono (opcional)</span>
                <input
                  className="input"
                  value={apoderadoForm.telefono}
                  onChange={(event) => setApoderadoForm((prev) => ({ ...prev, telefono: event.target.value }))}
                  placeholder="+51987654321"
                  inputMode="tel"
                  disabled={saving}
                />
              </label>
            </div>
          ) : null}

          <div className="family-section">
            <div className="family-section__head">
              <h4>
                <UserPlus size={16} /> Nuevo estudiante
              </h4>
              <small>La matrícula se registra después</small>
            </div>
            <div className="form-grid form-grid--2">
              <label className="field field--plain">
                <span className="field__label">Nombres</span>
                <input
                  className="input"
                  value={estudianteForm.nombres}
                  onChange={(event) => setEstudianteForm((prev) => ({ ...prev, nombres: event.target.value }))}
                  disabled={saving}
                  required
                />
              </label>
              <label className="field field--plain">
                <span className="field__label">Apellidos</span>
                <input
                  className="input"
                  value={estudianteForm.apellidos}
                  onChange={(event) => setEstudianteForm((prev) => ({ ...prev, apellidos: event.target.value }))}
                  disabled={saving}
                  required
                />
              </label>
            </div>
            <div className="form-grid form-grid--2">
              <label className="field field--plain">
                <span className="field__label">DNI del estudiante</span>
                <input
                  className="input"
                  value={estudianteForm.dni}
                  onChange={(event) =>
                    setEstudianteForm((prev) => ({ ...prev, dni: event.target.value.replace(/\D/g, "").slice(0, 8) }))
                  }
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
                  value={estudianteForm.fechaNacimiento}
                  max={today}
                  onChange={(event) => setEstudianteForm((prev) => ({ ...prev, fechaNacimiento: event.target.value }))}
                  disabled={saving}
                  required
                />
              </label>
            </div>
            <div className="form-grid form-grid--2">
              <label className="field field--plain">
                <span className="field__label">Correo del estudiante</span>
                <input
                  className="input"
                  type="email"
                  value={estudianteForm.email}
                  onChange={(event) => setEstudianteForm((prev) => ({ ...prev, email: event.target.value }))}
                  disabled={saving}
                  required
                />
              </label>
              <label className="field field--plain">
                <span className="field__label">Contraseña temporal</span>
                <input
                  className="input"
                  type="password"
                  value={estudianteForm.password}
                  onChange={(event) => setEstudianteForm((prev) => ({ ...prev, password: event.target.value }))}
                  minLength={8}
                  maxLength={72}
                  disabled={saving}
                  required
                />
              </label>
            </div>
          </div>

          <div className="form-grid form-grid--2">
            <label className="field field--plain">
              <span className="field__label">Parentesco</span>
              <select
                className="select"
                value={parentesco}
                onChange={(event) => setParentesco(event.target.value)}
                disabled={saving}
              >
                {PARENTESCOS.map((value) => (
                  <option key={value} value={value}>
                    {PARENTESCO_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox checkbox--card">
              <input
                type="checkbox"
                checked={responsablePrincipal}
                onChange={(event) => setResponsablePrincipal(event.target.checked)}
                disabled={saving}
              />
              <span>
                <strong>Responsable principal</strong>
                <small>Al marcarlo, el responsable anterior deja de serlo.</small>
              </span>
            </label>
          </div>

          {saveError ? (
            <div className="alert alert--error" role="alert">
              <CircleX size={18} />
              <div>
                <p>{saveError.message}</p>
                {saveError.fields?.length ? (
                  <ul className="alert__list">
                    {saveError.fields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={Boolean(linkTarget)}
        onClose={() => {
          if (!linkSaving) setLinkTarget(null);
        }}
        title="Vincular representado"
        subtitle={linkTarget ? `Apoderado: ${fullName(linkTarget)}` : ""}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setLinkTarget(null)} disabled={linkSaving}>
              Cancelar
            </button>
            <button type="submit" form="link-student-form" className="btn btn--primary" disabled={linkSaving}>
              {linkSaving ? "Vinculando…" : "Vincular"}
            </button>
          </>
        }
      >
        {linkError ? (
          <div className="alert alert--error" role="alert">
            <CircleX size={18} />
            <p>{linkError.message}</p>
          </div>
        ) : null}

        <form id="link-student-form" className="form" onSubmit={handleLink}>
          <label className="field field--plain">
            <span className="field__label">Estudiante</span>
            <select
              className="select"
              value={linkForm.estudianteId}
              onChange={(event) => setLinkForm((prev) => ({ ...prev, estudianteId: event.target.value }))}
              disabled={linkSaving || !availableStudents.length}
            >
              <option value="">
                {availableStudents.length ? "Selecciona un estudiante" : "Todos los estudiantes ya están vinculados"}
              </option>
              {availableStudents.map((estudiante) => (
                <option key={estudiante.id} value={estudiante.id}>
                  {fullName(estudiante)} · DNI {estudiante.dni}
                  {estudiante.seccionEtiqueta ? ` · ${estudiante.seccionEtiqueta}` : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="form-grid form-grid--2">
            <label className="field field--plain">
              <span className="field__label">Parentesco</span>
              <select
                className="select"
                value={linkForm.parentesco}
                onChange={(event) => setLinkForm((prev) => ({ ...prev, parentesco: event.target.value }))}
                disabled={linkSaving}
              >
                {PARENTESCOS.map((value) => (
                  <option key={value} value={value}>
                    {PARENTESCO_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox checkbox--card">
              <input
                type="checkbox"
                checked={linkForm.responsablePrincipal}
                onChange={(event) =>
                  setLinkForm((prev) => ({ ...prev, responsablePrincipal: event.target.checked }))
                }
                disabled={linkSaving}
              />
              <span>
                <strong>Responsable principal</strong>
                <small>Solo uno por estudiante.</small>
              </span>
            </label>
          </div>

          <div className="info-strip info-strip--soft">
            <Users size={16} />
            <p>
              La vinculación no crea cuentas nuevas. Si el estudiante aún no tiene matrícula, se mostrará sin sección
              hasta que la registres.
            </p>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(unlinkTarget)}
        title="Desvincular representado"
        danger
        message={
          unlinkTarget
            ? `El apoderado dejará de ver a ${unlinkTarget.hijo.nombres}. El vínculo se da de baja lógicamente y se conserva el historial.`
            : ""
        }
        confirmLabel="Desvincular"
        loading={unlinkLoading}
        onConfirm={handleUnlink}
        onClose={() => setUnlinkTarget(null)}
      />
    </div>
  );
}
