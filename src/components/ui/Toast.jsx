import { CircleCheck, CircleX, Info, X } from "lucide-react";

const ICONS = {
  success: CircleCheck,
  error: CircleX,
  info: Info,
};

export default function Toast({ toast, onClose }) {
  if (!toast) return null;
  const Icon = ICONS[toast.type] || Info;

  return (
    <div className={`toast toast--${toast.type || "info"}`} role="status">
      <span className="toast__icon">
        <Icon size={18} />
      </span>
      <p className="toast__message">{toast.message}</p>
      <button type="button" className="toast__close" onClick={onClose} aria-label="Cerrar aviso">
        <X size={15} />
      </button>
    </div>
  );
}
