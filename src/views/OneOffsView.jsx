import { PrimaryBtn, GhostBtn } from '../components/index.js';
import { DAYS, todayIdx } from '../hooks/useAppState.js';

export function OneOffsView({ T, state }) {
  const { oneOffs, newOneOff, setNewOneOff, addOneOff, deleteOneOff, assignOneOffDay, setOneOffs, assigningOneOff, setAssigningOneOff } = state;
  const TODAY_IDX = todayIdx();
  const card = { borderRadius:11, background:T.surface, border:`1px solid ${T.border}`, overflow:"hidden" };

  return (
    <div>
      <div style={{ fontSize:10, color:T.textMuted, letterSpacing:"0.1em", marginBottom:11, textTransform:"uppercase" }}>
        One-off tasks · {oneOffs.filter(t=>!t.done).length} open
      </div>
      <div style={{ display:"flex", gap:7, marginBottom:13 }}>
        <input
          value={newOneOff}
          onChange={e => setNewOneOff(e.target.value)}
          onKeyDown={e => e.key==="Enter" && addOneOff()}
          placeholder="Add a one-off task..."
          style={{ flex:1, background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:"9px 11px", color:T.text, fontSize:13, fontFamily:"inherit", outline:"none" }}
        />
        <PrimaryBtn onClick={addOneOff} T={T} style={{ padding:"9px 14px", fontSize:15 }}>+</PrimaryBtn>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {oneOffs.filter(t => !t.done).map(todo => (
          <div key={todo.id} style={card}>
            <div style={{ padding:"11px 12px", display:"flex", alignItems:"center", gap:9 }}>
              <span style={{ flex:1, fontSize:13, color:T.text }}>{todo.label}</span>
              {todo.day && <span style={{ fontSize:8, letterSpacing:"0.1em", textTransform:"uppercase", color:T.accent, background:T.accentBg, padding:"2px 7px", borderRadius:4 }}>{todo.day.slice(0,3)}</span>}
              <GhostBtn onClick={() => setAssigningOneOff(assigningOneOff===todo.id?null:todo.id)} T={T} style={{ fontSize:9 }}>{todo.day?"reassign":"+ day"}</GhostBtn>
              <button onClick={() => setOneOffs(p => p.map(o => o.id===todo.id ? { ...o, done:true } : o))} style={{ background:"transparent", border:"none", color:T.green, fontSize:14, cursor:"pointer", padding:"0 2px" }} title="Mark done">✓</button>
              <button onClick={() => deleteOneOff(todo.id)} style={{ background:"transparent", border:"none", color:T.textMuted, fontSize:12, cursor:"pointer" }}>✕</button>
            </div>
            {assigningOneOff === todo.id && (
              <div style={{ borderTop:`1px solid ${T.border}`, padding:"8px 12px", display:"flex", gap:5, flexWrap:"wrap" }}>
                {DAYS.map((d, i) => (
                  <button key={d} onClick={() => assignOneOffDay(todo.id, d)} style={{ padding:"4px 8px", borderRadius:4, border:`1px solid ${i===TODAY_IDX?T.accent:T.border}`, background:"transparent", color:i===TODAY_IDX?T.accent:T.textSub, fontSize:9, cursor:"pointer", fontFamily:"inherit" }}>{d.slice(0,3)}</button>
                ))}
                <GhostBtn onClick={() => assignOneOffDay(todo.id, null)} T={T} style={{ fontSize:9 }}>clear</GhostBtn>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
