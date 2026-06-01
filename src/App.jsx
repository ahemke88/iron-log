import { useState, useMemo, useRef, useEffect, useCallback } from "react";

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
    { val: snap(numVal - step * 2), size: 15, opacity: 0.18, fw: 400 },
    { val: snap(numVal - step),     size: 21, opacity: 0.32, fw: 500 },
    { val: numVal,                   size: 34, opacity: 1,    fw: 700, selected: true },
    { val: snap(numVal + step),     size: 21, opacity: 0.32, fw: 500 },
    { val: snap(numVal + step * 2), size: 15, opacity: 0.18, fw: 400 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
      {label && <div style={{ fontSize: 10, fontWeight: 700, color: "#a0a8cc", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 6, paddingTop: 10 }}>{label}</div>}
      <div ref={containerRef} onTouchStart={handleTouchStart} onTouchEnd={() => { accum.current = 0; }}
        style={{ userSelect: "none", touchAction: "none", cursor: "ns-resize", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {rows.map((r, i) => (
          <div key={i} onClick={() => { if (i < 2) change(step * (2 - i)); else if (i > 2) change(-step * (i - 2)); }}
            style={{ height: r.selected ? 54 : i === 1 || i === 3 ? 40 : 32, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", position: "relative", cursor: r.selected ? "default" : "pointer" }}>
            {r.selected && <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1.5, background: "linear-gradient(90deg,transparent,rgba(100,130,220,.35),transparent)" }} />}
            <span style={{ fontSize: r.size, color: `rgba(20,30,160,${r.opacity})`, fontWeight: r.fw, fontFamily: "'Playfair Display',serif", transition: "all .15s" }}>{r.val}</span>
            {r.selected && <div style={{ position: "absolute", bottom: 0, left: "10%", right: "10%", height: 1.5, background: "linear-gradient(90deg,transparent,rgba(100,130,220,.35),transparent)" }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Plate Calculator ─────────────────────────────────────────────────────────
const PLATE_SIZES = [2.5, 5, 10, 25, 35, 45];
const PLATE_COLORS = {
  2.5: { bg: "#e8e8f0", text: "#8888a8", h: 28 },
  5:   { bg: "#d0d0e0", text: "#6868a0", h: 36 },
  10:  { bg: "#a8c8f5", text: "#2050a0", h: 48 },
  25:  { bg: "#90d098", text: "#1a6030", h: 60 },
  35:  { bg: "#f0d060", text: "#806010", h: 68 },
  45:  { bg: "#6090e0", text: "#fff",    h: 76 }
};
const BAR_OPTIONS = [
  { name: "Standard Bar", short: "45lb Bar", weight: 45 },
  { name: "EZ Curl Bar",  short: "25lb Bar", weight: 25 },
  { name: "Smith Bar",    short: "20lb Bar", weight: 20 },
  { name: "No Bar",       short: "No Bar",   weight: 0  }
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
        <div style={{ display: "flex", gap: 8 }}>
          {BAR_OPTIONS.map(b => (
            <button key={b.name} onClick={() => setBar(b)}
              style={{ flex: 1, padding: "9px 6px", borderRadius: 12, border: `1.5px solid ${bar.name === b.name ? "#a8c8f5" : "rgba(180,185,220,.3)"}`, background: bar.name === b.name ? "rgba(168,200,245,.15)" : "rgba(255,255,255,.5)", color: bar.name === b.name ? "#3060b0" : "#a0a8cc", fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
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
              style={{ padding: "10px 14px", borderRadius: 12, border: "none", background: c.bg, color: c.text, fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 700, cursor: "pointer", minWidth: 52, boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}>
              {w}
            </button>
          ); })}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="lbl">Rack (tap × to remove)</div>
        <div style={{ background: "rgba(255,255,255,.6)", borderRadius: 16, padding: "16px 12px", border: "1.5px solid rgba(255,255,255,.85)", minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center", overflowX: "auto" }}>
          {plates.length === 0 ? <span style={{ fontSize: 13, color: "#c0c8e0" }}>No plates added yet</span> : (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              {displayPlates.map((w, i) => { const c = PLATE_COLORS[w]; const origIdx = plates.length - 1 - i; return (
                <div key={i} style={{ position: "relative" }}>
                  <button onClick={() => setPlates(prev => prev.filter((_, idx) => idx !== origIdx))}
                    style={{ position: "absolute", top: -8, right: -6, width: 18, height: 18, borderRadius: "50%", background: "rgba(220,80,80,.85)", border: "none", color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 700, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  <div style={{ width: 32, height: c.h, background: c.bg, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,.12)" }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: c.text, transform: "rotate(-90deg)", whiteSpace: "nowrap" }}>{w}</span>
                  </div>
                </div>
              ); })}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0 4px" }}>
                <div style={{ width: 40, height: 16, background: "linear-gradient(135deg,#c8d0e8,#a0aac8)", borderRadius: 8 }} />
                <span style={{ fontSize: 9, color: "#a0a8cc", marginTop: 3, fontWeight: 600 }}>{bar.weight}lb</span>
              </div>
              {[...displayPlates].reverse().map((w, i) => { const c = PLATE_COLORS[w]; return (
                <div key={i} style={{ width: 32, height: c.h, background: c.bg, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: c.text, transform: "rotate(-90deg)", whiteSpace: "nowrap" }}>{w}</span>
                </div>
              ); })}
            </div>
          )}
        </div>
        {plates.length > 0 && <button onClick={() => setPlates([])} style={{ marginTop: 8, background: "none", border: "1.5px solid rgba(220,100,100,.3)", borderRadius: 10, padding: "6px 14px", fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#c06060", cursor: "pointer", fontWeight: 600 }}>Clear all</button>}
      </div>
      <div style={{ background: "linear-gradient(130deg,rgba(168,200,255,.2),rgba(168,240,192,.2))", borderRadius: 14, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1.5px solid rgba(168,210,245,.3)" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#5070b0" }}>Total Weight</span>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 700, color: "#3050a0" }}>{total} <span style={{ fontSize: 14, color: "#7090c0" }}>lbs</span></span>
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
        <div style={{ display: "flex", background: "rgba(195,208,245,.2)", borderRadius: 30, padding: 4, width: "fit-content" }}>
          {[false,true].map(val => (
            <button key={String(val)} onClick={() => setCombined(val)}
              style={{ padding: "8px 16px", borderRadius: 26, border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600, background: combined === val ? "rgba(255,255,255,.9)" : "none", color: combined === val ? "#2d2d4e" : "#a0a8cc" }}>
              {val ? "Combined Total" : "Single DB"}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "#b0b8d8", marginTop: 6 }}>{combined ? "Logs both DBs combined (e.g. 30+30 = 60 lbs)" : "Logs one DB weight (e.g. 30 lbs)"}</p>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div className="lbl">Select Dumbbell Weight</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {DB_WEIGHTS.map(w => (
            <button key={w} onClick={() => setSelected(w)}
              style={{ padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${selected === w ? "#a8c8f5" : "rgba(180,185,220,.3)"}`, background: selected === w ? "linear-gradient(130deg,rgba(168,200,255,.3),rgba(168,240,192,.2))" : "rgba(255,255,255,.6)", color: selected === w ? "#3060b0" : "#6068a0", fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 700, cursor: "pointer", minWidth: 52 }}>
              {w}
            </button>
          ))}
        </div>
      </div>
      {selected !== null && (
        <div style={{ background: "linear-gradient(130deg,rgba(168,200,255,.2),rgba(168,240,192,.2))", borderRadius: 14, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1.5px solid rgba(168,210,245,.3)" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#5070b0" }}>{combined ? `${selected} + ${selected}` : "Single DB"}</span>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 700, color: "#3050a0" }}>{total} <span style={{ fontSize: 14, color: "#7090c0" }}>lbs</span></span>
        </div>
      )}
    </div>
  );
}

// ─── Weight Input ─────────────────────────────────────────────────────────────
function WeightInput({ onWeightChange }) {
  const [mode, setMode] = useState("barbell");
  const [manualVal, setManualVal] = useState("");
  const MODES = [{ key: "barbell", label: "Plate Loaded" }, { key: "dumbbell", label: "Dumbbell" }, { key: "bodyweight", label: "Bodyweight" }, { key: "manual", label: "Manual" }];
  return (
    <div style={{ background: "rgba(255,255,255,.55)", borderRadius: 18, border: "1.5px solid rgba(255,255,255,.85)", padding: 18 }}>
      <div style={{ display: "flex", flexWrap: "wrap", background: "rgba(195,208,245,.2)", borderRadius: 16, padding: 4, marginBottom: 20, gap: 2 }}>
        {MODES.map(m => (
          <button key={m.key} onClick={() => { setMode(m.key); if (m.key === "bodyweight") onWeightChange(0); }}
            style={{ flex: 1, minWidth: "45%", padding: "8px 4px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 600, background: mode === m.key ? "rgba(255,255,255,.9)" : "none", color: mode === m.key ? "#2d2d4e" : "#a0a8cc", boxShadow: mode === m.key ? "0 4px 14px rgba(155,175,235,.2)" : "none" }}>
            {m.label}
          </button>
        ))}
      </div>
      {mode === "barbell"     && <PlateCalculator onWeightChange={onWeightChange} />}
      {mode === "dumbbell"    && <DumbbellPicker  onWeightChange={onWeightChange} />}
      {mode === "bodyweight"  && (
        <div style={{ background: "linear-gradient(130deg,rgba(168,200,255,.2),rgba(168,240,192,.2))", borderRadius: 14, padding: "20px 18px", textAlign: "center", border: "1.5px solid rgba(168,210,245,.3)" }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: "#3050a0", marginBottom: 6 }}>Bodyweight</div>
          <div style={{ fontSize: 12, color: "#7090c0" }}>Logged as 0 lbs — no added weight</div>
        </div>
      )}
      {mode === "manual"   && (
        <div>
          <div className="lbl">Enter Any Weight</div>
          <p style={{ fontSize: 12, color: "#b0b8d8", marginBottom: 14 }}>For unusual weights like 2.5, 7, 62 lbs etc.</p>
          <input type="number" value={manualVal} onChange={e => { setManualVal(e.target.value); onWeightChange(Number(e.target.value)); }} placeholder="e.g. 7.5"
            style={{ background: "rgba(255,255,255,.72)", border: "1.5px solid rgba(180,185,220,.32)", borderRadius: 12, color: "#2d2d4e", padding: "11px 15px", width: "100%", fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, outline: "none", textAlign: "center" }} />
          {manualVal && (
            <div style={{ marginTop: 14, background: "linear-gradient(130deg,rgba(168,200,255,.2),rgba(168,240,192,.2))", borderRadius: 14, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1.5px solid rgba(168,210,245,.3)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#5070b0" }}>Total Weight</span>
              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 700, color: "#3050a0" }}>{manualVal} <span style={{ fontSize: 14, color: "#7090c0" }}>lbs</span></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function simpleHash(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; return String(h); }
const ADMIN_PASSWORD = "Infinit3Creature2000";
const store = {
  async get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  async set(k, v, s) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  async delete(k) { try { localStorage.removeItem(k); } catch {} }
};
const getWeekKey = (d) => { const dt = new Date(d), day = dt.getDay(), diff = dt.getDate() - day + (day === 0 ? -6 : 1); return new Date(dt.setDate(diff)).toISOString().split("T")[0]; };
const todayStr = () => new Date().toISOString().split("T")[0];
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// Build merged categories (default + user custom)
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

// Find which category an exercise belongs to
function findCategory(exerciseName, categories) {
  for (const [cat, exercises] of Object.entries(categories)) {
    if (exercises.includes(exerciseName)) return cat;
  }
  return null;
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  .glass{background:rgba(255,255,255,.58);backdrop-filter:blur(18px);border:1.5px solid rgba(255,255,255,.85);border-radius:22px;box-shadow:0 8px 32px rgba(160,185,230,.12)}
  .tab-pill{background:none;border:none;cursor:pointer;padding:10px 16px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;border-radius:30px;transition:all .22s;color:#a0a8cc}
  .tab-on{background:rgba(255,255,255,.88);color:#2d2d4e;box-shadow:0 4px 16px rgba(150,175,235,.22)}
  .field{background:rgba(255,255,255,.72);border:1.5px solid rgba(180,185,220,.32);border-radius:12px;color:#2d2d4e;padding:11px 15px;width:100%;font-family:'DM Sans',sans-serif;font-size:14px;outline:none}
  select.field{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23a0a8d0' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;background-color:rgba(255,255,255,.72);padding-right:34px}
  .save-btn{background:linear-gradient(130deg,#b8dcff 0%,#b8f0cc 100%);border:none;border-radius:14px;padding:14px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer;color:#1a3d2e;width:100%;box-shadow:0 6px 22px rgba(160,210,245,.38);transition:all .2s}
  .save-btn:hover{transform:translateY(-2px)}
  .add-set-btn{background:rgba(255,255,255,.5);border:1.5px dashed rgba(168,190,240,.55);border-radius:12px;padding:10px;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;color:#8098c8;width:100%;font-weight:500}
  .pr-row{background:rgba(255,255,255,.6);border:1.5px solid rgba(255,255,255,.88);border-radius:18px;padding:18px 20px;margin-bottom:11px;display:flex;justify-content:space-between;align-items:center;transition:transform .2s}
  .pr-row:hover{transform:translateY(-2px)}
  .chip{padding:7px 15px;font-size:12px;font-weight:500;cursor:pointer;border-radius:30px;border:1.5px solid rgba(180,185,225,.3);background:rgba(255,255,255,.5);color:#a0a8cc;transition:all .18s;font-family:'DM Sans',sans-serif}
  .chip-on{background:rgba(255,255,255,.88);color:#3040a0;border-color:#c0caee;box-shadow:0 4px 14px rgba(155,170,235,.2)}
  .stat-box{background:rgba(255,255,255,.62);backdrop-filter:blur(12px);border:1.5px solid rgba(255,255,255,.88);border-radius:18px;padding:20px 18px}
  .bar-bg{background:rgba(195,205,240,.22);border-radius:100px;height:10px;overflow:hidden}
  .bar-fg{height:100%;border-radius:100px;transition:width .7s cubic-bezier(.4,0,.2,1)}
  .rm-btn{background:rgba(255,120,120,.07);border:none;border-radius:8px;width:32px;height:32px;cursor:pointer;color:#d0a0a0;font-size:17px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .recent-card{background:rgba(255,255,255,.5);border-radius:14px;padding:14px 16px;margin-bottom:8px;border:1.5px solid rgba(255,255,255,.82)}
  .spill{font-size:12px;color:#7888c0;background:rgba(160,185,240,.14);padding:4px 12px;border-radius:20px;font-weight:500}
  .drum-wrap{background:rgba(255,255,255,.72);border:1.5px solid rgba(180,185,220,.28);border-radius:16px;overflow:hidden;flex:1;position:relative}
  .drum-wrap::after{content:'';position:absolute;left:0;right:0;top:0;height:55px;background:linear-gradient(to bottom,rgba(255,255,255,.95),transparent);pointer-events:none;z-index:2}
  .drum-wrap::before{content:'';position:absolute;left:0;right:0;bottom:0;height:55px;background:linear-gradient(to top,rgba(255,255,255,.95),transparent);pointer-events:none;z-index:2}
  .lbl{font-size:11px;font-weight:700;color:#a0a8cc;letter-spacing:1.2px;text-transform:uppercase;display:block;margin-bottom:8px}
  .err-box{background:rgba(255,100,100,.1);border:1px solid rgba(255,120,120,.3);border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#c05050}
  .cat-label{font-size:10px;font-weight:700;color:#a0a8cc;letter-spacing:1.5px;text-transform:uppercase;padding:12px 0 6px;display:block}
  .progress-indicator{border-radius:16px;padding:16px 18px;margin-bottom:18px;border:1.5px solid}
  .fade{animation:fu .3s ease}
  @keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .overlay{position:fixed;inset:0;background:rgba(20,25,60,.55);backdrop-filter:blur(6px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px}
`;

const BG = () => (
  <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
    <div style={{ position: "absolute", top: -100, right: -80, width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle,rgba(190,240,195,.55) 0%,transparent 68%)" }} />
    <div style={{ position: "absolute", top: 160, left: -90, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(190,215,255,.5) 0%,transparent 68%)" }} />
    <div style={{ position: "absolute", bottom: 80, right: 10, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,215,240,.38) 0%,transparent 68%)" }} />
  </div>
);

// ─── Admin Modals ─────────────────────────────────────────────────────────────
function AdminLoginModal({ onSuccess, onClose }) {
  const [pass, setPass] = useState(""); const [error, setError] = useState("");
  const submit = () => { if (pass === ADMIN_PASSWORD) onSuccess(); else { setError("Incorrect password."); setPass(""); } };
  return (
    <div className="overlay">
      <div className="glass" style={{ width: "100%", maxWidth: 340, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#151535" }}>Admin Access</p>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#a0a8cc", cursor: "pointer" }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: "#a0a8cc", marginBottom: 18 }}>Enter your admin password to continue.</p>
        <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="••••••••••••" className="field" style={{ marginBottom: 14 }} />
        {error && <div className="err-box">{error}</div>}
        <button onClick={submit} className="save-btn">Enter</button>
      </div>
    </div>
  );
}

function AdminView({ onClose }) {
  const [emails, setEmails] = useState(null);
  useEffect(() => { store.get("all_emails").then(list => setEmails(list || [])); }, []);
  return (
    <div className="overlay">
      <div className="glass" style={{ width: "100%", maxWidth: 440, padding: 28, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#151535" }}>Subscribers</p>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#a0a8cc", cursor: "pointer" }}>×</button>
        </div>
        {emails === null && <p style={{ color: "#a0a8cc" }}>Loading...</p>}
        {emails !== null && emails.length === 0 && <p style={{ color: "#b0b8d8" }}>No signups yet.</p>}
        {emails && emails.length > 0 && (
          <>
            <div style={{ background: "rgba(168,210,245,.1)", border: "1.5px solid rgba(168,210,245,.3)", borderRadius: 12, padding: "10px 14px", marginBottom: 18, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "#4a7aaf", fontWeight: 600 }}>Total subscribers</span>
              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: "#4060d8" }}>{emails.length}</span>
            </div>
            {emails.map((e, i) => (
              <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid rgba(180,195,235,.2)", display: "flex", justifyContent: "space-between" }}>
                <div><div style={{ fontSize: 14, fontWeight: 600, color: "#2d2d4e" }}>{e.email}</div><div style={{ fontSize: 11, color: "#b0b8d8" }}>@{e.username} · {e.joinedDate}</div></div>
                <span style={{ fontSize: 10, background: "rgba(168,240,192,.3)", color: "#3a8060", padding: "3px 10px", borderRadius: 20, fontWeight: 700, alignSelf: "center" }}>Active</span>
              </div>
            ))}
            <button onClick={() => { const csv = "Email,Username,Joined\n" + emails.map(e => `${e.email},${e.username},${e.joinedDate}`).join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "subscribers.csv"; a.click(); }}
              style={{ marginTop: 16, background: "linear-gradient(130deg,#b8dcff,#b8f0cc)", border: "none", borderRadius: 12, padding: "12px 20px", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#1a3d2e", width: "100%" }}>
              Download CSV
            </button>
          </>
        )}
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
    const key = `user:${username.trim().toLowerCase()}`;
    const existing = await store.get(key);
    if (mode === "login") {
      if (!existing) { setError("Account not found."); setLoading(false); return; }
      if (existing.hash !== simpleHash(password)) { setError("Incorrect password."); setLoading(false); return; }
    } else {
      if (existing) { setError("Username taken."); setLoading(false); return; }
      await store.set(key, { hash: simpleHash(password), email: email.trim().toLowerCase(), username: username.trim().toLowerCase(), joinedDate: todayStr() });
      await store.set(`workouts:${username.trim().toLowerCase()}`, []);
      await store.set(`custom_exercises:${username.trim().toLowerCase()}`, []);
      let emailList = await store.get("all_emails") || [];
      if (!emailList.find(e => e.email === email.trim().toLowerCase())) {
        emailList.push({ email: email.trim().toLowerCase(), username: username.trim().toLowerCase(), joinedDate: todayStr() });
        await store.set("all_emails", emailList, true);
      }
    }
    onLogin(username.trim().toLowerCase(), existing?.email || email.trim().toLowerCase());
    setLoading(false);
  };
  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", minHeight: "100vh", background: "linear-gradient(140deg,#deeeff 0%,#eaf6ff 25%,#edfff0 55%,#f5fff2 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28 }}>
      <style>{STYLES}</style><BG />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 380 }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#a0b8d8", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Progressive Overload Tracker</p>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 40, fontWeight: 700, color: "#151535", lineHeight: 1.1 }}>Your fitness,<br /><em style={{ color: "#5080df" }}>elevated.</em></h1>
        </div>
        <div className="glass" style={{ padding: 28 }}>
          <div style={{ display: "flex", background: "rgba(195,208,245,.2)", borderRadius: 30, padding: 4, marginBottom: 24 }}>
            {[["login","Sign In"],["signup","Create Account"]].map(([k,l]) => (
              <button key={k} onClick={() => { setMode(k); setError(""); }} style={{ flex: 1, padding: "9px 0", borderRadius: 26, border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, background: mode === k ? "rgba(255,255,255,.9)" : "none", color: mode === k ? "#2d2d4e" : "#a0a8cc" }}>{l}</button>
            ))}
          </div>
          <div style={{ marginBottom: 14 }}><label className="lbl">Username</label><input value={username} onChange={e => setUsername(e.target.value)} placeholder="your_username" onKeyDown={e => e.key === "Enter" && submit()} className="field" /></div>
          {mode === "signup" && <div style={{ marginBottom: 14 }}><label className="lbl">Email address</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" className="field" /><p style={{ fontSize: 11, color: "#b0b8d8", marginTop: 6 }}>Used to receive updates and recover your account.</p></div>}
          <div style={{ marginBottom: 20 }}><label className="lbl">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && submit()} className="field" /></div>
          {error && <div className="err-box">{error}</div>}
          <button onClick={submit} disabled={loading} className="save-btn" style={{ opacity: loading ? .7 : 1 }}>{loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}</button>
        </div>
      </div>
    </div>
  );
}

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
    if (weightTrend && volumeTrend) return { type: "great", msg: "You're progressing!", sub: "Weight and volume are both going up. Keep it up.", bg: "rgba(150,230,170,.15)", border: "rgba(100,200,130,.3)", color: "#2a8040" };
    if (!weightFlat && volumeTrend) return { type: "good", msg: "Volume is increasing!", sub: "Great work. Consider adding a little more weight soon.", bg: "rgba(168,210,255,.15)", border: "rgba(120,180,255,.3)", color: "#2050a0" };
    if (weightFlat && volFlat) return { type: "plateau", msg: "Plateau detected", sub: "Weight and volume have been flat. Try adding 5 lbs or one extra rep this session.", bg: "rgba(255,210,150,.15)", border: "rgba(255,180,80,.3)", color: "#a06010" };
    return { type: "ok", msg: "Keep going!", sub: "Log more sessions to see your full trend.", bg: "rgba(195,208,245,.15)", border: "rgba(160,180,240,.3)", color: "#4050a0" };
  }, [weekProgress]);

  if (!indicator) return null;
  return (
    <div className="progress-indicator" style={{ background: indicator.bg, borderColor: indicator.border }}>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: indicator.color, marginBottom: 4 }}>{indicator.msg}</div>
      <div style={{ fontSize: 13, color: "#6070a0" }}>{indicator.sub}</div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null); const [userEmail, setUserEmail] = useState("");
  const [workouts, setWorkouts] = useState([]); const [tab, setTab] = useState("log");
  const [customExercises, setCustomExercises] = useState([]); // { name, category }[]
  const [selectedExercise, setSelectedExercise] = useState("Bench Press");
  const [customEx, setCustomEx] = useState(""); const [customExCategory, setCustomExCategory] = useState("Chest");
  const [sets, setSets] = useState([{ id: Date.now(), reps: "8", weight: 0 }]);
  const [date, setDate] = useState(todayStr()); const [saved, setSaved] = useState(false);
  const [activeExercise, setActiveExercise] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false); const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const adminTaps = useRef(0); const adminTimer = useRef(null);

  const categories = useMemo(() => buildCategories(customExercises), [customExercises]);

  // Restore session on app open
  useEffect(() => {
    const restore = async () => {
      try {
        const session = await store.get("active_session");
        if (session?.username) {
          const userRecord = await store.get(`user:${session.username}`);
          if (userRecord) {
            const data = await store.get(`workouts:${session.username}`);
            const custom = await store.get(`custom_exercises:${session.username}`);
            setWorkouts(data || []);
            setCustomExercises(custom || []);
            setUserEmail(userRecord.email || "");
            setUser(session.username);
          }
        }
      } catch {}
      setSessionLoading(false);
    };
    restore();
  }, []);

  const handleLogin = async (u, email) => {
    const data = await store.get(`workouts:${u}`);
    const custom = await store.get(`custom_exercises:${u}`);
    setWorkouts(data || []);
    setCustomExercises(custom || []);
    setUserEmail(email || "");
    setUser(u);
    await store.set("active_session", { username: u });
  };

  const saveWorkout = async () => {
    const name = customEx.trim() || selectedExercise;
    const validSets = sets.filter(s => s.weight > 0);
    if (!validSets.length) return;

    // Save custom exercise to user's list if new
    if (customEx.trim()) {
      const alreadyExists = customExercises.find(e => e.name.toLowerCase() === customEx.trim().toLowerCase());
      if (!alreadyExists) {
        const newCustom = [...customExercises, { name: customEx.trim(), category: customExCategory }];
        setCustomExercises(newCustom);
        await store.set(`custom_exercises:${user}`, newCustom);
      }
    }

    const newW = { id: Date.now(), date, exercise: name, sets: validSets.map(s => ({ reps: Number(s.reps), weight: Number(s.weight) })) };
    const updated = [...workouts, newW];
    setWorkouts(updated);
    await store.set(`workouts:${user}`, updated);
    setSets([{ id: Date.now(), reps: "8", weight: 0 }]);
    setCustomEx(""); setSaved(true); setTimeout(() => setSaved(false), 2200);
  };

  const updateSetReps = (i, val) => { const s = [...sets]; s[i].reps = val; setSets(s); };
  const updateSetWeight = (i, val) => { const s = [...sets]; s[i].weight = val; setSets(s); };

  const handleLogoTap = () => {
    adminTaps.current++; clearTimeout(adminTimer.current);
    adminTimer.current = setTimeout(() => { adminTaps.current = 0; }, 2000);
    if (adminTaps.current >= 5) { adminTaps.current = 0; setShowAdminLogin(true); }
  };

  const prs = useMemo(() => {
    const map = {};
    workouts.forEach(w => { const best = Math.max(...w.sets.map(s => s.weight)); const bestSet = w.sets.find(s => s.weight === best); if (!map[w.exercise] || best > map[w.exercise].weight) map[w.exercise] = { weight: best, reps: bestSet.reps, date: w.date }; });
    return Object.entries(map).sort((a, b) => b[1].weight - a[1].weight);
  }, [workouts]);

  // Group logged exercises by category for progress tab
  const loggedByCategory = useMemo(() => {
    const logged = [...new Set(workouts.map(w => w.exercise))];
    const grouped = {};
    logged.forEach(ex => {
      const cat = findCategory(ex, categories) || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(ex);
    });
    return grouped;
  }, [workouts, categories]);

  // Auto-select first logged exercise for progress
  useEffect(() => {
    if (!activeExercise && workouts.length > 0) setActiveExercise(workouts[0].exercise);
  }, [workouts]);

  const weekProgress = useMemo(() => {
    if (!activeExercise) return [];
    const byWeek = {};
    workouts.filter(w => w.exercise === activeExercise).forEach(w => { const wk = getWeekKey(w.date); if (!byWeek[wk]) byWeek[wk] = { totalVol: 0, maxWeight: 0 }; w.sets.forEach(s => { byWeek[wk].totalVol += s.reps * s.weight; byWeek[wk].maxWeight = Math.max(byWeek[wk].maxWeight, s.weight); }); });
    return Object.entries(byWeek).sort((a, b) => a[0].localeCompare(b[0]));
  }, [workouts, activeExercise]);

  const maxVol = useMemo(() => Math.max(...weekProgress.map(([, v]) => v.totalVol), 1), [weekProgress]);

  if (sessionLoading) return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", minHeight: "100vh", background: "linear-gradient(140deg,#deeeff 0%,#eaf6ff 25%,#edfff0 55%,#f5fff2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{STYLES}</style><BG />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: "#151535", marginBottom: 8 }}>Iron Log</p>
        <p style={{ fontSize: 13, color: "#a0a8cc" }}>Loading your session...</p>
      </div>
    </div>
  );
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", minHeight: "100vh", background: "linear-gradient(140deg,#deeeff 0%,#eaf6ff 25%,#edfff0 55%,#f5fff2 100%)", color: "#2d2d4e", paddingBottom: 80 }}>
      <style>{STYLES}</style><BG />
      {showAdminLogin && <AdminLoginModal onSuccess={() => { setShowAdminLogin(false); setShowAdmin(true); }} onClose={() => setShowAdminLogin(false)} />}
      {showAdmin && <AdminView onClose={() => setShowAdmin(false)} />}

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ padding: "36px 24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span onClick={handleLogoTap} style={{ fontSize: 11, fontWeight: 700, color: "#a0b8d8", letterSpacing: 2, textTransform: "uppercase", cursor: "default" }}>Iron Log</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => window.location.reload()} title="Refresh app" style={{ background: "rgba(255,255,255,.6)", border: "1.5px solid rgba(180,185,220,.3)", borderRadius: 20, padding: "5px 12px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "#a0a8cc", cursor: "pointer" }}>↺</button>
              <button onClick={() => { setUser(null); setWorkouts([]); setCustomExercises([]); store.delete('active_session'); }} style={{ background: "rgba(255,255,255,.6)", border: "1.5px solid rgba(180,185,220,.3)", borderRadius: 20, padding: "5px 14px", fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#a0a8cc", cursor: "pointer" }}>Sign out</button>
            </div>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 700, color: "#151535", lineHeight: 1.1, marginBottom: 22 }}>Hey, <em style={{ color: "#5080df" }}>{user}</em> 👋</h1>
          <div style={{ background: "rgba(195,208,245,.2)", borderRadius: 40, padding: 5, display: "inline-flex", gap: 2 }}>
            {[["log","Log"],["prs","PRs"],["progress","Progress"]].map(([k,l]) => (
              <button key={k} className={`tab-pill ${tab === k ? "tab-on" : ""}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: "0 20px" }}>

          {/* ── LOG TAB ── */}
          {tab === "log" && (
            <div className="fade">
              <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
                <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 21, fontWeight: 700, color: "#151535", marginBottom: 22 }}>New session</p>

                <div style={{ marginBottom: 16 }}>
                  <label className="lbl">Date</label>
                  <input type="date" className="field" value={date} onChange={e => setDate(e.target.value)} style={{ width: "auto" }} />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label className="lbl">Exercise</label>
                  {/* Grouped dropdown */}
                  <select className="field" value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)} style={{ marginBottom: 10 }}>
                    {Object.entries(categories).map(([cat, exercises]) => (
                      <optgroup key={cat} label={`── ${cat.toUpperCase()} ──`}>
                        {exercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                      </optgroup>
                    ))}
                  </select>

                  {/* Custom exercise input */}
                  <div style={{ background: "rgba(255,255,255,.5)", borderRadius: 14, padding: 14, border: "1.5px solid rgba(255,255,255,.8)" }}>
                    <label className="lbl">Or add a custom exercise</label>
                    <input className="field" placeholder="e.g. Hip Abductor" value={customEx} onChange={e => setCustomEx(e.target.value)} style={{ marginBottom: 10 }} />
                    {customEx.trim() && (
                      <div>
                        <label className="lbl">Which category does it belong to?</label>
                        <select className="field" value={customExCategory} onChange={e => setCustomExCategory(e.target.value)}>
                          {CATEGORY_NAMES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <p style={{ fontSize: 11, color: "#b0b8d8", marginTop: 8 }}>It will be saved to your {customExCategory} list permanently.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: 22 }}>
                  <label className="lbl">Sets</label>
                  {sets.map((s, i) => (
                    <div key={s.id} style={{ marginBottom: 24, background: "rgba(255,255,255,.4)", borderRadius: 20, padding: 18, border: "1.5px solid rgba(255,255,255,.8)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#5070b0" }}>SET {i + 1}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {s.weight > 0 && <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "#3050a0" }}>{s.weight} lbs</span>}
                          <button onClick={() => setSets([...sets.slice(0, i+1), { id: Date.now(), reps: s.reps, weight: s.weight }, ...sets.slice(i+1)])}
                            title="Duplicate set"
                            style={{ background: "rgba(168,200,245,.15)", border: "1.5px solid rgba(168,200,245,.4)", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#5080c0", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>⧉</button>
                          {sets.length > 1 && <button className="rm-btn" onClick={() => setSets(sets.filter((_, idx) => idx !== i))}>×</button>}
                        </div>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label className="lbl">Reps — swipe up/down</label>
                        <div className="drum-wrap" style={{ maxWidth: 140 }}>
                          <DrumPicker value={s.reps} onChange={v => updateSetReps(i, v)} min={1} max={100} step={1} label="Reps" />
                        </div>
                      </div>
                      <label className="lbl">Weight</label>
                      <WeightInput onWeightChange={v => updateSetWeight(i, v)} />
                    </div>
                  ))}
                  <button className="add-set-btn" onClick={() => setSets([...sets, { id: Date.now(), reps: sets[sets.length-1].reps, weight: sets[sets.length-1].weight }])}>+ Add set</button>
                </div>

                <button className="save-btn" onClick={saveWorkout}>{saved ? "✓ Saved!" : "Save Workout"}</button>
              </div>

              {workouts.length > 0 && (
                <div>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 19, fontWeight: 700, color: "#151535", marginBottom: 14 }}>Recent sessions</p>
                  {[...workouts].reverse().slice(0, 4).map(w => (
                    <div key={w.id} className="recent-card">
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{w.exercise}</span>
                        <span style={{ fontSize: 11, color: "#b0b8d8" }}>{w.date}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{w.sets.map((s, i) => <span key={i} className="spill">{s.reps} × {s.weight} lbs</span>)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PRs TAB ── */}
          {tab === "prs" && (
            <div className="fade">
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 21, fontWeight: 700, color: "#151535", marginBottom: 6 }}>Personal records</p>
              <p style={{ fontSize: 13, color: "#a0a8cc", marginBottom: 20 }}>Your heaviest lift ever, per exercise.</p>
              {prs.length === 0 && <div className="glass" style={{ padding: 28, textAlign: "center" }}><p style={{ color: "#b0b8d8" }}>No records yet — log some workouts!</p></div>}
              {Object.entries(
                prs.reduce((acc, [ex, pr]) => {
                  const cat = findCategory(ex, categories) || "Other";
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push([ex, pr]);
                  return acc;
                }, {})
              ).map(([cat, items]) => (
                <div key={cat}>
                  <span className="cat-label">{cat}</span>
                  {items.map(([ex, pr], i) => (
                    <div key={ex} className="pr-row" style={{ boxShadow: i === 0 && cat === prs[0]?.[0] ? "0 8px 32px rgba(155,220,175,.28)" : "0 4px 16px rgba(160,185,230,.1)" }}>
                      <div>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "#151535", marginBottom: 4 }}>{ex}</div>
                        <div style={{ fontSize: 11, color: "#b0b8d8" }}>Achieved {pr.date}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 700, color: "#4870df", lineHeight: 1 }}>{pr.weight}</div>
                        <div style={{ fontSize: 12, color: "#b0b8d8", marginTop: 3 }}>lbs × {pr.reps} reps</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* ── PROGRESS TAB ── */}
          {tab === "progress" && (
            <div className="fade">
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 21, fontWeight: 700, color: "#151535", marginBottom: 6 }}>Week-over-week</p>
              <p style={{ fontSize: 13, color: "#a0a8cc", marginBottom: 16 }}>Select an exercise to see your progress.</p>

              {/* Grouped exercise chips */}
              {Object.keys(loggedByCategory).length === 0 && (
                <div className="glass" style={{ padding: 28, textAlign: "center" }}><p style={{ color: "#b0b8d8" }}>Log workouts to see your progress.</p></div>
              )}
              {Object.entries(loggedByCategory).map(([cat, exercises]) => (
                <div key={cat} style={{ marginBottom: 16 }}>
                  <span className="cat-label">{cat}</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {exercises.map(ex => (
                      <button key={ex} className={`chip ${activeExercise === ex ? "chip-on" : ""}`} onClick={() => setActiveExercise(ex)}>{ex}</button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Progress detail */}
              {activeExercise && weekProgress.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 700, color: "#151535", marginBottom: 16 }}>{activeExercise}</p>

                  <ProgressIndicator weekProgress={weekProgress} />

                  {weekProgress.length >= 2 && (() => {
                    const last = weekProgress[weekProgress.length - 1][1];
                    const prev = weekProgress[weekProgress.length - 2][1];
                    return (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                          {[{ label: "Max Weight", val: `${last.maxWeight}`, unit: "lbs", diff: last.maxWeight - prev.maxWeight, color: "#4060d8", glow: "rgba(160,185,255,.3)" }, { label: "Total Volume", val: last.totalVol.toLocaleString(), unit: "lbs", diff: last.totalVol - prev.totalVol, color: "#388a5a", glow: "rgba(150,220,180,.3)" }].map(c => (
                            <div key={c.label} className="stat-box" style={{ boxShadow: `0 8px 28px ${c.glow}` }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#b0b8d8", letterSpacing: 1.2, marginBottom: 10, textTransform: "uppercase" }}>{c.label}</div>
                              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: c.color, lineHeight: 1, marginBottom: 4 }}>{c.val}</div>
                              <div style={{ fontSize: 11, color: "#b0b8d8", marginBottom: 8 }}>{c.unit}</div>
                              <div style={{ fontSize: 12, color: c.diff >= 0 ? "#3a9060" : "#c05050", fontWeight: 700 }}>{c.diff >= 0 ? "↑" : "↓"} {Math.abs(c.diff)} {c.unit} vs last wk</div>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}

                  <div className="glass" style={{ padding: 20, marginBottom: 18 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#a0a8cc", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 18 }}>Weekly Volume</p>
                    {(() => {
                      const BAR_COLORS = ["#a8c8ff","#b8e0a8","#f0d080","#f0a8c8","#a8e0f0","#d0a8f0","#f0b8a8","#a8f0d0"];
                      const svgW = 320, svgH = 200;
                      const pad = { top: 16, right: 16, bottom: 48, left: 52 };
                      const chartW = svgW - pad.left - pad.right;
                      const chartH = svgH - pad.top - pad.bottom;
                      const n = weekProgress.length;
                      const barW = Math.min(40, (chartW / n) * 0.55);
                      const gap = chartW / n;
                      const yMax = maxVol * 1.15;
                      const yTicks = 4;
                      const getLabel = (wk, i) => {
                        if (i === n - 1) return "Now";
                        if (i === n - 2) return "Last";
                        const d = new Date(wk);
                        return `${d.getMonth()+1}/${d.getDate()}`;
                      };
                      return (
                        <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ overflow: "visible" }}>
                          {/* Y grid lines + labels */}
                          {Array.from({ length: yTicks + 1 }, (_, ti) => {
                            const val = Math.round((yMax / yTicks) * ti);
                            const y = pad.top + chartH - (val / yMax) * chartH;
                            return (
                              <g key={ti}>
                                <line x1={pad.left} x2={pad.left + chartW} y1={y} y2={y} stroke="rgba(160,180,230,.2)" strokeWidth="1" strokeDasharray="4,3" />
                                <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#a0a8cc" fontFamily="DM Sans, sans-serif">
                                  {val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                                </text>
                              </g>
                            );
                          })}
                          {/* Axes */}
                          <line x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top + chartH} stroke="rgba(160,180,230,.4)" strokeWidth="1.5" />
                          <line x1={pad.left} x2={pad.left + chartW} y1={pad.top + chartH} y2={pad.top + chartH} stroke="rgba(160,180,230,.4)" strokeWidth="1.5" />
                          {/* Y axis label */}
                          <text x={12} y={pad.top + chartH / 2} textAnchor="middle" fontSize="9" fill="#a0a8cc" fontFamily="DM Sans, sans-serif" transform={`rotate(-90, 12, ${pad.top + chartH / 2})`}>Volume (lbs)</text>
                          {/* Bars */}
                          {weekProgress.map(([wk, v], i) => {
                            const barH = (v.totalVol / yMax) * chartH;
                            const x = pad.left + gap * i + gap / 2 - barW / 2;
                            const y = pad.top + chartH - barH;
                            const isLatest = i === n - 1;
                            const color = BAR_COLORS[i % BAR_COLORS.length];
                            return (
                              <g key={wk}>
                                <rect x={x} y={y} width={barW} height={barH} rx="4" fill={isLatest ? "#6090e0" : color} opacity={isLatest ? 1 : 0.75} />
                                <text x={x + barW / 2} y={pad.top + chartH + 14} textAnchor="middle" fontSize="9" fill={isLatest ? "#3050a0" : "#a0a8cc"} fontFamily="DM Sans, sans-serif" fontWeight={isLatest ? "700" : "400"}>
                                  {getLabel(wk, i)}
                                </text>
                                <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="8" fill={isLatest ? "#3050a0" : "#8090b8"} fontFamily="DM Sans, sans-serif">
                                  {v.totalVol >= 1000 ? `${(v.totalVol/1000).toFixed(1)}k` : v.totalVol}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      );
                    })()}
                  </div>

                  {/* Top sets table */}
                  <div className="glass" style={{ padding: 20 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#a0a8cc", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 16 }}>Top Sets</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 50px 88px 60px", gap: "0 8px" }}>
                      {["Date","Reps","Weight","Vol"].map(h => (
                        <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#c0c8e0", letterSpacing: 1, paddingBottom: 10, borderBottom: "1px solid rgba(180,195,235,.2)", textTransform: "uppercase" }}>{h}</div>
                      ))}
                      {workouts.filter(w => w.exercise === activeExercise)
                        .flatMap(w => w.sets.map(s => ({ date: w.date, ...s, vol: s.reps * s.weight })))
                        .sort((a, b) => b.weight - a.weight).slice(0, 8)
                        .flatMap((s, i) => [
                          <div key={`d${i}`} style={{ fontSize: 12, color: "#a0a8cc", padding: "10px 0", borderBottom: "1px solid rgba(180,195,235,.12)" }}>{s.date}</div>,
                          <div key={`r${i}`} style={{ fontSize: 13, fontWeight: 600, color: "#2d2d4e", padding: "10px 0", borderBottom: "1px solid rgba(180,195,235,.12)" }}>{s.reps}</div>,
                          <div key={`w${i}`} style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? "#4060d8" : "#2d2d4e", padding: "10px 0", borderBottom: "1px solid rgba(180,195,235,.12)" }}>{s.weight} lbs</div>,
                          <div key={`v${i}`} style={{ fontSize: 12, color: "#a0a8cc", padding: "10px 0", borderBottom: "1px solid rgba(180,195,235,.12)" }}>{s.vol}</div>
                        ])}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
