import React, { useEffect, useMemo, useState } from "react";

const SESSION_KEY = "workclock_sessions";
const SETTINGS_KEY = "workclock_settings";

const dollars = (n) => `$${Number(n || 0).toFixed(2)}`;
const hrs = (n) => Number(n || 0).toFixed(2);
const num = (v, fallback = 0) => {
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function App() {
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [hourlyRate, setHourlyRate] = useState(25);
  const [stateTax, setStateTax] = useState(5);
  const [federalTax, setFederalTax] = useState(12);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    try {
      const savedSessions = JSON.parse(localStorage.getItem(SESSION_KEY) || "[]");
      const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      setSessions(Array.isArray(savedSessions) ? savedSessions : []);
      setHourlyRate(num(savedSettings.hourlyRate, 25));
      setStateTax(num(savedSettings.stateTax, 5));
      setFederalTax(num(savedSettings.federalTax, 12));
    } catch {
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ hourlyRate, stateTax, federalTax }));
  }, [hourlyRate, stateTax, federalTax]);

  function clockIn() {
    setClockInTime(new Date().toISOString());
    setClockedIn(true);
  }

  function clockOut() {
    if (!clockInTime) return;
    const end = new Date();
    const start = new Date(clockInTime);
    const worked = Math.max((end - start) / 3600000, 0);
    const gross = worked * hourlyRate;
    const tax = gross * ((stateTax + federalTax) / 100);
    const net = gross - tax;
    const session = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: end.toLocaleDateString(),
      in: start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      out: end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      hours: worked,
      gross,
      tax,
      net,
      hourlyRate,
      stateTax,
      federalTax,
    };
    setSessions((current) => [session, ...current]);
    setClockedIn(false);
    setClockInTime(null);
  }

  function removeShift(id) {
    setSessions((current) => current.filter((s) => s.id !== id));
  }

  function clearAll() {
    if (window.confirm("Clear all saved shifts?")) setSessions([]);
  }

  const totals = useMemo(() => {
    return sessions.reduce(
      (a, s) => ({
        hours: a.hours + num(s.hours),
        gross: a.gross + num(s.gross),
        tax: a.tax + num(s.tax),
        net: a.net + num(s.net),
      }),
      { hours: 0, gross: 0, tax: 0, net: 0 }
    );
  }, [sessions]);

  const today = new Date().toLocaleDateString();
  const todayTotals = useMemo(() => {
    return sessions
      .filter((s) => s.date === today)
      .reduce(
        (a, s) => ({
          hours: a.hours + num(s.hours),
          gross: a.gross + num(s.gross),
          tax: a.tax + num(s.tax),
          net: a.net + num(s.net),
        }),
        { hours: 0, gross: 0, tax: 0, net: 0 }
      );
  }, [sessions, today]);

  return (
    <div style={styles.page}>
      <div style={styles.phone}>
        <header style={styles.header}>
          <div>
            <div style={styles.kicker}>TIMECARD PWA</div>
            <h1 style={styles.title}>WorkClock<span style={styles.green}>Pro</span></h1>
            <p style={styles.sub}>Clock in. Clock out. Track net pay.</p>
          </div>
          <button style={styles.iconButton} onClick={() => setShowSettings(!showSettings)}>Settings</button>
        </header>

        {showSettings && (
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Pay Settings</h2>
            <Input label="Hourly Rate" value={hourlyRate} setValue={setHourlyRate} />
            <div style={styles.twoCol}>
              <Input label="State Tax %" value={stateTax} setValue={setStateTax} />
              <Input label="Federal Tax %" value={federalTax} setValue={setFederalTax} />
            </div>
            <button style={styles.saveButton} onClick={() => setShowSettings(false)}>Save and Close</button>
            <p style={styles.note}>Settings save automatically on this device.</p>
          </section>
        )}

        <section style={styles.card}>
          <p style={styles.label}>Current Status</p>
          <h2 style={{ ...styles.status, color: clockedIn ? "#34d399" : "#e5e7eb" }}>{clockedIn ? "Clocked In" : "Clocked Out"}</h2>
          <p style={styles.sub}>{clockedIn && clockInTime ? `Started at ${new Date(clockInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Ready for the next shift."}</p>
        </section>

        <button style={{ ...styles.mainButton, ...(clockedIn ? styles.outButton : styles.inButton) }} onClick={clockedIn ? clockOut : clockIn}>
          {clockedIn ? "CLOCK OUT" : "CLOCK IN"}
        </button>

        <section style={styles.grid}>
          <Stat label="Today Hours" value={hrs(todayTotals.hours)} />
          <Stat label="Today Net" value={dollars(todayTotals.net)} green />
          <Stat label="Total Hours" value={hrs(totals.hours)} />
          <Stat label="Total Tax" value={dollars(totals.tax)} red />
        </section>

        <section style={styles.card}>
          <div style={styles.threeCol}>
            <Mini label="Gross" value={dollars(totals.gross)} />
            <Mini label="Taxes" value={dollars(totals.tax)} red />
            <Mini label="Net" value={dollars(totals.net)} green />
          </div>
        </section>

        <section style={styles.historyHeader}>
          <h2 style={styles.cardTitle}>Recent History</h2>
          {sessions.length > 0 && <button style={styles.clearButton} onClick={clearAll}>Clear All</button>}
        </section>

        {sessions.length === 0 ? (
          <div style={styles.empty}>No shifts recorded yet.</div>
        ) : (
          sessions.map((s) => (
            <article key={s.id} style={styles.shift}>
              <div style={styles.row}>
                <div>
                  <b>{s.date}</b>
                  <p style={styles.sub}>{s.in} - {s.out}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <b style={styles.green}>+{dollars(s.net)}</b>
                  <p style={styles.sub}>{hrs(s.hours)} hrs</p>
                </div>
              </div>
              <div style={styles.threeCol}>
                <Mini label="Gross" value={dollars(s.gross)} />
                <Mini label="Tax" value={dollars(s.tax)} red />
                <Mini label="Rate" value={dollars(s.hourlyRate || hourlyRate)} />
              </div>
              <button style={styles.deleteButton} onClick={() => removeShift(s.id)}>Delete Shift</button>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function Input({ label, value, setValue }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={styles.label}>{label}</span>
      <input style={styles.input} type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(num(e.target.value, 0))} />
    </label>
  );
}

function Stat({ label, value, green = false, red = false }) {
  return (
    <div style={styles.stat}>
      <p style={styles.label}>{label}</p>
      <h3 style={{ ...styles.statValue, color: green ? "#34d399" : red ? "#fca5a5" : "#fff" }}>{value}</h3>
    </div>
  );
}

function Mini({ label, value, green = false, red = false }) {
  return (
    <div style={styles.mini}>
      <p style={styles.miniLabel}>{label}</p>
      <b style={{ color: green ? "#34d399" : red ? "#fca5a5" : "#fff" }}>{value}</b>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#020617", color: "#f8fafc", fontFamily: "Arial, sans-serif", padding: "18px 12px 80px", boxSizing: "border-box" },
  phone: { width: "100%", maxWidth: 430, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18 },
  kicker: { fontSize: 11, color: "#34d399", fontWeight: 900, letterSpacing: 3 },
  title: { fontSize: 34, margin: "4px 0", fontWeight: 900, color: "#fff" },
  green: { color: "#34d399" },
  sub: { margin: 0, color: "#94a3b8", fontSize: 14 },
  iconButton: { background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 999, padding: "10px 12px", fontWeight: 800 },
  card: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 26, padding: 18, marginBottom: 14, boxShadow: "0 16px 35px rgba(0,0,0,.25)" },
  cardTitle: { margin: "0 0 12px", fontSize: 20, color: "#fff" },
  label: { display: "block", fontSize: 11, color: "#64748b", fontWeight: 900, textTransform: "uppercase", marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", background: "#020617", color: "#fff", border: "1px solid #334155", borderRadius: 16, padding: 14, fontSize: 18, fontWeight: 800 },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  threeCol: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 },
  saveButton: { width: "100%", background: "#10b981", color: "#022c22", border: 0, borderRadius: 16, padding: 14, fontWeight: 900, fontSize: 16 },
  note: { color: "#64748b", textAlign: "center", fontSize: 12, marginBottom: 0 },
  status: { margin: "6px 0", fontSize: 26, fontWeight: 900 },
  mainButton: { width: "100%", border: 0, borderRadius: 34, padding: "38px 16px", fontSize: 32, fontWeight: 900, letterSpacing: 3, marginBottom: 14, boxShadow: "0 20px 40px rgba(0,0,0,.3)" },
  inButton: { background: "#10b981", color: "#022c22" },
  outButton: { background: "#7f1d1d", color: "#fecaca", border: "4px solid #ef4444" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 },
  stat: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 22, padding: 16 },
  statValue: { margin: 0, fontSize: 24 },
  mini: { background: "#020617", borderRadius: 14, padding: 10, textAlign: "center" },
  miniLabel: { color: "#64748b", fontSize: 10, margin: "0 0 4px", fontWeight: 900, textTransform: "uppercase" },
  historyHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", margin: "18px 4px 10px" },
  clearButton: { background: "#450a0a", color: "#fca5a5", border: "1px solid #7f1d1d", borderRadius: 999, padding: "9px 12px", fontWeight: 900 },
  empty: { border: "2px dashed #1e293b", borderRadius: 26, padding: 35, color: "#64748b", textAlign: "center", fontWeight: 800 },
  shift: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 24, padding: 16, marginBottom: 12 },
  row: { display: "flex", justifyContent: "space-between", gap: 12 },
  deleteButton: { width: "100%", marginTop: 14, background: "#1e293b", color: "#e2e8f0", border: 0, borderRadius: 15, padding: 12, fontWeight: 900 },
};
