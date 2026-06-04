import { useState, useEffect, useRef } from 'react';
import { useGoogleDrive } from '../services/useGoogleDrive.js';

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
export { DAYS };

export const todayIdx = () => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; };

export const loadFromStorage = (key, fallback) => {
  try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : fallback; } catch { return fallback; }
};
export const saveToStorage = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };

export function useAppState(isSignedIn) {
  const [tabs, setTabs] = useState(() => loadFromStorage("tabs", ["brief","week","one-offs"]));
  const [tabNames, setTabNames] = useState(() => loadFromStorage("tabNames", { brief:"📋 Brief", week:"Week", "one-offs":"One-offs" }));
  const [editingTab, setEditingTab] = useState(null);
  const [editTabName, setEditTabName] = useState("");
  const tabDragIdx = useRef(null);

  const [activeTab, setActiveTab] = useState("brief");

  const [schedule, setSchedule] = useState(() => loadFromStorage("schedule", {
    Monday:[], Tuesday:[], Wednesday:[], Thursday:[], Friday:[], Saturday:[], Sunday:[]
  }));
  const [oneOffs, setOneOffs] = useState(() => loadFromStorage("oneOffs", []));
  const [checked, setChecked] = useState(() => loadFromStorage("checked_" + new Date().toDateString(), {}));
  const [briefOrder, setBriefOrder] = useState(() => loadFromStorage("briefOrder", ["focus","backlog","stats","emails","calendar"]));
  const briefDragIdx = useRef(null);

  const [newTask, setNewTask] = useState("");
  const [editingDay, setEditingDay] = useState(null);
  const [newOneOff, setNewOneOff] = useState("");
  const [assigningOneOff, setAssigningOneOff] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [dailyStats, setDailyStats] = useState(() => loadFromStorage("dailyStats", {}));
  const [backlog, setBacklog] = useState(() => loadFromStorage("backlog", []));
  const [ignored, setIgnored] = useState(() => loadFromStorage("ignored_" + new Date().toDateString(), {}));
  const [permanentlyIgnored, setPermanentlyIgnored] = useState(() => loadFromStorage("permanentlyIgnored", []));
  const [confirmBlock, setConfirmBlock] = useState(null);

  const { saveData, loadData } = useGoogleDrive();

  useEffect(() => { saveToStorage("tabs", tabs); }, [tabs]);
  useEffect(() => { saveToStorage("tabNames", tabNames); }, [tabNames]);
  useEffect(() => { saveToStorage("briefOrder", briefOrder); }, [briefOrder]);
  useEffect(() => { saveToStorage("schedule", schedule); }, [schedule]);
  useEffect(() => { saveToStorage("oneOffs", oneOffs); }, [oneOffs]);
  useEffect(() => { saveToStorage("checked_" + new Date().toDateString(), checked); }, [checked]);
  useEffect(() => { saveToStorage("ignored_" + new Date().toDateString(), ignored); }, [ignored]);
  useEffect(() => { saveToStorage("permanentlyIgnored", permanentlyIgnored); }, [permanentlyIgnored]);
  useEffect(() => { saveToStorage("dailyStats", dailyStats); }, [dailyStats]);
  useEffect(() => { saveToStorage("backlog", backlog); }, [backlog]);

  // Backlog: pick up uncompleted tasks from yesterday on first open of a new day
  useEffect(() => {
    const today = new Date().toDateString();
    const lastOpen = loadFromStorage("lastOpenDate", null);
    saveToStorage("lastOpenDate", today);
    if (!lastOpen || lastOpen === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    const yesterdayDayName = DAYS[yesterday.getDay() === 0 ? 6 : yesterday.getDay() - 1];
    const yesterdayChecked = loadFromStorage("checked_" + yesterdayStr, {});
    const missed = (schedule[yesterdayDayName] || []).filter(t => !yesterdayChecked[t.id]);

    if (missed.length > 0) {
      setBacklog(prev => {
        const existingIds = new Set(prev.map(b => b.id));
        return [...prev, ...missed.filter(t => !existingIds.has(t.id)).map(t => ({ id:t.id, label:t.label, fromDay:yesterdayDayName }))];
      });
    }
  }, []);

  // Drive: load on sign-in, clear on sign-out
  useEffect(() => {
    if (isSignedIn) {
      setSyncLoading(true);
      loadData().then(result => {
        if (result.success && result.data) {
          setSchedule(result.data.schedule);
          setOneOffs(result.data.oneOffs);
          if (result.data.checked) setChecked(result.data.checked);
          if (result.data.ignored) setIgnored(result.data.ignored);
          if (result.data.permanentlyIgnored) setPermanentlyIgnored(result.data.permanentlyIgnored);
        }
        setSyncLoading(false);
      });
    } else {
      setChecked({});
      setIgnored({});
      setSchedule({ Monday:[], Tuesday:[], Wednesday:[], Thursday:[], Friday:[], Saturday:[], Sunday:[] });
      setOneOffs([]);
    }
  }, [isSignedIn, loadData]);

  // Drive: save on any state change (debounced)
  useEffect(() => {
    if (!isSignedIn) return;
    const timer = setTimeout(() => saveData(schedule, oneOffs, checked, ignored, permanentlyIgnored), 1000);
    return () => clearTimeout(timer);
  }, [isSignedIn, schedule, oneOffs, checked, ignored, permanentlyIgnored, saveData]);

  // --- Task management ---
  const addTask = (day) => {
    if (!newTask.trim()) return;
    setSchedule(p => ({ ...p, [day]: [...(p[day] || []), { id:"t"+Date.now(), label:newTask.trim() }] }));
    setNewTask("");
  };
  const deleteTask = (day, taskId) => setSchedule(p => ({ ...p, [day]: p[day].filter(t => t.id !== taskId) }));
  const moveTask = (task, fromDay, toDay) => {
    if (fromDay === toDay) return;
    setSchedule(p => {
      const next = { ...p };
      next[fromDay] = p[fromDay].filter(t => t.id !== task.id);
      next[toDay] = [...(p[toDay] || []), task];
      return next;
    });
  };

  // --- One-off management ---
  const addOneOff = () => {
    if (!newOneOff.trim()) return;
    setOneOffs(p => [...p, { id:"o"+Date.now(), label:newOneOff.trim(), day:null, done:false }]);
    setNewOneOff("");
  };
  const deleteOneOff = (id) => setOneOffs(p => p.filter(t => t.id !== id));
  const assignOneOffDay = (id, day) => { setOneOffs(p => p.map(t => t.id === id ? { ...t, day } : t)); setAssigningOneOff(null); };
  const toggleOneOff = (id) => setOneOffs(p => p.map(o => o.id === id ? { ...o, done:!o.done } : o));
  const addEventAsOneOff = (event) => {
    const TODAY = DAYS[todayIdx()];
    const exists = oneOffs.find(o => o.label.includes(event.title) && o.day === TODAY);
    if (exists) {
      setOneOffs(p => p.filter(o => o.id !== exists.id));
    } else {
      setOneOffs(p => [...p, { id:"o"+Date.now(), label:`${event.title} (${event.time})`, day:TODAY, done:false }]);
    }
  };

  // --- Drag: tabs ---
  const onTabDragStart = i => { tabDragIdx.current = i; };
  const onTabDragOver = (e, i) => {
    e.preventDefault();
    if (tabDragIdx.current === null || tabDragIdx.current === i) return;
    setTabs(prev => { const next = [...prev]; const [m] = next.splice(tabDragIdx.current, 1); next.splice(i, 0, m); tabDragIdx.current = i; return next; });
  };
  const onTabDragEnd = () => { tabDragIdx.current = null; };

  // --- Drag: brief sections ---
  const onBriefDragStart = i => { briefDragIdx.current = i; };
  const onBriefDragOver = (e, i) => {
    e.preventDefault();
    if (briefDragIdx.current === null || briefDragIdx.current === i) return;
    setBriefOrder(prev => { const next = [...prev]; const [m] = next.splice(briefDragIdx.current, 1); next.splice(i, 0, m); briefDragIdx.current = i; return next; });
  };
  const onBriefDragEnd = () => { briefDragIdx.current = null; };

  // --- Tab rename ---
  const startEditTab = (tab) => { setEditingTab(tab); setEditTabName(tabNames[tab]); };
  const saveTabName = (tab) => {
    if (editTabName.trim()) setTabNames(p => ({ ...p, [tab]: editTabName.trim() }));
    setEditingTab(null);
  };

  // --- Email actions ---
  const toggleIgnored = (id) => setIgnored(p => ({ ...p, [id]: !p[id] }));
  const confirmBlockEmail = (email) => setConfirmBlock(email);
  const cancelBlock = () => setConfirmBlock(null);
  const applyBlock = () => {
    if (!confirmBlock) return;
    setPermanentlyIgnored(p => [...p, confirmBlock.id]);
    setIgnored(p => { const n = { ...p }; delete n[confirmBlock.id]; return n; });
    setConfirmBlock(null);
  };

  // --- Backlog ---
  const promoteBacklogToOneOff = (item) => {
    setOneOffs(p => [...p, { id:"o"+Date.now(), label:item.label, day:null, done:false }]);
    setBacklog(p => p.filter(b => b.id !== item.id));
  };
  const dismissBacklog = (id) => setBacklog(p => p.filter(b => b.id !== id));

  return {
    // UI state
    tabs, tabNames, editingTab, editTabName, setEditTabName,
    activeTab, setActiveTab,
    briefOrder,
    newTask, setNewTask,
    editingDay, setEditingDay,
    newOneOff, setNewOneOff,
    assigningOneOff, setAssigningOneOff,
    syncLoading,
    dailyStats, setDailyStats,
    // Data
    schedule, oneOffs, checked, setChecked,
    ignored, permanentlyIgnored,
    backlog, confirmBlock,
    // Task actions
    addTask, deleteTask, moveTask,
    // One-off actions
    addOneOff, deleteOneOff, assignOneOffDay, toggleOneOff, addEventAsOneOff,
    // Drag
    onTabDragStart, onTabDragOver, onTabDragEnd,
    onBriefDragStart, onBriefDragOver, onBriefDragEnd,
    // Tab rename
    startEditTab, saveTabName,
    // Email actions
    toggleIgnored, confirmBlockEmail, cancelBlock, applyBlock,
    // Backlog
    promoteBacklogToOneOff, dismissBacklog,
  };
}
