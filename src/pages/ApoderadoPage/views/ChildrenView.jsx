import {
  BookOpen,
  ChevronRight,
  FileText,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  Mail,
  UserCheck,
  Users,
} from "lucide-react";
import {
  PARENTESCO_LABELS,
  SITUACION_CLASS,
  estadoLabel,
  initials,
} from "../../../utils/format";
import { hijoName } from "../apoderadoUtils";

export default function ChildrenView({ hijos = [], selectedHijoId, onSelect, onNavigate }) {
  const openChild = (hijo, view = "resumen") => {
    onSelect(hijo.estudianteId, view);
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Mis representados</h2>
          <p className="page__sub">
            {hijos.length} estudiante(s) activo(s) vinculados a tu cuenta. Elige uno para revisar su año
            escolar.
          </p>
        </div>
        <div className="page__actions">
          <span className="badge badge--success">
            <UserCheck size={13} /> {hijos.length} vínculo(s) activo(s)
          </span>
        </div>
      </div>

      {hijos.length ? (
        <section className="apoderado-children-grid">
          {hijos.map((hijo) => {
            const selected = String(hijo.estudianteId) === String(selectedHijoId);
            return (
              <article
                key={hijo.estudianteId}
                className={`apoderado-child-card ${selected ? "is-selected" : ""}`}
              >
                <div className="apoderado-child-card__head">
                  <span className="apoderado-child-card__avatar">{initials(hijo.nombres, hijo.apellidos)}</span>
                  <div className="apoderado-child-card__title">
                    <h3>{hijoName(hijo)}</h3>
                    <div className="apoderado-child-card__badges">
                      <span className="badge badge--secondary">
                        {PARENTESCO_LABELS[hijo.parentesco] || estadoLabel(hijo.parentesco) || "Apoderado"}
                      </span>
                      {hijo.responsablePrincipal ? (
                        <span className="badge badge--success">Responsable principal</span>
                      ) : null}
                      {selected ? <span className="badge badge--primary">Seleccionado</span> : null}
                    </div>
                  </div>
                </div>

                <div className="apoderado-child-card__meta">
                  <span>
                    <IdCard size={14} /> DNI {hijo.dni || "—"}
                  </span>
                  <span>
                    <Mail size={14} /> {hijo.email || "Sin correo"}
                  </span>
                  <span>
                    <GraduationCap size={14} />{" "}
                    {hijo.seccionEtiqueta ? `Sección ${hijo.seccionEtiqueta}` : "Sin matrícula"}
                  </span>
                  <span>
                    <Users size={14} /> {hijo.anioNombre || "Año escolar"}
                  </span>
                </div>

                <div className="apoderado-child-card__status">
                  <span className="apoderado-child-card__status-label">Situación</span>
                  <span
                    className={`badge ${SITUACION_CLASS[hijo.situacionFinal] || "badge--neutral"}`}
                  >
                    {hijo.situacionFinal ? estadoLabel(hijo.situacionFinal) : "Sin definir"}
                  </span>
                </div>

                <div className="apoderado-child-card__actions">
                  <button
                    type="button"
                    className="apoderado-action is-primary"
                    onClick={() => openChild(hijo, "resumen")}
                  >
                    <LayoutDashboard size={15} /> Ver resumen
                  </button>
                  <button
                    type="button"
                    className="apoderado-action is-secondary"
                    onClick={() => openChild(hijo, "cursos")}
                  >
                    <BookOpen size={15} /> Cursos
                  </button>
                  <button
                    type="button"
                    className="apoderado-action is-accent"
                    onClick={() => openChild(hijo, "boleta")}
                  >
                    <FileText size={15} /> Boleta
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <Users size={26} />
            </span>
            <p className="empty__title">Sin representados</p>
            <p className="empty__text">
              Cuando Secretaría vincule a tus hijos a tu cuenta, aparecerán en esta lista.
            </p>
          </div>
        </section>
      )}

      <div className="info-strip info-strip--soft">
        <UserCheck size={16} />
        <p>
          Solo ves a los estudiantes con vínculo <strong>activo</strong> y cuenta habilitada. La
          información de cada uno se consulta por separado.
        </p>
      </div>
    </div>
  );
}
