"use client";

import { useState, useEffect, useCallback } from "react";

type SalesPoint = { id: number; name: string };
type Drink = { id: number; name: string; isPourDrink: boolean };
type QueueItem = { id: number; drinkName: string; pendingCount: number };
type StatItem = { drinkName: string; totalPoured: number };

const DEFAULT_POUR_BUTTONS = ["Bier", "Radler", "Glühwein"];

export default function ZapfPage() {
  const [session, setSession] = useState<any>(undefined);
  const [loginUsername, setLoginUsername] = useState(""); const [loginPassword, setLoginPassword] = useState(""); const [loginDisplayName, setLoginDisplayName] = useState(""); const [loginError, setLoginError] = useState("");
  const [salesPoints, setSalesPoints] = useState<SalesPoint[]>([]);
  const [selectedSalesPointId, setSelectedSalesPointId] = useState<number | null>(null);
  const [buttonList, setButtonList] = useState<string[]>(DEFAULT_POUR_BUTTONS);
  const [rawQueue, setRawQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<Map<string, number>>(new Map());
  const [lastAction, setLastAction] = useState<string | null>(null);

  useEffect(() => { checkAuth(); }, []);
  async function checkAuth() { try { const r = await fetch("/api/auth/me"); setSession(r.ok ? await r.json() : null); } catch { setSession(null); } }
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoginError("");
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: loginUsername, password: loginPassword, displayName: loginDisplayName || loginUsername }) });
      if (r.ok) window.location.reload(); else { const d = await r.json(); setLoginError(d.error || "Fehler"); }
    } catch { setLoginError("Verbindungsfehler"); }
  }
  async function handleLogout() { await fetch("/api/auth/logout", { method: "POST" }); window.location.reload(); }

  useEffect(() => {
    if (!session?.authenticated) return;
    const saved = localStorage.getItem("zapfSalesPointId");
    if (saved) setSelectedSalesPointId(parseInt(saved));
    fetchSalesPoints();
    fetchDrinks();
    fetchStats();
  }, [session?.authenticated]);

  useEffect(() => {
    if (!session?.authenticated || selectedSalesPointId === null) return;
    localStorage.setItem("zapfSalesPointId", selectedSalesPointId.toString());
    fetchQueue();
  }, [session?.authenticated, selectedSalesPointId]);

  useEffect(() => {
    if (!session?.authenticated || !selectedSalesPointId) return;
    const i = setInterval(() => { fetchQueue(); fetchStats(); }, 1000);
    return () => clearInterval(i);
  }, [session?.authenticated, selectedSalesPointId]);

  async function fetchSalesPoints() { try { const r = await fetch("/api/sales-points"); if (r.ok) { const d = await r.json(); setSalesPoints(d); if (d.length > 0 && selectedSalesPointId === null) setSelectedSalesPointId(d[0].id); } } catch (err) { console.error(err); } }
  async function fetchDrinks() { try { const r = await fetch("/api/drinks"); if (r.ok) { const d: Drink[] = await r.json(); const pn = d.filter((x) => x.isPourDrink).map((x) => x.name); const c = new Set<string>(); c.add("Bier"); c.add("Radler"); c.add("Glühwein"); pn.forEach((n) => { if (n.toLowerCase() !== "bier/radler") c.add(n); }); setButtonList(Array.from(c)); } } catch { setButtonList(["Bier", "Radler", "Glühwein"]); } }
  async function fetchQueue() { if (!selectedSalesPointId) return; try { const r = await fetch(`/api/pour/queue?salesPointId=${selectedSalesPointId}`); if (r.ok) setRawQueue(await r.json()); } catch (err) { console.error(err); } }
  async function fetchStats() { if (!selectedSalesPointId) return; try { const r = await fetch(`/api/pour/stats?salesPointId=${selectedSalesPointId}`); if (r.ok) { const d: StatItem[] = await r.json(); const m = new Map<string, number>(); d.forEach((i) => m.set(i.drinkName, i.totalPoured)); setStats(m); } } catch (err) { console.error(err); } }

  const getPendingCount = (btn: string) => { const bl = btn.toLowerCase(); let c = 0; rawQueue.forEach((q) => { if (q.pendingCount <= 0) return; const ql = q.drinkName.toLowerCase(); if (ql === bl) c += q.pendingCount; else if ((ql.includes("bier/radler") || ql.includes("bier / radler")) && (bl === "bier" || bl === "radler")) c += q.pendingCount; else if (ql.includes(bl) || bl.includes(ql)) c += q.pendingCount; }); return c; };
  const getPouredCount = (btn: string) => { const bl = btn.toLowerCase(); let t = 0; stats.forEach((p, n) => { const nl = n.toLowerCase(); if (nl === bl || (nl.includes("bier/radler") && (bl === "bier" || bl === "radler")) || nl.includes(bl) || bl.includes(nl)) t += p; }); return t; };

  const handleComplete = useCallback(async (dn: string) => {
    if (!selectedSalesPointId) return;
    setRawQueue((p) => p.map((q) => { const ql = q.drinkName.toLowerCase(); const dl = dn.toLowerCase(); const m = ql === dl || (ql.includes("bier/radler") && (dl === "bier" || dl === "radler")) || ql.includes(dl) || dl.includes(ql); return (m && q.pendingCount > 0) ? { ...q, pendingCount: q.pendingCount - 1 } : q; }));
    try { const r = await fetch("/api/pour/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salesPointId: selectedSalesPointId, drinkName: dn }) }); if (r.ok) { setLastAction(`${dn} gezapft`); setTimeout(() => setLastAction(null), 1200); fetchQueue(); fetchStats(); } else fetchQueue(); } catch (err) { console.error(err); fetchQueue(); }
  }, [selectedSalesPointId]);

  const sp = salesPoints.find((s) => s.id === selectedSalesPointId);

  if (session === undefined) return <div className="h-screen bg-gray-900 flex items-center justify-center text-white"><p>Laden...</p></div>;
  if (session === null) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
          <div className="flex items-center gap-3 mb-6"><img src="/images/turbotap-logo.png" alt="TurboTap" className="w-10 h-10 rounded-lg" /><h1 className="text-2xl font-bold text-white">TurboTap · Zapf</h1></div>
          {loginError && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-700">{loginError}</div>}
          <div className="space-y-4">
            <div><label className="block text-sm text-gray-400 mb-1">Benutzername</label><input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" autoFocus /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Passwort</label><input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Dein Name (für die Statistik)</label><input type="text" value={loginDisplayName} onChange={(e) => setLoginDisplayName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="z.B. Max" /></div>
            <button type="submit" className="w-full py-3 rounded-xl font-bold bg-amber-600 hover:bg-amber-500 transition-all">Anmelden</button>
            <a href="/" className="block text-center text-sm text-gray-400 hover:text-white">← Zur Kasse</a>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden select-none">
      <header className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          <img src="/images/turbotap-logo.png" alt="" className="w-6 h-6 rounded" />
          <span className="font-bold text-sm md:text-base truncate">Zapfen – {sp?.name || "..."}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-gray-700 rounded px-1.5 py-0.5 text-gray-300 hidden sm:inline">👤 {session.displayName || session.username}</span>
          <select value={selectedSalesPointId ?? ""} onChange={(e) => setSelectedSalesPointId(parseInt(e.target.value))} className="bg-gray-700 text-white text-xs md:text-sm rounded-lg px-2 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none">
            {salesPoints.map((sp) => (<option key={sp.id} value={sp.id}>{sp.name}</option>))}
          </select>
          <a href="/" className="text-xs bg-gray-700 hover:bg-gray-600 rounded-lg px-2 py-1 border border-gray-600 font-bold transition-colors">🧾 Kasse</a>
          <button onClick={handleLogout} className="text-[10px] text-red-400 hover:text-red-300 ml-0.5" title="Abmelden">🚪</button>
        </div>
      </header>
      {lastAction && <div className="shrink-0 bg-green-700 text-white text-center py-1 text-xs md:text-sm font-bold animate-pulse">✅ {lastAction}</div>}
      <main className="flex-1 flex items-center justify-center p-3 gap-3 md:gap-6 overflow-y-auto">
        <div className="flex flex-col gap-2.5 md:gap-4">
          <div className="text-xs text-red-400 font-bold text-center uppercase tracking-wider mb-0.5">Offen</div>
          {buttonList.map((drink) => { const c = getPendingCount(drink); return (
            <div key={`r-${drink}`} className={`w-24 h-24 md:w-36 md:h-36 rounded-2xl flex flex-col items-center justify-center border-3 md:border-4 shadow-xl transition-all p-1.5 text-center ${c > 0 ? "bg-red-600 border-red-400 animate-pulse scale-105" : "bg-red-900/40 border-red-800/60 opacity-80"}`}>
              <span className="text-xs md:text-sm font-extrabold truncate w-full leading-tight">{drink}</span><span className="text-3xl md:text-5xl font-black mt-0.5">{c}</span>
            </div>); })}
        </div>
        <div className="flex flex-col gap-2.5 md:gap-4">
          <div className="text-xs text-green-400 font-bold text-center uppercase tracking-wider mb-0.5">Gezapft (diese Stelle)</div>
          {buttonList.map((drink) => { const c = getPouredCount(drink); const p = getPendingCount(drink); return (
            <button key={`g-${drink}`} onClick={() => handleComplete(drink)} className={`w-24 h-24 md:w-36 md:h-36 rounded-2xl flex flex-col items-center justify-center bg-green-600 hover:bg-green-500 active:bg-green-700 active:scale-95 border-3 md:border-4 border-green-400 shadow-xl transition-all p-1.5 text-center ${p === 0 ? "opacity-75 hover:opacity-100" : "ring-2 ring-green-300"}`}>
              <span className="text-xs md:text-sm font-extrabold truncate w-full leading-tight">{drink}</span><span className="text-3xl md:text-5xl font-black mt-0.5">{c}</span><span className="text-[9px] md:text-[10px] opacity-80">Tippen zum Abhaken</span>
            </button>); })}
        </div>
      </main>
      <footer className="shrink-0 bg-gray-800 border-t border-gray-700 px-3 py-1.5 text-center text-[11px] text-gray-400">TurboTap · Bier, Radler, Glühwein getrennt · Grün tippen = 1 gezapft</footer>
    </div>
  );
}
