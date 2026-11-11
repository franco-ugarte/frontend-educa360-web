import { useState } from "react";
import {
  CalendarDays,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Paperclip,
  Presentation,
  RefreshCw,
  Video,
} from "lucide-react";
import { estudianteService, getApiError } from "../../../services/api";
import { formatBytes, formatDate } from "../../../utils/format";
import { courseLabel } from "../estudianteUtils";

function materialVisual(mimeType) {
  const mime = String(mimeType || "");
  if (mime.includes("pdf") || mime.includes("word")) {
    return { icon: FileText, tone: "danger" };
  }
  if (mime.includes("spreadsheet") || mime.includes("excel")) {
    return { icon: FileSpreadsheet, tone: "success" };
  }
  if (mime.includes("presentation") || mime.includes("powerpoint")) {
    return { icon: Presentation, tone: "accent" };
  }
  if (mime.startsWith("image/")) {
    return { icon: ImageIcon, tone: "secondary" };
  }
  if (mime.startsWith("video/")) {
    return { icon: Video, tone: "primary" };
  }
  return { icon: FileText, tone: "neutral" };
}

export default function MaterialsView({
  cursos,
  materialesPorCurso,
  initialCursoId,
  onReload,
  showToast,
}) {
  const [cursoId, setCursoId] = useState(String(initialCursoId || cursos[0]?.id || ""));
  const [downloadBusy, setDownloadBusy] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const selectedCurso = cursos.find((curso) => String(curso.id) === String(cursoId)) || null;
  const materiales = materialesPorCurso[cursoId] || [];
  const totalMateriales = Object.values(materialesPorCurso || {}).reduce(
    (total, list) => total + (list?.length || 0),
    0
  );

  const handleRefresh = () => {
    if (!onReload) return;
    setRefreshing(true);
    Promise.resolve(onReload()).finally(() => setRefreshing(false));
  };

  const downloadMaterial = async (material) => {
    setDownloadBusy(material.id);
    try {
      const data = await estudianteService.urlDescargaMaterial(material.id);
      if (!data?.url) {
        showToast?.("error", "El servidor no devolvió una URL de descarga.");
        return;
      }
      const link = document.createElement("a");
      link.href = data.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = material.nombreOriginal || "";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      showToast?.("error", getApiError(error).message);
    } finally {
      setDownloadBusy(null);
    }
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Materiales de clase</h2>
          <p className="page__sub">
            {selectedCurso
              ? `${courseLabel(selectedCurso)} · ${materiales.length} material(es) disponible(s)`
              : "Selecciona un curso para revisar sus materiales."}
          </p>
        </div>
        <div className="page__actions">
          <select className="select" value={cursoId} onChange={(event) => setCursoId(event.target.value)}>
            {cursos.map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.materiaNombre} · {curso.seccionEtiqueta}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn--soft"
            onClick={handleRefresh}
            disabled={refreshing || !onReload}
          >
            <RefreshCw size={16} className={refreshing ? "spin" : ""} /> Actualizar
          </button>
        </div>
      </div>

      {!cursos.length ? (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <FolderOpen size={26} />
            </span>
            <p className="empty__title">Sin cursos disponibles</p>
            <p className="empty__text">
              Cuando tu matrícula esté registrada, verás aquí los materiales publicados por tus docentes.
            </p>
          </div>
        </section>
      ) : totalMateriales === 0 ? (
        <section className="card">
          <div className="empty empty--tall">
            <span className="empty__icon">
              <FolderOpen size={26} />
            </span>
            <p className="empty__title">Aún no hay materiales publicados</p>
            <p className="empty__text">
              Tus docentes todavía no comparten archivos en ninguno de tus cursos. Cuando lo hagan, podrás
              descargarlos desde aquí.
            </p>
            <button type="button" className="btn btn--soft btn--sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw size={15} className={refreshing ? "spin" : ""} /> Volver a consultar
            </button>
          </div>
        </section>
      ) : materiales.length ? (
        <section className="estudiante-material-grid">
          {materiales.map((material) => {
            const visual = materialVisual(material.mimeType);
            const Icon = visual.icon;
            return (
              <article key={material.id} className="estudiante-material-card">
                <div className="estudiante-material-card__head">
                  <span className={`estudiante-material-card__icon is-${visual.tone}`}>
                    <Icon size={22} />
                  </span>
                  <div className="estudiante-material-card__title">
                    <h3>{material.titulo}</h3>
                    <small>{material.descripcion || "Material compartido por tu docente."}</small>
                  </div>
                  <span className="badge badge--success">Publicado</span>
                </div>

                <div className="estudiante-material-card__meta">
                  <span>
                    <Paperclip size={14} />
                    <b>{material.nombreOriginal}</b>
                  </span>
                  <span>{formatBytes(material.tamanoBytes)}</span>
                  <span>
                    <CalendarDays size={14} /> {formatDate(material.fechaPublicacion || material.createdAt)}
                  </span>
                </div>

                <div className="estudiante-material-card__content">
                  {material.contenidoTitulo ? (
                    <>
                      <small>Contenido asociado</small>
                      <strong>{material.contenidoTitulo}</strong>
                    </>
                  ) : (
                    <span className="muted">Material general del curso.</span>
                  )}
                </div>

                <div className="estudiante-material-card__actions">
                  <span className="estudiante-material-card__course">{courseLabel(selectedCurso)}</span>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => downloadMaterial(material)}
                    disabled={downloadBusy === material.id}
                  >
                    <Download size={15} />
                    {downloadBusy === material.id ? "Abriendo…" : "Descargar"}
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
              <FolderOpen size={26} />
            </span>
            <p className="empty__title">Sin materiales en {selectedCurso?.materiaNombre}</p>
            <p className="empty__text">
              Este curso no tiene archivos publicados. Revisa los demás cursos o vuelve a consultar más tarde.
            </p>
            <button type="button" className="btn btn--soft btn--sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw size={15} className={refreshing ? "spin" : ""} /> Actualizar
            </button>
          </div>
        </section>
      )}

      <div className="info-strip info-strip--soft">
        <Paperclip size={16} />
        <p>
          Solo ves materiales <strong>publicados</strong> por tus docentes. La descarga usa una URL firmada temporal:
          si el enlace vence, vuelve a pulsar Descargar.
        </p>
      </div>
    </div>
  );
}
