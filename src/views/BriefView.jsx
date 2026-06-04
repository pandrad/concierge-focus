import { DragHandle, PrimaryBtn, GhostBtn, Spinner, NoCredentialsWarning } from '../components/index.js';
import { DAYS, todayIdx } from '../hooks/useAppState.js';
import { GOOGLE_CLIENT_ID } from '../services/config.js';

export function BriefView({ T, state, emails, events, emailLoading, emailError, calLoading, calError, isSignedIn, authLoading, signIn, refetchEmails, refetchCal }) {
  const {
    schedule, oneOffs, checked, setChecked,
    ignored, permanentlyIgnored,
    backlog, syncLoading, dailyStats, setDailyStats,
    briefOrder,
    onBriefDragStart, onBriefDragOver, onBriefDragEnd,
    toggleOneOff, addEventAsOneOff, toggleIgnored, confirmBlockEmail,
    promoteBacklogToOneOff, dismissBacklog,
    confirmBlock, cancelBlock, applyBlock,
  } = state;

  const TODAY_IDX = todayIdx();
  const TODAY = DAYS[TODAY_IDX];
  const todayTasks = schedule[TODAY] || [];
  const todayOneOffs = oneOffs.filter(t => t.day === TODAY);
  const activeEmails = emails.filter(e => !ignored[e.id] && !permanentlyIgnored.includes(e.id));
  const emailDoneCount = activeEmails.filter(e => checked[e.id]).length;
  const taskDoneCount = todayTasks.filter(t => checked[t.id]).length;
  const oneOffDoneCount = todayOneOffs.filter(t => t.done).length;
  const totalDone = emailDoneCount + taskDoneCount + oneOffDoneCount;
  const totalCount = activeEmails.length + todayTasks.length + todayOneOffs.length;

  const card = { borderRadius:11, background:T.surface, border:`1px solid ${T.border}`, overflow:"hidden" };
  const sectionLabel = { fontSize:9, color:T.accent, letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:11, display:"block", fontWeight:700 };

  const getWeeklyData = () => {
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const stats = dailyStats[dateStr];
      const percent = stats && stats.total > 0 ? Math.round(stats.done / stats.total * 100) : 0;
      const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
      week.push({ dateStr, dayName, percent, stats });
    }
    return week;
  };

  // Track today's stats when totals are first available
  const today = new Date().toDateString();
  if (totalCount > 0 && !dailyStats[today]) {
    setDailyStats(p => ({ ...p, [today]: { done: totalDone, total: totalCount } }));
  }

  const sections = {
    backlog: backlog.length === 0 ? null : (
      <div style={card}>
        <div style={{ padding:"14px 16px" }}>
          <span style={{ ...sectionLabel, color:T.urgent }}>⚠️ Not done yesterday · {backlog.length} task{backlog.length !== 1 ? "s" : ""}</span>
          {backlog.map(t => (
            <div key={t.id} style={{ display:"flex", alignItems:"center", gap:9, marginBottom:8 }}>
              <span style={{ fontSize:11, color:T.textMuted, flexShrink:0 }}>{t.fromDay.slice(0,3)}</span>
              <span style={{ fontSize:13, color:T.text, flex:1 }}>{t.label}</span>
              <button onClick={() => promoteBacklogToOneOff(t)} style={{ fontSize:9, padding:"3px 8px", borderRadius:5, border:`1px solid ${T.accentBorder}`, background:T.accentBg, color:T.accent, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>+ one-off</button>
              <button onClick={() => dismissBacklog(t.id)} style={{ background:"transparent", border:"none", color:T.textMuted, fontSize:13, cursor:"pointer", padding:"0 2px" }}>×</button>
            </div>
          ))}
        </div>
      </div>
    ),

    stats: (
      <div style={card}>
        <div style={{ padding:"14px 16px" }}>
          <span style={sectionLabel}>📊 Last 7 days</span>
          <div style={{ display:"flex", gap:8, alignItems:"flex-end", height:80, justifyContent:"space-around" }}>
            {getWeeklyData().map((day, i) => (
              <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flex:1 }}>
                <div style={{ width:"100%", background:T.surface2, borderRadius:4, height:60, position:"relative", overflow:"hidden", display:"flex", alignItems:"flex-end" }}>
                  <div style={{ width:"100%", height:`${day.percent}%`, background:T.accent, transition:"height 0.3s", borderRadius:2 }} />
                </div>
                <div style={{ fontSize:9, color:T.textSub, fontWeight:600 }}>{day.percent}%</div>
                <div style={{ fontSize:8, color:T.textMuted }}>{day.dayName}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),

    focus: (
      <div style={card}>
        <div style={{ padding:"14px 16px", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:11 }}>
            <span style={{ ...sectionLabel, marginBottom:0 }}>📋 Today's focus — {TODAY}</span>
            {syncLoading && <span style={{ fontSize:9, color:T.textMuted, letterSpacing:"0.07em" }}>syncing…</span>}
          </div>
          {todayTasks.length === 0 && todayOneOffs.length === 0 ? (
            <div style={{ fontSize:12, color:T.textMuted, padding:"16px 0", textAlign:"center" }}>{syncLoading ? "Loading your tasks…" : "No tasks for today"}</div>
          ) : (
            <>
              {todayTasks.map(t => (
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:9, marginBottom:8 }}>
                  <div onClick={() => setChecked(p => ({ ...p, [t.id]:!p[t.id] }))} style={{ width:18, height:18, borderRadius:4, flexShrink:0, cursor:"pointer", border:`1.5px solid ${checked[t.id]?T.green:T.textMuted}`, background:checked[t.id]?T.green:"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {checked[t.id] && <span style={{ color:"#fff", fontSize:10 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:13, color:checked[t.id]?T.textMuted:T.text, textDecoration:checked[t.id]?"line-through":"none", flex:1 }}>{t.label}</span>
                </div>
              ))}
              {todayOneOffs.length > 0 && todayTasks.length > 0 && <div style={{ height:1, background:T.border, margin:"10px 0" }} />}
              {todayOneOffs.map(t => (
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:9, marginBottom:8 }}>
                  <div onClick={() => toggleOneOff(t.id)} style={{ width:18, height:18, borderRadius:4, flexShrink:0, cursor:"pointer", border:`1.5px solid ${t.done?T.green:T.textMuted}`, background:t.done?T.green:"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {t.done && <span style={{ color:"#fff", fontSize:10 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:13, color:t.done?T.textMuted:T.text, textDecoration:t.done?"line-through":"none", flex:1 }}>{t.label}</span>
                  <span style={{ fontSize:8, color:T.accent, background:T.accentBg, padding:"2px 6px", borderRadius:4, letterSpacing:"0.08em" }}>ONE-OFF</span>
                </div>
              ))}
            </>
          )}
        </div>
        {totalCount > 0 && (
          <div style={{ padding:"9px 16px" }}>
            <span style={{ fontSize:11, color:T.textSub }}>{taskDoneCount+oneOffDoneCount}/{todayTasks.length+todayOneOffs.length} tasks done{taskDoneCount+oneOffDoneCount === todayTasks.length+todayOneOffs.length && todayTasks.length+todayOneOffs.length > 0 ? " · 🔥" : ""}</span>
          </div>
        )}
      </div>
    ),

    emails: (
      <div style={card}>
        <div style={{ padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:11 }}>
            <span style={{ ...sectionLabel, marginBottom:0, color:T.urgent }}>✉️ Needs reply · {emailDoneCount}/{activeEmails.length} handled</span>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:9, color:T.textMuted }}>last 7 days</span>
              {isSignedIn && <button onClick={refetchEmails} style={{ background:"transparent", border:"none", fontSize:11, color:T.textMuted, cursor:"pointer" }}>↻</button>}
            </div>
          </div>
          {!isSignedIn ? (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              {authLoading ? <Spinner T={T} /> : (
                <>
                  <div style={{ fontSize:12, color:T.textMuted, marginBottom:12 }}>Sign in to load your emails</div>
                  {GOOGLE_CLIENT_ID ? (
                    <PrimaryBtn onClick={signIn} T={T}>Sign in with Google</PrimaryBtn>
                  ) : (
                    <NoCredentialsWarning T={T} />
                  )}
                </>
              )}
            </div>
          ) : emailLoading ? (
            <Spinner T={T} />
          ) : emailError ? (
            <div style={{ fontSize:12, color:T.urgent, padding:"12px 0", textAlign:"center" }}>{emailError} — <button onClick={refetchEmails} style={{ background:"none", border:"none", color:T.blue, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>retry</button></div>
          ) : emails.length === 0 ? (
            <div style={{ fontSize:12, color:T.textMuted, padding:"16px 0", textAlign:"center" }}>No unread emails 🎉</div>
          ) : (
            emails.filter(e => !permanentlyIgnored.includes(e.id)).map(e => (
              <div key={e.id} style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:9, opacity:ignored[e.id]?0.4:1 }}>
                {!ignored[e.id] && (
                  <div onClick={() => setChecked(p => ({ ...p, [e.id]:!p[e.id] }))} style={{ width:16, height:16, borderRadius:3, marginTop:2, flexShrink:0, cursor:"pointer", border:`1.5px solid ${checked[e.id]?T.green:T.textMuted}`, background:checked[e.id]?T.green:"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {checked[e.id] && <span style={{ color:"#fff", fontSize:9 }}>✓</span>}
                  </div>
                )}
                {ignored[e.id] && <div style={{ width:16, flexShrink:0 }} />}
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:13, color:T.text, fontWeight:e.urgent?600:400, textDecoration:checked[e.id]?"line-through":"none", opacity:checked[e.id]?0.6:1 }}>{e.from}</span>
                  <span style={{ fontSize:11, color:T.textSub, textDecoration:checked[e.id]?"line-through":"none", opacity:checked[e.id]?0.6:1 }}> — {e.subject}</span>
                  <div style={{ fontSize:11, color:T.textMuted, marginTop:1 }}>{e.preview.slice(0,70)}…</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
                  <span style={{ fontSize:9, color:T.textMuted }}>{e.date}</span>
                  <div style={{ display:"flex", gap:4 }}>
                    <button onClick={() => toggleIgnored(e.id)} style={{ fontSize:9, padding:"2px 7px", borderRadius:4, border:`1px solid ${T.border}`, background:"transparent", color:ignored[e.id]?T.textMuted:T.textSub, cursor:"pointer", fontFamily:"inherit" }}>{ignored[e.id] ? "unignore" : "ignore"}</button>
                    <button onClick={() => confirmBlockEmail(e)} style={{ fontSize:9, padding:"2px 7px", borderRadius:4, border:`1px solid ${T.border}`, background:"transparent", color:T.urgent, cursor:"pointer", fontFamily:"inherit" }} title="Never show this email again">block</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    ),

    calendar: (
      <div style={card}>
        <div style={{ padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:11 }}>
            <span style={{ ...sectionLabel, marginBottom:0, color:T.blue }}>📅 Today's events</span>
            {isSignedIn && <button onClick={refetchCal} style={{ background:"transparent", border:"none", fontSize:11, color:T.textMuted, cursor:"pointer" }}>↻ refresh</button>}
          </div>
          {!isSignedIn ? (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              {authLoading ? <Spinner T={T} /> : <div style={{ fontSize:12, color:T.textMuted }}>Sign in above to load your calendar</div>}
            </div>
          ) : calLoading ? (
            <Spinner T={T} />
          ) : calError ? (
            <div style={{ fontSize:12, color:T.urgent, padding:"12px 0", textAlign:"center" }}>{calError} — <button onClick={refetchCal} style={{ background:"none", border:"none", color:T.blue, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>retry</button></div>
          ) : events.length === 0 ? (
            <div style={{ fontSize:11, color:T.textMuted, padding:"16px 0", textAlign:"center" }}>No events today</div>
          ) : (
            events.map(ev => {
              const eventAdded = oneOffs.some(o => o.label.includes(ev.title) && o.day === TODAY);
              return (
                <div key={ev.id} style={{ display:"flex", gap:11, alignItems:"center", marginBottom:9 }}>
                  <div style={{ width:3, height:34, borderRadius:2, background:"#DB2777", flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:T.text }}>{ev.title}</div>
                    <div style={{ fontSize:11, color:T.textSub }}>{ev.time}</div>
                  </div>
                  <GhostBtn onClick={() => addEventAsOneOff(ev)} T={T} style={{ fontSize:9, padding:"4px 8px", color:eventAdded?T.green:T.textSub, borderColor:eventAdded?T.green:T.border }}>
                    {eventAdded ? "✓ added" : "+ task"}
                  </GhostBtn>
                </div>
              );
            })
          )}
        </div>
      </div>
    ),
  };

  return (
    <>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ fontSize:9, color:T.textMuted, letterSpacing:"0.07em", marginBottom:-4 }}>drag sections to reorder ⠿</div>
        {briefOrder.filter(s => sections[s]).map((section, i) => (
          <div key={section} draggable onDragStart={() => onBriefDragStart(i)} onDragOver={e => onBriefDragOver(e, i)} onDragEnd={onBriefDragEnd} style={{ display:"flex", alignItems:"flex-start", gap:8, cursor:"grab" }}>
            <DragHandle color={T.textMuted} />
            <div style={{ flex:1 }}>{sections[section]}</div>
          </div>
        ))}
      </div>

      {confirmBlock && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:24 }}>
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, maxWidth:400, width:"100%", padding:24 }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.urgent, marginBottom:8 }}>Permanently block this email?</div>
            <div style={{ fontSize:12, color:T.textSub, marginBottom:6 }}>
              <strong style={{ color:T.text }}>{confirmBlock.from}</strong> — {confirmBlock.subject}
            </div>
            <div style={{ fontSize:12, color:T.textMuted, marginBottom:20 }}>This email will never appear in your dashboard again. There is no way to undo this.</div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
              <GhostBtn onClick={cancelBlock} T={T}>Cancel</GhostBtn>
              <PrimaryBtn color={T.urgent} onClick={applyBlock} T={T}>Yes, block forever</PrimaryBtn>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
