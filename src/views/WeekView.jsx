import { PrimaryBtn, GhostBtn } from '../components/index.js';
import { DAYS, todayIdx } from '../hooks/useAppState.js';

export function WeekView({ T, state }) {
  const { schedule, checked, newTask, setNewTask, editingDay, setEditingDay, addTask, deleteTask, moveTask } = state;
  const TODAY_IDX = todayIdx();
  const card = { borderRadius:11, background:T.surface, border:`1px solid ${T.border}`, overflow:"hidden" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
      {DAYS.map((day, i) => (
        <div key={day} style={{ ...card, border:`1px solid ${i===TODAY_IDX?T.accentBorder:T.border}` }}>
          <div style={{ padding:"9px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${T.border}`, background:i===TODAY_IDX?T.accentBg:"transparent" }}>
            <span style={{ fontSize:10, letterSpacing:"0.13em", textTransform:"uppercase", color:i===TODAY_IDX?T.accent:T.textSub, fontWeight:700 }}>{day}{i===TODAY_IDX?" · today":""}</span>
            <GhostBtn onClick={() => setEditingDay(editingDay===day?null:day)} T={T} style={{ fontSize:9, padding:"4px 9px" }}>
              {editingDay === day ? "Done" : "+ Add"}
            </GhostBtn>
          </div>

          {editingDay === day && (
            <div style={{ padding:"12px 14px", background:T.surface2, borderBottom:`1px solid ${T.border}` }}>
              <input
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key==="Enter" && addTask(day)}
                placeholder="Task description..."
                style={{ width:"100%", boxSizing:"border-box", background:T.surface, border:`1px solid ${T.border}`, borderRadius:7, padding:"8px 11px", color:T.text, fontSize:12, fontFamily:"inherit", outline:"none", marginBottom:8 }}
              />
              <PrimaryBtn onClick={() => addTask(day)} T={T} style={{ fontSize:10, padding:"6px 12px" }}>Add task</PrimaryBtn>
            </div>
          )}

          <div style={{ padding:"9px 14px" }}>
            {(schedule[day]||[]).length === 0 ? (
              <div style={{ fontSize:11, color:T.textMuted, padding:"8px 0", textAlign:"center" }}>No tasks yet</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {(schedule[day]||[]).map(t => (
                  <div key={t.id} style={{ display:"flex", alignItems:"center", gap:7, fontSize:12, color:T.text, padding:"5px 0" }}>
                    <span style={{ flex:1 }}>{t.label}</span>
                    <select defaultValue="" onChange={e => { if (e.target.value) moveTask(t, day, e.target.value); e.target.value=""; }} style={{ fontSize:9, background:T.surface2, border:`1px solid ${T.border}`, borderRadius:4, color:T.textSub, padding:"2px 4px", cursor:"pointer" }}>
                      <option value="" disabled>move…</option>
                      {DAYS.filter(d => d !== day).map(d => <option key={d} value={d}>{d.slice(0,3)}</option>)}
                    </select>
                    <button onClick={() => deleteTask(day, t.id)} style={{ background:"transparent", border:"none", color:T.textMuted, fontSize:13, cursor:"pointer", padding:"0 4px" }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
