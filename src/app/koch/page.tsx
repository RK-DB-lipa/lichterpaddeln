"use client";

import { useState, useEffect, useCallback } from "react";

type Food = { id: number; name: string; priceGross: number; taxRate: number; color: string; imageUrl: string | null; isCookItem: boolean; group?: string | null; };
type QueueItem = { id: number; foodName: string; quantity: number; };
type StatItem = { foodName: string; totalCooked: number; };

const DEFAULT_COOK_BUTTONS = ["Hauptgericht", "Beilage", "Dessert"];

export default function KochPage() {
  const [session, setSession] = useState<any>(undefined);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginDisplayName, setLoginDisplayName] = useState("");
  const [loginError, setLoginError] = useState("");
  const [foods, setFoods] = useState<Food[]>([]);
  const [buttonList, setButtonList] = useState<string[]>(DEFAULT_COOK_BUTTONS);
  const [rawQueue, setRawQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<Map<string, number>>(new Map());
  const [lastAction, setLastAction] = useState<string | null>(null);

  useEffect(() => { checkAuth(); }, []);
  async function checkAuth() {
    try { const r = await fetch("/api/auth/me"); setSession(r.ok ? await r.json() : null); }
    catch { setSession(null); }
  }
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoginError("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword, displayName: loginDisplayName || loginUsername })
      });
      if (r.ok) window.location.reload();
      else { const d = await r.json(); setLoginError(d.error || "Fehler"); }
    } catch { setLoginError("Verbindungsfehler"); }
  }
  async function handleLogout() { await fetch("/api/auth/logout", { method: "POST" }); window.location.reload(); }

  // Wake Lock
  useEffect(() => {
    let wakeLockSentinel: any = null;
    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
          console.log("Wake Lock aktiviert");
          wakeLockSentinel.addEventListener("release", () => {
            console.log("Wake Lock freigegeben - erneute Anfrage");
            if (document.visibilityState === "visible") requestWakeLock();
          });
        }
      } catch (err) {
        console.log("Wake Lock nicht verfügbar:", err);
      }
    }
    requestWakeLock();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") requestWakeLock();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (wakeLockSentinel) wakeLockSentinel.release().catch(() => {});
    };
  }, [session?.authenticated]);

  useEffect(() => {
    if (!session?.authenticated) return;
    fetchFoods();
    fetchStats();
  }, [session?.authenticated]);

  // Polling every 2 seconds
  useEffect(() => {
    if (!session?.authenticated) return;
    const interval = setInterval(() => { fetchQueue(); fetchStats(); }, 2000);
    return () => clearInterval(interval);
  }, [session?.authenticated]);

  async function fetchFoods() {
    try {
      const r = await fetch("/api/foods?isCookItem=true");
      if (r.ok) {
        const data: Food[] = await r.json();
        setFoods(data);
        // Extract unique groups
        const groups = Array.from(new Set(data.map(f => f.group).filter(g => g))) as string[];
        setButtonList(groups.length > 0 ? groups : DEFAULT_COOK_BUTTONS);
      }
    } catch { setButtonList(DEFAULT_COOK_BUTTONS); }
  }

  async function fetchQueue() {
    try {
      const r = await fetch("/api/food/queue");
      if (r.ok) setRawQueue(await r.json());
    } catch (err) { console.error(err); }
  }

  async function fetchStats() {
    try {
      const r = await fetch("/api/food/stats");
      if (r.ok) {
        const data: StatItem[] = await r.json();
        const map = new Map<string, number>();
        data.forEach((item) => map.set(item.foodName, item.totalCooked));
        setStats(map);
      }
    } catch (err) { console.error(err); }
  }

  const getPendingCount = (btn: string) => {
    const bl = btn.toLowerCase();
    let c = 0;
    rawQueue.forEach((q) => {
      if (q.quantity <= 0) return;
      const ql = q.foodName.toLowerCase();
      if (ql === bl || ql.includes(bl) || bl.includes(ql)) c += q.quantity;
    });
    return c;
  };

  const getCookedCount = (btn: string) => {
    const bl = btn.toLowerCase();
    let t = 0;
    stats.forEach((p, n) => {
      const nl = n.toLowerCase();
      if (nl === bl || nl.includes(bl) || bl.includes(nl)) t += p;
    });
    return t;
  };

  const handleComplete = useCallback(async (foodName: string) => {
    setRawQueue((p) => p.map((q) => {
      const ql = q.foodName.toLowerCase();
      const fl = foodName.toLowerCase();
      const m = ql === fl || ql.includes(fl) || fl.includes(ql);
      return (m && q.quantity > 0) ? { ...q, quantity: q.quantity - 1 } : q;
    }));
    try {
      const r = await fetch("/api/food/complete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodName })
      });
      if (r.ok) {
        setLastAction(`${foodName} zubereitet`);
        setTimeout(() => setLastAction(null), 1200);
        fetchQueue(); fetchStats();
      } else fetchQueue();
    } catch (err) { console.error(err); fetchQueue(); }
  }, []);

  if (session === undefined) return <div className="h-screen bg-gray-900 flex items-center justify-center text-white"><p>Laden...</p></div>;

  if (!session?.authenticated) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center p-4 logo-watermark">
        <form onSubmit={handleLogin} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
          <div className="flex items-center gap-3 mb-2"><img src="/images/turbotap-logo.png" alt="TurboTap" className="w-10 h-10 rounded-lg" /><h1 className="text-2xl font-bold text-white">TurboTap</h1></div>
          <p className="text-xs text-gray-400 mb-6">Küche · Mitarbeiter-Anmeldung</p>
          {loginError && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-700">{loginError}</div>}
          <div className="space-y-4">
            <div><label className="block text-sm text-gray-400 mb-1">Benutzername</label><input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" autoFocus /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Passwort</label><input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Dein Name</label><input type="text" value={loginDisplayName} onChange={(e) => setLoginDisplayName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="z.B. Max" /></div>
            <button type="submit" className="w-full py-3 rounded-xl font-bold bg-orange-600 hover:bg-orange-500 transition-all">Anmelden</button>
          </div>
          <a href="/" className="block text-center text-sm text-gray-400 hover:text-white mt-4">← Zur Kasse</a>
        </form>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden select-none logo-watermark">
      <header className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          <img src="/images/turbotap-logo.png" alt="" className="w-6 h-6 rounded" />
          <span className="font-bold text-sm md:text-base truncate">TurboTap · Küche</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-gray-700 rounded px-1.5 py-0.5 text-gray-300 hidden sm:inline">👤 {session.displayName || session.username}</span>
          <a href="/" className="text-xs bg-gray-700 hover:bg-gray-600 rounded-lg px-2 py-1 border border-gray-600 font-bold transition-colors">🧾 Kasse</a>
          <button onClick={handleLogout} className="text-[10px] text-red-400 hover:text-red-300 ml-0.5" title="Abmelden">🚪</button>
        </div>
      </header>
      {lastAction && <div className="shrink-0 bg-green-700 text-white text-center py-1 text-xs md:text-sm font-bold animate-pulse">✅ {lastAction}</div>}
      <main className="flex-1 flex items-center justify-center p-3 gap-3 md:gap-6 overflow-y-auto">
        {(() => {
          const activeButtons = buttonList.filter(b => getPendingCount(b) > 0 || getCookedCount(b) > 0);
          if (activeButtons.length === 0) {
            return <div className="text-gray-500 text-center text-lg">🍳 Keine offenen Bestellungen</div>;
          }
          return (<>
            <div className="flex flex-col gap-2.5 md:gap-4">
              <div className="text-xs text-red-400 font-bold text-center uppercase tracking-wider mb-0.5">Offen</div>
              {activeButtons.map((btn) => {
                const c = getPendingCount(btn);
                return (
                  <div key={`r-${btn}`} className={`w-24 h-24 md:w-36 md:h-36 rounded-2xl flex flex-col items-center justify-center border-3 md:border-4 shadow-xl transition-all p-1.5 text-center ${c > 0 ? "bg-red-600 border-red-400 animate-pulse scale-105" : "bg-red-900/40 border-red-800/60 opacity-80"}`}>
                    <span className="text-xs md:text-sm font-extrabold truncate w-full leading-tight">{btn}</span>
                    <span className="text-3xl md:text-5xl font-black mt-0.5">{c}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-2.5 md:gap-4">
              <div className="text-xs text-green-400 font-bold text-center uppercase tracking-wider mb-0.5">Zubereitet</div>
              {activeButtons.map((btn) => {
                const c = getCookedCount(btn);
                const p = getPendingCount(btn);
                return (
                  <button key={`g-${btn}`} onClick={() => handleComplete(btn)} className={`w-24 h-24 md:w-36 md:h-36 rounded-2xl flex flex-col items-center justify-center bg-green-600 hover:bg-green-500 active:bg-green-700 active:scale-95 border-3 md:border-4 border-green-400 shadow-xl transition-all p-1.5 text-center ${p === 0 ? "opacity-75 hover:opacity-100" : "ring-2 ring-green-300"}`}>
                    <span className="text-xs md:text-sm font-extrabold truncate w-full leading-tight">{btn}</span>
                    <span className="text-3xl md:text-5xl font-black mt-0.5">{c}</span>
                    <span className="text-[9px] md:text-[10px] opacity-80">Tippen zum Abhaken</span>
                  </button>
                );
              })}
            </div>
          </>);
        })()}
      </main>
      <footer className="shrink-0 bg-gray-800 border-t border-gray-700 px-3 py-1.5 text-center text-[11px] text-gray-400">TurboTap · Küche · Grün tippen = 1 zubereitet</footer>
    </div>
  );
}
