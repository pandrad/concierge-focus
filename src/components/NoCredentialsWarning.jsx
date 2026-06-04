export function NoCredentialsWarning({ T }) {
  return (
    <div style={{ padding:"16px", background:T.accentBg, border:`1px solid ${T.accentBorder}`, borderRadius:10, marginBottom:16, fontSize:12, color:T.text }}>
      <strong style={{ color:T.accent }}>Setup required:</strong> Add your Google Client ID to a <code>.env</code> file as <code>VITE_GOOGLE_CLIENT_ID=...</code> then restart the dev server.
      See <code>README.md</code> for full instructions.
    </div>
  );
}
