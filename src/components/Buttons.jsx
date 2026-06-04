export function PrimaryBtn({ onClick, color, children, disabled, style = {}, T }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding:"8px 14px", borderRadius:7, border:"none",
        background:color || T.accent, color:"#fff", fontSize:11,
        cursor:disabled ? "not-allowed" : "pointer", fontFamily:"inherit",
        letterSpacing:"0.07em", fontWeight:600, opacity:disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function GhostBtn({ onClick, children, style = {}, T }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:"7px 12px", borderRadius:7, border:`1px solid ${T.border}`,
        background:"transparent", color:T.textSub, fontSize:11,
        cursor:"pointer", fontFamily:"inherit", ...style,
      }}
    >
      {children}
    </button>
  );
}
