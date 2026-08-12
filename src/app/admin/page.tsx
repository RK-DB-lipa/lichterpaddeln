"use client";

import { useState, useEffect, useCallback } from "react";

type Drink = { id: number; name: string; priceGross: number; taxRate: number; hasDeposit: boolean; depositAmount: number; cupSize: string; color: string; imageUrl: string | null; isActive: boolean; sortOrder: number; isPourDrink: boolean; salesPointIds?: number[]; group?: string | null; reducedPrice?: number; reductionPercent?: number; hasReduction?: boolean; };
type Food = { id: number; name: string; priceGross: number; taxRate: number; color: string; imageUrl: string | null; isActive: boolean; isCookItem: boolean; sortOrder: number; group?: string | null; reducedPrice?: number; reductionPercent?: number; hasReduction?: boolean; };
type PriceReduction = { id: number; itemId: number; itemType: "drink" | "food"; startTime: string; endTime: string; reductionPercent: number; isActive: boolean; };
type Event = { id: number; name: string; startDate: string; endDate: string; isActive: boolean; drinkCount: number; foodCount: number; };
type SalesPoint = { id: number; name: string; isActive: boolean; sortOrder: number; };
type OrderItemSummary = { drinkName: string; totalQuantity: number; totalGross: number; totalDeposit: number; };
type FoodItemSummary = { foodName: string; totalQuantity: number; totalGross: number };
type OrderTotals = { totalOrders: number; totalRevenue: number; totalDepositsCharged: number; totalDepositsReturned: number; netDeposits: number; };
type Order = { id: number; salesPointId: number; totalGross: number; totalDeposit: number; totalDepositReturned: number; netDeposit: number; cashierName?: string; createdAt: string; foodItems?: Array<{ foodName: string; quantity: number; unitPriceGross: number; totalPriceGross: number }> };
type PourStat = { drinkName: string; totalPoured: number; };
type CupCounter = { salesPointId: number; given02: number; given04: number; returned02: number; returned04: number; };
type TenantInfo = { userId: number; username: string; isActive: boolean; expiresAt: string; drinks: number; orders: number; pours: number; };

const EMPTY_DRINK = { name: "", priceGross: "", taxRate: "19", hasDeposit: true, depositAmount: "2.00", cupSize: "04", color: "#3B82F6", imageUrl: "", sortOrder: "0", isPourDrink: false, salesPointIds: [] as number[], group: "" };

