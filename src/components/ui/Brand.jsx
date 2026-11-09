import logo from "../../assets/logo.png";

export default function Brand({ compact = false, inverted = false }) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""} ${inverted ? "brand--inverted" : ""}`}>
      <span className="brand__mark">
        <img src={logo} alt="Educa360" />
      </span>
      <span className="brand__text">
        <strong>Educa360</strong>
        {!compact ? <small>Gestión académica</small> : null}
      </span>
    </div>
  );
}
