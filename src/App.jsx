import { useState, useMemo, useRef, useEffect, useCallback } from "react";

function DrumPicker({ value, onChange, min = 0, max = 999, step = 1, label }) {
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
    accum.current += dy;
    lastY.current = e.touches[0].clientY;
    if (Math.abs(accum.current) >= 30) { change(accum.current > 0 ? step : -step); accum.current = 0; }
  }, [change, step]);
  const handleTouchEnd = () => { accum.current = 0; };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
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
      <div ref={containerRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
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

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return String(h);
}

const store = {
  async get(key) { try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; } catch { return null; } },
  async set(key, val) { try { await window.storage.set(key, JSON.stringify(val)); } catch {} },
};

const EXERCISES = ["Bench Press","Squat","Deadlift","Overhead Press","Barbell Row","Pull-ups","Dips","Incline Bench","Leg Press","Romanian Deadlift","Lat Pulldown","Cable Row"];
const getWeekKey = (d) => { const dt = new Date(d), day = dt.getDay(), diff = dt.getDate() - day + (day === 0 ? -6 : 1); return new Date(dt.setDate(diff)).toISOString().split("T")[0]; };
const todayStr = () => new Date().toISOString().split("T")[0];
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  .glass{background:rgba(255,255,255,.58);backdrop-filter:blur(18px);border:1.5px solid rgba(255,255,255,.85);border-radius:22px;box-shadow:0 8px 32px rgba(160,185,230,.12)}
  .tab-pill{background:none;border:none;cursor:pointer;padding:10px 16px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;border-radius:30px;transition:all .22s;color:#a0a8cc}
  .tab-on{background:rgba(255,255,255,.88);color:#2d2d4e;box-shadow:0 4px 16px rgba(150,175,235,.22)}
  .field{background:rgba(255,255,255,.72);border:1.5px solid rgba(180,185,220,.32);border-radius:12px;color:#2d2d4e;padding:11px 15px;width:100%;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;transition:border .2s}
  .field:focus{border-color:#a8c8f5;box-shadow:0 0 0 3px rgba(168,200,245,.18)}
  select.field{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23a0a8d0' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;background-color:rgba(255,255,255,.72);padding-right:34px}
  .save-btn{background:linear-gradient(130deg,#b8dcff 0%,#b8f0cc 100%);border:none;border-radius:14px;padding:14px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer;color:#1a3d2e;width:100%;box-shadow:0 6px 22px rgba(160,210,245,.38);transition:all .2s}
  .save-btn:hover{transform:translateY(-2px)}
  .save-btn:disabled{opacity:.6;cursor:default;transform:none}
  .add-set-btn{background:rgba(255,255,255,.5);border:1.5px dashed rgba(168,190,240,.55);border-radius:12px;padding:10px;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;color:#8098c8;transition:all .2s;width:100%;font-weight:500}
  .pr-row{background:rgba(255,255,255,.6);border:1.5px solid rgba(255,255,255,.88);border-radius:18px;padding:18px 20px;margin-bottom:11px;display:flex;justify-content:space-between;align-items:center;transition:transform .2s,box-shadow .2s}
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
  .fade{animation:fu .3s ease}
  @keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .lbl{font-size:11px;font-weight:700;color:#a0a8cc;letter-spacing:1.2px;text-transform:uppercase;display:block;margin-bottom:8px}
  .err-box{background:rgba(255,100,100,.1);border:1px solid rgba(255,120,120,.3);border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#c05050}
  .email-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(168,210,245,.15);border:1.5px solid rgba(168,210,245,.4);border-radius:20px;padding:5px 12px;font-size:12px;color:#4a7aaf;font-weight:500}
`;

const BG = () => (
  <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
    <div style={{ position: "absolute", top: -100, right: -80, width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle,rgba(190,240,195,.55) 0%,transparent 68%)" }} />
    <div style={{ position: "absolute", top: 160, left: -90, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(190,215,255,.5) 0%,transparent 68%)" }} />
    <div style={{ position: "absolute", bottom: 80, right: 10, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,215,240,.38) 0%,transparent 68%)" }} />
    <div style={{ position: "absolute", bottom: 280, left: 20, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,240,190,.35) 0%,transparent 68%)" }} />
  </div>
);

function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password.trim()) { setError("Please fill in all required fields."); return; }
    if (mode === "signup" && !email.trim()) { setError("Please enter your email address."); return; }
    if (mode === "signup" && !isValidEmail(email)) { setError("Please enter a valid email address."); return; }
    setLoading(true); setError("");

    const key = `user:${username.trim().toLowerCase()}`;
    const existing = await store.get(key);

    if (mode === "login") {
      if (!existing) { setError("Account not found. Create one instead?"); setLoading(false); return; }
      if (existing.hash !== simpleHash(password)) { setError("Incorrect password."); setLoading(false); return; }
    } else {
      if (existing) { setError("Username taken. Try another."); setLoading(false); return; }
      // Save user with email
      await store.set(key, { hash: simpleHash(password), email: email.trim().toLowerCase(), username: username.trim().toLowerCase(), joinedDate: todayStr() });
      await store.set(`workouts:${username.trim().toLowerCase()}`, []);
      // Save to shared email list (for your records)
      let emailList = await store.get("all_emails") || [];
      if (!emailList.find(e => e.email === email.trim().toLowerCase())) {
        emailList.push({ email: email.trim().toLowerCase(), username: username.trim().toLowerCase(), joinedDate: todayStr() });
        await store.set("all_emails", emailList, true); // shared so you can see all signups
      }
    }
    onLogin(username.trim().toLowerCase(), existing?.email || email.trim().toLowerCase());
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", minHeight: "100vh", background: "linear-gradient(140deg,#deeeff 0%,#eaf6ff 25%,#edfff0 55%,#f5fff2 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28 }}>
      <style>{STYLES}</style>
      <BG />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 380 }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#a0b8d8", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Progressive Overload Tracker</p>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 40, fontWeight: 700, color: "#151535", lineHeight: 1.1 }}>Your fitness,<br /><em style={{ color: "#5080df" }}>elevated.</em></h1>
        </div>

        <div className="glass" style={{ padding: 28 }}>
          <div style={{ display: "flex", background: "rgba(195,208,245,.2)", borderRadius: 30, padding: 4, marginBottom: 24 }}>
            {[["login","Sign In"],["signup","Create Account"]].map(([k,l]) => (
              <button key={k} onClick={() => { setMode(k); setError(""); }} style={{ flex: 1, padding: "9px 0", borderRadius: 26, border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, transition: "all .2s", background: mode === k ? "rgba(255,255,255,.9)" : "none", color: mode === k ? "#2d2d4e" : "#a0a8cc", boxShadow: mode === k ? "0 4px 14px rgba(155,175,235,.2)" : "none" }}>{l}</button>
            ))}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="lbl">Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="your_username" onKeyDown={e => e.key === "Enter" && submit()} className="field" />
          </div>

          {mode === "signup" && (
            <div style={{ marginBottom: 14 }}>
              <label className="lbl">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" onKeyDown={e => e.key === "Enter" && submit()} className="field" />
              <p style={{ fontSize: 11, color: "#b0b8d8", marginTop: 6 }}>Used to recover your account and receive updates.</p>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label className="lbl">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && submit()} className="field" />
          </div>

          {error && <div className="err-box">{error}</div>}

          <button onClick={submit} disabled={loading} className="save-btn" style={{ opacity: loading ? .7 : 1 }}>
            {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>

          {mode === "signup" && (
            <p style={{ fontSize: 11, color: "#b0b8d8", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>
              By signing up you agree to receive product updates and tips. No spam, ever.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Admin Email List Viewer ────────────────────────────────────────────────────
function AdminView({ onClose }) {
  const [emails, setEmails] = useState(null);
  useEffect(() => {
    store.get("all_emails").then(list => setEmails(list || []));
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,25,60,.5)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="glass" style={{ width: "100%", maxWidth: 440, padding: 28, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#151535" }}>📋 Subscriber List</p>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#a0a8cc", cursor: "pointer" }}>×</button>
        </div>

        {emails === null && <p style={{ color: "#a0a8cc", fontSize: 14 }}>Loading...</p>}
        {emails !== null && emails.length === 0 && <p style={{ color: "#b0b8d8", fontSize: 14 }}>No signups yet.</p>}

        {emails && emails.length > 0 && (
          <>
            <div style={{ background: "rgba(168,210,245,.1)", border: "1.5px solid rgba(168,210,245,.3)", borderRadius: 12, padding: "10px 14px", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#4a7aaf", fontWeight: 600 }}>Total subscribers</span>
              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: "#4060d8" }}>{emails.length}</span>
            </div>

            <div style={{ marginBottom: 16 }}>
              {emails.map((e, i) => (
                <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid rgba(180,195,235,.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#2d2d4e", marginBottom: 3 }}>{e.email}</div>
                    <div style={{ fontSize: 11, color: "#b0b8d8" }}>@{e.username} · joined {e.joinedDate}</div>
                  </div>
                  <span style={{ fontSize: 10, background: "rgba(168,240,192,.3)", color: "#3a8060", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>Active</span>
                </div>
              ))}
            </div>

            <button onClick={() => {
              const csv = "Email,Username,Joined\n" + emails.map(e => `${e.email},${e.username},${e.joinedDate}`).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "ironlog_subscribers.csv"; a.click();
            }} style={{ background: "linear-gradient(130deg,#b8dcff,#b8f0cc)", border: "none", borderRadius: 12, padding: "12px 20px", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#1a3d2e", width: "100%" }}>
              ⬇ Download CSV
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [workouts, setWorkouts] = useState([]);
  const [tab, setTab] = useState("log");
  const [exercise, setExercise] = useState(EXERCISES[0]);
  const [customEx, setCustomEx] = useState("");
  const [sets, setSets] = useState([{ reps: "8", weight: "135" }]);
  const [date, setDate] = useState(todayStr());
  const [saved, setSaved] = useState(false);
  const [activeExercise, setActiveExercise] = useState("Bench Press");
  const [showAdmin, setShowAdmin] = useState(false);
  const adminTaps = useRef(0);
  const adminTimer = useRef(null);

  const handleLogin = async (u, email) => {
    const data = await store.get(`workouts:${u}`);
    setWorkouts(data || []);
    setUserEmail(email || "");
    setUser(u);
  };

  const saveWorkout = async () => {
    const name = customEx.trim() || exercise;
    const validSets = sets.filter(s => s.reps && s.weight);
    if (!validSets.length) return;
    const newW = { id: Date.now(), date, exercise: name, sets: validSets.map(s => ({ reps: Number(s.reps), weight: Number(s.weight) })) };
    const updated = [...workouts, newW];
    setWorkouts(updated);
    await store.set(`workouts:${user}`, updated);
    setSets([{ reps: sets[sets.length-1].reps, weight: sets[sets.length-1].weight }]);
    setCustomEx("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const updateSet = (i, field, val) => { const s = [...sets]; s[i][field] = val; setSets(s); };

  // Secret admin tap: tap the logo 5x fast
  const handleLogoTap = () => {
    adminTaps.current++;
    clearTimeout(adminTimer.current);
    adminTimer.current = setTimeout(() => { adminTaps.current = 0; }, 2000);
    if (adminTaps.current >= 5) { adminTaps.current = 0; setShowAdmin(true); }
  };

  const prs = useMemo(() => {
    const map = {};
    workouts.forEach(w => {
      const best = Math.max(...w.sets.map(s => s.weight));
      const bestSet = w.sets.find(s => s.weight === best);
      if (!map[w.exercise] || best > map[w.exercise].weight)
        map[w.exercise] = { weight: best, reps: bestSet.reps, date: w.date };
    });
    return Object.entries(map).sort((a, b) => b[1].weight - a[1].weight);
  }, [workouts]);

  const exercises = useMemo(() => [...new Set(workouts.map(w => w.exercise))], [workouts]);

  const weekProgress = useMemo(() => {
    const byWeek = {};
    workouts.filter(w => w.exercise === activeExercise).forEach(w => {
      const wk = getWeekKey(w.date);
      if (!byWeek[wk]) byWeek[wk] = { totalVol: 0, maxWeight: 0 };
      w.sets.forEach(s => { byWeek[wk].totalVol += s.reps * s.weight; byWeek[wk].maxWeight = Math.max(byWeek[wk].maxWeight, s.weight); });
    });
    return Object.entries(byWeek).sort((a, b) => a[0].localeCompare(b[0]));
  }, [workouts, activeExercise]);

  const maxVol = useMemo(() => Math.max(...weekProgress.map(([, v]) => v.totalVol), 1), [weekProgress]);

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", minHeight: "100vh", background: "linear-gradient(140deg,#deeeff 0%,#eaf6ff 25%,#edfff0 55%,#f5fff2 100%)", color: "#2d2d4e", paddingBottom: 80 }}>
      <style>{STYLES}</style>
      <BG />
      {showAdmin && <AdminView onClose={() => setShowAdmin(false)} />}

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ padding: "36px 24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span onClick={handleLogoTap} style={{ fontSize: 11, fontWeight: 700, color: "#a0b8d8", letterSpacing: 2, textTransform: "uppercase", cursor: "default" }}>Iron Log</span>
            <button onClick={() => { setUser(null); setWorkouts([]); setUserEmail(""); }} style={{ background: "rgba(255,255,255,.6)", border: "1.5px solid rgba(180,185,220,.3)", borderRadius: 20, padding: "5px 14px", fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#a0a8cc", cursor: "pointer" }}>Sign out</button>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 700, color: "#151535", lineHeight: 1.1, marginBottom: 8 }}>
            Hey, <em style={{ color: "#5080df" }}>{user}</em> 👋
          </h1>
          {userEmail && (
            <div style={{ marginBottom: 18 }}>
              <span className="email-badge">✉ {userEmail}</span>
            </div>
          )}

          <div style={{ background: "rgba(195,208,245,.2)", borderRadius: 40, padding: 5, display: "inline-flex", gap: 2 }}>
            {[["log","Log"],["prs","PRs"],["progress","Progress"]].map(([k,l]) => (
              <button key={k} className={`tab-pill ${tab === k ? "tab-on" : ""}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: "0 20px" }}>

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
                  <select className="field" value={exercise} onChange={e => setExercise(e.target.value)} style={{ marginBottom: 10 }}>
                    {EXERCISES.map(ex => <option key={ex}>{ex}</option>)}
                  </select>
                  <input className="field" placeholder="Or type a custom exercise..." value={customEx} onChange={e => setCustomEx(e.target.value)} />
                </div>

                <div style={{ marginBottom: 22 }}>
                  <label className="lbl">Sets</label>
                  <p style={{ fontSize: 12, color: "#b0b8d8", marginBottom: 16 }}>Swipe up/down on the drums to change values</p>
                  {sets.map((s, i) => (
                    <div key={i} style={{ marginBottom: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#a0a8cc", letterSpacing: 1 }}>SET {i + 1}</span>
                        {sets.length > 1 && <button className="rm-btn" onClick={() => setSets(sets.filter((_, idx) => idx !== i))}>×</button>}
                      </div>
                      <div style={{ display: "flex", gap: 14 }}>
                        <div className="drum-wrap"><DrumPicker value={s.reps} onChange={v => updateSet(i, "reps", v)} min={1} max={100} step={1} label="Reps" /></div>
                        <div className="drum-wrap"><DrumPicker value={s.weight} onChange={v => updateSet(i, "weight", v)} min={0} max={2000} step={5} label="Weight (lbs)" /></div>
                      </div>
                    </div>
                  ))}
                  <button className="add-set-btn" onClick={() => setSets([...sets, { reps: sets[sets.length-1].reps, weight: sets[sets.length-1].weight }])}>+ Add set</button>
                </div>

                <button className="save-btn" onClick={saveWorkout}>{saved ? "✓ Saved!" : "Save Workout"}</button>
              </div>

              {workouts.length > 0 && (
                <div>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 19, fontWeight: 700, color: "#151535", marginBottom: 14 }}>Recent sessions</p>
                  {[...workouts].reverse().slice(0, 4).map(w => (
                    <div key={w.id} className="recent-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{w.exercise}</span>
                        <span style={{ fontSize: 11, color: "#b0b8d8" }}>{w.date}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {w.sets.map((s, i) => <span key={i} className="spill">{s.reps} × {s.weight} lbs</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "prs" && (
            <div className="fade">
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 21, fontWeight: 700, color: "#151535", marginBottom: 6 }}>Personal records</p>
              <p style={{ fontSize: 13, color: "#a0a8cc", marginBottom: 20 }}>Your heaviest lift ever, per exercise.</p>
              {prs.length === 0 && <div className="glass" style={{ padding: 28, textAlign: "center" }}><p style={{ color: "#b0b8d8" }}>No records yet — log some workouts!</p></div>}
              {prs.map(([ex, pr], i) => (
                <div key={ex} className="pr-row" style={{ boxShadow: i === 0 ? "0 8px 32px rgba(155,220,175,.28)" : "0 4px 16px rgba(160,185,230,.1)" }}>
                  <div>
                    {i === 0 && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#48a068", background: "rgba(100,210,130,.13)", padding: "3px 10px", borderRadius: 20, display: "inline-block", marginBottom: 8 }}>🏆 Top lift</span>}
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "#151535", marginBottom: 4 }}>{ex}</div>
                    <div style={{ fontSize: 11, color: "#b0b8d8" }}>Achieved {pr.date}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 700, color: i === 0 ? "#3a9060" : "#4870df", lineHeight: 1 }}>{pr.weight}</div>
                    <div style={{ fontSize: 12, color: "#b0b8d8", marginTop: 3 }}>lbs × {pr.reps} reps</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "progress" && (
            <div className="fade">
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 21, fontWeight: 700, color: "#151535", marginBottom: 6 }}>Week-over-week</p>
              <p style={{ fontSize: 13, color: "#a0a8cc", marginBottom: 16 }}>Track your volume and strength gains.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                {exercises.map(ex => <button key={ex} className={`chip ${activeExercise === ex ? "chip-on" : ""}`} onClick={() => setActiveExercise(ex)}>{ex}</button>)}
              </div>
              {exercises.length === 0 && <div className="glass" style={{ padding: 28, textAlign: "center" }}><p style={{ color: "#b0b8d8" }}>Log workouts to see your progress.</p></div>}
              {exercises.length > 0 && weekProgress.length < 2 && <p style={{ color: "#b0b8d8", fontSize: 14 }}>Log at least 2 weeks of {activeExercise} to see trends.</p>}
              {weekProgress.length >= 2 && (() => {
                const last = weekProgress[weekProgress.length - 1][1];
                const prev = weekProgress[weekProgress.length - 2][1];
                return (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
                      {[
                        { label: "Max Weight", val: `${last.maxWeight}`, unit: "lbs", diff: last.maxWeight - prev.maxWeight, color: "#4060d8", glow: "rgba(160,185,255,.3)" },
                        { label: "Total Volume", val: last.totalVol.toLocaleString(), unit: "lbs", diff: last.totalVol - prev.totalVol, color: "#388a5a", glow: "rgba(150,220,180,.3)" }
                      ].map(c => (
                        <div key={c.label} className="stat-box" style={{ boxShadow: `0 8px 28px ${c.glow}` }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#b0b8d8", letterSpacing: 1.2, marginBottom: 10, textTransform: "uppercase" }}>{c.label}</div>
                          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: c.color, lineHeight: 1, marginBottom: 4 }}>{c.val}</div>
                          <div style={{ fontSize: 11, color: "#b0b8d8", marginBottom: 8 }}>{c.unit}</div>
                          <div style={{ fontSize: 12, color: c.diff >= 0 ? "#3a9060" : "#c05050", fontWeight: 700 }}>{c.diff >= 0 ? "↑" : "↓"} {Math.abs(c.diff)} {c.unit} vs last wk</div>
                        </div>
                      ))}
                    </div>
                    <div className="glass" style={{ padding: 20 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#a0a8cc", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 18 }}>Weekly Volume</p>
                      {weekProgress.map(([wk, v], i) => {
                        const isLatest = i === weekProgress.length - 1;
                        return (
                          <div key={wk} style={{ marginBottom: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: isLatest ? "#1a1a3e" : "#a0a8cc" }}>{isLatest ? "This week" : i === weekProgress.length - 2 ? "Last week" : `Wk of ${wk}`}</span>
                              <span style={{ fontSize: 12, color: "#b0b8d8" }}>{v.totalVol.toLocaleString()} lbs</span>
                            </div>
                            <div className="bar-bg"><div className="bar-fg" style={{ width: `${(v.totalVol / maxVol) * 100}%`, background: isLatest ? "linear-gradient(90deg,#a8c8ff,#a8f0c0)" : "linear-gradient(90deg,rgba(168,200,255,.35),rgba(168,240,192,.35))" }} /></div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