export default function AdminPage() {
  const [session, setSession] = useState<any>(undefined);
  const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [loginError, setLoginError] = useState("");
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
  const [showDrinkForm, setShowDrinkForm] = useState(false); const [formData, setFormData] = useState(EMPTY_DRINK); const [formError, setFormError] = useState("");
  const [salesPoints, setSalesPoints] = useState<SalesPoint[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [showFoodForm, setShowFoodForm] = useState(false);
  const [foodFormData, setFoodFormData] = useState({ name: "", priceGross: "", taxRate: "19", color: "#10B981", imageUrl: "", isCookItem: false, group: "" });
  const [foodFormError, setFoodFormError] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventFormData, setEventFormData] = useState({ name: "", startDate: "", endDate: "" });
  const [eventFormError, setEventFormError] = useState("");
  const [showEventAssignDialog, setShowEventAssignDialog] = useState(false);
  const [assignEventId, setAssignEventId] = useState<number | null>(null);
  const [assignType, setAssignType] = useState<"drinks" | "foods">("drinks");
  const [assignedIds, setAssignedIds] = useState<number[]>([]);
  const [showSalesPointForm, setShowSalesPointForm] = useState(false); const [spFormName, setSpFormName] = useState(""); const [spFormError, setSpFormError] = useState("");
  const [editingSalesPoint, setEditingSalesPoint] = useState<SalesPoint | null>(null); const [spEditName, setSpEditName] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [drinkSummary, setDrinkSummary] = useState<OrderItemSummary[]>([]);
  const [foodSummary, setFoodSummary] = useState<FoodItemSummary[]>([]);
  const [totals, setTotals] = useState<OrderTotals | null>(null);
  const [activeTab, setActiveTab] = useState<string>("drinks");
  const [orderFilter, setOrderFilter] = useState<string>("");
  const [cashierFilter, setCashierFilter] = useState<string>(""); const [cashierNames, setCashierNames] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState<string>("");
  const [fromTime, setFromTime] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [toTime, setToTime] = useState<string>("");
  const [pourerFilter, setPourerFilter] = useState<string>(""); const [pourerNames, setPourerNames] = useState<string[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false); const [resetTarget, setResetTarget] = useState("");
  const [pourStats, setPourStats] = useState<PourStat[]>([]);
  const [showPourResetConfirm, setShowPourResetConfirm] = useState(false);
  const [cupCounters, setCupCounters] = useState<CupCounter[]>([]);
  const [showCupResetConfirm, setShowCupResetConfirm] = useState(false); const [cupResetTarget, setCupResetTarget] = useState("");
  const [orderDetail, setOrderDetail] = useState<{ order: Order; items: any[]; foodItems?: Array<{ foodName: string; quantity: number; unitPriceGross: number; totalPriceGross: number }> } | null>(null);
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<any>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameTargetUser, setUsernameTargetUser] = useState<any>(null);
  const [newUsername, setNewUsername] = useState("");
  const [groups, setGroups] = useState<string[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [employeeFormData, setEmployeeFormData] = useState({ displayName: "" });
  const [showAliasForm, setShowAliasForm] = useState(false);
  const [aliasTargetEmployee, setAliasTargetEmployee] = useState<any>(null);
  const [aliasName, setAliasName] = useState("");
  const [priceReductions, setPriceReductions] = useState<PriceReduction[]>([]);
  const [showReductionForm, setShowReductionForm] = useState(false);
  const [editingReduction, setEditingReduction] = useState<PriceReduction | null>(null);
  const [reductionFormData, setReductionFormData] = useState({ itemId: 0, itemType: "drink" as "drink" | "food", startTime: "22:00", endTime: "02:00", reductionPercent: 20 });

  const isSuperAdmin = session?.role === "admin" && session?.username === "admin";

  const checkAuth = useCallback(async () => {
    try { const r = await fetch("/api/auth/me"); if (r.ok) setSession(await r.json()); else setSession(null); } catch { setSession(null); }
  }, []);

  const fetchDrinks = useCallback(async () => {
    try { const r = await fetch("/api/drinks"); if (r.ok) setDrinks(await r.json()); } catch (err) { console.error(err); }
  }, []);
  const fetchGroups = useCallback(async () => {
    try { const r = await fetch("/api/groups"); if (r.ok) setGroups(await r.json()); } catch (err) { console.error(err); }
  }, []);
  const fetchFoods = useCallback(async () => {
    try { const r = await fetch("/api/foods"); if (r.ok) setFoods(await r.json()); } catch (err) { console.error(err); }
  }, []);
  const fetchEvents = useCallback(async () => {
    try { const r = await fetch("/api/events"); if (r.ok) setEvents(await r.json()); } catch (err) { console.error(err); }
  }, []);
  const fetchEmployees = useCallback(async () => {
    try { const r = await fetch("/api/employees"); if (r.ok) setEmployees(await r.json()); } catch (err) { console.error(err); }
  }, []);
  const fetchPriceReductions = useCallback(async () => {
    try { const r = await fetch("/api/price-reductions"); if (r.ok) setPriceReductions(await r.json()); } catch (err) { console.error(err); }
  }, []);
  const fetchSalesPoints = useCallback(async () => {
    try { const r = await fetch("/api/sales-points"); if (r.ok) setSalesPoints(await r.json()); } catch (err) { console.error(err); }
  }, []);
  const fetchNames = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([
        fetch("/api/names?type=cashier").then((r) => r.ok ? r.json() : []),
        fetch("/api/names?type=pourer").then((r) => r.ok ? r.json() : []),
      ]);
      setCashierNames(c || []); setPourerNames(p || []);
    } catch {}
  }, []);
  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (orderFilter) params.set("salesPointId", orderFilter);
      if (cashierFilter) params.set("cashierName", cashierFilter);
      if (fromDate) params.set("fromDate", fromDate);
      if (fromTime) params.set("fromTime", fromTime);
      if (toDate) params.set("toDate", toDate);
      if (toTime) params.set("toTime", toTime);
      const qs = params.toString();
      const r = await fetch(qs ? `/api/orders?${qs}` : "/api/orders");
      if (r.ok) { 
        const d = await r.json(); 
        setOrders(d.orders || []); 
        setDrinkSummary(d.drinkSummary || []); 
        setFoodSummary(d.foodSummary || []);
        setTotals(d.totals || null); 
      }
    } catch (err) { console.error(err); }
  }, [orderFilter, cashierFilter, fromDate, fromTime, toDate, toTime]);
  const fetchPourStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (pourerFilter) params.set("pourerName", pourerFilter);
      const qs = params.toString();
      const r = await fetch(qs ? `/api/pour/stats?${qs}` : "/api/pour/stats");
      if (r.ok) setPourStats(await r.json());
    } catch (err) { console.error(err); }
  }, [pourerFilter]);
  const fetchCupCounters = useCallback(async () => {
    try { const r = await fetch("/api/cups"); if (r.ok) setCupCounters(await r.json()); } catch (err) { console.error(err); }
  }, []);
  const fetchTenants = useCallback(async () => {
    try { const r = await fetch("/api/superadmin"); if (r.ok) setTenants(await r.json()); } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => { if (session) { fetchDrinks(); fetchGroups(); fetchFoods(); fetchEvents(); fetchEmployees(); fetchPriceReductions(); fetchSalesPoints(); fetchOrders(); fetchPourStats(); fetchCupCounters(); fetchNames(); } }, [session]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoginError("");
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      if (r.ok) { window.location.reload(); } else { const d = await r.json(); setLoginError(d.error || "Fehler"); }
    } catch { setLoginError("Verbindungsfehler"); }
  }
  async function handleLogout() { await fetch("/api/auth/logout", { method: "POST" }); setSession(null); }
  async function api(path: string, method: string, body?: any) { const r = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); if (!r.ok) throw new Error((await r.json()).error || "API-Fehler"); return r.json(); }

  async function handleSaveDrink(e: React.FormEvent) {
    e.preventDefault(); setFormError("");
    if (!formData.name || !formData.priceGross) { setFormError("Name und Bruttopreis erforderlich"); return; }
    try {
      const p = { name: formData.name, priceGross: parseFloat(formData.priceGross), taxRate: parseFloat(formData.taxRate), hasDeposit: formData.hasDeposit, depositAmount: parseFloat(formData.depositAmount), cupSize: formData.cupSize, color: formData.color, imageUrl: formData.imageUrl || null, sortOrder: parseInt(formData.sortOrder) || 0, isPourDrink: formData.isPourDrink, salesPointIds: formData.salesPointIds || [], group: formData.group || null };
      if (editingDrink) await api(`/api/drinks/${editingDrink.id}`, "PUT", p); else await api("/api/drinks", "POST", p);
      setShowDrinkForm(false); fetchDrinks();
    } catch (err: any) { setFormError(err.message); }
  }
  async function handleDeleteDrink(id: number) { if (!confirm("Getränk deaktivieren?")) return; try { await api(`/api/drinks/${id}`, "DELETE"); fetchDrinks(); } catch (err) { console.error(err); } }
  async function handleSortDrink(drinkId: number, action: "top" | "up" | "down" | "bottom") {
    try { await api("/api/drinks/sort", "POST", { drinkId, action }); fetchDrinks(); }
    catch (err: any) { alert(err.message || "Fehler beim Verschieben"); }
  }
  async function handleSortSP(spId: number, action: "top" | "up" | "down" | "bottom") {
    try { await api("/api/sales-points/sort", "POST", { salesPointId: spId, action }); fetchSalesPoints(); }
    catch (err: any) { alert(err.message || "Fehler beim Verschieben"); }
  }
  async function handleSortGroup(group: string, action: "top" | "up" | "down" | "bottom") {
    try { await api("/api/groups", "POST", { group, action }); fetchGroups(); fetchDrinks(); }
    catch (err: any) { alert(err.message || "Fehler beim Verschieben"); }
  }
  async function handleSaveEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeFormData.displayName.trim()) return;
    try { await api("/api/employees", "POST", { displayName: employeeFormData.displayName.trim() }); setShowEmployeeForm(false); setEmployeeFormData({ displayName: "" }); fetchEmployees(); }
    catch (err: any) { alert(err.message || "Fehler"); }
  }
  async function handleAddAlias(e: React.FormEvent) {
    e.preventDefault();
    if (!aliasTargetEmployee || !aliasName.trim()) return;
    try { await api("/api/employees/aliases", "POST", { employeeId: aliasTargetEmployee.id, aliasName: aliasName.trim() }); setShowAliasForm(false); setAliasName(""); setAliasTargetEmployee(null); fetchEmployees(); }
    catch (err: any) { alert(err.message || "Fehler"); }
  }
  async function handleRemoveAlias(aliasId: number) {
    if (!confirm("Alias entfernen?")) return;
    try { await api(`/api/employees/aliases?id=${aliasId}`, "DELETE"); fetchEmployees(); }
    catch (err: any) { alert(err.message || "Fehler"); }
  }
  async function handleSaveReduction(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingReduction) await api(`/api/price-reductions/${editingReduction.id}`, "PUT", reductionFormData);
      else await api("/api/price-reductions", "POST", reductionFormData);
      setShowReductionForm(false); setEditingReduction(null); fetchPriceReductions();
    } catch (err: any) { alert(err.message || "Fehler"); }
  }
  async function handleDeleteReduction(id: number) {
    if (!confirm("Preisaktion löschen?")) return;
    try { await api(`/api/price-reductions/${id}`, "DELETE"); fetchPriceReductions(); }
    catch (err: any) { alert(err.message || "Fehler"); }
  }
  async function handleToggleReduction(id: number, isActive: boolean) {
    try { await api(`/api/price-reductions/${id}`, "PUT", { isActive: !isActive }); fetchPriceReductions(); }
    catch (err: any) { alert(err.message || "Fehler"); }
  }
  async function handleSaveFood(e: React.FormEvent) {
    e.preventDefault(); setFoodFormError("");
    if (!foodFormData.name || !foodFormData.priceGross) { setFoodFormError("Name und Bruttopreis erforderlich"); return; }
    try {
      const p = { name: foodFormData.name, priceGross: parseFloat(foodFormData.priceGross), taxRate: parseFloat(foodFormData.taxRate), color: foodFormData.color, imageUrl: foodFormData.imageUrl || null, isCookItem: foodFormData.isCookItem, group: foodFormData.group || null };
      if (editingFood) await api(`/api/foods/${editingFood.id}`, "PUT", p); else await api("/api/foods", "POST", p);
      setShowFoodForm(false); setEditingFood(null); fetchFoods();
    } catch (err: any) { setFoodFormError(err.message); }
  }
  async function handleDeleteFood(id: number) { if (!confirm("Speise deaktivieren?")) return; try { await api(`/api/foods/${id}`, "DELETE"); fetchFoods(); } catch (err) { console.error(err); } }
  async function handleSortFood(foodId: number, action: "top" | "up" | "down" | "bottom") {
    try { await api("/api/foods/sort", "POST", { foodId, action }); fetchFoods(); }
    catch (err: any) { alert(err.message || "Fehler"); }
  }
  function openEditFood(f: Food) { setEditingFood(f); setFoodFormData({ name: f.name, priceGross: f.priceGross.toString(), taxRate: f.taxRate.toString(), color: f.color, imageUrl: f.imageUrl || "", isCookItem: f.isCookItem, group: f.group || "" }); setFoodFormError(""); setShowFoodForm(true); }
  async function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault(); setEventFormError("");
    if (!eventFormData.name || !eventFormData.startDate || !eventFormData.endDate) { setEventFormError("Alle Felder erforderlich"); return; }
    try {
      if (editingEvent) await api(`/api/events/${editingEvent.id}`, "PUT", eventFormData); else await api("/api/events", "POST", eventFormData);
      setShowEventForm(false); setEditingEvent(null); fetchEvents();
    } catch (err: any) { setEventFormError(err.message); }
  }
  async function handleDeleteEvent(id: number) { if (!confirm("Event löschen?")) return; try { await api(`/api/events/${id}`, "DELETE"); fetchEvents(); } catch (err) { console.error(err); } }
  async function openAssignDialog(eventId: number, type: "drinks" | "foods") { setAssignEventId(eventId); setAssignType(type); try { const r = await fetch(`/api/events/${type}?eventId=${eventId}`); if (r.ok) setAssignedIds(await r.json()); else setAssignedIds([]); setShowEventAssignDialog(true); } catch { setAssignedIds([]); setShowEventAssignDialog(true); } }
  async function handleSaveAssign() {
    if (!assignEventId) return;
    try { await api(`/api/events/${assignType}`, "POST", { eventId: assignEventId, [assignType === "drinks" ? "drinkIds" : "foodIds"]: assignedIds }); setShowEventAssignDialog(false); fetchEvents(); }
    catch (err: any) { alert(err.message || "Fehler"); }
  }
  async function handleChangeUsername() {
    if (!usernameTargetUser || !newUsername.trim()) return;
    try { await api(`/api/users/${usernameTargetUser.userId}/username`, "PUT", { username: newUsername.trim() }); setShowUsernameModal(false); setUsernameTargetUser(null); setNewUsername(""); fetchTenants(); alert("Username geändert"); }
    catch (err: any) { alert(err.message || "Fehler"); }
  }
  async function handleSaveSP(e: React.FormEvent) { e.preventDefault(); setSpFormError(""); if (!spFormName.trim()) { setSpFormError("Name erforderlich"); return; } try { await api("/api/sales-points", "POST", { name: spFormName.trim() }); setShowSalesPointForm(false); setSpFormName(""); fetchSalesPoints(); } catch (err: any) { setSpFormError(err.message); } }
  async function handleUpdateSP(e: React.FormEvent) { e.preventDefault(); if (!editingSalesPoint || !spEditName.trim()) return; try { await api(`/api/sales-points/${editingSalesPoint.id}`, "PUT", { name: spEditName.trim() }); setEditingSalesPoint(null); setSpEditName(""); fetchSalesPoints(); } catch (err) { console.error(err); } }
  async function handleDeleteSP(id: number) { if (!confirm("Verkaufsstelle deaktivieren?")) return; try { await api(`/api/sales-points/${id}`, "DELETE"); fetchSalesPoints(); } catch (err) { console.error(err); } }
  async function handleResetOrders() { try { await api("/api/admin/reset", "POST", resetTarget ? { salesPointId: parseInt(resetTarget) } : {}); setShowResetConfirm(false); setResetTarget(""); fetchOrders(); } catch (err) { console.error(err); } }
  async function handleResetPour() { try { await api("/api/pour/reset", "POST"); setShowPourResetConfirm(false); fetchPourStats(); } catch (err) { console.error(err); } }
  async function handleResetCups() { try { await api("/api/cups/reset", "POST", cupResetTarget ? { salesPointId: parseInt(cupResetTarget) } : {}); setShowCupResetConfirm(false); setCupResetTarget(""); fetchCupCounters(); } catch (err) { console.error(err); } }

  const getSPName = (id: number) => salesPoints.find((sp) => sp.id === id)?.name || `ID ${id}`;
  const cupTotals = cupCounters.reduce((a, c) => ({ given02: a.given02 + c.given02, given04: a.given04 + c.given04, returned02: a.returned02 + c.returned02, returned04: a.returned04 + c.returned04 }), { given02: 0, given04: 0, returned02: 0, returned04: 0 });
  const showOrderDetail = (order: Order) => { setOrderDetail({ order, items: [], foodItems: order.foodItems || [] }); };
  const switchToTenant = async (tenantId: number) => { try { const r = await api("/api/superadmin", "POST", { tenantId }); if (r.success) window.location.reload(); } catch (err) { console.error(err); } };

  if (session === undefined) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><p>Laden...</p></div>;

  if (!session?.authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
          <div className="flex items-center gap-3 mb-6"><img src="/images/turbotap-logo.png" alt="TurboTap" className="w-10 h-10 rounded-lg" /><h1 className="text-2xl font-bold text-white">TurboTap</h1></div>
          {loginError && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-700">{loginError}</div>}
          <div className="space-y-4">
            <div><label className="block text-sm text-gray-400 mb-1">Benutzername</label><input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" autoFocus /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Passwort</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" /></div>
            <button type="submit" className="w-full py-3 rounded-xl font-bold bg-amber-600 hover:bg-amber-500">Anmelden</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden logo-watermark">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3"><img src="/images/turbotap-logo.png" alt="" className="w-8 h-8 rounded-lg" /><h1 className="text-lg font-bold">TurboTap · Admin</h1></div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-sm text-blue-400 hover:underline">← Kasse</a>
          <a href="/zapf" className="text-sm text-green-400 hover:underline">Zapfen →</a>
          <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300">Abmelden</button>
        </div>
      </header>

      <div className="flex border-b border-gray-700 shrink-0">
        {[["drinks","🍺 Getränke"],["foods","🍔 Speisen"],["salesPoints","🏪 Verkaufsstellen"],["events","📅 Events"],["reductions","💰 Preisaktionen"],["cups","🥤 Becher"],["orders","📊 Bestellungen"],["employees","👤 Mitarbeiter"],...(isSuperAdmin ? [["users","👥 Nutzer"],["super","🔐 Super-Admin"]] : [])].map(([tab,label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-center font-bold text-sm ${activeTab === tab ? "border-b-2 border-amber-500 text-amber-400" : "text-gray-400"}`}>{label}</button>
        ))}
      </div>

      <div className="flex-1 p-4 max-w-5xl mx-auto w-full overflow-y-auto">
        {activeTab === "drinks" && (
          <div>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Getränke</h2><button onClick={() => { setEditingDrink(null); setFormData({...EMPTY_DRINK}); setFormError(""); setShowDrinkForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neues</button></div>
            {drinks.map((d) => (
              <div key={d.id} className="bg-gray-800 rounded-xl p-3 flex items-center gap-3 border border-gray-700 mb-2">
                <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-xs" style={{backgroundColor:d.color}}>{d.name.charAt(0)}</div>
                <div className="flex-1 min-w-0"><div className="font-bold">{d.name}</div><div className="text-xs text-gray-400">{d.priceGross.toFixed(2)} € · {d.taxRate}% MwSt.</div></div>
                <button onClick={() => { setEditingDrink(d); setFormData({ name: d.name, priceGross: d.priceGross.toString(), taxRate: d.taxRate.toString(), hasDeposit: d.hasDeposit, depositAmount: d.depositAmount.toString(), cupSize: d.cupSize, color: d.color, imageUrl: d.imageUrl || "", sortOrder: d.sortOrder.toString(), isPourDrink: d.isPourDrink, salesPointIds: d.salesPointIds || [], group: d.group || "" }); setShowDrinkForm(true); }} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-sm">✏️</button>
                <button onClick={() => handleDeleteDrink(d.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-sm">🗑️</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "reductions" && (
          <div>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">💰 Preisaktionen</h2><button onClick={() => { setEditingReduction(null); setReductionFormData({ itemId: 0, itemType: "drink", startTime: "22:00", endTime: "02:00", reductionPercent: 20 }); setShowReductionForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neue Aktion</button></div>
            {priceReductions.map((red) => {
              const item = red.itemType === "drink" ? drinks.find(d => d.id === red.itemId) : foods.find(f => f.id === red.itemId);
              return (
                <div key={red.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-2">
                  <div className="flex items-center justify-between">
                    <div><div className="font-bold">{item ? (item as any).name : "Unbekannt"} ({red.itemType === "drink" ? "🍺" : "🍔"})</div><div className="text-sm text-gray-400">{red.startTime} - {red.endTime} · {red.reductionPercent}%</div></div>
                    <div className="flex gap-2">
                      <button onClick={() => handleToggleReduction(red.id, red.isActive)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${red.isActive ? "bg-green-700" : "bg-gray-600"}`}>{red.isActive ? "✅" : "⏸️"}</button>
                      <button onClick={() => { setEditingReduction(red); setReductionFormData({ itemId: red.itemId, itemType: red.itemType, startTime: red.startTime, endTime: red.endTime, reductionPercent: red.reductionPercent }); setShowReductionForm(true); }} className="px-3 py-1.5 rounded-lg bg-blue-700 text-xs">✏️</button>
                      <button onClick={() => handleDeleteReduction(red.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 text-xs">🗑️</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showDrinkForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleSaveDrink} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingDrink ? "Bearbeiten" : "Neues Getränk"}</h2>
            <div className="space-y-4">
              <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Name" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
              <input type="number" step="0.01" value={formData.priceGross} onChange={(e) => setFormData({...formData, priceGross: e.target.value})} placeholder="Bruttopreis" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
              <input type="text" value={formData.group} onChange={(e) => setFormData({...formData, group: e.target.value})} placeholder="Gruppe" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
            </div>
            <div className="flex gap-3 mt-6"><button type="button" onClick={() => setShowDrinkForm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button><button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600">Speichern</button></div>
          </form>
        </div>
      )}

      {showReductionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleSaveReduction} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-4">{editingReduction ? "Bearbeiten" : "Neue Preisaktion"}</h2>
            <div className="space-y-4">
              <select value={reductionFormData.itemType} onChange={(e) => setReductionFormData({...reductionFormData, itemType: e.target.value as "drink" | "food"})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600">
                <option value="drink">🍺 Getränk</option><option value="food">🍔 Speise</option>
              </select>
              <select value={reductionFormData.itemId} onChange={(e) => setReductionFormData({...reductionFormData, itemId: parseInt(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600">
                <option value={0}>Wählen...</option>
                {(reductionFormData.itemType === "drink" ? drinks : foods).map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
              </select>
              <input type="time" value={reductionFormData.startTime} onChange={(e) => setReductionFormData({...reductionFormData, startTime: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
              <input type="time" value={reductionFormData.endTime} onChange={(e) => setReductionFormData({...reductionFormData, endTime: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
              <input type="number" min="0" max="100" value={reductionFormData.reductionPercent} onChange={(e) => setReductionFormData({...reductionFormData, reductionPercent: parseFloat(e.target.value)})} placeholder="Rabatt %" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
            </div>
            <div className="flex gap-3 mt-6"><button type="button" onClick={() => setShowReductionForm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button><button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600">Speichern</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
