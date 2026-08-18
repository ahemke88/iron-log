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
              style={{ padding: "8px 16px", borderRadius: 26, border: "none", cursor: "pointer", fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 600, background: combined === val ? "rgba(255,255,255,.9)" : "none", color: combined === val ? "#ffffff" : "#888888" }}>
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
      <div style={{ display: "flex", flexWrap: "wrap", background: "rgba(255,255,255,.05)", borderRadius: 16, padding: 4, marginBottom: 20, gap: 2 }}>
        {MODES.map(m => (
          <button key={m.key} onClick={() => { setMode(m.key); if (m.key === "bodyweight") onWeightChange(0); }}
            style={{ flex: 1, minWidth: "45%", padding: "8px 4px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 600, background: mode === m.key ? "rgba(255,255,255,.9)" : "none", color: mode === m.key ? "#ffffff" : "#888888", boxShadow: mode === m.key ? "0 4px 14px rgba(155,175,235,.2)" : "none" }}>
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
function ProgressTab({ workouts, categories, activeExercise, setActiveExercise, weekProgress, dailyProgress, maxVol, maxDailyWeight }) {
  const [view, setView] = useState("overview");
  const [expandedSession, setExpandedSession] = useState(null);

  const loggedByCategory = useMemo(() => {
    const grouped = {};
    [...new Set(workouts.map(w => w.exercise))].forEach(ex => {
      let foundCat = "Other";
      for (const [cat, exs] of Object.entries(categories)) {
        if (exs.includes(ex)) { foundCat = cat; break; }
      }
      if (!grouped[foundCat]) grouped[foundCat] = [];
      grouped[foundCat].push(ex);
    });
    return grouped;
  }, [workouts, categories]);

  const sessions = useMemo(() => {
    if (!activeExercise) return [];
    return workouts
      .filter(w => w.exercise === activeExercise)
      .map(w => ({
        ...w,
        sets: Array.isArray(w.sets) ? w.sets : [],
        maxWeight: Math.max(...(Array.isArray(w.sets) ? w.sets : []).map(s => s.weight || 0), 0),
        totalVol: (Array.isArray(w.sets) ? w.sets : []).reduce((sum, s) => sum + (s.reps * s.weight), 0),
        totalReps: (Array.isArray(w.sets) ? w.sets : []).reduce((sum, s) => sum + s.reps, 0),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [workouts, activeExercise]);

  const allTimeMax = useMemo(() => sessions.length ? Math.max(...sessions.map(s => s.maxWeight)) : 0, [sessions]);
  const lastSession = sessions[0];

  return (
    <div className="fade">
      <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 21, fontWeight: 700, color: "#ffffff", marginBottom: 6 }}>Progress</p>
      <p style={{ fontSize: 13, color: "#888888", marginBottom: 16 }}>Select an exercise to see your progress.</p>

      {/* Exercise selector */}
      {Object.keys(loggedByCategory).length === 0 && (
        <div style={{ background: "rgba(18,18,18,.98)", border: "1.5px solid rgba(255,255,255,.07)", borderRadius: 18, padding: 28, textAlign: "center" }}>
          <p style={{ color: "#555555" }}>Log workouts to see your progress.</p>
        </div>
      )}

      {Object.entries(loggedByCategory).map(([cat, exs]) => (
        <div key={cat} style={{ marginBottom: 14 }}>
          <span className="cat-label">{cat}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {exs.map(ex => (
              <button key={ex}
                className={`chip ${activeExercise === ex ? "chip-on" : ""}`}
                onClick={() => { setActiveExercise(ex === activeExercise ? null : ex); setView("overview"); setExpandedSession(null); }}>
                {ex}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* View switcher + detail — revealed when exercise selected */}
      {activeExercise && sessions.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {/* View switcher right below chips */}
          <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 12 }}>{activeExercise}</p>
          <div style={{ display: "flex", background: "rgba(255,255,255,.05)", borderRadius: 12, padding: 4, marginBottom: 18, gap: 2 }}>
            {[["overview","Overview"],["byweek","By Week"],["bysession","By Session"]].map(([k,l]) => (
              <button key={k} onClick={() => setView(k)}
                style={{ flex: 1, padding: "9px 4px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 600, transition: "all .2s", background: view === k ? "rgba(255,255,255,.12)" : "none", color: view === k ? "#ffffff" : "#cccccc" }}>
                {l}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {view === "overview" && (
            <div className="fade">
              {/* Quick stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {[
                  { label: "Heaviest Weight", val: `${allTimeMax}`, unit: "lbs — your all time best", color: "#f0b429" },
                  { label: "Times Trained", val: `${sessions.length}`, unit: "sessions logged", color: "#ffffff" },
                  { label: "Last Trained", val: lastSession ? formatDate(lastSession.date) : "--", unit: "", color: "#ffffff", small: true },
                  { label: "Last Session Best", val: `${lastSession?.maxWeight || 0}`, unit: "lbs lifted", color: "#00c805" },
                ].map(c => (
                  <div key={c.label} style={{ background: "rgba(18,18,18,.98)", border: "1.5px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "16px 14px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#555555", letterSpacing: 1.2, marginBottom: 8, textTransform: "uppercase" }}>{c.label}</div>
                    <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: c.small ? 14 : 24, fontWeight: 700, color: c.color, lineHeight: 1, marginBottom: 4 }}>{c.val}</div>
                    {c.unit && <div style={{ fontSize: 11, color: "#555555" }}>{c.unit}</div>}
                  </div>
                ))}
              </div>

              {/* Progress indicator */}
              {weekProgress.length >= 2 && (() => {
                const last = weekProgress[weekProgress.length - 1][1];
                const prev = weekProgress[weekProgress.length - 2][1];
                const wtDiff = last.maxWeight - prev.maxWeight;
                let msg, sub, color;
                if (wtDiff > 0) { msg = "You are getting stronger."; sub = `You lifted ${wtDiff} lbs more than last week. Keep going.`; color = "#00c805"; }
                else if (wtDiff === 0) { msg = "Same weight as last week."; sub = `You have been at ${last.maxWeight} lbs. Try adding 5 lbs this session.`; color = "#f0b429"; }
                else { msg = "Weight went down this week."; sub = "That is okay. Rest and recovery matter. Come back stronger."; color = "#ff4444"; }
                return (
                  <div style={{ borderRadius: 14, padding: "14px 16px", marginBottom: 14, background: "rgba(18,18,18,.98)", border: `1.5px solid ${color === "#00c805" ? "rgba(0,200,5,.25)" : color === "#f0b429" ? "rgba(240,180,40,.25)" : "rgba(255,68,68,.25)"}` }}>
                    <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 15, fontWeight: 700, color, marginBottom: 4 }}>{msg}</div>
                    <div style={{ fontSize: 13, color: "#888888" }}>{sub}</div>
                  </div>
                );
              })()}

              {/* Last session sets */}
              {lastSession && (
                <div style={{ background: "rgba(18,18,18,.98)", border: "1.5px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 18 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#555555", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Last session — {formatDate(lastSession.date)}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {lastSession.sets.map((s, i) => (
                      <span key={i} className="spill">{s.reps} reps x {s.weight} lbs</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <span style={{ fontSize: 12, color: "#555555" }}>Heaviest: <strong style={{ color: "#ffffff" }}>{lastSession.maxWeight} lbs</strong></span>
                    <span style={{ fontSize: 12, color: "#555555" }}>Total reps: <strong style={{ color: "#ffffff" }}>{lastSession.totalReps}</strong></span>
                    <span style={{ fontSize: 12, color: "#555555" }}>Sets: <strong style={{ color: "#ffffff" }}>{lastSession.sets.length}</strong></span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── BY WEEK ── */}
          {view === "byweek" && (
            <div className="fade">
              {weekProgress.length < 2 && <p style={{ color: "#555555", fontSize: 14 }}>Log at least 2 weeks to see weekly trends.</p>}
              {weekProgress.length >= 2 && (() => {
                const last = weekProgress[weekProgress.length - 1][1];
                const prev = weekProgress[weekProgress.length - 2][1];
                return (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                      {[
                        { label: "Max Weight", val: `${last.maxWeight}`, unit: "lbs", diff: last.maxWeight - prev.maxWeight, color: "#f0b429" },
                        { label: "Total Reps", val: `${weekProgress[weekProgress.length-1][1].totalVol > 0 ? sessions.filter(s => s.date >= weekProgress[weekProgress.length-1][0]).reduce((sum, s) => sum + s.totalReps, 0) : 0}`, unit: "reps this week", diff: 0, color: "#ffffff" }
                      ].map(c => (
                        <div key={c.label} style={{ background: "rgba(18,18,18,.98)", border: "1.5px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "16px 14px" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#555555", letterSpacing: 1.2, marginBottom: 8, textTransform: "uppercase" }}>{c.label}</div>
                          <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 24, fontWeight: 700, color: c.color, lineHeight: 1, marginBottom: 4 }}>{c.val}</div>
                          <div style={{ fontSize: 11, color: "#555555", marginBottom: c.diff !== 0 ? 6 : 0 }}>{c.unit}</div>
                          {c.diff !== 0 && <div style={{ fontSize: 12, color: c.diff >= 0 ? "#00c805" : "#ff4444", fontWeight: 700 }}>{c.diff >= 0 ? "↑" : "↓"} {Math.abs(c.diff)} lbs vs last wk</div>}
                        </div>
                      ))}
                    </div>
                    <div style={{ background: "rgba(18,18,18,.98)", border: "1.5px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 18 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#555555", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 16 }}>Heaviest weight per session</p>
                      {dailyProgress.length > 0 && (() => {
                        const BAR_COLORS = ["#a8c8ff","#b8e0a8","#f0d080","#f0a8c8","#a8e0f0","#d0a8f0"];
                        const svgW = 320, svgH = 180;
                        const pad = { top: 20, right: 16, bottom: 44, left: 48 };
                        const chartW = svgW - pad.left - pad.right;
                        const chartH = svgH - pad.top - pad.bottom;
                        const n = dailyProgress.length;
                        const barW = Math.min(34, (chartW / Math.max(n,1)) * 0.6);
                        const gap = chartW / Math.max(n,1);
                        const yMax = maxDailyWeight * 1.2;
                        return (
                          <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ overflow: "visible" }}>
                            {Array.from({ length: 4 }, (_, ti) => {
                              const val = Math.round((yMax / 4) * (ti + 1));
                              const y = pad.top + chartH - (val / yMax) * chartH;
                              return (
                                <g key={ti}>
                                  <line x1={pad.left} x2={pad.left + chartW} y1={y} y2={y} stroke="rgba(255,255,255,.06)" strokeWidth="1" strokeDasharray="3,3" />
                                  <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#555555" fontFamily="Poppins,sans-serif">{val}</text>
                                </g>
                              );
                            })}
                            <line x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top + chartH} stroke="rgba(255,255,255,.1)" strokeWidth="1.5" />
                            <line x1={pad.left} x2={pad.left + chartW} y1={pad.top + chartH} y2={pad.top + chartH} stroke="rgba(255,255,255,.1)" strokeWidth="1.5" />
                            {dailyProgress.map(([day, v], i) => {
                              const barH = Math.max(2, (v.maxWeight / yMax) * chartH);
                              const x = pad.left + gap * i + gap/2 - barW/2;
                              const y = pad.top + chartH - barH;
                              const isLatest = i === n - 1;
                              const d = new Date(day + "T12:00:00");
                              const label = `${d.getMonth()+1}/${d.getDate()}`;
                              return (
                                <g key={day}>
                                  <rect x={x} y={y} width={barW} height={barH} rx="4" fill={isLatest ? "#00c805" : BAR_COLORS[i % BAR_COLORS.length]} opacity={isLatest ? 1 : 0.6} />
                                  <text x={x + barW/2} y={pad.top + chartH + 14} textAnchor="middle" fontSize="8" fill={isLatest ? "#00c805" : "#555555"} fontFamily="Poppins,sans-serif" fontWeight={isLatest ? "700" : "400"}>{label}</text>
                                  <text x={x + barW/2} y={y - 4} textAnchor="middle" fontSize="8" fill={isLatest ? "#00c805" : "#666666"} fontFamily="Poppins,sans-serif">{v.maxWeight}</text>
                                </g>
                              );
                            })}
                          </svg>
                        );
                      })()}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* ── BY SESSION ── */}
          {view === "bysession" && (
            <div className="fade">
              <p style={{ fontSize: 13, color: "#888888", marginBottom: 14 }}>Tap any session to see full details.</p>
              {sessions.map((s, i) => (
                <div key={s.id || i} style={{ marginBottom: 8 }}>
                  <button onClick={() => setExpandedSession(expandedSession === i ? null : i)}
                    style={{ width: "100%", background: expandedSession === i ? "rgba(0,200,5,.06)" : "rgba(18,18,18,.98)", border: `1.5px solid ${expandedSession === i ? "rgba(0,200,5,.2)" : "rgba(255,255,255,.07)"}`, borderRadius: expandedSession === i ? "14px 14px 0 0" : 14, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginBottom: 3 }}>{formatDate(s.date)}</div>
                      <div style={{ fontSize: 12, color: "#555555" }}>{s.sets.length} sets · Heaviest: {s.maxWeight} lbs · Total reps: {s.totalReps}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {i === 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#00c805", background: "rgba(0,200,5,.1)", padding: "3px 10px", borderRadius: 20 }}>Latest</span>}
                      <span style={{ color: "#555555" }}>{expandedSession === i ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {expandedSession === i && (
                    <div style={{ background: "rgba(14,14,14,.98)", border: "1.5px solid rgba(0,200,5,.15)", borderTop: "none", borderRadius: "0 0 14px 14px", padding: "14px 16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 1fr 1fr", gap: "0 8px", marginBottom: 12 }}>
                        {["Set","Reps","Weight","Total"].map(h => (
                          <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#555555", letterSpacing: 1, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,.05)", textTransform: "uppercase" }}>{h}</div>
                        ))}
                        {s.sets.map((set, si) => [
                          <div key={`n${si}`} style={{ fontSize: 13, fontWeight: 700, color: "#00c805", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{si + 1}</div>,
                          <div key={`r${si}`} style={{ fontSize: 13, color: "#ffffff", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600 }}>{set.reps}</div>,
                          <div key={`w${si}`} style={{ fontSize: 13, color: set.weight === s.maxWeight ? "#f0b429" : "#ffffff", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: set.weight === s.maxWeight ? 700 : 600 }}>{set.weight} lbs</div>,
                          <div key={`v${si}`} style={{ fontSize: 12, color: "#555555", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{set.reps * set.weight}</div>
                        ])}
                      </div>
                      <div style={{ fontSize: 11, color: "#555555" }}>Total: {s.totalReps} reps across {s.sets.length} sets</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Time Overview — moved to bottom, simplified */}
      {workouts.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#555555", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>Your Overall Stats</p>
          {(() => {
            const totalSessions = workouts.length;
            const totalRepsAll = workouts.reduce((sum, w) => sum + (Array.isArray(w.sets) ? w.sets : []).reduce((s2, s) => s2 + s.reps, 0), 0);
            const groupCount = {};
            workouts.forEach(w => {
              let cat = "Other";
              for (const [c, exs] of Object.entries(categories)) { if (exs.includes(w.exercise)) { cat = c; break; } }
              groupCount[cat] = (groupCount[cat] || 0) + 1;
            });
            const topGroup = Object.entries(groupCount).sort((a,b) => b[1]-a[1])[0];
            const allEx = [...new Set(workouts.map(w => w.exercise))];
            const maxCnt = Math.max(...Object.values(groupCount));
            return (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  {[
                    { label: "Times Trained", val: totalSessions, sub: "total sessions logged" },
                    { label: "Moves Tracked", val: allEx.length, sub: "different exercises" },
                    { label: "Total Reps", val: totalRepsAll.toLocaleString(), sub: "reps logged all time" },
                    { label: "Most Trained", val: topGroup ? topGroup[0] : "--", sub: topGroup ? `${topGroup[1]} sessions` : "", small: true },
                  ].map(c => (
                    <div key={c.label} style={{ background: "rgba(18,18,18,.98)", border: "1.5px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "14px 12px" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#555555", letterSpacing: 1.2, marginBottom: 6, textTransform: "uppercase" }}>{c.label}</div>
                      <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: c.small ? 13 : 20, fontWeight: 700, color: "#ffffff", lineHeight: 1, marginBottom: 3 }}>{c.val}</div>
                      <div style={{ fontSize: 10, color: "#555555" }}>{c.sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: "rgba(18,18,18,.98)", border: "1.5px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "14px 16px" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#555555", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>How Often You Train Each Muscle</p>
                  {Object.entries(groupCount).sort((a,b) => b[1]-a[1]).map(([cat, cnt]) => (
                    <div key={cat} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: "#aaaaaa" }}>{cat}</span>
                        <span style={{ fontSize: 12, color: "#555555" }}>{cnt} session{cnt !== 1 ? "s" : ""}</span>
                      </div>
                      <div style={{ background: "rgba(255,255,255,.05)", borderRadius: 100, height: 5, overflow: "hidden" }}>
                        <div style={{ width: `${(cnt/maxCnt)*100}%`, height: "100%", background: "#00c805", borderRadius: 100 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}


// ─── Edit Cardio Modal ────────────────────────────────────────────────────────
function EditCardioModal({ session, onSave, onDelete, onClose }) {
  const [activity, setActivity] = useState(session.activity);
  const [duration, setDuration] = useState(String(session.duration_mins));
  const [distance, setDistance] = useState(String(session.distance || ""));
  const [distanceUnit, setDistanceUnit] = useState(session.distance_unit || "miles");
  const [intensity, setIntensity] = useState(session.intensity || null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!duration || Number(duration) <= 0) return;
    setSaving(true);
    try {
      const updates = { activity: activity.trim(), duration_mins: Number(duration), distance: distance ? Number(distance) : null, distance_unit: distance ? distanceUnit : null, intensity: intensity || null };
      const { error } = await supabase.from("cardio_sessions").update(updates).eq("id", session.id);
      if (error) throw new Error(error.message);
      onSave({ ...session, ...updates });
    } catch (e) { alert("Error saving. Please try again."); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this cardio session?")) return;
    try {
      await supabase.from("cardio_sessions").delete().eq("id", session.id);
      onDelete(session.id);
    } catch (e) { alert("Error deleting."); }
  };

  return (
    <div className="overlay">
      <div style={{ background: "rgba(18,18,18,.98)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 22, width: "100%", maxWidth: 420, padding: 26 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 18, fontWeight: 700, color: "#ffffff" }}>Edit Cardio</p>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#555555", cursor: "pointer" }}>x</button>
        </div>
        <p style={{ fontSize: 11, color: "#555555", marginBottom: 18 }}>{formatDate(session.date)}</p>

        <div style={{ marginBottom: 14 }}>
          <label className="lbl">Activity</label>
          <input value={activity} onChange={e => setActivity(e.target.value)} className="field" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="lbl">Duration (minutes)</label>
          <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="field" style={{ textAlign: "center", fontSize: 20, fontWeight: 700 }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="lbl">Distance <span style={{ color: "#555555", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
          <div style={{ display: "flex", gap: 10 }}>
            <input type="number" value={distance} onChange={e => setDistance(e.target.value)} className="field" placeholder="0.0" style={{ flex: 1 }} />
            <div style={{ display: "flex", background: "rgba(255,255,255,.05)", borderRadius: 12, padding: 4, gap: 2 }}>
              {["miles","km"].map(u => (
                <button key={u} onClick={() => setDistanceUnit(u)}
                  style={{ padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 600, background: distanceUnit === u ? "rgba(255,255,255,.1)" : "none", color: distanceUnit === u ? "#ffffff" : "#666666" }}>
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="lbl">Intensity <span style={{ color: "#555555", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
          <div style={{ display: "flex", gap: 8 }}>
            {[["Easy","#00c805","rgba(0,200,5,.1)"],["Moderate","#f0b429","rgba(240,180,40,.1)"],["Hard","#ff4444","rgba(255,68,68,.1)"]].map(([lvl, color, bg]) => (
              <button key={lvl} onClick={() => setIntensity(intensity === lvl ? null : lvl)}
                style={{ flex: 1, padding: "10px 6px", borderRadius: 12, border: `1.5px solid ${intensity === lvl ? color : "rgba(255,255,255,.1)"}`, background: intensity === lvl ? bg : "rgba(18,18,18,.98)", color: intensity === lvl ? color : "#888888", fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {lvl}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          style={{ background: "#00c805", border: "none", borderRadius: 12, padding: 13, fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#000000", width: "100%", marginBottom: 10 }}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button onClick={handleDelete}
          style={{ background: "rgba(255,68,68,.08)", border: "1.5px solid rgba(255,68,68,.25)", borderRadius: 12, padding: 13, fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#ff4444", width: "100%" }}>
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

// ─── Coach Tab ────────────────────────────────────────────────────────────────
function CoachTab({ workouts, categories, user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const chatEndRef = useRef(null);

  // Build workout summary for AI context
  const buildContext = () => {
    if (!workouts || workouts.length === 0) return "The user has not logged any workouts yet.";

    // Muscle group frequency
    const groupCount = {};
    const exerciseLastWeight = {};
    const exerciseWeightByDate = {};

    workouts.forEach(w => {
      const setsArr = Array.isArray(w.sets) ? w.sets : [];
      // Find category
      let foundCat = "Other";
      for (const [cat, exs] of Object.entries(categories)) {
        if (exs.includes(w.exercise)) { foundCat = cat; break; }
      }
      groupCount[foundCat] = (groupCount[foundCat] || 0) + 1;

      // Track weight over time per exercise
      const maxW = setsArr.length > 0 ? Math.max(...setsArr.map(s => s.weight)) : 0;
      if (!exerciseWeightByDate[w.exercise]) exerciseWeightByDate[w.exercise] = [];
      exerciseWeightByDate[w.exercise].push({ date: w.date, maxWeight: maxW });
      exerciseLastWeight[w.exercise] = maxW;
    });

    // Find plateaus (no weight increase in last 2 entries)
    const plateaus = [];
    Object.entries(exerciseWeightByDate).forEach(([ex, entries]) => {
      const sorted = entries.sort((a, b) => a.date.localeCompare(b.date));
      if (sorted.length >= 2) {
        const last = sorted[sorted.length - 1];
        const prev = sorted[sorted.length - 2];
        if (last.maxWeight <= prev.maxWeight) plateaus.push({ exercise: ex, weight: last.maxWeight });
      }
    });

    // Find least trained muscle groups
    const allGroups = Object.keys(categories);
    const leastTrained = allGroups.filter(g => !groupCount[g] || groupCount[g] < 2);

    const totalSessions = workouts.length;
    const recentWorkouts = workouts.slice(0, 5).map(w => `${w.exercise} on ${w.date}`).join(", ");

    return `User: ${user.username}
Total sessions logged: ${totalSessions}
Recent workouts: ${recentWorkouts}
Sessions per muscle group: ${Object.entries(groupCount).map(([g, c]) => `${g}: ${c}`).join(", ")}
Undertrained groups (less than 2 sessions): ${leastTrained.join(", ") || "none"}
Exercises with no recent weight increase: ${plateaus.map(p => `${p.exercise} (stuck at ${p.weight} lbs)`).join(", ") || "none detected"}`;
  };

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
      const systemPrompt = `You are Iron Log's AI coach. You are a knowledgeable, encouraging, and direct fitness coach. You speak in plain simple English. No jargon. No em dashes. Short paragraphs. You have access to the user's workout data below.

Your job:
1. Analyze their training and give specific actionable advice
2. Identify muscle imbalances and suggest corrections
3. Challenge them when you see no progress
4. Ask questions to understand what is holding them back
5. Motivate them genuinely based on their actual data, not generic quotes
6. Reference their specific exercises and numbers when giving advice

Always be direct and specific. Never give vague advice. If they are stuck on a weight, tell them exactly what to do.

User workout data:
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
              activeExercise={activeExercise}
              setActiveExercise={setActiveExercise}
              weekProgress={weekProgress}
              dailyProgress={dailyProgress}
              maxVol={maxVol}
              maxDailyWeight={maxDailyWeight}
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
