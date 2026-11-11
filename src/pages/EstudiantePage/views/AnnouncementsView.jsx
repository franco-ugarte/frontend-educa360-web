import { useMemo, useState } from "react";
import { Megaphone, School, Users } from "lucide-react";
import { formatDateTime, initials } from "../../../utils/format";
import { announcementScope, sortAnnouncements } from "../estudianteUtils";

const FILTERS = [
  { key: "TODOS", label: "Todos" },
  { key: "GENERALES", label: "Generales" },
  { key: "SECCION", label: "Mi sección" },
];

export default function AnnouncementsView({ comunicados = [] }) {
  const [filter, setFilter] = useState("TODOS");

  const sorted = useMemo(() => sortAnnouncements(comunicados), [comunicados]);
  const filtered = useMemo(() => {
    if (filter === "GENERALES") return sorted.filter((item) => !item.seccionEtiqueta);
    if (filter === "SECCION") return sorted.filter((item) => Boolean(item.seccionEtiqueta));
    return sorted;
  }, [sorted, filter]);

  const generales = sorted.filter((item) => !item.seccionEtiqueta).length;
  const seccion = sorted.length - generales;

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Comunicados</h2>
          <p className="page__sub">
            Avisos generales de la institución y de tu sección. {generales} general(es) y {seccion} de sección.
          </p>
        </div>
        <div className="segmented">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`segmented__item ${filter === item.key ? "segmented__item--active" : ""}`}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <section className="card estudiante-announcement-list">
          {filtered.map((comunicado) => (
            <article key={comunicado.id} className="estudiante-announcement">
              <span className="estudiante-announcement__icon">
                <Megaphone size={18} />
              </span>
              <div className="estudiante-announcement__body">
                <div className="estudiante-announcement__head">
                  <span className="estudiante-announcement__author">
                    <span className="avatar avatar--sm">
                      {initials(
                        comunicado.autorNombre?.split(" ")[0],
                        comunicado.autorNombre?.split(" ").slice(1).join(" ")
                      )}
                    </span>
                    <span>
                      <strong>{comunicado.autorNombre || "Institución"}</strong>
                      <small>{formatDateTime(comunicado.createdAt)}</small>
                    </span>
                  </span>
                  <span
                    className={`badge ${comunicado.seccionEtiqueta ? "badge--secondary" : "badge--info"}`}
                  >
                    {comunicado.seccionEtiqueta ? <Users size={12} /> : <School size={12} />}
                    {announcementScope(comunicado)}
                  </span>
                </div>
                <p className="estudiante-announcement__content">{comunicado.contenido}</p>
                <div className="estudiante-announcement__foot">
                  <span>{comunicado.anioNombre || "Año escolar"}</span>
                  {comunicado.updatedAt && comunicado.updatedAt !== comunicado.createdAt ? (
                    <span>Editado · {formatDateTime(comunicado.updatedAt)}</span>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <Megaphone size={26} />
            </span>
            <p className="empty__title">
              {filter === "TODOS" ? "Sin comunicados por ahora" : "Sin comunicados en este filtro"}
            </p>
            <p className="empty__text">
              {filter === "TODOS"
                ? "Cuando la institución o tu sección publiquen un aviso, aparecerá aquí."
                : "Prueba con otro filtro para ver el resto de avisos."}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
