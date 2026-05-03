import React, { useEffect, useMemo, useState } from "react";
import {
  Clock,
  History,
  Settings as SettingsIcon,
  Save,
  Trash2,
  Wallet,
  Timer,
  ReceiptText,
} from "lucide-react";

const SESSION_STORAGE_KEY = "workclock_sessions";
const SETTINGS_STORAGE_KEY = "workclock_settings";

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function hours(value) {
  return Number(value || 0).toFixed(2);
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function App() {
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [hourlyRate, setHourlyRate] = useState(25);
  const [stateTax, setStateTax] = useState(5);
  const [federalTax, setFederalTax] = useState(12);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const savedSessions = localStorage.getItem(SESSION_STORAGE_KEY);
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (savedSessions) {
      try {
        setSessions(JSON.parse(savedSessions));
      } catch {
        setSessions([]);
      }
    }

    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setHourlyRate(safeNumber(settings.hourlyRate, 25));
        setStateTax(safeNumber(settings.stateTax, 5));
        setFederalTax(safeNumber(settings.federalTax, 12));
      } catch {
        setHourlyRate(25);
        setStateTax(5);
        setFederalTax(12);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ hourlyRate, stateTax, federalTax })
    );
  }, [hourlyRate, stateTax, federalTax]);

  function clockIn() {
    const now = new Date();
    setClockInTime(now.toISOString());
    setClockedIn(true);
  }

  function clockOut() {
    if (!clockInTime) return;

    const out = new Date();
    const start = new Date(clockInTime);
    const workedHours = Math.max((out - start) / 3600000, 0);
    const gross = workedHours * hourlyRate;
    const tax = gross * ((stateTax + federalTax) / 100);
    const net = gross - tax;

    const newSession = {
      id: crypto.randomUUID(),
      date: out.toLocaleDateString(),
      in: start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      out: out.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      hours: workedHours,
      gross,
      tax,
      net,
      hourlyRate,
      stateTax,
      federalTax,
      createdAt: out.toISOString(),
    };

    setSessions((current) => [newSession, ...current]);
    setClockedIn(false);
    setClockInTime(null);
  }

  function deleteSession(id) {
    setSessions((current) => current.filter((session) => session.id !== id));
  }

  function clearAllSessions() {
    const approved = window.confirm("Delete all saved timecard history?");
    if (!approved) return;
    setSessions([]);
  }

  const totals = useMemo(() => {
    return sessions.reduce(
      (acc, session) => ({
        hours: acc.hours + Number(session.hours || 0),
        gross: acc.gross + Number(session.gross || 0),
        tax: acc.tax + Number(session.tax || 0),
        net: acc.net + Number(session.net || 0),
      }),
      { hours: 0, gross: 0, tax: 0, net: 0 }
    );
  }, [sessions]);

  const today = new Date().toLocaleDateString();
  const todayTotals = useMemo(() => {
    return sessions
      .filter((session) => session.date === today)
      .reduce(
        (acc, session) => ({
          hours: acc.hours + Number(session.hours || 0),
          gross: acc.gross + Number(session.gross || 0),
          tax: acc.tax + Number(session.tax || 0),
          net: acc.net + Number(session.net || 0),
        }),
        { hours: 0, gross: 0, tax: 0, net: 0 }
      );
  }, [sessions, today]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans px-4 pb-20 pt-6">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between pb-6 pt-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-400">
              Timecard PWA
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white">
              WorkClock<span className="text-emerald-400">Pro</span>
            </h1>
            <p className="text-sm text-slate-400">Clock in. Clock out. Track net pay.</p>
          </div>

          <button
            type="button"
            onClick={() => setShowSettings((current) => !current)}
            className="rounded-full border border-slate-700 bg-slate-900 p-3 text-slate-200 shadow-lg shadow-black/30 transition active:scale-95"
            aria-label="Toggle pay settings"
          >
            <SettingsIcon size={24} />
          </button>
        </header>

        <main className="space-y-5">
          {showSettings && (
            <section className="rounded-[2rem] border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/30">
              <div className="mb-4 flex items-center gap-2">
                <SettingsIcon className="text-emerald-400" size={20} />
                <h2 className="text-lg font-black">Pay Settings</h2>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Hourly Rate
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={hourlyRate}
                    onChange={(event) => setHourlyRate(safeNumber(event.target.value, 0))}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-lg font-bold text-white outline-none ring-emerald-500 transition focus:ring-2"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      State Tax %
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={stateTax}
                      onChange={(event) => setStateTax(safeNumber(event.target.value, 0))}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-lg font-bold text-white outline-none ring-emerald-500 transition focus:ring-2"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Federal Tax %
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={federalTax}
                      onChange={(event) => setFederalTax(safeNumber(event.target.value, 0))}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-lg font-bold text-white outline-none ring-emerald-500 transition focus:ring-2"
                    />
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 font-black text-slate-950 transition active:scale-95"
              >
                <Save size={18} />
                Save & Close
              </button>
              <p className="mt-3 text-center text-xs text-slate-500">
                Saved automatically on this device.
              </p>
            </section>
          )}

          <section className="rounded-[2rem] border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/30">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Current Status</p>
            <div className="mt-2 flex items-center justify-between gap-4">
              <div>
                <h2 className={`text-2xl font-black ${clockedIn ? "text-emerald-400" : "text-slate-300"}`}>
                  {clockedIn ? "Clocked In" : "Clocked Out"}
                </h2>
                {clockedIn && clockInTime ? (
                  <p className="mt-1 text-sm text-slate-400">
                    Started at {new Date(clockInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-400">Ready for the next shift.</p>
                )}
              </div>
              <div className={`rounded-2xl p-3 ${clockedIn ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-400"}`}>
                <Timer size={30} />
              </div>
            </div>
          </section>

          <button
            type="button"
            onClick={clockedIn ? clockOut : clockIn}
            className={`flex w-full flex-col items-center justify-center gap-3 rounded-[2.5rem] py-12 shadow-2xl transition active:scale-95 ${
              clockedIn
                ? "border-4 border-red-500 bg-red-500/10 text-red-400 shadow-red-500/20"
                : "bg-emerald-500 text-slate-950 shadow-emerald-500/20"
            }`}
          >
            <Clock size={54} className={clockedIn ? "animate-pulse" : ""} />
            <span className="text-3xl font-black uppercase tracking-widest">
              {clockedIn ? "Clock Out" : "Clock In"}
            </span>
          </button>

          <section className="grid grid-cols-2 gap-3">
            <StatCard icon={Timer} label="Today Hours" value={hours(todayTotals.hours)} />
            <StatCard icon={Wallet} label="Today Net" value={money(todayTotals.net)} highlight />
            <StatCard icon={Clock} label="Total Hours" value={hours(totals.hours)} />
            <StatCard icon={ReceiptText} label="Total Tax" value={money(totals.tax)} danger />
          </section>

          <section className="rounded-[2rem] border border-slate-800 bg-slate-900 p-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500">Gross</p>
                <p className="mt-1 text-sm font-black text-white">{money(totals.gross)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500">Taxes</p>
                <p className="mt-1 text-sm font-black text-red-300">{money(totals.tax)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500">Net</p>
                <p className="mt-1 text-sm font-black text-emerald-400">{money(totals.net)}</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="flex items-center gap-2 text-xl font-black">
                <History size={20} className="text-slate-500" />
                Recent History
              </h2>
              {sessions.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllSessions}
                  className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300"
                >
                  Clear
                </button>
              )}
            </div>

            {sessions.length === 0 ? (
              <div className="rounded-[2rem] border-2 border-dashed border-slate-800 py-12 text-center font-bold text-slate-600">
                No shifts recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <article key={session.id} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-black text-white">{session.date}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {session.in} — {session.out}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-emerald-400">+{money(session.net)}</p>
                        <p className="text-xs text-slate-500">{hours(session.hours)} hrs</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <MiniStat label="Gross" value={money(session.gross)} />
                      <MiniStat label="Tax" value={money(session.tax)} danger />
                      <MiniStat label="Rate" value={money(session.hourlyRate || hourlyRate)} />
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteSession(session.id)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-800 py-2 text-sm font-black text-slate-300 transition hover:bg-red-950 hover:text-red-300"
                    >
                      <Trash2 size={16} />
                      Delete Shift
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, highlight = false, danger = false }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/20">
      <div className={`mb-3 inline-flex rounded-2xl p-2 ${highlight ? "bg-emerald-500/15 text-emerald-400" : danger ? "bg-red-500/15 text-red-300" : "bg-slate-800 text-slate-400"}`}>
        <Icon size={20} />
      </div>
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-black ${highlight ? "text-emerald-400" : danger ? "text-red-300" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function MiniStat({ label, value, danger = false }) {
  return (
    <div className="rounded-2xl bg-slate-950 p-2">
      <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
      <p className={`text-xs font-black ${danger ? "text-red-300" : "text-white"}`}>{value}</p>
    </div>
  );
}
