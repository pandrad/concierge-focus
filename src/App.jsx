import { useState, useEffect } from "react";
import { useGoogleAuth } from "./services/useGoogleAuth.js";
import { useGmailData } from "./services/useGmailData.js";
import { useCalendarData } from "./services/useCalendarData.js";
import { LIGHT, DARK } from "./theme.js";
import { useAppState, loadFromStorage, saveToStorage } from "./hooks/useAppState.js";
import { BriefView } from "./views/BriefView.jsx";
import { WeekView } from "./views/WeekView.jsx";
import { OneOffsView } from "./views/OneOffsView.jsx";

export default function App() {
  const [dark, setDark] = useState(() => loadFromStorage("dark", false));
  const T = dark ? DARK : LIGHT;

  const [time, setTime] = useState(new Date());
  useEffect(() => { saveToStorage("dark", dark); }, [dark]);
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 60000); return () => clearInterval(t); }, []);

  const { isSignedIn, isLoading: authLoading, signIn, signOut } = useGoogleAuth();
  const { emails, userEmail, loading: emailLoading, error: emailError, refetch: refetchEmails } = useGmailData(isSignedIn, 'week');
  const { events, loading: calLoading, error: calError, refetch: refetchCal } = useCalendarData(isSignedIn);

  const state = useAppState(isSignedIn);
  const { tabs, tabNames, editingTab, editTabName, setEditTabName, activeTab, setActiveTab, onTabDragStart, onTabDragOver, onTabDragEnd, startEditTab, saveTabName } = state;

  const greeting = () => { const h = time.getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };
  const fmtDate = d => d.toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long" });

  const { checked, oneOffs, schedule } = state;
  const todayTasks = schedule[["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][(new Date().getDay()||7)-1]] || [];
  const todayOneOffs = oneOffs.filter(t => t.day === ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][(new Date().getDay()||7)-1]);
  const totalDone = todayTasks.filter(t => checked[t.id]).length + todayOneOffs.filter(t => t.done).length;
  const totalCount = todayTasks.length + todayOneOffs.length;
  const progress = totalCount ? Math.round(totalDone / totalCount * 100) : 0;

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"'DM Mono','Courier New',monospace", transition:"background 0.2s,color 0.2s" }}>
      <div style={{ maxWidth:720, margin:"0 auto", padding:"26px 18px 60px" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
          <div>
            <div style={{ fontSize:9, letterSpacing:"0.22em", color:T.accent, textTransform:"uppercase", marginBottom:3 }}>My Concierge</div>
            <h1 style={{ fontSize:23, fontWeight:700, margin:0, letterSpacing:"-0.02em", fontFamily:"'DM Sans',sans-serif", color:T.text }}>{greeting()}, Pedro.</h1>
            <div style={{ fontSize:12, color:T.textSub, marginTop:3 }}>{fmtDate(time)}</div>
            {userEmail && <div style={{ fontSize:10, color:T.textMuted, marginTop:2 }}>⚬ {userEmail}</div>}
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

        {/* Progress bar */}
        <div style={{ marginBottom:20, background:T.surface2, borderRadius:4, height:3 }}>
          <div style={{ height:"100%", borderRadius:4, background:T.accent, width:`${progress}%`, transition:"width 0.4s" }} />
        </div>

        {/* Tab bar */}
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
                <input autoFocus value={editTabName} onChange={e => setEditTabName(e.target.value)} onBlur={() => saveTabName(tab)} onKeyDown={e => e.key==="Enter" && saveTabName(tab)} style={{ width:80, background:"transparent", border:"none", color:"inherit", fontSize:"inherit", fontFamily:"inherit", outline:"none", textAlign:"center", textTransform:"inherit" }} />
              ) : (
                <span onClick={() => setActiveTab(tab)} onDoubleClick={() => startEditTab(tab)} style={{ cursor:"pointer" }}>{tabNames[tab]}</span>
              )}
            </div>
          ))}
        </div>
        <div style={{ fontSize:9, color:T.textMuted, marginBottom:18, letterSpacing:"0.07em", textAlign:"right" }}>drag tabs to reorder · double-click to rename</div>

        {/* Views */}
        {activeTab === "brief" && (
          <BriefView T={T} state={state} emails={emails} events={events} emailLoading={emailLoading} emailError={emailError} calLoading={calLoading} calError={calError} isSignedIn={isSignedIn} authLoading={authLoading} signIn={signIn} refetchEmails={refetchEmails} refetchCal={refetchCal} />
        )}
        {activeTab === "week" && <WeekView T={T} state={state} />}
        {activeTab === "one-offs" && <OneOffsView T={T} state={state} />}

        {/* Footer */}
        <div style={{ marginTop:38, paddingTop:13, borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:9, color:T.border, letterSpacing:"0.14em" }}>MY CONCIERGE v2.0</span>
          <span style={{ fontSize:9, color:T.border }}>Gmail + Calendar · live data</span>
        </div>
      </div>
    </div>
  );
}
