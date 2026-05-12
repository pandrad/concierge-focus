import { useState, useEffect, useRef } from "react";
import { useGoogleAuth } from "./useGoogleAuth.js";
import { useGmailData } from "./useGmailData.js";
import { useCalendarData } from "./useCalendarData.js";
import { useGoogleDrive } from "./useGoogleDrive.js";
import { GOOGLE_CLIENT_ID } from "./config.js";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const todayIdx = () => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; };

const LIGHT = {
  bg:"#F5F3EE", surface:"#FFFFFF", surface2:"#EDEBE4", border:"#D4CFC5",
  text:"#1C1917", textSub:"#57534E", textMuted:"#A8A29E",
  accent:"#C2410C", accentBg:"rgba(194,65,12,0.08)", accentBorder:"rgba(194,65,12,0.3)",
  green:"#047857", greenBg:"rgba(4,120,87,0.08)", greenBorder:"rgba(4,120,87,0.3)",
  blue:"#0369A1", urgent:"#B91C1C",
};
const DARK = {
  bg:"#08080E", surface:"#13131C", surface2:"#1B1B27", border:"#2C2C3E",
  text:"#F0EEF0", textSub:"#9B99A8", textMuted:"#55536A",
  accent:"#FB923C", accentBg:"rgba(251,146,60,0.13)", accentBorder:"rgba(251,146,60,0.4)",
  green:"#34D399", greenBg:"rgba(52,211,153,0.1)", greenBorder:"rgba(52,211,153,0.35)",
  blue:"#38BDF8", urgent:"#FCA5A5",
};

const loadFromStorage = (key, fallback) => {
  try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : fallback; } catch { return fallback; }
};
const saveToStorage = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };

const DragHandle = ({ color }) => (
  <span style={{ fontSize:12, color, cursor:"grab", userSelect:"none", flexShrink:0 }} title="Drag to reorder">⠿</span>
);

function NoCredentialsWarning({ T }) {
  return (
    <div style={{ padding:"16px", background:T.accentBg, border:`1px solid ${T.accentBorder}`, borderRadius:10, marginBottom:16, fontSize:12, color:T.text }}>
      <strong style={{ color:T.accent }}>Setup required:</strong> Add your Google Client ID to a <code>.env</code> file as <code>VITE_GOOGLE_CLIENT_ID=...</code> then restart the dev server.
      See <code>README.md</code> for full instructions.
    </div>
  );
}

