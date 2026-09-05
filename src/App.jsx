import { useState, useMemo, useRef, useEffect, useCallback } from "react";

// ─── Supabase Config ──────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ssiserjdpsvuqhnzykls.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzaXNlcmpkcHN2dXFobnp5a2xzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNDQ5MDEsImV4cCI6MjA5NDgyMDkwMX0.9FacnG4RLpnEqK4AFzfY7YBlxawhlJySvMpyyWDOvhI";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Unified helper using official Supabase client
const sb = {
  async getUser(username) {
    const { data, error } = await supabase.from("users").select("*").eq("username", username);
    if (error) throw new Error(error.message);
    return data;
  },
  async createUser(userData) {
    const { data, error } = await supabase.from("users").insert(userData).select();
    if (error) throw new Error(error.message);
    return data;
  },
  async getWorkouts(username) {
    const { data, error } = await supabase.from("workouts").select("*").eq("username", username).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },
  async createWorkout(workoutData) {
    const { data, error } = await supabase.from("workouts").insert(workoutData).select();
    if (error) throw new Error(error.message);
    return data;
  },
  async updateWorkout(id, sets) {
    const { error } = await supabase.from("workouts").update({ sets }).eq("id", id);
    if (error) throw new Error(error.message);
  },
  async deleteWorkout(id) {
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
  async getCustomExercises(username) {
    const { data, error } = await supabase.from("custom_exercises").select("*").eq("username", username);
    if (error) throw new Error(error.message);
    return data;
  },
  async createCustomExercise(exData) {
    const { data, error } = await supabase.from("custom_exercises").insert(exData).select();
    if (error) throw new Error(error.message);
    return data;
  },
  async getSubscribers() {
    const { data, error } = await supabase.from("users").select("username,email,joined_date").order("joined_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }
};

// ─── Exercise Categories ──────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = {
  "Legs":      ["Squat","Leg Press","Romanian Deadlift","Leg Curl","Leg Extension","Calf Raise"],
  "Glutes":    ["Hip Thrust","Glute Bridge","Cable Kickback"],
  "Chest":     ["Bench Press","Incline Bench","Dips","Cable Fly","Chest Press"],
  "Back":      ["Deadlift","Barbell Row","Lat Pulldown","Cable Row","Pull-ups"],
  "Shoulders": ["Overhead Press","Lateral Raise","Front Raise","Face Pull"],
  "Biceps":    ["Barbell Curl","Hammer Curl","Cable Curl","Incline Curl"],
  "Triceps":   ["Skull Crusher","Tricep Pushdown","Close Grip Bench","Overhead Extension"],
  "Core":      ["Plank","Crunch","Cable Crunch","Hanging Leg Raise","Russian Twist"]
};
const CATEGORY_NAMES = Object.keys(DEFAULT_CATEGORIES);

function buildCategories(customExercises) {
  const merged = {};
  CATEGORY_NAMES.forEach(cat => { merged[cat] = [...DEFAULT_CATEGORIES[cat]]; });
  if (customExercises) {
    customExercises.forEach(({ name, category }) => {
      if (!merged[category]) merged[category] = [];
      if (!merged[category].includes(name)) merged[category].push(name);
    });
  }
  return merged;
}

function findCategory(exerciseName, categories) {
  for (const [cat, exercises] of Object.entries(categories)) {
    if (exercises.includes(exerciseName)) return cat;
  }
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function simpleHash(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; return String(h); }
const ADMIN_PASSWORD = "Infinit3Creature2000";
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const getWeekKey = (d) => { const dt = new Date(d), day = dt.getDay(), diff = dt.getDate() - day + (day === 0 ? -6 : 1); return new Date(dt.setDate(diff)).toISOString().split("T")[0]; };
const todayStr = () => new Date().toISOString().split("T")[0];
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// ─── Drum Picker ──────────────────────────────────────────────────────────────
function DrumPicker({ value, onChange, min = 1, max = 100, step = 1, label }) {
  const containerRef = useRef(null);
  const lastY = useRef(null);
  const accum = useRef(0);
  const numVal = value === "" ? 0 : Number(value);
  const snap = useCallback((v) => Math.max(min, Math.min(max, Math.round(v / step) * step)), [min, max, step]);
  const change = useCallback((delta) => onChange(String(snap(numVal + delta))), [numVal, snap, onChange]);
  const handleWheel = useCallback((e) => { e.preventDefault(); change(e.deltaY > 0 ? -step : step); }, [change, step]);
  const handleTouchStart = (e) => { lastY.current = e.touches[0].clientY; accum.current = 0; };
  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const dy = lastY.current - e.touches[0].clientY;
    accum.current += dy; lastY.current = e.touches[0].clientY;
    if (Math.abs(accum.current) >= 30) { change(accum.current > 0 ? step : -step); accum.current = 0; }
  }, [change, step]);
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => { el.removeEventListener("wheel", handleWheel); el.removeEventListener("touchmove", handleTouchMove); };
  }, [handleWheel, handleTouchMove]);
  const rows = [
    { val: snap(numVal - step * 2), size: 15, opacity: 0.18, fw: 300 },
    { val: snap(numVal - step),     size: 22, opacity: 0.35, fw: 400 },
    { val: numVal,                   size: 36, opacity: 1,    fw: 700, selected: true },
    { val: snap(numVal + step),     size: 22, opacity: 0.35, fw: 400 },
    { val: snap(numVal + step * 2), size: 15, opacity: 0.18, fw: 300 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      {label && <div style={{ fontSize: 10, fontWeight: 700, color: "#888888", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 6, paddingTop: 10 }}>{label}</div>}
      <div ref={containerRef} onTouchStart={handleTouchStart} onTouchEnd={() => { accum.current = 0; }}
        style={{ userSelect: "none", touchAction: "none", cursor: "ns-resize", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {rows.map((r, i) => (
          <div key={i} onClick={() => { if (i < 2) change(step * (2 - i)); else if (i > 2) change(-step * (i - 2)); }}
            style={{ height: r.selected ? 58 : i === 1 || i === 3 ? 42 : 32, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", cursor: r.selected ? "default" : "pointer" }}>
            <span style={{ fontSize: r.size, color: `rgba(255,255,255,${r.opacity})`, fontWeight: r.fw, fontFamily: "'Poppins',sans-serif", transition: "all .15s", letterSpacing: r.selected ? "-0.5px" : "0" }}>{r.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Plate Calculator ─────────────────────────────────────────────────────────
const PLATE_SIZES = [2.5, 5, 10, 25, 35, 45];
const PLATE_COLORS = {
  2.5: { bg: "#e8e8f0", text: "#8888a8", h: 28 }, 5: { bg: "#d0d0e0", text: "#6868a0", h: 36 },
  10: { bg: "#a8c8f5", text: "#ffffff", h: 48 }, 25: { bg: "#90d098", text: "#1a6030", h: 60 },
  35: { bg: "#f0d060", text: "#806010", h: 68 }, 45: { bg: "#00c805", text: "#fff", h: 76 }
};
const BAR_OPTIONS = [
  { name: "Standard Bar", short: "45lb Bar", weight: 45 },
  { name: "EZ Curl Bar", short: "25lb Bar", weight: 25 },
  { name: "Smith Bar", short: "20lb Bar", weight: 20 },
  { name: "No Bar", short: "No Bar", weight: 0 }
];

function PlateCalculator({ onWeightChange }) {
  const [bar, setBar] = useState(BAR_OPTIONS[0]);
  const [plates, setPlates] = useState([]);
  const total = useMemo(() => bar.weight + plates.reduce((s, p) => s + p, 0) * 2, [bar, plates]);
  useEffect(() => { onWeightChange(total); }, [total]);
  const displayPlates = [...plates].reverse();
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div className="lbl">Bar Type</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {BAR_OPTIONS.map(b => (
            <button key={b.name} onClick={() => setBar(b)}
              style={{ flex: 1, minWidth: "45%", padding: "9px 6px", borderRadius: 12, border: `1.5px solid ${bar.name === b.name ? "#a8c8f5" : "rgba(255,255,255,.1)"}`, background: bar.name === b.name ? "rgba(0,200,5,.1)" : "rgba(22,22,22,.95)", color: bar.name === b.name ? "#00c805" : "#888888", fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {b.short}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div className="lbl">Add Plates (both sides)</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PLATE_SIZES.map(w => { const c = PLATE_COLORS[w]; return (
            <button key={w} onClick={() => setPlates(prev => [...prev, w])}
              style={{ padding: "10px 14px", borderRadius: 12, border: "none", background: c.bg, color: c.text, fontFamily: "'Poppins',sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer", minWidth: 52 }}>
              {w}
            </button>
          ); })}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="lbl">Rack (tap × to remove)</div>
        <div style={{ background: "rgba(22,22,22,.98)", borderRadius: 16, padding: "16px 12px", border: "1.5px solid rgba(255,255,255,.07)", minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center", overflowX: "auto" }}>
          {plates.length === 0 ? <span style={{ fontSize: 13, color: "#c0c8e0" }}>No plates added yet</span> : (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              {displayPlates.map((w, i) => { const c = PLATE_COLORS[w]; const origIdx = plates.length - 1 - i; return (
                <div key={i} style={{ position: "relative" }}>
                  <button onClick={() => setPlates(prev => prev.filter((_, idx) => idx !== origIdx))}
                    style={{ position: "absolute", top: -8, right: -6, width: 18, height: 18, borderRadius: "50%", background: "rgba(220,80,80,.85)", border: "none", color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 700, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  <div style={{ width: 32, height: c.h, background: c.bg, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: c.text, transform: "rotate(-90deg)", whiteSpace: "nowrap" }}>{w}</span>
                  </div>
                </div>
              ); })}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0 4px" }}>
                <div style={{ width: 40, height: 16, background: "linear-gradient(135deg,#c8d0e8,#a0aac8)", borderRadius: 8 }} />
                <span style={{ fontSize: 9, color: "#888888", marginTop: 3, fontWeight: 600 }}>{bar.weight}lb</span>
              </div>
              {[...displayPlates].reverse().map((w, i) => { const c = PLATE_COLORS[w]; return (
                <div key={i} style={{ width: 32, height: c.h, background: c.bg, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: c.text, transform: "rotate(-90deg)", whiteSpace: "nowrap" }}>{w}</span>
                </div>
              ); })}
            </div>
          )}
        </div>
        {plates.length > 0 && <button onClick={() => setPlates([])} style={{ marginTop: 8, background: "none", border: "1.5px solid rgba(220,100,100,.3)", borderRadius: 10, padding: "6px 14px", fontFamily: "'Poppins',sans-serif", fontSize: 12, color: "#ff4444", cursor: "pointer", fontWeight: 600 }}>Clear all</button>}
      </div>
      <div style={{ background: "rgba(0,200,5,.08)", borderRadius: 14, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1.5px solid rgba(0,200,5,.2)" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#00c805" }}>Total Weight</span>
        <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 30, fontWeight: 700, color: "#ffffff" }}>{total} <span style={{ fontSize: 14, color: "#888888" }}>lbs</span></span>
      </div>
    </div>
  );
}

// ─── Dumbbell Picker ──────────────────────────────────────────────────────────
const DB_WEIGHTS = [5,10,12.5,15,20,25,30,35,40,45,50,55,60,65,70,75,80];
function DumbbellPicker({ onWeightChange }) {
  const [selected, setSelected] = useState(null);
  const [combined, setCombined] = useState(false);
  const total = useMemo(() => selected === null ? 0 : combined ? selected * 2 : selected, [selected, combined]);
  useEffect(() => { if (selected !== null) onWeightChange(total); }, [total, selected]);
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div className="lbl">Log As</div>
        <div style={{ display: "flex", background: "rgba(255,255,255,.05)", borderRadius: 30, padding: 4, width: "fit-content" }}>
          {[false,true].map(val => (
            <button key={String(val)} onClick={() => setCombined(val)}
              style={{ padding: "8px 16px", borderRadius: 26, border: "none", cursor: "pointer", fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 600, background: combined === val ? "rgba(255,255,255,.1)" : "rgba(28,28,28,.98)", color: "#ffffff" }}>
              {val ? "Combined Total" : "Single DB"}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "#555555", marginTop: 6 }}>{combined ? "Logs both DBs combined (e.g. 30+30 = 60 lbs)" : "Logs one DB weight (e.g. 30 lbs)"}</p>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div className="lbl">Select Dumbbell Weight</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {DB_WEIGHTS.map(w => (
            <button key={w} onClick={() => setSelected(w)}
              style={{ padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${selected === w ? "#a8c8f5" : "rgba(255,255,255,.1)"}`, background: selected === w ? "rgba(0,200,5,.12)" : "rgba(24,24,24,.98)", color: selected === w ? "#00c805" : "#6068a0", fontFamily: "'Poppins',sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer", minWidth: 52 }}>
              {w}
            </button>
          ))}
        </div>
      </div>
      {selected !== null && (
        <div style={{ background: "rgba(0,200,5,.08)", borderRadius: 14, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1.5px solid rgba(0,200,5,.2)" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#00c805" }}>{combined ? `${selected} + ${selected}` : "Single DB"}</span>
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 30, fontWeight: 700, color: "#ffffff" }}>{total} <span style={{ fontSize: 14, color: "#888888" }}>lbs</span></span>
        </div>
      )}
    </div>
  );
}


// ─── Pulley Picker ────────────────────────────────────────────────────────────
const PULLEY_WEIGHTS = [5,10,15,20,25,30,35,40,45,50,55,60,70,80,90,100,110,120,130,140,150,160,170,180,190,200];
function PulleyPicker({ onWeightChange }) {
  const [selected, setSelected] = useState(null);
  useEffect(() => { if (selected !== null) onWeightChange(selected); }, [selected]);
  return (
    <div>
      <div className="lbl">Select Cable / Pulley Weight (lbs)</div>
      <p style={{ fontSize: 11, color: "#555555", marginBottom: 14 }}>Tap the weight shown on the cable machine stack</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {PULLEY_WEIGHTS.map(w => (
          <button key={w} onClick={() => setSelected(w)}
            style={{ padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${selected === w ? "#a8c8f5" : "rgba(255,255,255,.1)"}`, background: selected === w ? "rgba(0,200,5,.12)" : "rgba(24,24,24,.98)", color: selected === w ? "#ffffff" : "#6068a0", fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", minWidth: 52 }}>
            {w}
          </button>
        ))}
      </div>
      {selected !== null && (
        <div style={{ background: "rgba(0,200,5,.08)", borderRadius: 14, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1.5px solid rgba(0,200,5,.2)" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#00c805" }}>Pulley Weight</span>
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 30, fontWeight: 700, color: "#ffffff" }}>{selected} <span style={{ fontSize: 14, color: "#888888" }}>lbs</span></span>
        </div>
      )}
    </div>
  );
}


// ─── Searchable Exercise Select ───────────────────────────────────────────────
function SearchableExerciseSelect({ categories, value, onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Flatten all exercises with their category
  const allExercises = useMemo(() => {
    const list = [];
    Object.entries(categories).forEach(([cat, exercises]) => {
      exercises.forEach(ex => list.push({ name: ex, category: cat }));
    });
    return list;
  }, [categories]);

  // Filter based on query
  const filtered = useMemo(() => {
    if (!query.trim()) return allExercises;
    const q = query.toLowerCase().trim();
    return allExercises.filter(ex => ex.name.toLowerCase().includes(q));
  }, [query, allExercises]);

  // Group filtered results by category
  const groupedFiltered = useMemo(() => {
    const grouped = {};
    filtered.forEach(ex => {
      if (!grouped[ex.category]) grouped[ex.category] = [];
      grouped[ex.category].push(ex.name);
    });
    return grouped;
  }, [filtered]);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, []);

  const select = (name) => {
    onChange(name);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative", marginBottom: 10 }}>
      {/* Selected value display / search trigger */}
      <div
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50); }}
        style={{ background: "rgba(28,28,28,.98)", border: `1.5px solid ${open ? "#a8c8f5" : "rgba(255,255,255,.1)"}`, borderRadius: open ? "12px 12px 0 0" : 12, color: "#ffffff", padding: "11px 15px", width: "100%", fontFamily: "'Poppins',sans-serif", fontSize: 14, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: open ? "0 0 0 3px rgba(168,200,245,.18)" : "none", transition: "all .2s" }}>
        <span style={{ fontWeight: 500 }}>{value || "Select exercise"}</span>
        <span style={{ color: "#888888", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "rgba(15,15,15,.99)", backdropFilter: "blur(16px)", border: "1.5px solid rgba(0,200,5,.25)", borderTop: "none", borderRadius: "0 0 14px 14px", zIndex: 50, maxHeight: 320, overflowY: "auto", boxShadow: "0 12px 32px rgba(255,255,255,.08)" }}>
          {/* Search input */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,.06)", position: "sticky", top: 0, background: "rgba(15,15,15,.99)" }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type to search exercises..."
              style={{ width: "100%", background: "rgba(0,200,5,.08)", border: "1.5px solid rgba(0,200,5,.2)", borderRadius: 10, padding: "9px 14px", fontFamily: "'Poppins',sans-serif", fontSize: 13, color: "#ffffff", outline: "none" }}
            />
            {query && (
              <button onClick={() => setQuery("")}
                style={{ position: "absolute", right: 22, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#888888", cursor: "pointer", fontSize: 16 }}>×</button>
            )}
          </div>

          {/* Results */}
          {filtered.length === 0 && (
            <div style={{ padding: "16px", textAlign: "center", fontSize: 13, color: "#555555" }}>No exercises found for "{query}"</div>
          )}
          {Object.entries(groupedFiltered).map(([cat, exercises]) => (
            <div key={cat}>
              <div style={{ padding: "8px 14px 4px", fontSize: 10, fontWeight: 700, color: "#888888", letterSpacing: 1.5, textTransform: "uppercase", background: "rgba(255,255,255,.05,.08)" }}>{cat}</div>
              {exercises.map(ex => (
                <button key={ex} onClick={() => select(ex)}
                  style={{ width: "100%", padding: "11px 16px", border: "none", background: ex === value ? "rgba(0,200,5,.1)" : "none", color: ex === value ? "#00c805" : "#ffffff", fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: ex === value ? 600 : 400, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                  <span>
                    {query ? (
                      // Highlight matching letters
                      (() => {
                        const q = query.toLowerCase();
                        const idx = ex.toLowerCase().indexOf(q);
                        if (idx === -1) return ex;
                        return (
                          <span>
                            {ex.slice(0, idx)}
                            <strong style={{ color: "#00c805", background: "rgba(168,200,245,.2)", borderRadius: 3, padding: "0 2px" }}>{ex.slice(idx, idx + q.length)}</strong>
                            {ex.slice(idx + q.length)}
                          </span>
                        );
                      })()
                    ) : ex}
                  </span>
                  {ex === value && <span style={{ color: "#00c805", fontSize: 14 }}>✓</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Weight Input ─────────────────────────────────────────────────────────────
function WeightInput({ onWeightChange }) {
  const [mode, setMode] = useState("barbell");
  const [manualVal, setManualVal] = useState("");
  const MODES = [{ key: "barbell", label: "Barbell" }, { key: "dumbbell", label: "Dumbbell" }, { key: "machine", label: "Machine / Cable" }, { key: "bodyweight", label: "Bodyweight" }, { key: "manual", label: "Manual" }];
  return (
    <div style={{ background: "rgba(20,20,20,.95)", borderRadius: 18, border: "1.5px solid rgba(255,255,255,.07)", padding: 18 }}>
      <div style={{ display: "flex", flexWrap: "wrap", background: "rgba(10,10,10,.9)", borderRadius: 16, padding: 4, marginBottom: 20, gap: 4 }}>
        {MODES.map(m => (
          <button key={m.key} onClick={() => { setMode(m.key); if (m.key === "bodyweight") onWeightChange(0); }}
            style={{ flex: 1, minWidth: "45%", padding: "8px 4px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 600, background: mode === m.key ? "rgba(0,200,5,.12)" : "rgba(25,25,25,.98)", color: mode === m.key ? "#00c805" : "#aaaaaa", border: `1.5px solid ${mode === m.key ? "#00c805" : "rgba(255,255,255,.08)"}` }}>
            {m.label}
          </button>
        ))}
      </div>
      {mode === "barbell"    && <PlateCalculator onWeightChange={onWeightChange} />}
      {mode === "dumbbell"   && <DumbbellPicker  onWeightChange={onWeightChange} />}
      {mode === "machine" && <PulleyPicker onWeightChange={onWeightChange} />}
      {mode === "bodyweight" && (
        <div style={{ background: "rgba(0,200,5,.06)", borderRadius: 14, padding: "20px 18px", textAlign: "center", border: "1.5px solid rgba(0,200,5,.2)" }}>
          <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 28, fontWeight: 700, color: "#ffffff", marginBottom: 6 }}>Bodyweight</div>
          <div style={{ fontSize: 12, color: "#888888" }}>Logged as 0 lbs — no added weight</div>
        </div>
      )}
      {mode === "manual" && (
        <div>
          <div className="lbl">Enter Any Weight</div>
          <p style={{ fontSize: 12, color: "#555555", marginBottom: 14 }}>For unusual weights like 2.5, 7, 62 lbs etc.</p>
          <input type="number" value={manualVal} onChange={e => { setManualVal(e.target.value); onWeightChange(Number(e.target.value)); }} placeholder="e.g. 7.5"
            style={{ background: "rgba(28,28,28,.98)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 12, color: "#ffffff", padding: "11px 15px", width: "100%", fontFamily: "'Poppins',sans-serif", fontSize: 22, fontWeight: 700, outline: "none", textAlign: "center" }} />
          {manualVal && (
            <div style={{ marginTop: 14, background: "rgba(0,200,5,.08)", borderRadius: 14, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1.5px solid rgba(0,200,5,.2)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#00c805" }}>Total Weight</span>
              <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 30, fontWeight: 700, color: "#ffffff" }}>{manualVal} <span style={{ fontSize: 14, color: "#888888" }}>lbs</span></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const VIEWPORT_FIX = () => {
  useEffect(() => {
    // Ensure proper mobile viewport
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
  }, []);
  return null;
};

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Poppins:wght@300;400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  .glass{background:rgba(18,18,18,.98);backdrop-filter:blur(18px);border:1.5px solid rgba(255,255,255,.07);border-radius:22px;box-shadow:0 8px 32px rgba(0,0,0,.4)}
  .tab-pill{background:none;border:none;cursor:pointer;padding:10px 16px;font-family:'Poppins',sans-serif;font-size:13px;font-weight:500;border-radius:30px;transition:all .22s;color:#bbbbbb}
  .tab-on{background:rgba(255,255,255,.1);color:#ffffff;box-shadow:0 4px 16px rgba(0,0,0,.3)}
  .field{background:rgba(28,28,28,.98);border:1.5px solid rgba(255,255,255,.1);border-radius:12px;color:#ffffff;padding:11px 15px;width:100%;font-family:'Poppins',sans-serif;font-size:14px;outline:none}
  select.field{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23a0a8d0' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;background-color:rgba(28,28,28,.98);padding-right:34px}
  .save-btn{background:#00c805;border:none;border-radius:14px;padding:14px;font-family:'Poppins',sans-serif;font-size:14px;font-weight:700;cursor:pointer;color:#000000;width:100%;box-shadow:0 6px 22px rgba(0,200,5,.25);transition:all .2s}
  .save-btn:hover{transform:translateY(-2px)}
  .add-set-btn{background:rgba(255,255,255,.04);border:1.5px dashed rgba(255,255,255,.15);border-radius:12px;padding:10px;font-family:'Poppins',sans-serif;font-size:13px;cursor:pointer;color:#888888;width:100%;font-weight:500}
  .pr-row{background:rgba(22,22,22,.98);border:1.5px solid rgba(255,255,255,.07);border-radius:18px;padding:18px 20px;margin-bottom:11px;display:flex;justify-content:space-between;align-items:center;transition:transform .2s}
  .pr-row:hover{transform:translateY(-2px)}
  .chip{padding:7px 15px;font-size:12px;font-weight:500;cursor:pointer;border-radius:30px;border:1.5px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#cccccc;transition:all .18s;font-family:'Poppins',sans-serif}
  .chip-on{background:rgba(0,200,5,.12);color:#00c805;border-color:rgba(0,200,5,.4);box-shadow:0 4px 14px rgba(0,200,5,.15)}
  .stat-box{background:rgba(22,22,22,.98);backdrop-filter:blur(12px);border:1.5px solid rgba(255,255,255,.07);border-radius:18px;padding:20px 18px}
  .rm-btn{background:rgba(255,68,68,.08);border:none;border-radius:8px;width:32px;height:32px;cursor:pointer;color:#ff4444;font-size:17px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .recent-card{background:rgba(20,20,20,.98);border-radius:14px;padding:14px 16px;margin-bottom:8px;border:1.5px solid rgba(255,255,255,.07)}
  .spill{font-size:12px;color:#00c805;background:rgba(0,200,5,.1);padding:4px 12px;border-radius:20px;font-weight:500}
  .drum-wrap{background:rgba(22,22,22,.98);border:1.5px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;flex:1;position:relative}
  .drum-wrap::after{content:'';position:absolute;left:0;right:0;top:0;height:55px;background:linear-gradient(to bottom,rgba(18,18,18,.98),transparent);pointer-events:none;z-index:2}
  .drum-wrap::before{content:'';position:absolute;left:0;right:0;bottom:0;height:55px;background:linear-gradient(to top,rgba(18,18,18,.98),transparent);pointer-events:none;z-index:2}
  .lbl{font-size:11px;font-weight:700;color:#666666;letter-spacing:1.2px;text-transform:uppercase;display:block;margin-bottom:8px}
  .err-box{background:rgba(255,68,68,.1);border:1px solid rgba(255,68,68,.3);border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#ff4444}
  .cat-label{font-size:10px;font-weight:700;color:#555555;letter-spacing:1.5px;text-transform:uppercase;padding:12px 0 6px;display:block}
  .progress-indicator{border-radius:16px;padding:16px 18px;margin-bottom:18px;border:1.5px solid}
  .overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px}
  .fade{animation:fu .3s ease}
  @keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
  html,body{width:100%;overflow-x:hidden;-webkit-text-size-adjust:100%;background:#0d0d0d}
  *{-webkit-tap-highlight-color:transparent}
`;

const BG = () => (
  <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
    <div style={{ position: "absolute", top: -100, right: -80, width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,200,5,.04) 0%,transparent 68%)" }} />
    <div style={{ position: "absolute", top: 160, left: -90, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,200,5,.03) 0%,transparent 68%)" }} />
    <div style={{ position: "absolute", bottom: 80, right: 10, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle,rgba(240,180,40,.03) 0%,transparent 68%)" }} />
  </div>
);

// ─── Progress Indicator ───────────────────────────────────────────────────────
function ProgressIndicator({ weekProgress }) {
  const indicator = useMemo(() => {
    if (weekProgress.length < 2) return null;
    const weeks = weekProgress.slice(-3);
    const weightTrend = weeks.every((w, i) => i === 0 || w[1].maxWeight >= weeks[i-1][1].maxWeight);
    const volumeTrend = weeks.every((w, i) => i === 0 || w[1].totalVol >= weeks[i-1][1].totalVol);
    const lastTwo = weekProgress.slice(-2);
    const weightFlat = lastTwo[1][1].maxWeight === lastTwo[0][1].maxWeight;
    const volFlat = lastTwo[1][1].totalVol === lastTwo[0][1].totalVol;
    if (weightTrend && volumeTrend) return { msg: "You're progressing!", sub: "Weight and volume are both going up. Keep it up.", bg: "rgba(0,200,5,.1)", border: "rgba(0,200,5,.25)", color: "#ffffff" };
    if (!weightFlat && volumeTrend) return { msg: "Volume is increasing!", sub: "Great work. Consider adding a little more weight soon.", bg: "rgba(100,150,255,.1)", border: "rgba(120,180,255,.3)", color: "#ffffff" };
    if (weightFlat && volFlat) return { msg: "Plateau detected", sub: "Weight and volume have been flat. Try adding 5 lbs or one extra rep this session.", bg: "rgba(255,210,150,.15)", border: "rgba(255,180,80,.3)", color: "#a06010" };
    return { msg: "Keep going!", sub: "Log more sessions to see your full trend.", bg: "rgba(255,255,255,.05,.15)", border: "rgba(160,180,240,.3)", color: "#ffffff" };
  }, [weekProgress]);
  if (!indicator) return null;
  return (
    <div className="progress-indicator" style={{ background: indicator.bg, borderColor: indicator.border }}>
      <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 18, fontWeight: 700, color: indicator.color, marginBottom: 4 }}>{indicator.msg}</div>
      <div style={{ fontSize: 13, color: "#888888" }}>{indicator.sub}</div>
    </div>
  );
}

// ─── Admin Modals ─────────────────────────────────────────────────────────────
function AdminLoginModal({ onSuccess, onClose }) {
  const [pass, setPass] = useState(""); const [error, setError] = useState("");
  const submit = () => { if (pass === ADMIN_PASSWORD) onSuccess(); else { setError("Incorrect password."); setPass(""); } };
  return (
    <div className="overlay">
      <div className="glass" style={{ width: "100%", maxWidth: 340, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 20, fontWeight: 700, color: "#ffffff" }}>Admin Access</p>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#888888", cursor: "pointer" }}>×</button>
        </div>
        <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="••••••••••••" className="field" style={{ marginBottom: 14 }} />
        {error && <div className="err-box">{error}</div>}
        <button onClick={submit} className="save-btn">Enter</button>
      </div>
    </div>
  );
}

function AdminView({ onClose }) {
  const [emails, setEmails] = useState(null);
  useEffect(() => {
    sb.getSubscribers()
      .then(data => setEmails(data || []))
      .catch(() => setEmails([]));
  }, []);
  return (
    <div className="overlay">
      <div className="glass" style={{ width: "100%", maxWidth: 440, padding: 28, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 20, fontWeight: 700, color: "#ffffff" }}>Subscribers</p>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#888888", cursor: "pointer" }}>×</button>
        </div>
        {emails === null && <p style={{ color: "#888888" }}>Loading...</p>}
        {emails !== null && emails.length === 0 && <p style={{ color: "#555555" }}>No signups yet.</p>}
        {emails && emails.length > 0 && (
          <>
            <div style={{ background: "rgba(0,200,5,.08)", border: "1.5px solid rgba(0,200,5,.2)", borderRadius: 12, padding: "10px 14px", marginBottom: 18, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "#4a7aaf", fontWeight: 600 }}>Total subscribers</span>
              <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 24, fontWeight: 700, color: "#ffffff" }}>{emails.length}</span>
            </div>
            {emails.map((e, i) => (
              <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,.06)", display: "flex", justifyContent: "space-between" }}>
                <div><div style={{ fontSize: 14, fontWeight: 600, color: "#ffffff" }}>{e.email}</div><div style={{ fontSize: 11, color: "#555555" }}>@{e.username} · {e.joined_date}</div></div>
              </div>
            ))}
            <button onClick={() => { const csv = "Email,Username,Joined\n" + emails.map(e => `${e.email},${e.username},${e.joined_date}`).join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "subscribers.csv"; a.click(); }}
              style={{ marginTop: 16, background: "#00c805", border: "none", borderRadius: 12, padding: "12px 20px", fontFamily: "'Poppins',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#000000", width: "100%" }}>
              Download CSV
            </button>
          </>
        )}
      </div>
    </div>
  );
}



// ─── Account Settings Modal ───────────────────────────────────────────────────
function AccountSettingsModal({ user, onUpdate, onClose }) {
  const [newUsername, setNewUsername] = useState(user.username);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [editingGoal, setEditingGoal] = useState(false);

  const saveChanges = async () => {
    setMsg(""); setError("");
    if (newPassword && newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setSaving(true);
    try {
      const updates = {};
      if (newUsername.trim() && newUsername.trim() !== user.username) {
        const existing = await sb.getUser(newUsername.trim().toLowerCase());
        if (existing && existing.length > 0) { setError("Username already taken."); setSaving(false); return; }
        updates.username = newUsername.trim().toLowerCase();
      }
      if (newPassword) updates.password_hash = simpleHash(newPassword);
      if (Object.keys(updates).length === 0) { setError("No changes made."); setSaving(false); return; }
      const { error: err } = await supabase.from("users").update(updates).eq("id", user.id);
      if (err) throw new Error(err.message);
      const updatedUser = { ...user, ...updates };
      localStorage.setItem("iron_log_user", JSON.stringify(updatedUser));
      onUpdate(updatedUser);
      setMsg("Changes saved successfully!");
      setNewPassword(""); setConfirmPassword("");
    } catch (e) { setError(e.message || "Error saving changes."); }
    setSaving(false);
  };

  return (
    <div className="overlay">
      <div className="glass" style={{ width: "100%", maxWidth: 400, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 20, fontWeight: 700, color: "#ffffff" }}>Account Settings</p>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#888888", cursor: "pointer" }}>×</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="lbl">Username</label>
          <input value={newUsername} onChange={e => setNewUsername(e.target.value)} className="field" placeholder="New username" />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="lbl">New Password</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="field" placeholder="Leave blank to keep current" />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label className="lbl">Confirm New Password</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="field" placeholder="Re-enter new password" />
        </div>

        {error && <div className="err-box" style={{ marginBottom: 14 }}>{error}</div>}
        {msg && <div style={{ background: "rgba(0,200,5,.12)", border: "1.5px solid rgba(100,200,130,.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#2a7040" }}>{msg}</div>}

        {/* Goal section */}
        <div style={{ marginBottom: 20, padding: "16px", background: "rgba(255,255,255,.04)", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label className="lbl" style={{ marginBottom: 0 }}>Training Goal</label>
            <button onClick={() => setEditingGoal(true)}
              style={{ background: "none", border: "1px solid rgba(0,200,5,.3)", borderRadius: 8, padding: "4px 12px", fontFamily: "'Poppins',sans-serif", fontSize: 12, color: "#00c805", cursor: "pointer" }}>
              Change
            </button>
          </div>
          <p style={{ fontSize: 14, color: "#ffffff", fontWeight: 600 }}>
            {user.goal ? GOALS.find(g => g.key === user.goal)?.label || user.goal : "Not set"}
          </p>
          {user.goal === "improve_area" && user.focus_areas?.length > 0 && (
            <p style={{ fontSize: 12, color: "#666666", marginTop: 4 }}>Focus: {user.focus_areas.join(", ")}</p>
          )}
        </div>

        <button onClick={saveChanges} disabled={saving} className="save-btn">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Edit Workout Modal ───────────────────────────────────────────────────────
function EditWorkoutModal({ workout, onSave, onDelete, onClose }) {
  const [editSets, setEditSets] = useState(
    (Array.isArray(workout.sets) ? workout.sets : []).map((s, i) => ({ ...s, id: i }))
  );
  const [editExercise, setEditExercise] = useState(workout.exercise);
  const [saving, setSaving] = useState(false);

  const updateSet = (i, field, val) => { const s = [...editSets]; s[i][field] = val; setEditSets(s); };

  return (
    <div className="overlay" style={{ alignItems: "flex-start", paddingTop: 40, overflowY: "auto" }}>
      <div className="glass" style={{ width: "100%", maxWidth: 440, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 18, fontWeight: 700, color: "#ffffff" }}>Edit Session</p>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#888888", cursor: "pointer" }}>×</button>
        </div>
        <p style={{ fontSize: 11, color: "#555555", marginBottom: 14 }}>{formatDate(workout.date)}</p>
        <div style={{ marginBottom: 18 }}>
          <label className="lbl">Exercise Name</label>
          <input value={editExercise} onChange={e => setEditExercise(e.target.value)} className="field" placeholder="Exercise name" />
        </div>

        {editSets.map((s, i) => (
          <div key={s.id} style={{ background: "rgba(20,20,20,.95)", borderRadius: 14, padding: 14, marginBottom: 12, border: "1.5px solid rgba(255,255,255,.07)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#00c805" }}>SET {i + 1}</span>
              {editSets.length > 1 && <button onClick={() => setEditSets(editSets.filter((_, idx) => idx !== i))} style={{ background: "rgba(255,120,120,.07)", border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", color: "#d0a0a0", fontSize: 15 }}>×</button>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#888888", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Reps</label>
                <input type="number" value={s.reps} onChange={e => updateSet(i, "reps", Number(e.target.value))}
                  style={{ background: "rgba(28,28,28,.98)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 10, color: "#ffffff", padding: "10px 12px", width: "100%", fontFamily: "'Poppins',sans-serif", fontSize: 18, fontWeight: 700, outline: "none", textAlign: "center" }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#888888", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Weight (lbs)</label>
                <input type="number" value={s.weight} onChange={e => updateSet(i, "weight", Number(e.target.value))}
                  style={{ background: "rgba(28,28,28,.98)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 10, color: "#ffffff", padding: "10px 12px", width: "100%", fontFamily: "'Poppins',sans-serif", fontSize: 18, fontWeight: 700, outline: "none", textAlign: "center" }} />
              </div>
            </div>
          </div>
        ))}

        <button onClick={() => setEditSets([...editSets, { id: Date.now(), reps: 8, weight: 0 }])}
          style={{ width: "100%", padding: 10, borderRadius: 12, border: "1.5px dashed rgba(168,190,240,.55)", background: "rgba(20,20,20,.95)", color: "#8098c8", fontFamily: "'Poppins',sans-serif", fontSize: 13, cursor: "pointer", marginBottom: 16 }}>
          + Add set
        </button>

        <button onClick={() => onSave(editSets, editExercise.trim() || workout.exercise)} disabled={saving}
          style={{ background: "#00c805", border: "none", borderRadius: 14, padding: 13, fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#000000", width: "100%", marginBottom: 10 }}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button onClick={onDelete}
          style={{ background: "rgba(255,100,100,.08)", border: "1.5px solid rgba(255,120,120,.3)", borderRadius: 14, padding: 13, fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#ff4444", width: "100%" }}>
          Delete Workout
        </button>
      </div>
    </div>
  );
}


// ─── Goal Onboarding ──────────────────────────────────────────────────────────
const GOALS = [
  {
    key: "build_muscle",
    label: "Build Muscle",
    description: "Focuses on gradually increasing the training stimulus to support muscle growth. Recommendations may emphasize reps, productive training volume, consistency, and progressive overload.",
    note: "Building muscle does not automatically mean becoming bulky. Muscle growth is gradual and depends on your training, nutrition, genetics, and overall goals."
  },
  {
    key: "gain_strength",
    label: "Gain Strength",
    description: "Focuses on improving how much force you can produce. Recommendations will place more emphasis on weight progression, estimated strength, and performance at similar rep ranges."
  },
  {
    key: "general_fitness",
    label: "General Fitness",
    description: "Focuses on consistent, well-rounded training rather than maximizing one specific outcome. Recommendations prioritize consistency and overall training patterns without aggressively pushing weight or volume increases."
  },
  {
    key: "maintain",
    label: "Maintain Current Fitness",
    description: "Focuses on preserving current strength and training consistency. Stable performance may be considered successful rather than something that always needs to increase."
  },
  {
    key: "improve_area",
    label: "Improve a Specific Body Area",
    description: "Focuses coaching more closely on selected muscle groups such as glutes, legs, back, chest, shoulders, arms, or core."
  },
  {
    key: "not_sure",
    label: "Not Sure Yet",
    description: "Iron Log will still track your progress and give balanced recommendations, but the coaching will be less specialized until you choose a more specific goal."
  }
];

const FOCUS_AREAS = ["Glutes","Legs","Chest","Back","Shoulders","Arms","Core"];

const HELP_QUESTIONS = [
  {
    q: "What would you most like to improve?",
    options: [
      { label: "How my body looks / muscle development", maps: "build_muscle" },
      { label: "How much I can lift", maps: "gain_strength" },
      { label: "Overall health and consistency", maps: "general_fitness" },
      { label: "Keep what I currently have", maps: "maintain" },
      { label: "A specific body area", maps: "improve_area" },
      { label: "I genuinely do not know", maps: "not_sure" }
    ]
  },
  {
    q: "Which statement sounds closest to you?",
    options: [
      { label: "I want to see visible muscle development", maps: "build_muscle" },
      { label: "I want my lifts to get stronger", maps: "gain_strength" },
      { label: "I mainly want to stay active and improve gradually", maps: "general_fitness" },
      { label: "I am happy with my current progress and want to maintain it", maps: "maintain" },
      { label: "I want to focus on one or more specific areas of my body", maps: "improve_area" },
      { label: "None of the above really fit", maps: "not_sure" }
    ]
  }
];

function GoalOnboarding({ user, onComplete }) {
  const [screen, setScreen] = useState("main"); // main | help | focus | confirm
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [helpAnswers, setHelpAnswers] = useState([]);
  const [helpStep, setHelpStep] = useState(0);
  const [suggested, setSuggested] = useState(null);
  const [disclaimer, setDisclaimer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState(null);

  // Tally help answers to suggest a goal
  const computeSuggestion = (answers) => {
    const tally = {};
    answers.forEach(a => { tally[a] = (tally[a] || 0) + 1; });
    return Object.entries(tally).sort((a,b) => b[1]-a[1])[0]?.[0] || "not_sure";
  };

  const handleHelpAnswer = (maps) => {
    const newAnswers = [...helpAnswers, maps];
    if (helpStep < HELP_QUESTIONS.length - 1) {
      setHelpAnswers(newAnswers);
      setHelpStep(helpStep + 1);
    } else {
      const suggestion = computeSuggestion(newAnswers);
      setSuggested(suggestion);
      setSelectedGoal(suggestion);
      setScreen("main");
    }
  };

  const handleGoalSelect = (key) => {
    setSelectedGoal(key);
    setExpandedGoal(key);
  };

  const handleContinue = () => {
    if (!selectedGoal) return;
    if (selectedGoal === "improve_area") { setScreen("focus"); return; }
    setScreen("confirm");
  };

  const handleSave = async () => {
    if (!disclaimer) return;
    setSaving(true);
    try {
      const updates = { goal: selectedGoal };
      if (selectedGoal === "improve_area") updates.focus_areas = selectedAreas;
      else updates.focus_areas = null;
      await supabase.from("users").update(updates).eq("id", user.id);
      const updatedUser = { ...user, ...updates };
      localStorage.setItem("iron_log_user", JSON.stringify(updatedUser));
      onComplete(updatedUser);
    } catch (e) { alert("Error saving goal. Please try again."); }
    setSaving(false);
  };

  const goalObj = GOALS.find(g => g.key === selectedGoal);

  // ── Help Me Choose screen ──
  if (screen === "help") {
    const q = HELP_QUESTIONS[helpStep];
    return (
      <div style={{ fontFamily: "'Poppins',sans-serif", minHeight: "100vh", background: "#0d0d0d", color: "#ffffff", padding: "48px 24px" }}>
        <style>{STYLES}</style>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <button onClick={() => { setScreen("main"); setHelpStep(0); setHelpAnswers([]); }}
            style={{ background: "none", border: "none", color: "#555555", cursor: "pointer", fontFamily: "'Poppins',sans-serif", fontSize: 13, marginBottom: 32, padding: 0 }}>
            ← Back
          </button>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#00c805", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
            Question {helpStep + 1} of {HELP_QUESTIONS.length}
          </p>
          <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 22, fontWeight: 700, color: "#ffffff", marginBottom: 28, lineHeight: 1.3 }}>{q.q}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.options.map((opt, i) => (
              <button key={i} onClick={() => handleHelpAnswer(opt.maps)}
                style={{ padding: "16px 18px", borderRadius: 14, border: "1.5px solid rgba(255,255,255,.1)", background: "rgba(22,22,22,.98)", color: "#dddddd", fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: 500, cursor: "pointer", textAlign: "left", transition: "all .2s" }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Focus areas screen ──
  if (screen === "focus") {
    return (
      <div style={{ fontFamily: "'Poppins',sans-serif", minHeight: "100vh", background: "#0d0d0d", color: "#ffffff", padding: "48px 24px" }}>
        <style>{STYLES}</style>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <button onClick={() => setScreen("main")}
            style={{ background: "none", border: "none", color: "#555555", cursor: "pointer", fontFamily: "'Poppins',sans-serif", fontSize: 13, marginBottom: 32, padding: 0 }}>
            ← Back
          </button>
          <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 26, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>Which areas?</p>
          <p style={{ fontSize: 14, color: "#666666", marginBottom: 28, lineHeight: 1.6 }}>Select one or more areas you want to focus on. You can change these later.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
            {FOCUS_AREAS.map(area => {
              const on = selectedAreas.includes(area);
              return (
                <button key={area} onClick={() => setSelectedAreas(prev => on ? prev.filter(a => a !== area) : [...prev, area])}
                  style={{ padding: "12px 18px", borderRadius: 12, border: `1.5px solid ${on ? "#00c805" : "rgba(255,255,255,.1)"}`, background: on ? "rgba(0,200,5,.1)" : "rgba(22,22,22,.98)", color: on ? "#00c805" : "#cccccc", fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  {area}
                </button>
              );
            })}
          </div>
          <button onClick={() => { if (selectedAreas.length > 0) setScreen("confirm"); }}
            disabled={selectedAreas.length === 0}
            style={{ background: selectedAreas.length > 0 ? "#00c805" : "rgba(255,255,255,.08)", border: "none", borderRadius: 14, padding: "16px", fontFamily: "'Poppins',sans-serif", fontSize: 15, fontWeight: 700, cursor: selectedAreas.length > 0 ? "pointer" : "default", color: selectedAreas.length > 0 ? "#000000" : "#333333", width: "100%" }}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ── Confirm + disclaimer screen ──
  if (screen === "confirm") {
    return (
      <div style={{ fontFamily: "'Poppins',sans-serif", minHeight: "100vh", background: "#0d0d0d", color: "#ffffff", padding: "48px 24px" }}>
        <style>{STYLES}</style>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <button onClick={() => setScreen(selectedGoal === "improve_area" ? "focus" : "main")}
            style={{ background: "none", border: "none", color: "#555555", cursor: "pointer", fontFamily: "'Poppins',sans-serif", fontSize: 13, marginBottom: 32, padding: 0 }}>
            ← Back
          </button>
          <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 26, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>Your goal</p>
          <div style={{ background: "rgba(0,200,5,.08)", border: "1.5px solid rgba(0,200,5,.25)", borderRadius: 16, padding: "18px 20px", marginBottom: 20 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#00c805", marginBottom: 6 }}>{goalObj?.label}</p>
            {selectedGoal === "improve_area" && selectedAreas.length > 0 && (
              <p style={{ fontSize: 13, color: "#888888" }}>Focus areas: {selectedAreas.join(", ")}</p>
            )}
          </div>

          {/* Disclaimer */}
          <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "16px 18px", marginBottom: 24 }}>
            <p style={{ fontSize: 12, color: "#888888", lineHeight: 1.7 }}>
              Iron Log uses your workout history and selected goal to provide training insights and general fitness recommendations. These insights are educational and are not medical advice or a substitute for guidance from a qualified healthcare or fitness professional. Training needs vary based on experience, health, recovery, injuries, and other individual factors.
            </p>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginTop: 16 }}>
              <button onClick={() => setDisclaimer(!disclaimer)}
                style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${disclaimer ? "#00c805" : "rgba(255,255,255,.2)"}`, background: disclaimer ? "#00c805" : "transparent", flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                {disclaimer && <span style={{ color: "#000", fontSize: 13, fontWeight: 700 }}>✓</span>}
              </button>
              <p style={{ fontSize: 12, color: "#888888", lineHeight: 1.6, cursor: "pointer" }} onClick={() => setDisclaimer(!disclaimer)}>
                I understand that Iron Log's recommendations are for general guidance only and not professional medical or fitness advice.
              </p>
            </div>
          </div>

          <button onClick={handleSave} disabled={!disclaimer || saving}
            style={{ background: disclaimer ? "#00c805" : "rgba(255,255,255,.08)", border: "none", borderRadius: 14, padding: "16px", fontFamily: "'Poppins',sans-serif", fontSize: 15, fontWeight: 700, cursor: disclaimer ? "pointer" : "default", color: disclaimer ? "#000000" : "#333333", width: "100%", marginBottom: 12 }}>
            {saving ? "Saving..." : "Start using Iron Log"}
          </button>
          <button onClick={() => setScreen("main")}
            style={{ background: "none", border: "none", color: "#555555", fontFamily: "'Poppins',sans-serif", fontSize: 13, cursor: "pointer", width: "100%", padding: "8px 0" }}>
            Choose a different goal
          </button>
        </div>
      </div>
    );
  }

  // ── Main goal selection screen ──
  return (
    <div style={{ fontFamily: "'Poppins',sans-serif", minHeight: "100vh", background: "#0d0d0d", color: "#ffffff", padding: "48px 24px 80px" }}>
      <style>{STYLES}</style>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#00c805", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Welcome, {user.username}</p>
        <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 28, fontWeight: 700, color: "#ffffff", marginBottom: 8, lineHeight: 1.2 }}>What is your primary training goal?</p>
        <p style={{ fontSize: 14, color: "#666666", marginBottom: 8, lineHeight: 1.6 }}>This helps Iron Log give you more relevant coaching. You can change it anytime in settings.</p>

        {suggested && (
          <div style={{ background: "rgba(0,200,5,.06)", border: "1px solid rgba(0,200,5,.15)", borderRadius: 12, padding: "10px 14px", marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: "#00c805" }}>Based on your answers, <strong>{GOALS.find(g=>g.key===suggested)?.label}</strong> may be the best fit.</p>
          </div>
        )}

        <button onClick={() => { setScreen("help"); setHelpStep(0); setHelpAnswers([]); setSuggested(null); }}
          style={{ background: "none", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 12, padding: "10px 16px", fontFamily: "'Poppins',sans-serif", fontSize: 13, color: "#888888", cursor: "pointer", marginBottom: 24 }}>
          Help me choose
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          {GOALS.map(g => {
            const isSelected = selectedGoal === g.key;
            const isExpanded = expandedGoal === g.key;
            return (
              <div key={g.key} style={{ borderRadius: 14, border: `1.5px solid ${isSelected ? "#00c805" : "rgba(255,255,255,.08)"}`, background: isSelected ? "rgba(0,200,5,.07)" : "rgba(18,18,18,.98)", overflow: "hidden", transition: "border-color .2s" }}>
                <button onClick={() => handleGoalSelect(g.key)}
                  style={{ width: "100%", padding: "16px 18px", border: "none", background: "transparent", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${isSelected ? "#00c805" : "rgba(255,255,255,.2)"}`, background: isSelected ? "#00c805" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isSelected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#000" }} />}
                    </div>
                    <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 15, fontWeight: 600, color: isSelected ? "#00c805" : "#ffffff" }}>{g.label}</span>
                  </div>
                  <span style={{ color: "#333333", fontSize: 12, marginLeft: 8 }}>{isExpanded ? "▲" : "▼"}</span>
                </button>
                {isExpanded && (
                  <div style={{ padding: "0 18px 16px 50px" }}>
                    <p style={{ fontSize: 13, color: "#888888", lineHeight: 1.7, marginBottom: g.note ? 10 : 0 }}>{g.description}</p>
                    {g.note && <p style={{ fontSize: 12, color: "#555555", fontStyle: "italic", lineHeight: 1.6 }}>{g.note}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={handleContinue} disabled={!selectedGoal}
          style={{ background: selectedGoal ? "#00c805" : "rgba(255,255,255,.08)", border: "none", borderRadius: 14, padding: "16px", fontFamily: "'Poppins',sans-serif", fontSize: 15, fontWeight: 700, cursor: selectedGoal ? "pointer" : "default", color: selectedGoal ? "#000000" : "#333333", width: "100%" }}>
          Continue
        </button>
      </div>
      {editingGoal && (
        <div className="overlay" style={{ zIndex: 200 }}>
          <GoalOnboarding user={user} onComplete={(updatedUser) => {
            onUpdate(updatedUser);
            setEditingGoal(false);
          }} />
        </div>
      )}
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    if (mode === "signup" && !isValidEmail(email)) { setError("Please enter a valid email."); return; }
    setLoading(true); setError("");
    const u = username.trim().toLowerCase();
    try {
      if (mode === "login") {
        const data = await sb.getUser(u);
        if (!data || data.length === 0) { setError("Account not found. Please sign up."); setLoading(false); return; }
        if (data[0].password_hash !== simpleHash(password)) { setError("Incorrect password."); setLoading(false); return; }
        onLogin(data[0]);
      } else {
        const existing = await sb.getUser(u);
        if (existing && existing.length > 0) { setError("Username taken. Try another."); setLoading(false); return; }
        const newUser = await sb.createUser({ username: u, email: email.trim().toLowerCase(), password_hash: simpleHash(password), joined_date: todayStr() });
        if (!newUser || newUser.length === 0) { setError("Account created! Please sign in now."); setLoading(false); return; }
        onLogin(newUser[0]);
      }
    } catch (e) {
      console.error("Auth error:", e);
      setError(`Error: ${e.message || "Please try again."}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: "'Poppins',sans-serif", minHeight: "100vh", background: "#0d0d0d", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28 }}>
      <style>{STYLES}</style><VIEWPORT_FIX /><BG />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 380 }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#555555", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Progressive Overload Tracker</p>
          <h1 style={{ fontFamily: "'Poppins',sans-serif", fontSize: 36, fontWeight: 700, color: "#ffffff", lineHeight: 1.1 }}>Your fitness,<br /><em style={{ color: "#00c805", fontStyle: "italic" }}>elevated.</em></h1>
        </div>
        <div className="glass" style={{ padding: 28 }}>
          <div style={{ display: "flex", background: "rgba(255,255,255,.05)", borderRadius: 30, padding: 4, marginBottom: 24 }}>
            {[["login","Sign In"],["signup","Create Account"]].map(([k,l]) => (
              <button key={k} onClick={() => { setMode(k); setError(""); }} style={{ flex: 1, padding: "9px 0", borderRadius: 26, border: "none", cursor: "pointer", fontFamily: "'Poppins',sans-serif", fontSize: 13, fontWeight: 600, background: mode === k ? "rgba(255,255,255,.9)" : "none", color: mode === k ? "#ffffff" : "#888888" }}>{l}</button>
            ))}
          </div>
          <div style={{ marginBottom: 14 }}><label className="lbl">Username</label><input value={username} onChange={e => setUsername(e.target.value)} placeholder="your_username" onKeyDown={e => e.key === "Enter" && submit()} className="field" /></div>
          {mode === "signup" && <div style={{ marginBottom: 14 }}><label className="lbl">Email address</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" className="field" /><p style={{ fontSize: 11, color: "#555555", marginTop: 6 }}>Used to recover your account and receive updates.</p></div>}
          <div style={{ marginBottom: 20 }}><label className="lbl">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && submit()} className="field" /></div>
          {error && <div className="err-box">{error}</div>}
          <button onClick={submit} disabled={loading} className="save-btn" style={{ opacity: loading ? .7 : 1 }}>{loading ? "Signing in..." : mode === "login" ? "Sign In" : "Create Account"}</button>
        </div>
      </div>
    </div>
  );
}




// ─── PRs Tab ──────────────────────────────────────────────────────────────────
function PRsTab({ prs, categories }) {
  const [expandedCat, setExpandedCat] = useState(null);

  const findCategory = (exerciseName) => {
    for (const [cat, exercises] of Object.entries(categories)) {
      if (exercises.includes(exerciseName)) return cat;
    }
    return "Other";
  };

  const grouped = useMemo(() => {
    const map = {};
    prs.forEach(([ex, pr]) => {
      const cat = findCategory(ex);
      if (!map[cat]) map[cat] = [];
      map[cat].push([ex, pr]);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [prs, categories]);

  return (
    <div className="fade">
      <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 21, fontWeight: 700, color: "#ffffff", marginBottom: 6 }}>Personal Records</p>
      <p style={{ fontSize: 13, color: "#888888", marginBottom: 20 }}>Your heaviest lift ever. Tap a category to expand.</p>

      {prs.length === 0 && (
        <div style={{ background: "rgba(18,18,18,.98)", border: "1.5px solid rgba(255,255,255,.07)", borderRadius: 18, padding: 28, textAlign: "center" }}>
          <p style={{ color: "#555555" }}>No records yet. Log some workouts.</p>
        </div>
      )}

      {grouped.map(([cat, items]) => {
        const isOpen = expandedCat === cat;
        const catBest = items.reduce((best, [, pr]) => pr.weight > best ? pr.weight : best, 0);
        return (
          <div key={cat} style={{ marginBottom: 10 }}>
            {/* Category header */}
            <button
              onClick={() => setExpandedCat(isOpen ? null : cat)}
              style={{ width: "100%", background: isOpen ? "rgba(0,200,5,.08)" : "rgba(18,18,18,.98)", border: `1.5px solid ${isOpen ? "rgba(0,200,5,.25)" : "rgba(255,255,255,.07)"}`, borderRadius: isOpen ? "16px 16px 0 0" : 16, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "all .2s" }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginBottom: 3 }}>{cat}</div>
                <div style={{ fontSize: 12, color: "#666666" }}>{items.length} exercise{items.length !== 1 ? "s" : ""} · Best: {catBest} lbs</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: "#555555" }}>{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>

            {/* Expanded items */}
            {isOpen && (
              <div style={{ background: "rgba(14,14,14,.98)", border: "1.5px solid rgba(0,200,5,.15)", borderTop: "none", borderRadius: "0 0 16px 16px", overflow: "hidden" }}>
                {items.map(([ex, pr], i) => (
                  <div key={ex} style={{ padding: "14px 18px", borderBottom: i < items.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", marginBottom: 3 }}>{ex}</div>
                      <div style={{ fontSize: 11, color: "#555555" }}>{formatDate(pr.date)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 24, fontWeight: 700, color: "#f0b429", lineHeight: 1 }}>{pr.weight}</div>
                      <div style={{ fontSize: 11, color: "#555555", marginTop: 2 }}>lbs x {pr.reps} reps</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Progress Tab ─────────────────────────────────────────────────────────────
const BODY_AREAS = {
  "Upper Body": ["Chest","Back","Shoulders","Biceps","Triceps"],
  "Lower Body": ["Legs","Glutes"],
  "Core":       ["Core"],
  "Other":      ["Other"]
};

function ProgressTab({ workouts, categories }) {
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [view, setView] = useState("overview");
  const [expandedSession, setExpandedSession] = useState(null);

  const getBodyArea = (ex) => {
    for (const [cat, exs] of Object.entries(categories)) {
      if (exs.includes(ex)) {
        for (const [area, cats] of Object.entries(BODY_AREAS)) {
          if (cats.includes(cat)) return area;
        }
      }
    }
    return "Other";
  };

  const loggedByArea = useMemo(() => {
    const map = {};
    [...new Set(workouts.map(w => w.exercise))].forEach(ex => {
      const area = getBodyArea(ex);
      if (!map[area]) map[area] = [];
      map[area].push(ex);
    });
    return map;
  }, [workouts, categories]);

  const sessions = useMemo(() => {
    if (!selectedExercise) return [];
    return workouts
      .filter(w => w.exercise === selectedExercise)
      .map(w => ({
        ...w,
        sets: Array.isArray(w.sets) ? w.sets : [],
        maxWeight: Math.max(...(Array.isArray(w.sets) ? w.sets : []).map(s => s.weight || 0), 0),
        totalReps: (Array.isArray(w.sets) ? w.sets : []).reduce((s, r) => s + r.reps, 0),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [workouts, selectedExercise]);

  const weekProgress = useMemo(() => {
    if (!selectedExercise) return [];
    const byWeek = {};
    workouts.filter(w => w.exercise === selectedExercise).forEach(w => {
      const dt = new Date(w.date), day = dt.getDay();
      const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
      const wk = new Date(new Date(w.date).setDate(new Date(w.date).getDate() - day + (day === 0 ? -6 : 1))).toISOString().split("T")[0];
      const sets = Array.isArray(w.sets) ? w.sets : [];
      const stats = calcSessionStats(sets);
      if (!byWeek[wk]) byWeek[wk] = { maxWeight: 0, totalReps: 0, totalVolume: 0 };
      if (stats) {
        byWeek[wk].maxWeight = Math.max(byWeek[wk].maxWeight, stats.maxWeight || 0);
        byWeek[wk].totalReps += stats.totalReps || 0;
        byWeek[wk].totalVolume += stats.totalVolume || 0;
      }
    });
    return Object.entries(byWeek).sort((a, b) => a[0].localeCompare(b[0]));
  }, [workouts, selectedExercise]);

  const dailyProgress = useMemo(() => {
    if (!selectedExercise) return [];
    const byDay = {};
    workouts.filter(w => w.exercise === selectedExercise).forEach(w => {
      const sets = Array.isArray(w.sets) ? w.sets : [];
      const stats = calcSessionStats(sets);
      if (!byDay[w.date]) byDay[w.date] = { maxWeight: 0, totalReps: 0, totalVolume: 0 };
      if (stats) {
        byDay[w.date].maxWeight = Math.max(byDay[w.date].maxWeight, stats.maxWeight || 0);
        byDay[w.date].totalReps += stats.totalReps || 0;
        byDay[w.date].totalVolume += stats.totalVolume || 0;
      }
    });
    return Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]));
  }, [workouts, selectedExercise]);

  const maxDailyWeight = useMemo(() => Math.max(...dailyProgress.map(([, v]) => v.maxWeight), 1), [dailyProgress]);
  const allTimeMax = useMemo(() => sessions.length ? Math.max(...sessions.map(s => s.maxWeight)) : 0, [sessions]);
  const lastSession = sessions[0];

  const tapArea = (area) => {
    if (selectedArea === area) { setSelectedArea(null); setSelectedExercise(null); }
    else { setSelectedArea(area); setSelectedExercise(null); }
    setView("overview"); setExpandedSession(null);
  };

  const tapExercise = (ex) => {
    if (selectedExercise === ex) { setSelectedExercise(null); }
    else { setSelectedExercise(ex); setView("overview"); setExpandedSession(null); }
  };

  return (
    <div className="fade" style={{ paddingBottom: 20 }}>
      <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 21, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>Progress</p>
      <p style={{ fontSize: 13, color: "#666666", marginBottom: 20 }}>Select a body area then an exercise.</p>

      {workouts.length === 0 && (
        <div style={{ background: "rgba(18,18,18,.98)", border: "1.5px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 28, textAlign: "center" }}>
          <p style={{ color: "#444444", fontSize: 14 }}>Log workouts to see your progress.</p>
        </div>
      )}

      {workouts.length > 0 && (
        <>
          {/* Level 1 — Body area 2x2 grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            {Object.keys(BODY_AREAS).map(area => {
              const count = (loggedByArea[area] || []).length;
              const isActive = selectedArea === area;
              return (
                <button key={area} onClick={() => count > 0 && tapArea(area)}
                  style={{ padding: "18px 14px", borderRadius: 16, border: `1.5px solid ${isActive ? "#00c805" : count > 0 ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.03)"}`, background: isActive ? "rgba(0,200,5,.1)" : count > 0 ? "rgba(20,20,20,.98)" : "rgba(14,14,14,.98)", cursor: count > 0 ? "pointer" : "default", textAlign: "left", transition: "all .22s" }}>
                  <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 15, fontWeight: 700, color: isActive ? "#00c805" : count > 0 ? "#ffffff" : "#2a2a2a", marginBottom: 5 }}>{area}</div>
                  <div style={{ fontSize: 11, color: isActive ? "rgba(0,200,5,.65)" : "#444444" }}>
                    {count > 0 ? `${count} exercise${count !== 1 ? "s" : ""} logged` : "Nothing logged yet"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Level 2 — Exercise list slides in */}
          {selectedArea && (loggedByArea[selectedArea] || []).length > 0 && (
            <div style={{ background: "rgba(14,14,14,.98)", border: "1.5px solid rgba(0,200,5,.15)", borderRadius: 16, overflow: "hidden", marginBottom: 10, animation: "slideDown .22s ease" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#00c805", letterSpacing: 1.8, textTransform: "uppercase" }}>{selectedArea}</span>
              </div>

              {(loggedByArea[selectedArea] || []).map((ex, i) => {
                const exSessions = workouts.filter(w => w.exercise === ex);
                const bestW = exSessions.length ? Math.max(...exSessions.flatMap(w => (Array.isArray(w.sets) ? w.sets : []).map(s => s.weight || 0))) : 0;
                const isSelected = selectedExercise === ex;
                const isLast = i === (loggedByArea[selectedArea] || []).length - 1;

                return (
                  <div key={ex}>
                    {/* Exercise row */}
                    <button onClick={() => tapExercise(ex)}
                      style={{ width: "100%", padding: "14px 16px", border: "none", background: isSelected ? "rgba(0,200,5,.07)" : "transparent", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: (!isSelected && !isLast) ? "1px solid rgba(255,255,255,.04)" : "none", transition: "background .18s" }}>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: isSelected ? 700 : 500, color: isSelected ? "#00c805" : "#dddddd", marginBottom: 3 }}>{ex}</div>
                        <div style={{ fontSize: 11, color: "#444444" }}>{exSessions.length} session{exSessions.length !== 1 ? "s" : ""} &middot; Best: {bestW} lbs</div>
                      </div>
                      <span style={{ fontSize: 13, color: isSelected ? "#00c805" : "#333333", marginLeft: 12, flexShrink: 0 }}>{isSelected ? "▲" : "▶"}</span>
                    </button>

                    {/* Level 3 — Summary slides in directly below */}
                    {isSelected && (
                      <div style={{ background: "rgba(10,10,10,.98)", borderTop: "1px solid rgba(0,200,5,.1)", borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,.04)", animation: "slideDown .2s ease" }}>

                        {/* View tabs */}
                        <div style={{ display: "flex", padding: "10px 12px", gap: 6, borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                          {[["overview","Overview"],["byweek","By Week"],["bysession","Sessions"]].map(([k, l]) => (
                            <button key={k} onClick={() => setView(k)}
                              style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 600, background: view === k ? "rgba(255,255,255,.1)" : "rgba(20,20,20,.98)", color: view === k ? "#ffffff" : "#555555", transition: "all .18s" }}>
                              {l}
                            </button>
                          ))}
                        </div>

                        <div style={{ padding: "16px 14px" }}>

                          {/* OVERVIEW */}
                          {view === "overview" && (
                            <div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                                {[
                                  { label: "All Time Best", val: `${allTimeMax} lbs`, sub: "heaviest lift ever", color: "#f0b429" },
                                  { label: "Times Trained", val: sessions.length, sub: "sessions logged", color: "#ffffff" },
                                  { label: "Last Trained", val: lastSession ? formatDate(lastSession.date) : "--", sub: "", color: "#cccccc", small: true },
                                  { label: "Last Best", val: `${lastSession?.maxWeight || 0} lbs`, sub: "most recent session", color: "#00c805" },
                                ].map(c => (
                                  <div key={c.label} style={{ background: "rgba(20,20,20,.98)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 12, padding: "12px 12px" }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: "#444444", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>{c.label}</div>
                                    <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: c.small ? 13 : 20, fontWeight: 700, color: c.color, lineHeight: 1, marginBottom: 3 }}>{c.val}</div>
                                    {c.sub && <div style={{ fontSize: 10, color: "#444444" }}>{c.sub}</div>}
                                  </div>
                                ))}
                              </div>

                              {weekProgress.length >= 2 && (() => {
                                const last = weekProgress[weekProgress.length - 1][1];
                                const prev = weekProgress[weekProgress.length - 2][1];
                                const diff = last.maxWeight - prev.maxWeight;
                                const msg = diff > 0 ? `Up ${diff} lbs from last week. Keep pushing.` : diff === 0 ? `Same weight as last week. Try adding 5 lbs.` : `Down ${Math.abs(diff)} lbs. Rest and come back stronger.`;
                                const color = diff > 0 ? "#00c805" : diff === 0 ? "#f0b429" : "#ff4444";
                                const borderColor = diff > 0 ? "rgba(0,200,5,.2)" : diff === 0 ? "rgba(240,180,40,.2)" : "rgba(255,68,68,.2)";
                                return (
                                  <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(20,20,20,.98)", border: `1px solid ${borderColor}`, marginBottom: 12 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color, lineHeight: 1.5 }}>{msg}</div>
                                  </div>
                                );
                              })()}

                              {lastSession && (
                                <div style={{ background: "rgba(20,20,20,.98)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 12, padding: "12px 14px" }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "#444444", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Last session</div>
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    {lastSession.sets.map((s, si) => (
                                      <span key={si} style={{ fontSize: 12, color: "#00c805", background: "rgba(0,200,5,.08)", padding: "3px 10px", borderRadius: 20, fontWeight: 500 }}>
                                        {s.reps} x {s.weight} lbs
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* BY WEEK */}
                          {view === "byweek" && (
                            <div>
                              {dailyProgress.length === 0 && <p style={{ color: "#444444", fontSize: 13 }}>No data yet.</p>}
                              {dailyProgress.length > 0 && (() => {
                                const COLORS = ["#a8c8ff","#b8e0a8","#f0d080","#f0a8c8","#a8e0f0","#d0a8f0"];
                                const W = 300, H = 160;
                                const pad = { top: 18, right: 10, bottom: 36, left: 42 };
                                const cW = W - pad.left - pad.right;
                                const cH = H - pad.top - pad.bottom;
                                const n = dailyProgress.length;
                                const bW = Math.min(28, (cW / Math.max(n,1)) * 0.6);
                                const gap = cW / Math.max(n,1);
                                const yMax = maxDailyWeight * 1.2;
                                return (
                                  <div style={{ marginBottom: 14 }}>
                                    <p style={{ fontSize: 10, fontWeight: 700, color: "#444444", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Heaviest weight per session (lbs)</p>
                                    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
                                      {[1,2,3,4].map(ti => {
                                        const val = Math.round((yMax / 4) * ti);
                                        const y = pad.top + cH - (val / yMax) * cH;
                                        return (
                                          <g key={ti}>
                                            <line x1={pad.left} x2={pad.left+cW} y1={y} y2={y} stroke="rgba(255,255,255,.05)" strokeWidth="1" strokeDasharray="3,3"/>
                                            <text x={pad.left-5} y={y+4} textAnchor="end" fontSize="8" fill="#444444" fontFamily="Poppins,sans-serif">{val}</text>
                                          </g>
                                        );
                                      })}
                                      <line x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top+cH} stroke="rgba(255,255,255,.08)" strokeWidth="1"/>
                                      <line x1={pad.left} x2={pad.left+cW} y1={pad.top+cH} y2={pad.top+cH} stroke="rgba(255,255,255,.08)" strokeWidth="1"/>
                                      {dailyProgress.map(([day, v], di) => {
                                        const bH = Math.max(2, (v.maxWeight/yMax)*cH);
                                        const x = pad.left + gap*di + gap/2 - bW/2;
                                        const y = pad.top + cH - bH;
                                        const isLatest = di === n-1;
                                        const d = new Date(day+"T12:00:00");
                                        return (
                                          <g key={day}>
                                            <rect x={x} y={y} width={bW} height={bH} rx="3" fill={isLatest ? "#00c805" : COLORS[di % COLORS.length]} opacity={isLatest ? 1 : 0.55}/>
                                            <text x={x+bW/2} y={pad.top+cH+12} textAnchor="middle" fontSize="7" fill={isLatest ? "#00c805" : "#444444"} fontFamily="Poppins,sans-serif">{`${d.getMonth()+1}/${d.getDate()}`}</text>
                                            <text x={x+bW/2} y={y-4} textAnchor="middle" fontSize="7" fill={isLatest ? "#00c805" : "#555555"} fontFamily="Poppins,sans-serif">{v.maxWeight}</text>
                                          </g>
                                        );
                                      })}
                                    </svg>
                                  </div>
                                );
                              })()}
                              {weekProgress.length >= 2 && (() => {
                                const last = weekProgress[weekProgress.length-1][1];
                                const prev = weekProgress[weekProgress.length-2][1];
                                const diff = last.maxWeight - prev.maxWeight;
                                return (
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                    {[
                                      { label: "This Week", val: `${last.maxWeight} lbs` },
                                      { label: "Last Week", val: `${prev.maxWeight} lbs` },
                                    ].map(c => (
                                      <div key={c.label} style={{ background: "rgba(20,20,20,.98)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 12, padding: "12px 12px" }}>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: "#444444", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{c.label}</div>
                                        <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 18, fontWeight: 700, color: "#ffffff" }}>{c.val}</div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {/* SESSIONS */}
                          {view === "bysession" && (
                            <div>
                              {sessions.length === 0 && <p style={{ color: "#444444", fontSize: 13 }}>No sessions yet.</p>}
                              {sessions.map((s, si) => (
                                <div key={s.id || si} style={{ marginBottom: 6 }}>
                                  <button onClick={() => setExpandedSession(expandedSession === si ? null : si)}
                                    style={{ width: "100%", padding: "12px 12px", border: "none", background: expandedSession === si ? "rgba(0,200,5,.06)" : "rgba(20,20,20,.98)", borderRadius: expandedSession === si ? "10px 10px 0 0" : 10, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ textAlign: "left" }}>
                                      <div style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>{formatDate(s.date)}</div>
                                      <div style={{ fontSize: 11, color: "#444444", marginTop: 2 }}>{s.sets.length} sets &middot; Best {s.maxWeight} lbs &middot; {s.totalReps} reps</div>
                                    </div>
                                    <span style={{ color: "#333333", fontSize: 11 }}>{expandedSession === si ? "▲" : "▼"}</span>
                                  </button>
                                  {expandedSession === si && (
                                    <div style={{ background: "rgba(14,14,14,.98)", borderRadius: "0 0 10px 10px", padding: "10px 12px" }}>
                                      {s.sets.map((set, ssi) => (
                                        <div key={ssi} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: ssi < s.sets.length-1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                                          <span style={{ fontSize: 12, color: "#444444" }}>Set {ssi+1}</span>
                                          <span style={{ fontSize: 12, fontWeight: 600, color: "#ffffff" }}>{set.reps} reps</span>
                                          <span style={{ fontSize: 12, fontWeight: set.weight === s.maxWeight ? 700 : 500, color: set.weight === s.maxWeight ? "#f0b429" : "#ffffff" }}>{set.weight} lbs</span>
                                          <span style={{ fontSize: 12, color: "#333333" }}>{set.reps * set.weight}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Overall stats */}
          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#333333", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>Overall Stats</p>
            {(() => {
              const totalReps = workouts.reduce((sum, w) => sum + (Array.isArray(w.sets) ? w.sets : []).reduce((s2, s) => s2 + s.reps, 0), 0);
              const areaCounts = {};
              workouts.forEach(w => {
                const a = getBodyArea(w.exercise);
                areaCounts[a] = (areaCounts[a] || 0) + 1;
              });
              const maxC = Math.max(...Object.values(areaCounts), 1);
              return (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                    {[
                      { label: "Sessions", val: workouts.length, sub: "total logged" },
                      { label: "Total Reps", val: totalReps.toLocaleString(), sub: "all time" },
                    ].map(c => (
                      <div key={c.label} style={{ background: "rgba(18,18,18,.98)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 12, padding: "12px 12px" }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#333333", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>{c.label}</div>
                        <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 20, fontWeight: 700, color: "#ffffff" }}>{c.val}</div>
                        <div style={{ fontSize: 10, color: "#333333" }}>{c.sub}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "rgba(18,18,18,.98)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 12, padding: "12px 14px" }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: "#333333", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Training Split</p>
                    {Object.entries(areaCounts).sort((a,b) => b[1]-a[1]).map(([area, cnt]) => (
                      <div key={area} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: "#aaaaaa" }}>{area}</span>
                          <span style={{ fontSize: 12, color: "#444444" }}>{cnt} session{cnt !== 1 ? "s" : ""}</span>
                        </div>
                        <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 100, height: 4, overflow: "hidden" }}>
                          <div style={{ width: `${(cnt/maxC)*100}%`, height: "100%", background: "#00c805", borderRadius: 100 }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}


// ─── Cardio Categories & Logger ───────────────────────────────────────────────
const CARDIO_CATEGORIES = {
  "Machines": ["Treadmill","Stair Climber","Elliptical","Rowing Machine","Stationary Bike","Air Bike","Ski Erg","Jacob's Ladder"],
  "HIIT": ["Circuit Training","Tabata","Jump Rope","Battle Ropes","Box Jumps","Burpees","Sprint Intervals","Sled Push","Sled Pull","Kettlebell Swings"],
  "Outdoor": ["Running","Walking","Cycling","Swimming","Hiking","Trail Run","Sprints"],
  "Classes and Other": ["Yoga","Pilates","Boxing","Kickboxing","CrossFit","Dance","Spin Class","Martial Arts"]
};

function CardioLogger({ user, date, onSave, customCardio, setCustomCardio }) {
  const [selCat, setSelCat] = useState(null);
  const [selAct, setSelAct] = useState("");
  const [customAct, setCustomAct] = useState("");
  const [customCat, setCustomCat] = useState("Machines");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [distUnit, setDistUnit] = useState("miles");
  const [intensity, setIntensity] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const allCats = useMemo(() => {
    const m = {};
    Object.entries(CARDIO_CATEGORIES).forEach(([cat, acts]) => { m[cat] = [...acts]; });
    (customCardio || []).forEach(({ name, category }) => {
      if (!m[category]) m[category] = [];
      if (!m[category].includes(name)) m[category].push(name);
    });
    return m;
  }, [customCardio]);

  const currentActs = selCat ? (allCats[selCat] || []) : [];

  const validate = () => {
    const errs = {};
    if (!customAct.trim() && !selAct) errs.activity = "please select or enter a cardio activity";
    if (!duration || Number(duration) <= 0) errs.duration = "please enter duration";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const actName = customAct.trim() || selAct;
    try {
      if (customAct.trim()) {
        const exists = (customCardio || []).find(c => c.name.toLowerCase() === customAct.trim().toLowerCase());
        if (!exists) {
          const { data } = await supabase.from("custom_cardio").insert({ username: user.username, name: customAct.trim(), category: customCat }).select();
          if (data) setCustomCardio(prev => [...prev, data[0]]);
        }
      }
      const { data } = await supabase.from("cardio_sessions").insert({
        username: user.username, date, activity: actName,
        category: selCat || customCat,
        duration_mins: Number(duration),
        distance: distance ? Number(distance) : null,
        distance_unit: distance ? distUnit : null,
        intensity: intensity || null
      }).select();
      if (data && data[0]) onSave(data[0]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      setSelAct(""); setCustomAct(""); setDistance(""); setIntensity(null); setDuration("");
    } catch (e) { alert("Error saving. Please try again."); }
    setSaving(false);
  };

  return (
    <div>
      {/* Category */}
      <div style={{ marginBottom: 18 }}>
        <label className="lbl">Category</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {Object.keys(CARDIO_CATEGORIES).map(cat => (
            <button key={cat} onClick={() => { setSelCat(cat); setSelAct(""); }}
              style={{ padding: "14px 10px", borderRadius: 14, border: `1.5px solid ${selCat === cat ? "#00c805" : "rgba(255,255,255,.08)"}`, background: selCat === cat ? "rgba(0,200,5,.1)" : "rgba(22,22,22,.98)", color: selCat === cat ? "#00c805" : "#aaaaaa", fontFamily: "'Poppins',sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>
              {cat}
            </button>
          ))}
        </div>
        {errors.activity && <p style={{ fontSize: 11, color: "#ff4444", marginTop: 6 }}>* {errors.activity}</p>}
      </div>

      {/* Subcategory chips */}
      {selCat && (
        <div style={{ marginBottom: 18 }}>
          <label className="lbl">{selCat}</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {currentActs.map(act => (
              <button key={act} onClick={() => { setSelAct(act); setCustomAct(""); }}
                style={{ padding: "8px 14px", borderRadius: 20, border: `1.5px solid ${selAct === act ? "#00c805" : "rgba(255,255,255,.1)"}`, background: selAct === act ? "rgba(0,200,5,.1)" : "rgba(22,22,22,.98)", color: selAct === act ? "#00c805" : "#cccccc", fontFamily: "'Poppins',sans-serif", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                {act}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom activity */}
      <div style={{ marginBottom: 18 }}>
        <label className="lbl">Or enter a custom activity</label>
        <input className="field" value={customAct} onChange={e => { setCustomAct(e.target.value); setSelAct(""); }} placeholder="e.g. Paddle boarding" />
        {customAct.trim() && (
          <div style={{ marginTop: 10 }}>
            <label className="lbl">Save under</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {Object.keys(CARDIO_CATEGORIES).map(cat => (
                <button key={cat} onClick={() => setCustomCat(cat)}
                  style={{ padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${customCat === cat ? "#00c805" : "rgba(255,255,255,.1)"}`, background: customCat === cat ? "rgba(0,200,5,.1)" : "rgba(22,22,22,.98)", color: customCat === cat ? "#00c805" : "#cccccc", fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Duration (required) */}
      <div style={{ marginBottom: 18 }}>
        <label className="lbl">Duration (minutes) <span style={{ color: "#ff4444" }}>*</span></label>
        <input type="number" className="field" value={duration} onChange={e => setDuration(e.target.value)}
          placeholder="e.g. 45" inputMode="numeric" style={{ textAlign: "center", fontSize: 22, fontWeight: 700 }} />
        {errors.duration && <p style={{ fontSize: 11, color: "#ff4444", marginTop: 6 }}>* {errors.duration}</p>}
      </div>

      {/* Distance (optional) */}
      <div style={{ marginBottom: 18 }}>
        <label className="lbl">Distance <span style={{ color: "#444444", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
        <div style={{ display: "flex", gap: 10 }}>
          <input type="number" className="field" value={distance} onChange={e => setDistance(e.target.value)} placeholder="0.0" style={{ flex: 1 }} />
          <div style={{ display: "flex", background: "rgba(10,10,10,.9)", borderRadius: 12, padding: 4, gap: 2 }}>
            {["miles","km"].map(u => (
              <button key={u} onClick={() => setDistUnit(u)}
                style={{ padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "'Poppins',sans-serif", fontSize: 13, fontWeight: 600, background: distUnit === u ? "rgba(255,255,255,.1)" : "none", color: distUnit === u ? "#ffffff" : "#555555" }}>
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Intensity (optional) */}
      <div style={{ marginBottom: 22 }}>
        <label className="lbl">Intensity <span style={{ color: "#444444", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
        <div style={{ display: "flex", gap: 10 }}>
          {[["Easy","#00c805","rgba(0,200,5,.1)"],["Moderate","#f0b429","rgba(240,180,40,.1)"],["Hard","#ff4444","rgba(255,68,68,.1)"]].map(([lvl, color, bg]) => (
            <button key={lvl} onClick={() => setIntensity(intensity === lvl ? null : lvl)}
              style={{ flex: 1, padding: "12px 6px", borderRadius: 12, border: `1.5px solid ${intensity === lvl ? color : "rgba(255,255,255,.08)"}`, background: intensity === lvl ? bg : "rgba(22,22,22,.98)", color: intensity === lvl ? color : "#666666", fontFamily: "'Poppins',sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {lvl}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        style={{ background: "#00c805", border: "none", borderRadius: 14, padding: 14, fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#000000", width: "100%", opacity: saving ? .7 : 1 }}>
        {saving ? "Saving..." : saved ? "Saved!" : "Save Cardio Session"}
      </button>
    </div>
  );
}

// ─── Edit Cardio Modal ────────────────────────────────────────────────────────
function EditCardioModal({ session, onSave, onDelete, onClose }) {
  const [activity, setActivity] = useState(session.activity);
  const [duration, setDuration] = useState(String(session.duration_mins));
  const [distance, setDistance] = useState(String(session.distance || ""));
  const [distUnit, setDistUnit] = useState(session.distance_unit || "miles");
  const [intensity, setIntensity] = useState(session.intensity || null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!duration || Number(duration) <= 0) return;
    setSaving(true);
    try {
      const updates = { activity: activity.trim(), duration_mins: Number(duration), distance: distance ? Number(distance) : null, distance_unit: distance ? distUnit : null, intensity: intensity || null };
      const { error } = await supabase.from("cardio_sessions").update(updates).eq("id", session.id);
      if (error) throw new Error(error.message);
      onSave({ ...session, ...updates });
    } catch (e) { alert("Error saving."); }
    setSaving(false);
  };

  const del = async () => {
    if (!window.confirm("Delete this session?")) return;
    try { await supabase.from("cardio_sessions").delete().eq("id", session.id); onDelete(session.id); }
    catch (e) { alert("Error deleting."); }
  };

  return (
    <div className="overlay">
      <div style={{ background: "rgba(18,18,18,.98)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 22, width: "100%", maxWidth: 420, padding: 26, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 18, fontWeight: 700, color: "#ffffff" }}>Edit Cardio</p>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#555555", cursor: "pointer" }}>×</button>
        </div>
        <p style={{ fontSize: 11, color: "#444444", marginBottom: 18 }}>{formatDate(session.date)}</p>
        <div style={{ marginBottom: 14 }}><label className="lbl">Activity</label><input value={activity} onChange={e => setActivity(e.target.value)} className="field" /></div>
        <div style={{ marginBottom: 14 }}><label className="lbl">Duration (minutes)</label><input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="field" style={{ textAlign: "center", fontSize: 20, fontWeight: 700 }} /></div>
        <div style={{ marginBottom: 14 }}>
          <label className="lbl">Distance <span style={{ color: "#444444", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
          <div style={{ display: "flex", gap: 10 }}>
            <input type="number" value={distance} onChange={e => setDistance(e.target.value)} className="field" placeholder="0.0" style={{ flex: 1 }} />
            <div style={{ display: "flex", background: "rgba(10,10,10,.9)", borderRadius: 12, padding: 4, gap: 2 }}>
              {["miles","km"].map(u => (
                <button key={u} onClick={() => setDistUnit(u)} style={{ padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 600, background: distUnit === u ? "rgba(255,255,255,.1)" : "none", color: distUnit === u ? "#ffffff" : "#555555" }}>{u}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="lbl">Intensity <span style={{ color: "#444444", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
          <div style={{ display: "flex", gap: 8 }}>
            {[["Easy","#00c805","rgba(0,200,5,.1)"],["Moderate","#f0b429","rgba(240,180,40,.1)"],["Hard","#ff4444","rgba(255,68,68,.1)"]].map(([lvl, color, bg]) => (
              <button key={lvl} onClick={() => setIntensity(intensity === lvl ? null : lvl)}
                style={{ flex: 1, padding: "10px 6px", borderRadius: 12, border: `1.5px solid ${intensity === lvl ? color : "rgba(255,255,255,.1)"}`, background: intensity === lvl ? bg : "rgba(18,18,18,.98)", color: intensity === lvl ? color : "#666666", fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {lvl}
              </button>
            ))}
          </div>
        </div>
        <button onClick={save} disabled={saving} style={{ background: "#00c805", border: "none", borderRadius: 12, padding: 13, fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#000000", width: "100%", marginBottom: 10 }}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button onClick={del} style={{ background: "rgba(255,68,68,.08)", border: "1.5px solid rgba(255,68,68,.25)", borderRadius: 12, padding: 13, fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#ff4444", width: "100%" }}>
          Delete Session
        </button>
      </div>
    </div>
  );
}

// ─── About Tab ────────────────────────────────────────────────────────────────
function AboutTab() {
  return (
    <div className="fade">
      <div className="glass" style={{ padding: 28, marginBottom: 16 }}>
        <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 20, fontWeight: 700, color: "#ffffff", marginBottom: 16 }}>What is Iron Log</p>
        <p style={{ fontSize: 14, color: "#aaaaaa", lineHeight: 1.8, marginBottom: 12 }}>Iron Log is a workout tracker built around one idea: you should always be doing a little more than last time. More weight. More reps. More effort. That is how your body grows.</p>
        <p style={{ fontSize: 14, color: "#aaaaaa", lineHeight: 1.8 }}>Every time you open this app, your job is simple. Beat what you did before. Even by one rep. Even by five pounds. That is enough.</p>
      </div>

      <div className="glass" style={{ padding: 28, marginBottom: 16 }}>
        <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 20, fontWeight: 700, color: "#ffffff", marginBottom: 16 }}>What is Progressive Overload</p>
        <p style={{ fontSize: 14, color: "#aaaaaa", lineHeight: 1.8, marginBottom: 12 }}>Progressive overload means gradually increasing the demand you place on your muscles over time. Your body adapts to stress. Once it adapts, you need to add more stress to keep growing.</p>
        <p style={{ fontSize: 14, color: "#aaaaaa", lineHeight: 1.8, marginBottom: 12 }}>This does not mean going heavier every single session. It means making small, consistent improvements over weeks and months. That could be one extra rep, a slightly heavier weight, or less rest between sets.</p>
        <p style={{ fontSize: 14, color: "#aaaaaa", lineHeight: 1.8 }}>The people who make the most progress are not the ones who train the hardest one time. They are the ones who train consistently and improve a little bit every week.</p>
      </div>

      <div className="glass" style={{ padding: 28, marginBottom: 16 }}>
        <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 20, fontWeight: 700, color: "#ffffff", marginBottom: 16 }}>What is a 1RM</p>
        <p style={{ fontSize: 14, color: "#aaaaaa", lineHeight: 1.8, marginBottom: 12 }}>1RM stands for one rep max. It is the maximum amount of weight you can lift for a single rep of any given exercise. It is the benchmark that defines your current strength level.</p>
        <p style={{ fontSize: 14, color: "#aaaaaa", lineHeight: 1.8, marginBottom: 12 }}>You do not need to test your 1RM to use this app. But understanding it helps you set smarter goals. Most people train between 60 and 85 percent of their 1RM depending on whether they are building size, strength, or endurance.</p>
        <p style={{ fontSize: 14, color: "#aaaaaa", lineHeight: 1.8 }}>As your 1RM goes up over time, your strength is going up. That is the whole point.</p>
      </div>

      <div className="glass" style={{ padding: 28, marginBottom: 16 }}>
        <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 20, fontWeight: 700, color: "#ffffff", marginBottom: 16 }}>The Philosophy</p>
        <p style={{ fontSize: 14, color: "#aaaaaa", lineHeight: 1.8, marginBottom: 12 }}>One more rep. One more plate. That is it.</p>
        <p style={{ fontSize: 14, color: "#aaaaaa", lineHeight: 1.8, marginBottom: 12 }}>Not every session will feel good. Some days the weight feels heavy and the motivation is not there. That is normal. Show up anyway. Do the work. Log it. Come back next time and try to do a little more.</p>
        <p style={{ fontSize: 14, color: "#aaaaaa", lineHeight: 1.8 }}>The log does not lie. If you keep showing up and keep pushing, the numbers will go up. And when the numbers go up, so does everything else.</p>
      </div>

      <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
        <p style={{ fontSize: 12, color: "#555555" }}>Iron Log. Built to push you forward.</p>
      </div>
    </div>
  );
}


// ─── Training Analysis Helpers ────────────────────────────────────────────────

// Merge multiple workout rows for the same exercise + date into one session
function mergeSessionsByDate(workouts, exerciseName) {
  const byDate = {};
  workouts
    .filter(w => w.exercise === exerciseName)
    .forEach(w => {
      const sets = Array.isArray(w.sets) ? w.sets : [];
      if (!byDate[w.date]) byDate[w.date] = [];
      byDate[w.date].push(...sets);
    });
  return Object.entries(byDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, sets]) => ({ date, sets }));
}

// Calculate stats for one merged session
function calcSessionStats(sets) {
  const validWeighted = sets.filter(s => s.reps > 0 && s.weight > 0);
  const validBodyweight = sets.filter(s => s.reps > 0 && (!s.weight || s.weight === 0));
  const isBodyweight = validWeighted.length === 0 && validBodyweight.length > 0;

  if (isBodyweight) {
    const totalReps = validBodyweight.reduce((sum, s) => sum + s.reps, 0);
    return {
      maxWeight: null,
      totalReps,
      totalVolume: null,
      estimated1RM: null,
      method: "bodyweight_progression"
    };
  }

  if (validWeighted.length === 0) return null;

  const maxWeight = Math.max(...validWeighted.map(s => s.weight));
  const totalReps = validWeighted.reduce((sum, s) => sum + s.reps, 0);
  const totalVolume = validWeighted.reduce((sum, s) => sum + s.weight * s.reps, 0);

  // Epley 1RM for every valid set with reps 1-20
  const oneRMs = validWeighted
    .filter(s => s.reps >= 1 && s.reps <= 20)
    .map(s => s.weight * (1 + s.reps / 30));
  const estimated1RM = oneRMs.length > 0 ? Math.max(...oneRMs) : null;

  return {
    maxWeight,
    totalReps,
    totalVolume,
    estimated1RM: estimated1RM !== null ? Math.round(estimated1RM * 10) / 10 : null,
    method: "weighted"
  };
}

// Get comparable-load reps: reps at weight within ±5% of target weight
function getComparableReps(sets, targetWeight) {
  const tolerance = targetWeight * 0.05;
  const comparable = sets.filter(
    s => s.reps > 0 && s.weight > 0 &&
         Math.abs(s.weight - targetWeight) <= tolerance
  );
  if (comparable.length === 0) return null;
  return comparable.reduce((sum, s) => sum + s.reps, 0) / comparable.length;
}

// Classify trend for one exercise across all workouts
function getExerciseTrend(exerciseName, workouts) {
  const mergedSessions = mergeSessionsByDate(workouts, exerciseName);
  const sessionCount = mergedSessions.length;

  // Eligibility check
  if (sessionCount < 4) {
    return { classification: "insufficient_data", reason: `Only ${sessionCount} session(s) logged. Need at least 4.`, confidence: "insufficient", sessionCount, daySpan: 0 };
  }
  const firstDate = new Date(mergedSessions[0].date);
  const lastDate = new Date(mergedSessions[sessionCount - 1].date);
  const daySpan = Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24));
  if (daySpan < 14) {
    return { classification: "insufficient_data", reason: `Sessions span only ${daySpan} days. Need at least 14.`, confidence: "insufficient", sessionCount, daySpan };
  }

  // Calculate stats for each session
  const sessions = mergedSessions.map(s => ({
    date: s.date,
    stats: calcSessionStats(s.sets),
    sets: s.sets
  })).filter(s => s.stats !== null);

  if (sessions.length < 4) {
    return { classification: "insufficient_data", reason: "Not enough valid sets across sessions.", confidence: "insufficient", sessionCount, daySpan };
  }

  const isBodyweight = sessions[0].stats.method === "bodyweight_progression";

  // Take last 4 sessions
  const last4 = sessions.slice(-4);
  const earlier = last4.slice(0, 2);  // sessions 1 and 2
  const recent  = last4.slice(2, 4);  // sessions 3 and 4

  const avg = (arr, key) => {
    const vals = arr.map(s => s.stats[key]).filter(v => v !== null && v !== undefined);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const pctChange = (oldVal, newVal) => {
    if (oldVal === null || newVal === null || oldVal === 0) return null;
    return ((newVal - oldVal) / oldVal) * 100;
  };

  // --- Bodyweight path ---
  if (isBodyweight) {
    const earlierReps = avg(earlier, "totalReps");
    const recentReps  = avg(recent,  "totalReps");
    const repChange   = pctChange(earlierReps, recentReps);

    let classification, reason;
    if (repChange !== null && repChange >= 5) {
      classification = "progressing";
      reason = `Total reps up ${repChange.toFixed(1)}% (bodyweight progression)`;
    } else if (repChange !== null && repChange <= -2) {
      classification = "stable";
      reason = `Reps slightly lower recently. Not enough evidence to flag a concern.`;
    } else {
      // Check plateau eligibility (5 sessions, 21 days)
      if (sessionCount >= 5 && daySpan >= 21 && repChange !== null && Math.abs(repChange) < 2) {
        classification = "possible_plateau";
        reason = `Reps have been flat across the last 4 sessions (bodyweight exercise, ${daySpan} days).`;
      } else {
        classification = "stable";
        reason = `Reps similar across sessions. Not enough history to confirm a plateau.`;
      }
    }
    return {
      classification, reason, confidence: "sufficient",
      sessionCount, daySpan, method: "bodyweight_progression",
      earlierReps: earlierReps?.toFixed(1), recentReps: recentReps?.toFixed(1),
      repChangePct: repChange?.toFixed(1)
    };
  }

  // --- Weighted path ---
  const earlier1RM  = avg(earlier, "estimated1RM");
  const recent1RM   = avg(recent,  "estimated1RM");
  const oneRMChange = pctChange(earlier1RM, recent1RM);

  // Comparable-load rep check: find most common weight in earlier baseline
  const allEarlierSets = earlier.flatMap(s => s.sets.filter(st => st.reps > 0 && st.weight > 0));
  const weightCounts = {};
  allEarlierSets.forEach(s => { weightCounts[s.weight] = (weightCounts[s.weight] || 0) + 1; });
  const referenceWeight = Object.entries(weightCounts).sort((a,b) => b[1]-a[1])[0]?.[0];

  let compRepEarlier = null, compRepRecent = null, compRepChange = null;
  if (referenceWeight) {
    const refW = Number(referenceWeight);
    compRepEarlier = earlier.reduce((sum, s) => {
      const r = getComparableReps(s.sets, refW);
      return r !== null ? sum + r : sum;
    }, 0) / earlier.length;
    compRepRecent = recent.reduce((sum, s) => {
      const r = getComparableReps(s.sets, refW);
      return r !== null ? sum + r : sum;
    }, 0) / recent.length;
    if (compRepEarlier > 0 && compRepRecent > 0) {
      compRepChange = compRepRecent - compRepEarlier;
    }
  }

  const earlierVol = avg(earlier, "totalVolume");
  const recentVol  = avg(recent,  "totalVolume");
  const volChange  = pctChange(earlierVol, recentVol);

  // Classification logic
  const meaningful1RMProgress = oneRMChange !== null && oneRMChange >= 2.5;
  const meaningfulRepProgress = compRepChange !== null && compRepChange >= 1.0;
  const anyPrimaryProgress = meaningful1RMProgress || meaningfulRepProgress;

  const flat1RM  = oneRMChange === null || Math.abs(oneRMChange) < 2.5;
  const flatReps = compRepChange === null || Math.abs(compRepChange) < 1.0;
  const allPrimaryFlat = flat1RM && flatReps;

  let classification, reason;

  if (anyPrimaryProgress) {
    classification = "progressing";
    const parts = [];
    if (meaningful1RMProgress) parts.push(`estimated 1RM up ${oneRMChange.toFixed(1)}%`);
    if (meaningfulRepProgress) parts.push(`+${compRepChange.toFixed(1)} reps at ${referenceWeight} lbs`);
    if (volChange !== null && volChange >= 3) parts.push(`volume up ${volChange.toFixed(1)}%`);
    reason = parts.join("; ");
  } else if (allPrimaryFlat && sessionCount >= 5 && daySpan >= 21) {
    classification = "possible_plateau";
    const parts = [];
    if (oneRMChange !== null) parts.push(`estimated 1RM ${oneRMChange >= 0 ? "+" : ""}${oneRMChange.toFixed(1)}%`);
    if (compRepChange !== null) parts.push(`comparable reps ${compRepChange >= 0 ? "+" : ""}${compRepChange.toFixed(1)}`);
    if (volChange !== null) parts.push(`volume ${volChange >= 0 ? "+" : ""}${volChange.toFixed(1)}%`);
    reason = `No meaningful improvement across primary evidence. ${parts.join("; ")}`;
  } else {
    classification = "stable";
    const parts = [];
    if (oneRMChange !== null) parts.push(`estimated 1RM ${oneRMChange >= 0 ? "+" : ""}${oneRMChange.toFixed(1)}%`);
    if (compRepChange !== null) parts.push(`comparable reps ${compRepChange >= 0 ? "+" : ""}${compRepChange.toFixed(1)}`);
    if (volChange !== null) parts.push(`volume ${volChange >= 0 ? "+" : ""}${volChange.toFixed(1)}%`);
    reason = parts.length > 0 ? parts.join("; ") : "Mixed or inconclusive evidence";
  }

  return {
    classification, reason, confidence: "sufficient",
    sessionCount, daySpan, method: "weighted",
    earlier1RM: earlier1RM?.toFixed(1), recent1RM: recent1RM?.toFixed(1),
    oneRMChangePct: oneRMChange?.toFixed(1),
    referenceWeight, compRepEarlier: compRepEarlier?.toFixed(1),
    compRepRecent: compRepRecent?.toFixed(1), compRepChange: compRepChange?.toFixed(1),
    earlierVol: earlierVol?.toFixed(0), recentVol: recentVol?.toFixed(0),
    volChangePct: volChange?.toFixed(1)
  };
}

// Muscle group balance report (last 28 days)
function getMuscleBalanceReport(workouts, categories) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const recentWorkouts = workouts.filter(w => new Date(w.date) >= cutoff);
  const daySpan = workouts.length > 0
    ? Math.round((now - new Date(workouts[workouts.length - 1]?.date)) / (1000*60*60*24))
    : 0;

  if (recentWorkouts.length < 8 || daySpan < 21) {
    return { hasEnoughHistory: false, reason: "Not enough training history yet to evaluate muscle-group balance." };
  }

  const groupCount = {};
  const getCategory = (ex) => {
    for (const [cat, exs] of Object.entries(categories)) {
      if (exs.includes(ex)) return cat;
    }
    return "Other";
  };
  recentWorkouts.forEach(w => {
    const cat = getCategory(w.exercise);
    groupCount[cat] = (groupCount[cat] || 0) + 1;
  });

  const maxCount = Math.max(...Object.values(groupCount), 1);
  const classified = {};
  Object.entries(groupCount).forEach(([cat, cnt]) => {
    const ratio = cnt / maxCount;
    if (ratio >= 0.6) classified[cat] = "balanced";
    else if (ratio >= 0.4) classified[cat] = "lower_frequency";
    else classified[cat] = "significantly_lower_frequency";
  });

  return { hasEnoughHistory: true, groupCount, classified, daySpan: Math.min(daySpan, 28) };
}

// Build structured context string for the AI Coach
function buildStructuredContext(workouts, categories, user) {
  if (!workouts || workouts.length === 0) return "The user has not logged any workouts yet.";

  const exercises = [...new Set(workouts.map(w => w.exercise))];
  const lines = [`User: ${user.username}`];

  if (user.goal) {
    lines.push(`Primary goal: ${user.goal.replace(/_/g, " ")}`);
    if (user.goal === "improve_area" && user.focus_areas?.length > 0) {
      lines.push(`Focus areas: ${user.focus_areas.join(", ")}`);
    }
  } else {
    lines.push("Primary goal: unspecified (provide balanced coaching)");
  }

  lines.push(`Total sessions logged: ${workouts.length}`);
  lines.push(`Total exercises tracked: ${exercises.length}`);
  lines.push("");

  // Exercise trends
  lines.push("--- EXERCISE TRENDS ---");
  exercises.forEach(ex => {
    const trend = getExerciseTrend(ex, workouts);
    if (trend.classification === "insufficient_data") {
      lines.push(`${ex}: ${trend.reason}`);
    } else {
      lines.push(`${ex}:`);
      lines.push(`  Sessions: ${trend.sessionCount} | Span: ${trend.daySpan} days | Method: ${trend.method}`);
      if (trend.method === "weighted") {
        lines.push(`  Earlier est. 1RM: ${trend.earlier1RM} lbs | Recent est. 1RM: ${trend.recent1RM} lbs | Change: ${trend.oneRMChangePct}%`);
        if (trend.referenceWeight) {
          lines.push(`  Comparable reps at ${trend.referenceWeight} lbs — Earlier: ${trend.compRepEarlier} | Recent: ${trend.compRepRecent} | Change: ${trend.compRepChange}`);
        }
        lines.push(`  Volume — Earlier avg: ${trend.earlierVol} lbs | Recent avg: ${trend.recentVol} lbs | Change: ${trend.volChangePct}%`);
      } else {
        lines.push(`  Reps — Earlier avg: ${trend.earlierReps} | Recent avg: ${trend.recentReps} | Change: ${trend.repChangePct}%`);
      }
      lines.push(`  Trend: ${trend.classification} | Reason: ${trend.reason}`);
    }
  });

  lines.push("");

  // Muscle balance
  lines.push("--- MUSCLE GROUP BALANCE (last 28 days) ---");
  const balance = getMuscleBalanceReport(workouts, categories);
  if (!balance.hasEnoughHistory) {
    lines.push(balance.reason);
  } else {
    Object.entries(balance.groupCount).sort((a,b)=>b[1]-a[1]).forEach(([cat, cnt]) => {
      lines.push(`  ${cat}: ${cnt} sessions (${balance.classified[cat].replace(/_/g," ")})`);
    });
  }

  return lines.join("\n");
}

// ─── Coach Tab ────────────────────────────────────────────────────────────────
function CoachTab({ workouts, categories, user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const chatEndRef = useRef(null);

  // Build structured context using analysis helpers
  const buildContext = () => buildStructuredContext(workouts, categories, user);

  const sendMessage = async (userMessage, isInitial = false) => {
    const context = buildContext();
    const newMessages = isInitial
      ? []
      : [...messages, { role: "user", content: userMessage }];

    if (!isInitial) {
      setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    }
    setInput("");
    setLoading(true);

    try {
      const systemPrompt = `You are Iron Log's AI coach. You are knowledgeable, encouraging, and direct. Plain simple English. No jargon. No em dashes. Short paragraphs.

You receive structured workout evidence. Your job is to reason FROM this evidence, not to assume conclusions before reading it.

Rules you must follow:
- Never claim someone has plateaued unless the trend data says possible_plateau.
- Never call a muscle group undertrained. Describe frequency factually: "Lower body has appeared less frequently in your recent training."
- When trend is stable, do not treat it as a failure. Describe it honestly.
- When data is insufficient, say so. Do not invent analysis from thin air.
- Do not compare different exercises as equivalent.
- Never interpret one poor session as regression.
- Volume alone is not proof of progress.
- Total reps alone are not proof of strength progress.

How to use the user's goal:
- gain_strength: Lead with estimated 1RM trends and weight progression. De-emphasize volume.
- build_muscle: Emphasize comparable-load reps, progressive overload, training consistency, muscle-group distribution.
- maintain: Stable performance is a success, not a warning sign. Do not push the user to constantly increase.
- improve_area: Surface training frequency and progression for their selected focus areas first.
- general_fitness: Balanced coaching. Do not aggressively push weight increases or criticize frequency.
- not_sure or unspecified: Neutral, balanced coaching. Mention once that setting a goal can make recommendations more specific.

Structured workout evidence:
${context}`;

      const apiMessages = isInitial
        ? [{ role: "user", content: "Analyze my training data and give me your honest assessment. What should I focus on?" }]
        : newMessages.map(m => ({ role: m.role, content: m.content }));

      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          messages: apiMessages
        })
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || "I could not generate a response. Please try again.";

      if (isInitial) {
        setMessages([{ role: "assistant", content: reply }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      }
    } catch (e) {
      const errMsg = "Could not connect to the coach right now. Please try again.";
      if (isInitial) {
        setMessages([{ role: "assistant", content: errMsg }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: errMsg }]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      sendMessage("", true);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="fade" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 220px)", minHeight: 400 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 21, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>AI Coach</p>
        <p style={{ fontSize: 13, color: "#888888" }}>Powered by your workout data. Ask anything.</p>
      </div>

      {/* Chat messages */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 16 }}>
        {messages.length === 0 && !loading && (
          <div className="glass" style={{ padding: 24, textAlign: "center" }}>
            <p style={{ color: "#555555", fontSize: 14 }}>Loading your coaching session...</p>
          </div>
        )}

        {loading && messages.length === 0 && (
          <div className="glass" style={{ padding: 24 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#888888", animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
              <span style={{ fontSize: 13, color: "#888888", marginLeft: 8 }}>Analyzing your training data...</span>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 14, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "assistant" && (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#00c805", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 10, flexShrink: 0, fontSize: 14, fontWeight: 700, color: "#000000" }}>C</div>
            )}
            <div style={{
              maxWidth: "82%",
              background: m.role === "user" ? "#00c805" : "rgba(25,25,25,.98)",
              borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              padding: "12px 16px",
              border: "1.5px solid rgba(255,255,255,.07)",
              backdropFilter: "blur(12px)"
            }}>
              <p style={{ fontSize: 14, color: "#ffffff", lineHeight: 1.75, whiteSpace: "pre-wrap", fontFamily: "'Poppins',sans-serif" }}>{m.content}</p>
            </div>
          </div>
        ))}

        {loading && messages.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#00c805", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#000000", flexShrink: 0 }}>C</div>
            <div style={{ background: "rgba(24,24,24,.95)", borderRadius: "18px 18px 18px 4px", padding: "12px 16px", border: "1.5px solid rgba(255,255,255,.07)" }}>
              <div style={{ display: "flex", gap: 5 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#888888", animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 10, paddingTop: 12, borderTop: "1.5px solid rgba(255,255,255,.06)" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && input.trim() && !loading) { e.preventDefault(); sendMessage(input.trim()); } }}
          placeholder="Ask your coach anything..."
          style={{ flex: 1, background: "rgba(28,28,28,.98)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 24, color: "#ffffff", padding: "12px 18px", fontFamily: "'Poppins',sans-serif", fontSize: 14, outline: "none" }}
        />
        <button
          onClick={() => { if (input.trim() && !loading) sendMessage(input.trim()); }}
          disabled={loading || !input.trim()}
          style={{ background: "#00c805", border: "none", borderRadius: "50%", width: 46, height: 46, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: loading || !input.trim() ? 0.5 : 1 }}>
          ↑
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [customExercises, setCustomExercises] = useState([]);
  const [tab, setTab] = useState("log");
  const [selectedExercise, setSelectedExercise] = useState("Bench Press");
  const [customEx, setCustomEx] = useState(""); const [customExCategory, setCustomExCategory] = useState("Chest");
  const [sets, setSets] = useState([{ id: Date.now(), reps: "8", weight: 0, times: 1 }]);
  const [date, setDate] = useState(todayStr()); const [saved, setSaved] = useState(false);
  const [activeExercise, setActiveExercise] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false); const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [setErrors, setSetErrors] = useState({});
  const [logMode, setLogMode] = useState("workout"); // "workout" or "cardio"
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [editingCardio, setEditingCardio] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [customCardio, setCustomCardio] = useState([]);
  const [cardioSessions, setCardioSessions] = useState([]);
  const adminTaps = useRef(0); const adminTimer = useRef(null);

  const categories = useMemo(() => buildCategories(customExercises), [customExercises]);

  // ── Restore session ──
  useEffect(() => {
    const restore = async () => {
      try {
        const saved = localStorage.getItem("iron_log_user");
        if (saved) {
          const userData = JSON.parse(saved);
          await loadUserData(userData);
        }
      } catch {}
      setSessionLoading(false);
    };
    restore();
  }, []);

  const loadUserData = async (userData) => {
    try {
      const [workoutData, customData, customCardioData, cardioData] = await Promise.all([
        sb.getWorkouts(userData.username),
        sb.getCustomExercises(userData.username),
        supabase.from("custom_cardio").select("*").eq("username", userData.username).then(r => r.data || []),
        supabase.from("cardio_sessions").select("*").eq("username", userData.username).order("date", { ascending: false }).then(r => r.data || [])
      ]);
      setWorkouts(workoutData || []);
      setCustomExercises(customData || []);
      setCustomCardio(customCardioData || []);
      setCardioSessions(cardioData || []);
      setUser(userData);
    } catch {}
  };

  const handleLogin = async (userData) => {
    localStorage.setItem("iron_log_user", JSON.stringify(userData));
    await loadUserData(userData);
  };

  const saveWorkout = async () => {
    const name = customEx.trim() || selectedExercise;
    // Validate sets
    const errors = {};
    sets.forEach((s, i) => {
      if (!s.reps || Number(s.reps) === 0) errors[i] = "enter reps before saving";
    });
    if (Object.keys(errors).length > 0) { setSetErrors(errors); return; }
    setSetErrors({});
    const validSets = sets.filter(s => s.weight >= 0);
    if (!validSets.length) return;
    setSavingWorkout(true);
    try {
      // Save custom exercise if new
      if (customEx.trim()) {
        const exists = customExercises.find(e => e.name.toLowerCase() === customEx.trim().toLowerCase());
        if (!exists) {
          const newCustom = await sb.createCustomExercise({ username: user.username, name: customEx.trim(), category: customExCategory });
          if (newCustom) setCustomExercises(prev => [...prev, newCustom[0]]);
        }
      }
      // Expand sets by times multiplier
      const expandedSets = validSets.flatMap(s =>
        Array.from({ length: s.times || 1 }, () => ({ reps: Number(s.reps), weight: Number(s.weight) }))
      );
      const newW = await sb.createWorkout({ username: user.username, date, exercise: name, sets: expandedSets });
      if (newW) setWorkouts(prev => [newW[0], ...prev]);
      setSets([{ id: Date.now(), reps: "8", weight: 0, times: 1 }]);
      setCustomEx(""); setSaved(true); setTimeout(() => setSaved(false), 2200);
    } catch (e) { alert("Error saving workout. Please try again."); }
    setSavingWorkout(false);
  };

  const updateSetReps = (i, field, val) => { const s = [...sets]; s[i].reps = val; setSets(s); };
  const updateSetWeight = (i, val) => { const s = [...sets]; s[i].weight = val; setSets(s); };

  const handleLogoTap = () => {
    adminTaps.current++; clearTimeout(adminTimer.current);
    adminTimer.current = setTimeout(() => { adminTaps.current = 0; }, 2000);
    if (adminTaps.current >= 5) { adminTaps.current = 0; setShowAdminLogin(true); }
  };

  const handleLogout = () => { localStorage.removeItem("iron_log_user"); setUser(null); setWorkouts([]); setCustomExercises([]); };

  const prs = useMemo(() => {
    const map = {};
    workouts.forEach(w => {
      const setsArr = Array.isArray(w.sets) ? w.sets : [];
      if (!setsArr.length) return;
      const best = Math.max(...setsArr.map(s => s.weight));
      const bestSet = setsArr.find(s => s.weight === best);
      if (!map[w.exercise] || best > map[w.exercise].weight) map[w.exercise] = { weight: best, reps: bestSet.reps, date: w.date };
    });
    return Object.entries(map).sort((a, b) => b[1].weight - a[1].weight);
  }, [workouts]);

  const exercises = useMemo(() => [...new Set(workouts.map(w => w.exercise))], [workouts]);

  const loggedByCategory = useMemo(() => {
    const grouped = {};
    exercises.forEach(ex => {
      const cat = findCategory(ex, categories) || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(ex);
    });
    return grouped;
  }, [exercises, categories]);

  useEffect(() => { if (!activeExercise && workouts.length > 0) setActiveExercise(workouts[0].exercise); }, [workouts]);

  const weekProgress = useMemo(() => {
    if (!activeExercise) return [];
    const byWeek = {};
    workouts.filter(w => w.exercise === activeExercise).forEach(w => {
      const setsArr = Array.isArray(w.sets) ? w.sets : [];
      const wk = getWeekKey(w.date);
      if (!byWeek[wk]) byWeek[wk] = { totalVol: 0, maxWeight: 0 };
      setsArr.forEach(s => { byWeek[wk].totalVol += s.reps * s.weight; byWeek[wk].maxWeight = Math.max(byWeek[wk].maxWeight, s.weight); });
    });
    return Object.entries(byWeek).sort((a, b) => a[0].localeCompare(b[0]));
  }, [workouts, activeExercise]);

  const maxVol = useMemo(() => Math.max(...weekProgress.map(([, v]) => v.totalVol), 1), [weekProgress]);

  // Daily progress — one entry per day logged, showing max weight
  const dailyProgress = useMemo(() => {
    if (!activeExercise) return [];
    const byDay = {};
    workouts.filter(w => w.exercise === activeExercise).forEach(w => {
      const setsArr = Array.isArray(w.sets) ? w.sets : [];
      if (!byDay[w.date]) byDay[w.date] = { maxWeight: 0 };
      setsArr.forEach(s => { byDay[w.date].maxWeight = Math.max(byDay[w.date].maxWeight, s.weight); });
    });
    return Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]));
  }, [workouts, activeExercise]);

  const maxDailyWeight = useMemo(() => Math.max(...dailyProgress.map(([, v]) => v.maxWeight), 1), [dailyProgress]);

  if (sessionLoading) return (
    <div style={{ fontFamily: "'Poppins',sans-serif", minHeight: "100vh", background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{STYLES}</style><VIEWPORT_FIX /><BG />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 28, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>Iron Log</p>
        <p style={{ fontSize: 13, color: "#888888" }}>Loading your session...</p>
      </div>
    </div>
  );

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  // Goal gate — required before entering the main app
  if (!user.goal) return (
    <GoalOnboarding user={user} onComplete={(updatedUser) => {
      setUser(updatedUser);
      localStorage.setItem("iron_log_user", JSON.stringify(updatedUser));
    }} />
  );

  return (
    <div style={{ fontFamily: "'Poppins',sans-serif", minHeight: "100vh", background: "#0d0d0d", color: "#ffffff", paddingBottom: 80 }}>
      <style>{STYLES}</style><VIEWPORT_FIX /><BG />
      {showAdminLogin && <AdminLoginModal onSuccess={() => { setShowAdminLogin(false); setShowAdmin(true); }} onClose={() => setShowAdminLogin(false)} />}
      {showAdmin && <AdminView onClose={() => setShowAdmin(false)} />}
      {editingCardio && (
        <EditCardioModal
          session={editingCardio}
          onSave={(updated) => { setCardioSessions(prev => prev.map(c => c.id === updated.id ? updated : c)); setEditingCardio(null); }}
          onDelete={(id) => { setCardioSessions(prev => prev.filter(c => c.id !== id)); setEditingCardio(null); }}
          onClose={() => setEditingCardio(null)}
        />
      )}
      {showSettings && (
        <AccountSettingsModal
          user={user}
          onUpdate={(updatedUser) => { setUser(updatedUser); setShowSettings(false); }}
          onClose={() => setShowSettings(false)}
        />
      )}
      {editingWorkout && (
        <EditWorkoutModal
          workout={editingWorkout}
          onSave={async (newSets, newExercise) => {
            try {
              const { error } = await supabase.from("workouts").update({ sets: newSets, exercise: newExercise }).eq("id", editingWorkout.id);
              if (error) throw new Error(error.message);
              setWorkouts(prev => prev.map(w => w.id === editingWorkout.id ? { ...w, sets: newSets, exercise: newExercise } : w));
              setEditingWorkout(null);
            } catch (e) { alert("Error saving. Please try again."); }
          }}
          onDelete={async () => {
            if (!window.confirm("Delete this workout?")) return;
            try {
              await sb.deleteWorkout(editingWorkout.id);
              setWorkouts(prev => prev.filter(w => w.id !== editingWorkout.id));
              setEditingWorkout(null);
            } catch (e) { alert("Error deleting. Please try again."); }
          }}
          onClose={() => setEditingWorkout(null)}
        />
      )}

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ padding: "36px 24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span onClick={handleLogoTap} style={{ fontSize: 11, fontWeight: 700, color: "#555555", letterSpacing: 2, textTransform: "uppercase", cursor: "default" }}>Iron Log</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => window.location.reload()} style={{ background: "rgba(22,22,22,.98)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 20, padding: "5px 12px", fontFamily: "'Poppins',sans-serif", fontSize: 14, color: "#888888", cursor: "pointer" }}>↺</button>
              <button onClick={() => setShowSettings(true)} style={{ background: "rgba(22,22,22,.98)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 20, padding: "5px 12px", fontFamily: "'Poppins',sans-serif", fontSize: 13, color: "#888888", cursor: "pointer" }}>⚙</button>
              <button onClick={handleLogout} style={{ background: "rgba(22,22,22,.98)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 20, padding: "5px 14px", fontFamily: "'Poppins',sans-serif", fontSize: 12, color: "#888888", cursor: "pointer" }}>Sign out</button>
            </div>
          </div>
          <h1 style={{ fontFamily: "'Poppins',sans-serif", fontSize: 32, fontWeight: 700, color: "#ffffff", lineHeight: 1.1, marginBottom: 22 }}>Hey, <em style={{ color: "#00c805", fontStyle: "italic" }}>{user.username}</em></h1>
          <div style={{ background: "rgba(255,255,255,.05)", borderRadius: 40, padding: 5, display: "flex", gap: 2, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            {[["log","Log"],["prs","PRs"],["progress","Progress"],["coach","Coach"],["about","About"]].map(([k,l]) => (
              <button key={k} className={`tab-pill ${tab === k ? "tab-on" : ""}`} onClick={() => setTab(k)} style={{ whiteSpace: "nowrap", fontSize: 12, padding: "10px 14px" }}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: "0 20px" }}>

          {/* ── LOG ── */}
          {tab === "log" && (
            <div className="fade">
              {/* Workout / Cardio toggle */}
              <div style={{ display: "flex", background: "rgba(255,255,255,.05)", borderRadius: 16, padding: 4, marginBottom: 16, gap: 4 }}>
                {[["workout","Workout"],["cardio","Cardio"]].map(([k,l]) => (
                  <button key={k} onClick={() => setLogMode(k)}
                    style={{ flex: 1, padding: "12px 0", borderRadius: 13, border: "none", cursor: "pointer", fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: 700, transition: "all .2s", background: logMode === k ? (k === "cardio" ? "#00c805" : "rgba(255,255,255,.1)") : "none", color: logMode === k ? (k === "cardio" ? "#000000" : "#ffffff") : "#888888" }}>
                    {l}
                  </button>
                ))}
              </div>

              {/* Cardio logger */}
              {logMode === "cardio" && (
                <div style={{ background: "rgba(18,18,18,.98)", border: "1.5px solid rgba(255,255,255,.07)", borderRadius: 22, padding: 24, marginBottom: 20 }}>
                  <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 20, fontWeight: 700, color: "#ffffff", marginBottom: 20 }}>Log Cardio</p>
                  <CardioLogger user={user} date={date} customCardio={customCardio} setCustomCardio={setCustomCardio}
                    onSave={(session) => setCardioSessions(prev => [session, ...prev])} />
                </div>
              )}

              {/* Workout logger */}
              {logMode === "workout" && <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
                <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 21, fontWeight: 700, color: "#ffffff", marginBottom: 22 }}>New session</p>
                <div style={{ marginBottom: 16 }}><label className="lbl">Date</label><input type="date" className="field" value={date} onChange={e => setDate(e.target.value)} style={{ width: "auto" }} /></div>
                <div style={{ marginBottom: 20 }}>
                  <label className="lbl">Exercise</label>
                  <SearchableExerciseSelect
                    categories={categories}
                    value={selectedExercise}
                    onChange={setSelectedExercise}
                  />
                  <div style={{ background: "rgba(20,20,20,.95)", borderRadius: 14, padding: 14, border: "1.5px solid rgba(255,255,255,.07)" }}>
                    <label className="lbl">Or add a custom exercise</label>
                    <input className="field" placeholder="e.g. Hip Abductor" value={customEx} onChange={e => setCustomEx(e.target.value)} style={{ marginBottom: 10 }} />
                    {customEx.trim() && (
                      <div>
                        <label className="lbl">Which category?</label>
                        <select className="field" value={customExCategory} onChange={e => setCustomExCategory(e.target.value)}>
                          {CATEGORY_NAMES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <p style={{ fontSize: 11, color: "#555555", marginTop: 8 }}>Saved permanently to your {customExCategory} list.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: 22 }}>
                  <label className="lbl">Sets</label>
                  {/* Quick fill recommendations */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    {[
                      { label: "Endurance", reps: "15", desc: "High reps, lighter weight" },
                      { label: "Build Muscle", reps: "10", desc: "Moderate reps and weight" },
                      { label: "Strength", reps: "5", desc: "Low reps, heavy weight" },
                    ].map(rec => (
                      <button key={rec.label} onClick={() => setSets(sets.map(s => ({ ...s, reps: rec.reps })))}
                        title={rec.desc}
                        style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "#cccccc", fontFamily: "'Poppins',sans-serif", fontSize: 10, fontWeight: 600, cursor: "pointer", textAlign: "center", lineHeight: 1.4 }}>
                        <div style={{ color: "#00c805", fontSize: 11, marginBottom: 2 }}>{rec.label}</div>
                        <div style={{ color: "#555555", fontSize: 9 }}>{rec.desc}</div>
                      </button>
                    ))}
                  </div>
                  {sets.map((s, i) => (
                    <div key={s.id} style={{ marginBottom: 24, background: "rgba(18,18,18,.9)", borderRadius: 20, padding: 18, border: "1.5px solid rgba(255,255,255,.07)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#00c805" }}>SET {i + 1}</span>
                          {s.type === "drop" && <span style={{ fontSize: 10, fontWeight: 700, color: "#ff4444", background: "rgba(240,150,150,.15)", padding: "2px 8px", borderRadius: 10, letterSpacing: 0.5 }}>DROP</span>}
                          {s.type === "super" && <span style={{ fontSize: 10, fontWeight: 700, color: "#00c805", background: "rgba(100,180,255,.15)", padding: "2px 8px", borderRadius: 10, letterSpacing: 0.5 }}>SUPER</span>}
                          {setErrors[i] && <span style={{ fontSize: 11, color: "#ff4444", fontWeight: 500 }}>* {setErrors[i]}</span>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {s.weight > 0 && <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 18, fontWeight: 700, color: "#ffffff" }}>{s.weight} lbs</span>}
                          {sets.length > 1 && <button className="rm-btn" onClick={() => setSets(sets.filter((_, idx) => idx !== i))}>×</button>}
                        </div>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label className="lbl">Reps</label>
                        <input type="number" value={s.reps} onChange={e => updateSetReps(i, "reps", e.target.value)}
                          placeholder="e.g. 10" inputMode="numeric"
                          style={{ background: "rgba(28,28,28,.98)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 12, color: "#ffffff", padding: "14px 16px", width: "100%", fontFamily: "'Poppins',sans-serif", fontSize: 22, fontWeight: 700, outline: "none", textAlign: "center" }} />
                      </div>
                      <label className="lbl">Weight</label>
                      <WeightInput onWeightChange={v => updateSetWeight(i, v)} />
                      <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, background: "rgba(0,200,5,.06)", borderRadius: 12, padding: "10px 14px", border: "1.5px solid rgba(0,200,5,.15)" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#00c805" }}>× Times (same reps & weight)</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <button onClick={() => { const s2 = [...sets]; s2[i].times = Math.max(1, (s2[i].times||1) - 1); setSets(s2); }}
                            style={{ width: 32, height: 32, borderRadius: "50%", border: "1.5px solid rgba(0,200,5,.25)", background: "rgba(26,26,26,.98)", color: "#00c805", fontSize: 18, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 22, fontWeight: 700, color: "#ffffff", minWidth: 28, textAlign: "center" }}>{s.times || 1}</span>
                          <button onClick={() => { const s2 = [...sets]; s2[i].times = (s2[i].times||1) + 1; setSets(s2); }}
                            style={{ width: 32, height: 32, borderRadius: "50%", border: "1.5px solid rgba(0,200,5,.25)", background: "rgba(26,26,26,.98)", color: "#00c805", fontSize: 18, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                        </div>
                        {(s.times||1) > 1 && <span style={{ fontSize: 11, color: "#888888" }}>= {s.times} sets</span>}
                      </div>
                    </div>
                  ))}
                  <button className="add-set-btn" onClick={() => setSets([...sets, { id: Date.now(), reps: sets[sets.length-1].reps, weight: sets[sets.length-1].weight, times: 1 }])}>+ Add Set</button>
                </div>
                <button className="save-btn" onClick={saveWorkout} disabled={savingWorkout}>{savingWorkout ? "Saving..." : saved ? "✓ Saved!" : "Save Workout"}</button>
              </div>}

              {workouts.length > 0 && logMode === "workout" && (
                <div>
                  <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 19, fontWeight: 700, color: "#ffffff", marginBottom: 14 }}>Recent sessions</p>
                  {workouts.slice(0, 4).map(w => (
                    <div key={w.id} className="recent-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{w.exercise}</span>
                          <div style={{ fontSize: 11, color: "#555555", marginTop: 2 }}>{w.date}</div>
                        </div>
                        <button onClick={() => setEditingWorkout(w)}
                          style={{ background: "rgba(0,200,5,.1)", border: "1.5px solid rgba(0,200,5,.25)", borderRadius: 10, padding: "6px 14px", fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 600, color: "#00c805", cursor: "pointer", flexShrink: 0 }}>
                          Edit
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {(Array.isArray(w.sets) ? w.sets : []).map((s, i) => <span key={i} className="spill">{s.reps} × {s.weight} lbs</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {cardioSessions.length > 0 && logMode === "cardio" && (
                <div>
                  <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 19, fontWeight: 700, color: "#ffffff", marginBottom: 14 }}>Recent cardio</p>
                  {cardioSessions.slice(0, 5).map((c, i) => (
                    <div key={c.id || i} style={{ background: "rgba(18,18,18,.98)", borderRadius: 14, padding: "14px 16px", marginBottom: 8, border: "1.5px solid rgba(255,255,255,.07)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", display: "block", marginBottom: 2 }}>{c.activity}</span>
                          <span style={{ fontSize: 11, color: "#555555" }}>{formatDate(c.date)} · {c.category}</span>
                        </div>
                        <button onClick={() => setEditingCardio(c)}
                          style={{ background: "rgba(0,200,5,.08)", border: "1.5px solid rgba(0,200,5,.2)", borderRadius: 10, padding: "5px 12px", fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 600, color: "#00c805", cursor: "pointer" }}>
                          Edit
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "#00c805", background: "rgba(0,200,5,.08)", padding: "3px 10px", borderRadius: 20, fontWeight: 500 }}>{c.duration_mins} min</span>
                        {c.distance && <span style={{ fontSize: 12, color: "#888888", background: "rgba(255,255,255,.05)", padding: "3px 10px", borderRadius: 20 }}>{c.distance} {c.distance_unit}</span>}
                        {c.intensity && <span style={{ fontSize: 12, color: c.intensity === "Easy" ? "#00c805" : c.intensity === "Moderate" ? "#f0b429" : "#ff4444", background: "rgba(255,255,255,.05)", padding: "3px 10px", borderRadius: 20 }}>{c.intensity}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* ── PRs ── */}
          {tab === "prs" && (
            <PRsTab prs={prs} categories={categories} />
          )}

          {tab === "progress" && (
            <ProgressTab
              workouts={workouts}
              categories={categories}
            />
          )}

          {/* ── COACH TAB ── */}
          {tab === "coach" && (
            <CoachTab workouts={workouts} categories={categories} user={user} />
          )}

          {/* ── ABOUT TAB ── */}
          {tab === "about" && (
            <AboutTab />
          )}

        </div>
      </div>
    </div>
  );
}