export default function Dashboard() {
  const [dark, setDark] = useState(() => loadFromStorage("dark", false));
  const T = dark ? DARK : LIGHT;

  const [time, setTime] = useState(new Date());

  const [tabs, setTabs] = useState(() => loadFromStorage("tabs", ["brief","week","one-offs"]));
  const [tabNames, setTabNames] = useState(() => loadFromStorage("tabNames", {
    brief:"📋 Brief", week:"Week", "one-offs":"One-offs"
  }));
  const [editingTab, setEditingTab] = useState(null);
  const [editTabName, setEditTabName] = useState("");
  const tabDragIdx = useRef(null);

  const [activeTab, setActiveTab] = useState("brief");

  const [schedule, setSchedule] = useState(() => loadFromStorage("schedule", {
    Monday:[], Tuesday:[], Wednesday:[], Thursday:[], Friday:[], Saturday:[], Sunday:[]
  }));

  const [oneOffs, setOneOffs] = useState(() => loadFromStorage("oneOffs", []));
  const [checked, setChecked] = useState(() => loadFromStorage("checked_" + new Date().toDateString(), {}));

  const [briefOrder, setBriefOrder] = useState(() => loadFromStorage("briefOrder", ["focus","emails","calendar"]));
  const briefDragIdx = useRef(null);

  const [newTask, setNewTask] = useState("");
  const [editingDay, setEditingDay] = useState(null);
  const [newOneOff, setNewOneOff] = useState("");
  const [assigningOneOff, setAssigningOneOff] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);

  const { isSignedIn, isLoading: authLoading, signIn, signOut } = useGoogleAuth();
  const { emails, loading: emailLoading, error: emailError, refetch: refetchEmails } = useGmailData(isSignedIn);
  const { events, loading: calLoading, error: calError, refetch: refetchCal } = useCalendarData(isSignedIn);
  const { saveData, loadData } = useGoogleDrive();

  useEffect(() => { saveToStorage("dark", dark); }, [dark]);
  useEffect(() => { saveToStorage("tabs", tabs); }, [tabs]);
  useEffect(() => { saveToStorage("tabNames", tabNames); }, [tabNames]);
  useEffect(() => { saveToStorage("briefOrder", briefOrder); }, [briefOrder]);
  useEffect(() => { saveToStorage("schedule", schedule); }, [schedule]);
  useEffect(() => { saveToStorage("oneOffs", oneOffs); }, [oneOffs]);
  useEffect(() => { saveToStorage("checked_" + new Date().toDateString(), checked); }, [checked]);
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 60000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (isSignedIn) {
      setSyncLoading(true);
      loadData().then(result => {
        if (result.success && result.data) {
          setSchedule(result.data.schedule);
          setOneOffs(result.data.oneOffs);
          setChecked({});
        }
        setSyncLoading(false);
      });
    } else {
      setChecked({});
      localStorage.removeItem("checked_" + new Date().toDateString());
    }
  }, [isSignedIn, loadData]);

  useEffect(() => {
    if (isSignedIn) {
      const timer = setTimeout(() => saveData(schedule, oneOffs), 1000);
      return () => clearTimeout(timer);
    }
  }, [isSignedIn, schedule, oneOffs, saveData]);

  const greeting = () => { const h = time.getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };
  const fmtDate = d => d.toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long" });

  const TODAY_IDX = todayIdx();
  const todayTasks = schedule[DAYS[TODAY_IDX]] || [];
  const todayOneOffs = oneOffs.filter(t => t.day === DAYS[TODAY_IDX]);

  const emailDoneCount = emails.filter(e => checked[e.id]).length;
  const taskDoneCount = todayTasks.filter(t => checked[t.id]).length;
  const oneOffDoneCount = todayOneOffs.filter(t => t.done).length;
  const totalDone = emailDoneCount + taskDoneCount + oneOffDoneCount;
  const totalCount = emails.length + todayTasks.length + todayOneOffs.length;
  const progress = totalCount ? Math.round(totalDone / totalCount * 100) : 0;

  const addTask = (day) => {
    if (!newTask.trim()) return;
    setSchedule(p => ({ ...p, [day]: [...(p[day] || []), { id:"t"+Date.now(), label:newTask.trim() }] }));
    setNewTask("");
  };

  const deleteTask = (day, taskId) => {
    setSchedule(p => ({ ...p, [day]: p[day].filter(t => t.id !== taskId) }));
  };

  const moveTask = (task, fromDay, toDay) => {
    if (fromDay === toDay) return;
    setSchedule(p => {
      const next = { ...p };
      next[fromDay] = p[fromDay].filter(t => t.id !== task.id);
      next[toDay] = [...(p[toDay] || []), task];
      return next;
    });
  };

  const addOneOff = () => {
    if (!newOneOff.trim()) return;
    setOneOffs(p => [...p, { id:"o"+Date.now(), label:newOneOff.trim(), day:null, done:false }]);
    setNewOneOff("");
  };

  const deleteOneOff = (id) => {
    setOneOffs(p => p.filter(t => t.id !== id));
  };

  const assignOneOffDay = (id, day) => {
    setOneOffs(p => p.map(t => t.id === id ? { ...t, day } : t));
    setAssigningOneOff(null);
  };

  const addEventAsOneOff = (event) => {
    const exists = oneOffs.find(o => o.label.includes(event.title) && o.day === DAYS[TODAY_IDX]);
    if (exists) {
      setOneOffs(p => p.filter(o => o.id !== exists.id));
    } else {
      setOneOffs(p => [...p, { id:"o"+Date.now(), label:`${event.title} (${event.time})`, day:DAYS[TODAY_IDX], done:false }]);
    }
  };

  const onTabDragStart = i => { tabDragIdx.current = i; };
  const onTabDragOver = (e, i) => {
    e.preventDefault();
    if (tabDragIdx.current === null || tabDragIdx.current === i) return;
    setTabs(prev => { const next = [...prev]; const [m] = next.splice(tabDragIdx.current, 1); next.splice(i, 0, m); tabDragIdx.current = i; return next; });
  };
  const onTabDragEnd = () => { tabDragIdx.current = null; };

  const onBriefDragStart = i => { briefDragIdx.current = i; };
  const onBriefDragOver = (e, i) => {
    e.preventDefault();
    if (briefDragIdx.current === null || briefDragIdx.current === i) return;
    setBriefOrder(prev => { const next = [...prev]; const [m] = next.splice(briefDragIdx.current, 1); next.splice(i, 0, m); briefDragIdx.current = i; return next; });
  };
  const onBriefDragEnd = () => { briefDragIdx.current = null; };

  const startEditTab = (tab) => { setEditingTab(tab); setEditTabName(tabNames[tab]); };
  const saveTabName = (tab) => {
    if (editTabName.trim()) setTabNames(p => ({ ...p, [tab]: editTabName.trim() }));
    setEditingTab(null);
  };

  const card = { borderRadius:11, background:T.surface, border:`1px solid ${T.border}`, overflow:"hidden" };
  const sectionLabel = { fontSize:9, color:T.accent, letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:11, display:"block", fontWeight:700 };

  const PrimaryBtn = ({ onClick, color, children, disabled, style={} }) => (
    <button onClick={onClick} disabled={disabled} style={{ padding:"8px 14px", borderRadius:7, border:"none", background:color||T.accent, color:"#fff", fontSize:11, cursor:disabled?"not-allowed":"pointer", fontFamily:"inherit", letterSpacing:"0.07em", fontWeight:600, opacity:disabled?0.5:1, ...style }}>{children}</button>
  );
  const GhostBtn = ({ onClick, children, style={} }) => (
    <button onClick={onClick} style={{ padding:"7px 12px", borderRadius:7, border:`1px solid ${T.border}`, background:"transparent", color:T.textSub, fontSize:11, cursor:"pointer", fontFamily:"inherit", ...style }}>{children}</button>
  );

  const Spinner = () => (
    <div style={{ textAlign:"center", padding:"16px 0", fontSize:11, color:T.textMuted }}>Loading…</div>
  );

  const BriefSections = {
    focus: (
      <div style={card}>
        <div style={{ padding:"14px 16px", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:11 }}>
            <span style={{ ...sectionLabel, marginBottom:0 }}>📋 Today's focus — {DAYS[TODAY_IDX]}</span>
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
                  <div onClick={() => setOneOffs(p => p.map(o => o.id === t.id ? { ...o, done:!o.done } : o))} style={{ width:18, height:18, borderRadius:4, flexShrink:0, cursor:"pointer", border:`1.5px solid ${t.done?T.green:T.textMuted}`, background:t.done?T.green:"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
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
            <span style={{ ...sectionLabel, marginBottom:0, color:T.urgent }}>✉️ Needs reply · {emailDoneCount}/{emails.length} handled</span>
            {isSignedIn && (
              <button onClick={refetchEmails} style={{ background:"transparent", border:"none", fontSize:11, color:T.textMuted, cursor:"pointer" }}>↻ refresh</button>
            )}
          </div>
          {!isSignedIn ? (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              {authLoading ? <Spinner /> : (
                <>
                  <div style={{ fontSize:12, color:T.textMuted, marginBottom:12 }}>Sign in to load your emails</div>
                  {GOOGLE_CLIENT_ID ? (
                    <PrimaryBtn onClick={signIn}>Sign in with Google</PrimaryBtn>
                  ) : (
                    <NoCredentialsWarning T={T} />
                  )}
                </>
              )}
            </div>
          ) : emailLoading ? (
            <Spinner />
          ) : emailError ? (
            <div style={{ fontSize:12, color:T.urgent, padding:"12px 0", textAlign:"center" }}>{emailError} — <button onClick={refetchEmails} style={{ background:"none", border:"none", color:T.blue, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>retry</button></div>
          ) : emails.length === 0 ? (
            <div style={{ fontSize:12, color:T.textMuted, padding:"16px 0", textAlign:"center" }}>No unread emails 🎉</div>
          ) : (
            emails.map(e => (
              <div key={e.id} style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:9 }}>
                <div onClick={() => setChecked(p => ({ ...p, [e.id]:!p[e.id] }))} style={{ width:16, height:16, borderRadius:3, marginTop:2, flexShrink:0, cursor:"pointer", border:`1.5px solid ${checked[e.id]?T.green:T.textMuted}`, background:checked[e.id]?T.green:"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {checked[e.id] && <span style={{ color:"#fff", fontSize:9 }}>✓</span>}
                </div>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:13, color:T.text, fontWeight:e.urgent?600:400, textDecoration:checked[e.id]?"line-through":"none", opacity:checked[e.id]?0.6:1 }}>{e.from}</span>
                  <span style={{ fontSize:11, color:T.textSub, textDecoration:checked[e.id]?"line-through":"none", opacity:checked[e.id]?0.6:1 }}> — {e.subject}</span>
                  <div style={{ fontSize:11, color:T.textMuted, marginTop:1, opacity:checked[e.id]?0.6:1 }}>{e.preview.slice(0, 70)}…</div>
                  <div style={{ fontSize:9, color:T.textMuted, marginTop:2, opacity:checked[e.id]?0.6:1 }}>To: {e.inbox}</div>
                </div>
                <span style={{ fontSize:9, color:T.textMuted, flexShrink:0 }}>{e.date}</span>
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
            {isSignedIn && (
              <button onClick={refetchCal} style={{ background:"transparent", border:"none", fontSize:11, color:T.textMuted, cursor:"pointer" }}>↻ refresh</button>
            )}
          </div>
          {!isSignedIn ? (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              {authLoading ? <Spinner /> : (
                <div style={{ fontSize:12, color:T.textMuted }}>Sign in above to load your calendar</div>
              )}
            </div>
          ) : calLoading ? (
            <Spinner />
          ) : calError ? (
            <div style={{ fontSize:12, color:T.urgent, padding:"12px 0", textAlign:"center" }}>{calError} — <button onClick={refetchCal} style={{ background:"none", border:"none", color:T.blue, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>retry</button></div>
          ) : events.length === 0 ? (
            <div style={{ fontSize:11, color:T.textMuted, padding:"16px 0", textAlign:"center" }}>No events today</div>
          ) : (
            events.map(ev => {
              const eventAdded = oneOffs.some(o => o.label.includes(ev.title) && o.day === DAYS[TODAY_IDX]);
              return (
                <div key={ev.id} style={{ display:"flex", gap:11, alignItems:"center", marginBottom:9 }}>
                  <div style={{ width:3, height:34, borderRadius:2, background:"#DB2777", flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:T.text }}>{ev.title}</div>
                    <div style={{ fontSize:11, color:T.textSub }}>{ev.time}</div>
                  </div>
                  <GhostBtn onClick={() => addEventAsOneOff(ev)} style={{ fontSize:9, padding:"4px 8px", color:eventAdded?T.green:T.textSub, borderColor:eventAdded?T.green:T.border }}>
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
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"'DM Mono','Courier New',monospace", transition:"background 0.2s,color 0.2s" }}>
      <div style={{ maxWidth:720, margin:"0 auto", padding:"26px 18px 60px" }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
          <div>
            <div style={{ fontSize:9, letterSpacing:"0.22em", color:T.accent, textTransform:"uppercase", marginBottom:3 }}>My Concierge</div>
            <h1 style={{ fontSize:23, fontWeight:700, margin:0, letterSpacing:"-0.02em", fontFamily:"'DM Sans',sans-serif", color:T.text }}>{greeting()}, Pedro.</h1>
            <div style={{ fontSize:12, color:T.textSub, marginTop:3 }}>{fmtDate(time)}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {isSignedIn && (
              <button onClick={signOut} style={{ fontSize:9, color:T.textMuted, background:"transparent", border:`1px solid ${T.border}`, borderRadius:6, padding:"4px 8px", cursor:"pointer" }}>sign out</button>
            )}
            <div style={{ textAlign:"center", background:T.accentBg, border:`1px solid ${T.accentBorder}`, borderRadius:10, padding:"7px 12px" }}>
              <div style={{ fontSize:18, fontWeight:700, color:T.accent }}>{progress}%</div>
              <div style={{ fontSize:9, color:T.textMuted, letterSpacing:"0.1em" }}>TODAY</div>
            </div>
            <button onClick={() => setDark(d => !d)} style={{ width:36, height:36, borderRadius:8, border:`1px solid ${T.border}`, background:T.surface, cursor:"pointer", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" }}>{dark ? "☀️" : "🌙"}</button>
          </div>
        </div>

        <div style={{ marginBottom:20, background:T.surface2, borderRadius:4, height:3 }}>
          <div style={{ height:"100%", borderRadius:4, background:T.accent, width:`${progress}%`, transition:"width 0.4s" }} />
        </div>

        <div style={{ display:"flex", gap:2, marginBottom:6, background:T.surface, borderRadius:10, padding:3, border:`1px solid ${T.border}` }}>
          {tabs.map((tab, i) => (
            <div
              key={tab}
              draggable
              onDragStart={() => onTabDragStart(i)}
              onDragOver={e => onTabDragOver(e, i)}
              onDragEnd={onTabDragEnd}
              style={{ flex:1, padding:"6px 4px", borderRadius:7, cursor:"grab", fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"inherit", userSelect:"none", background:activeTab===tab?T.accent:"transparent", color:activeTab===tab?"#fff":T.textMuted, fontWeight:activeTab===tab?700:400, transition:"all 0.15s", display:"flex", alignItems:"center", justifyContent:"center", gap:3 }}
            >
              <span style={{ fontSize:9, opacity:0.5 }}>⠿</span>
              {editingTab === tab ? (
                <input
                  autoFocus
                  value={editTabName}
                  onChange={e => setEditTabName(e.target.value)}
                  onBlur={() => saveTabName(tab)}
                  onKeyDown={e => e.key === "Enter" && saveTabName(tab)}
                  style={{ width:80, background:"transparent", border:"none", color:"inherit", fontSize:"inherit", fontFamily:"inherit", outline:"none", textAlign:"center", textTransform:"inherit" }}
                />
              ) : (
                <span onClick={() => setActiveTab(tab)} onDoubleClick={() => startEditTab(tab)} style={{ cursor:"pointer" }}>{tabNames[tab]}</span>
              )}
            </div>
          ))}
        </div>
        <div style={{ fontSize:9, color:T.textMuted, marginBottom:18, letterSpacing:"0.07em", textAlign:"right" }}>drag tabs to reorder · double-click to rename</div>

        {activeTab === "brief" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ fontSize:9, color:T.textMuted, letterSpacing:"0.07em", marginBottom:-4 }}>drag sections to reorder ⠿</div>
            {briefOrder.map((section, i) => (
              <div
                key={section}
                draggable
                onDragStart={() => onBriefDragStart(i)}
                onDragOver={e => onBriefDragOver(e, i)}
                onDragEnd={onBriefDragEnd}
                style={{ display:"flex", alignItems:"flex-start", gap:8, cursor:"grab" }}
              >
                <DragHandle color={T.textMuted} />
                <div style={{ flex:1 }}>{BriefSections[section]}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "week" && (
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            {DAYS.map((day, i) => (
              <div key={day} style={{ ...card, border:`1px solid ${i===TODAY_IDX?T.accentBorder:T.border}` }}>
                <div style={{ padding:"9px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${T.border}`, background:i===TODAY_IDX?T.accentBg:"transparent" }}>
                  <span style={{ fontSize:10, letterSpacing:"0.13em", textTransform:"uppercase", color:i===TODAY_IDX?T.accent:T.textSub, fontWeight:700 }}>{day}{i===TODAY_IDX?" · today":""}</span>
                  <GhostBtn onClick={() => setEditingDay(editingDay===day?null:day)} style={{ fontSize:9, padding:"4px 9px" }}>
                    {editingDay === day ? "Done" : "+ Add"}
                  </GhostBtn>
                </div>

                {editingDay === day && (
                  <div style={{ padding:"12px 14px", background:T.surface2, borderBottom:`1px solid ${T.border}` }}>
                    <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key==="Enter"&&addTask(day)} placeholder="Task description..." style={{ width:"100%", boxSizing:"border-box", background:T.surface, border:`1px solid ${T.border}`, borderRadius:7, padding:"8px 11px", color:T.text, fontSize:12, fontFamily:"inherit", outline:"none", marginBottom:8 }} />
                    <PrimaryBtn onClick={() => addTask(day)} style={{ fontSize:10, padding:"6px 12px" }}>Add task</PrimaryBtn>
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
                          <select defaultValue="" onChange={e => { if (e.target.value) { moveTask(t, day, e.target.value); } e.target.value=""; }} style={{ fontSize:9, background:T.surface2, border:`1px solid ${T.border}`, borderRadius:4, color:T.textSub, padding:"2px 4px", cursor:"pointer" }}>
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
        )}

        {activeTab === "one-offs" && (
          <div>
            <div style={{ fontSize:10, color:T.textMuted, letterSpacing:"0.1em", marginBottom:11, textTransform:"uppercase" }}>One-off tasks · {oneOffs.filter(t=>!t.done).length} open</div>
            <div style={{ display:"flex", gap:7, marginBottom:13 }}>
              <input value={newOneOff} onChange={e => setNewOneOff(e.target.value)} onKeyDown={e => e.key==="Enter"&&addOneOff()} placeholder="Add a one-off task..." style={{ flex:1, background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:"9px 11px", color:T.text, fontSize:13, fontFamily:"inherit", outline:"none" }} />
              <PrimaryBtn onClick={addOneOff} style={{ padding:"9px 14px", fontSize:15 }}>+</PrimaryBtn>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {oneOffs.filter(t => !t.done).map(todo => (
                <div key={todo.id} style={card}>
                  <div style={{ padding:"11px 12px", display:"flex", alignItems:"center", gap:9 }}>
                    <span style={{ flex:1, fontSize:13, color:T.text }}>{todo.label}</span>
                    {todo.day && <span style={{ fontSize:8, letterSpacing:"0.1em", textTransform:"uppercase", color:T.accent, background:T.accentBg, padding:"2px 7px", borderRadius:4 }}>{todo.day.slice(0,3)}</span>}
                    <GhostBtn onClick={() => setAssigningOneOff(assigningOneOff===todo.id?null:todo.id)} style={{ fontSize:9 }}>{todo.day?"reassign":"+ day"}</GhostBtn>
                    <button onClick={() => setOneOffs(p => p.map(o => o.id === todo.id ? { ...o, done:true } : o))} style={{ background:"transparent", border:"none", color:T.green, fontSize:14, cursor:"pointer", padding:"0 2px" }} title="Mark done">✓</button>
                    <button onClick={() => deleteOneOff(todo.id)} style={{ background:"transparent", border:"none", color:T.textMuted, fontSize:12, cursor:"pointer" }}>✕</button>
                  </div>
                  {assigningOneOff === todo.id && (
                    <div style={{ borderTop:`1px solid ${T.border}`, padding:"8px 12px", display:"flex", gap:5, flexWrap:"wrap" }}>
                      {DAYS.map((d, i) => (
                        <button key={d} onClick={() => assignOneOffDay(todo.id, d)} style={{ padding:"4px 8px", borderRadius:4, border:`1px solid ${i===TODAY_IDX?T.accent:T.border}`, background:"transparent", color:i===TODAY_IDX?T.accent:T.textSub, fontSize:9, cursor:"pointer", fontFamily:"inherit" }}>{d.slice(0,3)}</button>
                      ))}
                      <GhostBtn onClick={() => assignOneOffDay(todo.id, null)} style={{ fontSize:9 }}>clear</GhostBtn>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop:38, paddingTop:13, borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:9, color:T.border, letterSpacing:"0.14em" }}>MY CONCIERGE v2.0</span>
          <span style={{ fontSize:9, color:T.border }}>Gmail + Calendar · live data</span>
        </div>
      </div>
    </div>
  );
}
