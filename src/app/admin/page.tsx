"use client";

import { useState, useEffect, useCallback } from "react";
import OrdersAnalytics from "./orders-analytics";

type Drink = { id: number; name: string; priceGross: number; taxRate: number; hasDeposit: boolean; depositAmount: number; cupSize: string; color: string; imageUrl: string | null; isActive: boolean; sortOrder: number; isPourDrink: boolean; salesPointIds?: number[]; group?: string | null; };
type Food = { id: number; name: string; priceGross: number; taxRate: number; color: string; imageUrl: string | null; isActive: boolean; isCookItem: boolean; sortOrder: number; group?: string | null; };
type PriceReduction = { id: number; itemId: number; itemType: "drink" | "food"; startTime: string; endTime: string; reductionPercent: number; isActive: boolean };
type Event = { id: number; name: string; startDate: string; endDate: string; isActive: boolean; drinkCount: number; foodCount: number; employeeDiscountPercent?: number };
type SalesPoint = { id: number; name: string; isActive: boolean; sortOrder: number };
type OrderItemSummary = { drinkName: string; totalQuantity: number; totalGross: number; totalDeposit: number };
type FoodItemSummary = { foodName: string; totalQuantity: number; totalGross: number };
type OrderTotals = { totalOrders: number; totalRevenue: number; totalDepositsCharged: number; totalDepositsReturned: number; netDeposits: number };
type Order = { id: number; salesPointId: number; totalGross: number; totalDeposit: number; totalDepositReturned: number; netDeposit: number; cashierName?: string; createdAt: string; foodItems?: Array<{ foodName: string; quantity: number; unitPriceGross: number; totalPriceGross: number }> };
type OrderDetail = { drinkName: string; quantity: number; unitPriceGross: number; unitDeposit: number; totalPriceGross: number; totalDeposit: number };
type PourStat = { drinkName: string; totalPoured: number };
type CupCounter = { salesPointId: number; given02: number; given04: number; returned02: number; returned04: number };
type TenantInfo = { userId: number; username: string; isActive: boolean; expiresAt: string; drinks: number; orders: number; pours: number };

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
  const [eventFormData, setEventFormData] = useState({ name: "", startDate: "", endDate: "", employeeDiscountPercent: "" });
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
  const [orderDetail, setOrderDetail] = useState<{ order: Order; items: OrderDetail[]; foodItems?: Array<{ foodName: string; quantity: number; unitPriceGross: number; totalPriceGross: number }> } | null>(null);
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
  useEffect(() => { if (session) { fetchDrinks(); fetchGroups(); fetchFoods(); fetchEvents(); fetchEmployees(); fetchSalesPoints(); fetchOrders(); fetchPourStats(); fetchCupCounters(); fetchNames(); fetchPriceReductions(); } }, [session, fetchDrinks, fetchGroups, fetchFoods, fetchEvents, fetchEmployees, fetchSalesPoints, fetchOrders, fetchPourStats, fetchCupCounters, fetchNames, fetchPriceReductions]);
  useEffect(() => { if (activeTab === "users" && isSuperAdmin && tenants.length === 0) fetchTenants(); }, [activeTab, isSuperAdmin]);
  // Sicherstellen, dass Bestellungen geladen werden wenn der Tab aktiv ist
  useEffect(() => { if (session && activeTab === "orders") { fetchOrders(); } }, [session, activeTab, fetchOrders]);

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
    try {
      await api("/api/groups", "POST", { group, action });
      fetchGroups();
      fetchDrinks();
    }
    catch (err: any) { alert(err.message || "Fehler beim Verschieben"); }
  }

  async function handleSaveEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeFormData.displayName.trim()) return;
    try {
      await api("/api/employees", "POST", { displayName: employeeFormData.displayName.trim() });
      setShowEmployeeForm(false);
      setEmployeeFormData({ displayName: "" });
      fetchEmployees();
    } catch (err: any) { alert(err.message || "Fehler beim Speichern"); }
  }

  async function handleAddAlias(e: React.FormEvent) {
    e.preventDefault();
    if (!aliasTargetEmployee || !aliasName.trim()) return;
    try {
      await api("/api/employees/aliases", "POST", { employeeId: aliasTargetEmployee.id, aliasName: aliasName.trim() });
      setShowAliasForm(false);
      setAliasName("");
      setAliasTargetEmployee(null);
      fetchEmployees();
    } catch (err: any) { alert(err.message || "Fehler beim Hinzufügen"); }
  }

  async function handleRemoveAlias(aliasId: number) {
    if (!confirm("Alias wirklich entfernen?")) return;
    try {
      await api(`/api/employees/aliases?id=${aliasId}`, "DELETE");
      fetchEmployees();
    } catch (err: any) { alert(err.message || "Fehler beim Entfernen"); }
  }

  async function handleSaveReduction(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingReduction) {
        await api(`/api/price-reductions/${editingReduction.id}`, "PUT", reductionFormData);
      } else {
        await api("/api/price-reductions", "POST", reductionFormData);
      }
      setShowReductionForm(false);
      setEditingReduction(null);
      fetchPriceReductions();
    } catch (err: any) { alert(err.message || "Fehler beim Speichern"); }
  }

  async function handleDeleteReduction(id: number) {
    if (!confirm("Preisreduktion wirklich löschen?")) return;
    try {
      await api(`/api/price-reductions/${id}`, "DELETE");
      fetchPriceReductions();
    } catch (err: any) { alert(err.message || "Fehler beim Löschen"); }
  }

  async function handleToggleReduction(id: number, isActive: boolean) {
    try {
      await api(`/api/price-reductions/${id}`, "PUT", { isActive: !isActive });
      fetchPriceReductions();
    } catch (err: any) { alert(err.message || "Fehler beim Umschalten"); }
  }

  async function handleSaveFood(e: React.FormEvent) {
    e.preventDefault(); setFoodFormError("");
    if (!foodFormData.name || !foodFormData.priceGross) { setFoodFormError("Name und Bruttopreis erforderlich"); return; }
    try {
      const p = { name: foodFormData.name, priceGross: parseFloat(foodFormData.priceGross), taxRate: parseFloat(foodFormData.taxRate), color: foodFormData.color, imageUrl: foodFormData.imageUrl || null, isCookItem: foodFormData.isCookItem, group: foodFormData.group || null };
      if (editingFood) await api(`/api/foods/${editingFood.id}`, "PUT", p);
      else await api("/api/foods", "POST", p);
      setShowFoodForm(false); setEditingFood(null); fetchFoods();
    } catch (err: any) { setFoodFormError(err.message || "Fehler beim Speichern"); }
  }

  async function handleDeleteFood(id: number) {
    if (!confirm("Food deaktivieren?")) return;
    try { await api(`/api/foods/${id}`, "DELETE"); fetchFoods(); }
    catch (err: any) { alert(err.message || "Fehler beim Löschen"); }
  }

  async function handleSortFood(foodId: number, action: "top" | "up" | "down" | "bottom") {
    try { await api("/api/foods/sort", "POST", { foodId, action }); fetchFoods(); }
    catch (err: any) { alert(err.message || "Fehler beim Verschieben"); }
  }

  function openEditFood(f: Food) {
    setEditingFood(f);
    setFoodFormData({ name: f.name, priceGross: f.priceGross.toString(), taxRate: f.taxRate.toString(), color: f.color, imageUrl: f.imageUrl || "", isCookItem: f.isCookItem, group: f.group || "" });
    setFoodFormError(""); setShowFoodForm(true);
  }

    async function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();
    setEventFormError("");
    
    if (!eventFormData.name || !eventFormData.startDate || !eventFormData.endDate) {
      setEventFormError("Name, Start- und Enddatum sind erforderlich");
      return;
    }
    
    const data = {
      name: eventFormData.name,
      startDate: eventFormData.startDate,
      endDate: eventFormData.endDate,
      employeeDiscountPercent: eventFormData.employeeDiscountPercent || "0",
    };

    try {
      let response; // ✅ WICHTIG: Variable hier deklarieren!
      
      if (editingEvent) {
        response = await api(`/api/events/${editingEvent.id}`, "PUT", data);
      } else {
        response = await api("/api/events", "POST", data);
      }
      
      // ✅ Jetzt kennt TypeScript die Variable 'response'
      console.log("✅ API ANTWORT:", response);

      setShowEventForm(false);
      setEditingEvent(null);
      fetchEvents();
    } catch (err: any) {
      setEventFormError(err.message || "Fehler beim Speichern");
    }
  }

  async function handleDeleteEvent(id: number) {
    if (!confirm("Event wirklich löschen? Alle Zuordnungen gehen verloren!")) return;
    try { await api(`/api/events/${id}`, "DELETE"); fetchEvents(); }
    catch (err: any) { alert(err.message || "Fehler beim Löschen"); }
  }

  async function openAssignDialog(eventId: number, type: "drinks" | "foods") {
    setAssignEventId(eventId); setAssignType(type);
    try {
      const r = await fetch(`/api/events/${type}?eventId=${eventId}`);
      if (r.ok) setAssignedIds(await r.json());
      else setAssignedIds([]);
      setShowEventAssignDialog(true);
    } catch { setAssignedIds([]); setShowEventAssignDialog(true); }
  }

  async function handleSaveAssign() {
    if (!assignEventId) return;
    try {
      await api(`/api/events/${assignType}`, "POST", { eventId: assignEventId, [assignType === "drinks" ? "drinkIds" : "foodIds"]: assignedIds });
      setShowEventAssignDialog(false); fetchEvents();
    } catch (err: any) { alert(err.message || "Fehler beim Speichern"); }
  }

  async function handleChangeUsername() {
    if (!usernameTargetUser || !newUsername.trim()) return;
    try {
      await api(`/api/users/${usernameTargetUser.userId}/username`, "PUT", { username: newUsername.trim() });
      setShowUsernameModal(false);
      setUsernameTargetUser(null);
      setNewUsername("");
      fetchTenants();
      alert("Username erfolgreich geändert");
    } catch (err: any) {
      alert(err.message || "Fehler beim Ändern des Usernames");
    }
  }
  async function handleSaveSP(e: React.FormEvent) { e.preventDefault(); setSpFormError(""); if (!spFormName.trim()) { setSpFormError("Name erforderlich"); return; } try { await api("/api/sales-points", "POST", { name: spFormName.trim() }); setShowSalesPointForm(false); setSpFormName(""); fetchSalesPoints(); } catch (err: any) { setSpFormError(err.message); } }
  async function handleUpdateSP(e: React.FormEvent) { e.preventDefault(); if (!editingSalesPoint || !spEditName.trim()) return; try { await api(`/api/sales-points/${editingSalesPoint.id}`, "PUT", { name: spEditName.trim() }); setEditingSalesPoint(null); setSpEditName(""); fetchSalesPoints(); } catch (err) { console.error(err); } }
  async function handleDeleteSP(id: number) { if (!confirm("Verkaufsstelle deaktivieren?")) return; try { await api(`/api/sales-points/${id}`, "DELETE"); fetchSalesPoints(); } catch (err) { console.error(err); } }
  async function handleResetOrders() { try { await api("/api/admin/reset", "POST", resetTarget ? { salesPointId: parseInt(resetTarget) } : {}); setShowResetConfirm(false); setResetTarget(""); fetchOrders(); } catch (err) { console.error(err); } }
  async function handleResetPour() { try { await api("/api/pour/reset", "POST"); setShowPourResetConfirm(false); fetchPourStats(); } catch (err) { console.error(err); } }
  async function handleResetCups() { try { await api("/api/cups/reset", "POST", cupResetTarget ? { salesPointId: parseInt(cupResetTarget) } : {}); setShowCupResetConfirm(false); setCupResetTarget(""); fetchCupCounters(); } catch (err) { console.error(err); } }

  const getSPName = (id: number) => salesPoints.find((sp) => sp.id === id)?.name || `ID ${id}`;
  const cupTotals = cupCounters.reduce((a, c) => ({ given02: a.given02 + c.given02, given04: a.given04 + c.given04, returned02: a.returned02 + c.returned02, returned04: a.returned04 + c.returned04 }), { given02: 0, given04: 0, returned02: 0, returned04: 0 });

  const showOrderDetail = (order: Order) => {
    setOrderDetail({ order, items: [], foodItems: order.foodItems || [] });
  };

  const switchToTenant = async (tenantId: number) => {
    try { const r = await api("/api/superadmin", "POST", { tenantId }); if (r.success) window.location.reload(); } catch (err) { console.error(err); }
  };

  function openEditDrink(d: Drink) {
    setEditingDrink(d);
    setFormData({
      name: d.name, priceGross: d.priceGross.toString(), taxRate: d.taxRate.toString(),
      hasDeposit: d.hasDeposit, depositAmount: d.depositAmount.toString(), cupSize: d.cupSize,
      color: d.color, imageUrl: d.imageUrl || "", sortOrder: d.sortOrder.toString(),
      isPourDrink: d.isPourDrink, salesPointIds: d.salesPointIds || [], group: d.group || "",
    });
    setFormError("");
  }

  if (session === undefined) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><p>Laden...</p></div>;

  if (!session?.authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <img src="/images/turbotap-logo.png" alt="TurboTap" className="w-10 h-10 rounded-lg" />
            <h1 className="text-2xl font-bold text-white">TurboTap</h1>
          </div>
          {loginError && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-700">{loginError}</div>}
          <div className="space-y-4">
            <div><label className="block text-sm text-gray-400 mb-1">Benutzername</label><input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" autoFocus /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Passwort</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" /></div>
            <button type="submit" className="w-full py-3 rounded-xl font-bold bg-amber-600 hover:bg-amber-500 transition-all">Anmelden</button>
            <a href="/" className="block text-center text-sm text-gray-400 hover:text-white">← Zurück zur Kasse</a>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden logo-watermark">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/images/turbotap-logo.png" alt="" className="w-8 h-8 rounded-lg shrink-0" />
          <h1 className="text-lg font-bold">TurboTap · Admin</h1>
          {session.role === "user" && <span className="text-[10px] bg-purple-700/60 border border-purple-500/40 rounded-full px-2 py-0.5 text-purple-200 truncate">👤 {session.displayName || session.username}</span>}
          {session.displayName?.startsWith("🔐") && <span className="text-[10px] bg-amber-700/60 border border-amber-500/40 rounded-full px-2 py-0.5 text-amber-200 truncate">{session.displayName}</span>}
        </div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-sm text-blue-400 hover:underline">← Kasse</a>
          <a href="/zapf" className="text-sm text-green-400 hover:underline">Zapfen →</a>
          <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300">Abmelden</button>
        </div>
      </header>

      <div className="flex border-b border-gray-700 shrink-0">
        {[["drinks","🍺 Getränke"],["foods","🍔 Speisen"],["salesPoints","🏪 Verkaufsstellen"],["events","📅 Events"],["reductions","💰 Preisaktionen"],["cups","🥤 Becher"],["orders","📊 Bestellungen"],["employees","👤 Mitarbeiter"],...(isSuperAdmin ? [["users","👥 Nutzer"],["super","🔐 Super-Admin"]] : [["users","👥 Nutzer"]])].map(([tab,label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-center font-bold text-sm ${activeTab === tab ? "border-b-2 border-amber-500 text-amber-400" : "text-gray-400"}`}>{label}</button>
        ))}
      </div>

      <div className="flex-1 p-4 max-w-5xl mx-auto w-full overflow-y-auto">
        {/* DRINKS */}
        {activeTab === "drinks" && (
          <div>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Getränke</h2>
              <button onClick={() => { setEditingDrink(null); setFormData({...EMPTY_DRINK}); setFormError(""); setShowDrinkForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neues</button></div>
            {(() => {
              let lastGroup: string | null = "__NONE__";
              return drinks.map((d) => {
                const currentGroup = d.group || null;
                const showSeparator = currentGroup && currentGroup !== lastGroup;
                if (currentGroup) lastGroup = currentGroup;
                return (
                  <div key={d.id} className="contents">
                    {showSeparator && (
                      <div className="col-span-full flex items-center gap-2 my-2">
                        <span className="h-px flex-1 bg-gray-600" />
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{currentGroup}</span>
                        {currentGroup && (
                          <div className="flex gap-0.5">
                            <button onClick={() => handleSortGroup(currentGroup, "top")} className="px-1.5 py-0.5 rounded bg-purple-700 hover:bg-purple-600 text-[10px] font-bold" title="Gruppe ganz nach oben">⏫</button>
                            <button onClick={() => handleSortGroup(currentGroup, "up")} className="px-1.5 py-0.5 rounded bg-purple-700 hover:bg-purple-600 text-[10px] font-bold" title="Gruppe eins nach oben">⇡</button>
                            <button onClick={() => handleSortGroup(currentGroup, "down")} className="px-1.5 py-0.5 rounded bg-purple-700 hover:bg-purple-600 text-[10px] font-bold" title="Gruppe eins nach unten">⇣</button>
                            <button onClick={() => handleSortGroup(currentGroup, "bottom")} className="px-1.5 py-0.5 rounded bg-purple-700 hover:bg-purple-600 text-[10px] font-bold" title="Gruppe ganz nach unten">⏬</button>
                          </div>
                        )}
                        <span className="h-px flex-1 bg-gray-600" />
                      </div>
                    )}
                    <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3 border border-gray-700 mb-2">
                      <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-xs" style={{backgroundColor:d.color}}>{d.name.charAt(0)}</div>
                      <div className="flex-1 min-w-0"><div className="font-bold truncate flex items-center gap-2">{d.name}{d.isPourDrink && <span className="text-[10px] bg-orange-600 px-1.5 py-0.5 rounded text-white">ZAPF</span>}</div>
                        <div className="text-xs text-gray-400"><span className="text-green-400 font-bold">{d.priceGross.toFixed(2)} € brutto</span> · {d.taxRate}% MwSt. · {d.hasDeposit ? `${d.depositAmount.toFixed(2)} € Pfand · ${d.cupSize==="02"?"0,2L":"0,4L"}` : "Kein Pfand"}{d.group && <span className="ml-1 text-purple-400">· 📁 {d.group}</span>}{d.salesPointIds?.length ? ` · an ${d.salesPointIds.length} Stelle(n)` : " · überall"}</div></div>
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => handleSortDrink(d.id, "top")} className="px-1.5 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-[10px] font-bold" title="Ganz nach oben">⏫</button>
                        <button onClick={() => handleSortDrink(d.id, "up")} className="px-1.5 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-[10px] font-bold" title="Eins nach oben">⇡</button>
                        <button onClick={() => handleSortDrink(d.id, "down")} className="px-1.5 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-[10px] font-bold" title="Eins nach unten">⇣</button>
                        <button onClick={() => handleSortDrink(d.id, "bottom")} className="px-1.5 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-[10px] font-bold" title="Ganz nach unten">⏬</button>
                      </div>
                      <button onClick={() => { openEditDrink(d); setShowDrinkForm(true); }} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-sm">✏️</button>
                      <button onClick={() => handleDeleteDrink(d.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-sm">🗑️</button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* FOODS */}
        {activeTab === "foods" && (
          <div>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Speisen</h2>
              <button onClick={() => { setEditingFood(null); setFoodFormData({ name: "", priceGross: "", taxRate: "19", color: "#10B981", imageUrl: "", isCookItem: false, group: "" }); setFoodFormError(""); setShowFoodForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neue Speise</button></div>
            <div className="space-y-2">
              {(() => {
                let lastGroup: string | null = "__NONE__";
                return foods.map((f) => {
                  const currentGroup = f.group || null;
                  const showSeparator = currentGroup && currentGroup !== lastGroup;
                  if (currentGroup) lastGroup = currentGroup;
                  return (
                    <div key={f.id} className="contents">
                      {showSeparator && (
                        <div className="col-span-full flex items-center gap-2 my-2">
                          <span className="h-px flex-1 bg-gray-600" />
                          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{currentGroup}</span>
                          <span className="h-px flex-1 bg-gray-600" />
                        </div>
                      )}
                      <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3 border border-gray-700 mb-2">
                        <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-xs" style={{backgroundColor:f.color}}>{f.name.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold truncate flex items-center gap-2">{f.name}
                            {f.isCookItem && <span className="text-[10px] bg-orange-600 px-1.5 py-0.5 rounded text-white">KOCH</span>}
                          </div>
                          <div className="text-xs text-gray-400"><span className="text-green-400 font-bold">{f.priceGross.toFixed(2)} €</span> · {f.taxRate}% MwSt.{f.group && <span className="ml-1 text-purple-400">· 📁 {f.group}</span>}</div>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => handleSortFood(f.id, "top")} className="px-1.5 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-[10px] font-bold" title="Ganz nach oben">⏫</button>
                          <button onClick={() => handleSortFood(f.id, "up")} className="px-1.5 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-[10px] font-bold" title="Eins nach oben">⇡</button>
                          <button onClick={() => handleSortFood(f.id, "down")} className="px-1.5 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-[10px] font-bold" title="Eins nach unten">⇣</button>
                          <button onClick={() => handleSortFood(f.id, "bottom")} className="px-1.5 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-[10px] font-bold" title="Ganz nach unten">⏬</button>
                        </div>
                        <button onClick={() => openEditFood(f)} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-sm">✏️</button>
                        <button onClick={() => handleDeleteFood(f.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-sm">🗑️</button>
                      </div>
                    </div>
                  );
                });
              })()}
              {foods.length === 0 && <p className="text-gray-500 text-center py-8">Noch keine Speisen angelegt.</p>}
            </div>
          </div>
        )}

        {/* SALES POINTS */}
        {activeTab === "salesPoints" && (
          <div>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Verkaufsstellen</h2>
              <button onClick={()=>{setSpFormName("");setSpFormError("");setShowSalesPointForm(true);}} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neue</button></div>
            {salesPoints.map((sp)=>(
              <div key={sp.id} className="bg-gray-800 rounded-xl p-3 flex items-center gap-3 border border-gray-700 mb-2">
                <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-xs bg-blue-600">{sp.name.charAt(0)}</div>
                <div className="flex-1 min-w-0"><div className="font-bold">{sp.name}</div><div className="text-xs text-gray-400">Sortierung: {sp.sortOrder}</div></div>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => handleSortSP(sp.id, "top")} className="px-1.5 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-[10px] font-bold" title="Ganz nach oben">⏫</button>
                  <button onClick={() => handleSortSP(sp.id, "up")} className="px-1.5 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-[10px] font-bold" title="Eins nach oben">⇡</button>
                  <button onClick={() => handleSortSP(sp.id, "down")} className="px-1.5 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-[10px] font-bold" title="Eins nach unten">⇣</button>
                  <button onClick={() => handleSortSP(sp.id, "bottom")} className="px-1.5 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-[10px] font-bold" title="Ganz nach unten">⏬</button>
                </div>
                <button onClick={()=>{setEditingSalesPoint(sp);setSpEditName(sp.name);}} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-sm">✏️</button>
                <button onClick={()=>handleDeleteSP(sp.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-sm">🗑️</button>
              </div>
            ))}
          </div>
        )}

        {/* CUPS */}
        {activeTab === "cups" && <CupsTab cupCounters={cupCounters} getSPName={getSPName} cupTotals={cupTotals} setCupResetTarget={setCupResetTarget} setShowCupResetConfirm={setShowCupResetConfirm} />}

        {/* EVENTS */}
        {activeTab === "events" && (
          <div>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Events</h2>
              <button onClick={() => { setEditingEvent(null); setEventFormData({ name: "", startDate: "", endDate: "", employeeDiscountPercent: "" }); setEventFormError(""); setShowEventForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neues Event</button></div>
            <div className="space-y-2">
              {events.map((ev) => (
                <div key={ev.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-lg">{ev.name}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(ev.startDate).toLocaleDateString("de-DE")} - {new Date(ev.endDate).toLocaleDateString("de-DE")}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-amber-400">🍺 {ev.drinkCount} Getränke</div>
                      <div className="text-green-400">🍔 {ev.foodCount} Speisen</div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => openAssignDialog(ev.id, "drinks")} className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-xs font-bold">🍺 Getränke zuweisen</button>
                    <button onClick={() => openAssignDialog(ev.id, "foods")} className="px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-xs font-bold">🍔 Speisen zuweisen</button>
                    <button onClick={() => { setEditingEvent(ev); 
  setEventFormData({ 
    name: ev.name, 
    startDate: new Date(ev.startDate).toISOString().split("T")[0], 
    endDate: new Date(ev.endDate).toISOString().split("T")[0],
    employeeDiscountPercent: ev.employeeDiscountPercent?.toString() || "" // ✅ NEU
  }); 
  setEventFormError(""); 
  setShowEventForm(true); 
}} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-xs font-bold">✏️ Bearbeiten</button>
                    <button onClick={() => handleDeleteEvent(ev.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-xs font-bold">🗑️ Löschen</button>
                  </div>
                </div>
              ))}
              {events.length === 0 && <p className="text-gray-500 text-center py-8">Noch keine Events angelegt.</p>}
            </div>
          </div>
        )}

        {/* PRICE REDUCTIONS TAB */}
        {activeTab === "reductions" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">💰 Zeitgesteuerte Preisaktionen</h2>
              <button onClick={() => { setEditingReduction(null); setReductionFormData({ itemId: 0, itemType: "drink", startTime: "22:00", endTime: "02:00", reductionPercent: 20 }); setShowReductionForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neue Aktion</button>
            </div>
            <p className="text-xs text-gray-400 mb-4">Definiere zeitbasierte Preisreduktionen für Getränke und Speisen.</p>
            <div className="space-y-2">
              {priceReductions.map((red) => {
                const item = red.itemType === "drink" 
                  ? drinks.find(d => d.id === red.itemId)
                  : foods.find(f => f.id === red.itemId);
                return (
                  <div key={red.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-bold text-base">
                          {item ? (item as any).name : "Unbekannt"} ({red.itemType === "drink" ? "🍺" : "🍔"})
                        </div>
                        <div className="text-sm text-gray-400">
                          {red.startTime} - {red.endTime} Uhr · {red.reductionPercent}% Rabatt
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleToggleReduction(red.id, red.isActive)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${red.isActive ? "bg-green-700 hover:bg-green-600" : "bg-gray-600 hover:bg-gray-500"}`}>
                          {red.isActive ? "✅ Aktiv" : "⏸️ Inaktiv"}
                        </button>
                        <button onClick={() => { setEditingReduction(red); setReductionFormData({ itemId: red.itemId, itemType: red.itemType, startTime: red.startTime, endTime: red.endTime, reductionPercent: red.reductionPercent }); setShowReductionForm(true); }} className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-xs font-bold">✏️</button>
                        <button onClick={() => handleDeleteReduction(red.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-xs font-bold">🗑️</button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {priceReductions.length === 0 && <p className="text-gray-500 text-center py-8">Noch keine Preisaktionen angelegt.</p>}
            </div>
          </div>
        )}

        
        {/* TEST: Zeigt ob der orders-Tab funktioniert */}
{activeTab === "orders" && (
  <div className="p-4 bg-blue-900/50 border-4 border-blue-500 rounded-xl">
        <p>Selektiere - exporitere deinen Erfolg</p>
    <OrdersAnalytics />
  </div>
)}

         
        {/* EMPLOYEES TAB */}
        {activeTab === "employees" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">👤 Mitarbeiter</h2>
              <button onClick={() => { setEmployeeFormData({ displayName: "" }); setShowEmployeeForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neuer Mitarbeiter</button>
            </div>
            <p className="text-xs text-gray-400 mb-4">Verwalte Mitarbeiter und ihre Alias-Namen für die Auswertung.</p>
            <div className="space-y-2">
              {employees.map((emp) => (
                <div key={emp.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-base">{emp.displayName}</div>
                    <button onClick={() => { setAliasTargetEmployee(emp); setAliasName(""); setShowAliasForm(true); }} className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-xs font-bold">+ Alias</button>
                  </div>
                  {emp.aliases && emp.aliases.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {emp.aliases.map((alias: string, i: number) => (
                        <div key={i} className="bg-gray-700 rounded-lg px-3 py-1.5 text-xs flex items-center gap-2">
                          <span>{alias}</span>
                          <button onClick={() => handleRemoveAlias(emp.aliasIds?.[i])} className="text-red-400 hover:text-red-300">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {employees.length === 0 && <p className="text-gray-500 text-center py-8">Noch keine Mitarbeiter angelegt.</p>}
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === "users" && session.role === "admin" && !isSuperAdmin && <UsersTabSimple />}

        {/* SUPER ADMIN */}
        {activeTab === "super" && isSuperAdmin && (
          <div>
            <h2 className="text-lg font-bold mb-4">🔐 Super-Admin · Mandanten-Verwaltung</h2>
            <p className="text-xs text-gray-400 mb-4">Klicke auf einen Mandanten, um in dessen Umgebung zu wechseln.</p>
            <div className="space-y-2">
              {tenants.map((t) => (
                <div key={t.userId} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => switchToTenant(t.userId)}>
                    <div><div className="font-bold text-base">{t.username}</div>
                      <div className="text-xs text-gray-400">{t.isActive ? "✅ Aktiv" : "⏸️ Deaktiviert"} · Lizenz bis {new Date(t.expiresAt).toLocaleDateString("de-DE")}</div></div>
                    <div className="text-right text-xs">
                      <div className="tabular-nums">{t.drinks} 🍺 · {t.orders} 📋 · {t.pours} 🍻</div>
                      <div className="text-amber-400 text-[10px] mt-1">👉 Klicken zum Bearbeiten</div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-gray-700">
                    <button onClick={(e) => { e.stopPropagation(); setUsernameTargetUser(t); setNewUsername(t.username); setShowUsernameModal(true); }} className="flex-1 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-xs font-bold">✏️ Username</button>
                    <button onClick={(e) => { e.stopPropagation(); setPasswordTargetUser(t); setShowPasswordModal(true); }} className="flex-1 px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-xs font-bold">🔑 Passwort</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-gray-800 rounded-xl border border-gray-700">
              <h3 className="font-bold mb-2">⚡ Direkt-Login (admin)</h3>
              <button onClick={() => switchToTenant(0)} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-sm">🔙 Zurück zum eigenen Admin</button>
            </div>
          </div>
        )}
      </div>

      {/* Drink Form Modal */}
      {showDrinkForm && <DrinkFormModal editingDrink={editingDrink} formData={formData} formError={formError} setFormData={setFormData} handleSave={handleSaveDrink} salesPoints={salesPoints} drinks={drinks} onClose={()=>setShowDrinkForm(false)} />}
      {showSalesPointForm && <SimpleModal title="Neue Verkaufsstelle" error={spFormError} value={spFormName} onChange={setSpFormName} onSubmit={handleSaveSP} onClose={()=>setShowSalesPointForm(false)} />}
      {editingSalesPoint && <SimpleModal title="Bearbeiten" error="" value={spEditName} onChange={setSpEditName} onSubmit={handleUpdateSP} onClose={()=>setEditingSalesPoint(null)} />}
      {showResetConfirm && <ConfirmModal title="Zähler zurücksetzen?" onConfirm={handleResetOrders} onClose={()=>setShowResetConfirm(false)}><p className="text-sm text-gray-300 text-center">{resetTarget ? `Bestellungen für "${getSPName(parseInt(resetTarget))}" löschen.` : "ALLE Bestellungen löschen."}</p></ConfirmModal>}
      {showPourResetConfirm && <ConfirmModal title="Zapf nullen?" onConfirm={handleResetPour} onClose={()=>setShowPourResetConfirm(false)}><p className="text-sm text-gray-300 text-center">Zapf-Statistiken löschen.</p></ConfirmModal>}
      {showCupResetConfirm && <ConfirmModal title="Becher nullen?" onConfirm={handleResetCups} onClose={()=>setShowCupResetConfirm(false)}><p className="text-sm text-gray-300 text-center">{cupResetTarget ? `Becher für "${getSPName(parseInt(cupResetTarget))}" nullen.` : "ALLE Becher nullen."}</p></ConfirmModal>}

      {/* Order Detail Modal */}
      {orderDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-600 max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-700 shrink-0">
              <div className="flex items-center gap-2 mb-1"><img src="/images/turbotap-logo.png" alt="" className="w-6 h-6 rounded" /><h2 className="text-xl font-bold">TurboTap · Rechnung #{orderDetail.order.id}</h2></div>
              <p className="text-xs text-gray-400">{new Date(orderDetail.order.createdAt).toLocaleString("de-DE")} · {getSPName(orderDetail.order.salesPointId)}</p>
              {orderDetail.order.cashierName && <p className="text-xs text-green-400">👤 {orderDetail.order.cashierName}</p>}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {orderDetail.items.length > 0 && <h4 className="font-bold text-sm text-gray-400 mt-2">🍺 Getränke</h4>}
              {orderDetail.items.map((item,i)=>(
                <div key={i} className="flex justify-between items-center border-b border-gray-700/40 pb-2">
                  <span className="font-medium">{item.quantity}× {item.drinkName}</span>
                  <span className="tabular-nums font-semibold">{(item.unitPriceGross * item.quantity).toFixed(2)} €</span>
                </div>
              ))}
              {orderDetail.order.foodItems && orderDetail.order.foodItems.length > 0 && (
                <>
                  <h4 className="font-bold text-sm text-gray-400 mt-4">🍔 Speisen</h4>
                  {orderDetail.order.foodItems.map((item,i)=>(
                    <div key={`food-${i}`} className="flex justify-between items-center border-b border-gray-700/40 pb-2">
                      <span className="font-medium">{item.quantity}× {item.foodName}</span>
                      <span className="tabular-nums font-semibold">{item.totalPriceGross.toFixed(2)} €</span>
                    </div>
                  ))}
                </>
              )}
              {orderDetail.order.totalDeposit > 0 && <div className="text-amber-400 flex justify-between text-sm pt-2"><span>Pfand</span><span className="tabular-nums">+{orderDetail.order.totalDeposit.toFixed(2)} €</span></div>}
              {orderDetail.order.totalDepositReturned > 0 && <div className="text-red-400 flex justify-between text-sm"><span>Pfand zurück</span><span className="tabular-nums">-{orderDetail.order.totalDepositReturned.toFixed(2)} €</span></div>}
              <div className="border-t border-gray-600 pt-2 mt-2 flex justify-between text-lg font-bold"><span>Gesamt</span><span className="text-green-400 tabular-nums">{orderDetail.order.totalGross.toFixed(2)} €</span></div>
            </div>
            <div className="p-4 border-t border-gray-700 shrink-0"><button onClick={()=>setOrderDetail(null)} className="w-full py-3 rounded-xl font-bold bg-amber-600 hover:bg-amber-500 transition-all">Schließen</button></div>
          </div>
        </div>
      )}

      {/* Username ändern Modal */}
      {showUsernameModal && usernameTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Username ändern</h2>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Neuer Username</label>
              <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" autoFocus />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowUsernameModal(false); setUsernameTargetUser(null); setNewUsername(""); }} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500 transition-all">Abbrechen</button>
              <button onClick={handleChangeUsername} className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 transition-all">Ändern</button>
            </div>
          </div>
        </div>
      )}

      {/* Passwort ändern Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <PasswordChangeModal isAdmin={true} targetUserId={passwordTargetUser?.userId} targetUsername={passwordTargetUser?.username} onClose={() => { setShowPasswordModal(false); setPasswordTargetUser(null); }} />
        </div>
      )}

      {/* Food Form Modal */}
      {showFoodForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleSaveFood} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-4">{editingFood ? "Speise bearbeiten" : "Neue Speise"}</h2>
            {foodFormError && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-700">{foodFormError}</div>}
            <div className="space-y-4">
              <div><label className="block text-sm text-gray-400 mb-1">Name *</label><input type="text" value={foodFormData.name} onChange={(e)=>setFoodFormData({...foodFormData, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-gray-400 mb-1">Bruttopreis (€) *</label><input type="number" step="0.01" value={foodFormData.priceGross} onChange={(e)=>setFoodFormData({...foodFormData, priceGross: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">MwSt.</label><select value={foodFormData.taxRate} onChange={(e)=>setFoodFormData({...foodFormData, taxRate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"><option value="19">19%</option><option value="7">7%</option></select></div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={foodFormData.isCookItem} onChange={(e)=>setFoodFormData({...foodFormData, isCookItem: e.target.checked})} className="w-5 h-5 rounded accent-orange-500" /><span className="text-sm text-gray-300">Kochartikel (erscheint im Koch-Frontend)</span></label>
              <div><label className="block text-sm text-gray-400 mb-1">Gruppe (optional)</label><input type="text" value={foodFormData.group} onChange={(e)=>setFoodFormData({...foodFormData, group: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="z.B. Hauptgerichte, Desserts" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Farbe</label><div className="flex items-center gap-3"><input type="color" value={foodFormData.color} onChange={(e)=>setFoodFormData({...foodFormData, color: e.target.value})} className="w-12 h-10 rounded-lg border border-gray-600 cursor-pointer" /><span className="text-sm text-gray-400 font-mono">{foodFormData.color}</span></div></div>
            </div>
            <div className="flex gap-3 mt-6"><button type="button" onClick={()=>setShowFoodForm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500">Abbrechen</button><button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-amber-600 hover:bg-amber-500">Speichern</button></div>
          </form>
        </div>
      )}

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleSaveEvent} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-4">{editingEvent ? "Event bearbeiten" : "Neues Event"}</h2>
            {eventFormError && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-700">{eventFormError}</div>}
            <div className="space-y-4">
              <div><label className="block text-sm text-gray-400 mb-1">Name *</label><input type="text" value={eventFormData.name} onChange={(e)=>setEventFormData({...eventFormData, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-gray-400 mb-1">Startdatum *</label><input type="date" value={eventFormData.startDate} onChange={(e)=>setEventFormData({...eventFormData, startDate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Enddatum *</label><input type="date" value={eventFormData.endDate} onChange={(e)=>setEventFormData({...eventFormData, endDate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" /></div>
              </div>
              {/* ✅ NEU: Mitarbeiter-Rabatt (korrekt eingebettet) */}
                <div className="mt-3">
                  <label className="block text-sm text-gray-400 mb-1">Mitarbeiter-Rabatt (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    step="0.1"
                    value={eventFormData.employeeDiscountPercent || ""} 
                    onChange={(e) => setEventFormData({ ...eventFormData, employeeDiscountPercent: e.target.value })} 
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" 
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Rabatt in Prozent für Mitarbeiter (z.B. 20 für 20% Rabatt auf Getränke)</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => { setShowEventForm(false); setEditingEvent(null); }} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500">Abbrechen</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-amber-600 hover:bg-amber-500">Speichern</button>
              </div>
            </form>
          </div>
        )}

      {/* Event Assign Dialog */}
      {showEventAssignDialog && assignEventId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-gray-700 max-h-[80vh] flex flex-col">
            <h2 className="text-xl font-bold mb-4">{assignType === "drinks" ? "🍺 Getränke" : "🍔 Speisen"} für Event zuweisen</h2>
            <div className="flex-1 overflow-y-auto mb-4">
              <div className="grid grid-cols-2 gap-2">
                {(assignType === "drinks" ? drinks : foods).map((item: any) => (
                  <label key={item.id} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer ${assignedIds.includes(item.id) ? "bg-blue-900/50 border-blue-500" : "bg-gray-700/50 border-gray-600 hover:border-gray-500"}`}>
                    <input type="checkbox" checked={assignedIds.includes(item.id)} onChange={(e) => { if (e.target.checked) setAssignedIds([...assignedIds, item.id]); else setAssignedIds(assignedIds.filter(id => id !== item.id)); }} className="w-4 h-4 rounded accent-blue-500" />
                    <span className="flex-1">{item.name}</span>
                    <span className="text-xs text-gray-400">{item.priceGross.toFixed(2)} €</span>
                  </label>
                ))}
              </div>
              {(assignType === "drinks" ? drinks : foods).length === 0 && <p className="text-gray-500 text-center py-8">Keine {assignType === "drinks" ? "Getränke" : "Speisen"} vorhanden.</p>}
            </div>
            <div className="flex gap-3"><button onClick={()=>setShowEventAssignDialog(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500">Abbrechen</button><button onClick={handleSaveAssign} className="flex-1 py-3 rounded-xl font-bold bg-amber-600 hover:bg-amber-500">Speichern ({assignedIds.length} ausgewählt)</button></div>
          </div>
        </div>
      )}

      {/* Employee Form Modal */}
      {showEmployeeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleSaveEmployee} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Neuer Mitarbeiter</h2>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Anzeigename</label>
              <input type="text" value={employeeFormData.displayName} onChange={(e) => setEmployeeFormData({ displayName: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" autoFocus />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowEmployeeForm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500">Abbrechen</button>
              <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600 hover:bg-green-500">Speichern</button>
            </div>
          </form>
        </div>
      )}

      {/* Alias Form Modal */}
      {showAliasForm && aliasTargetEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleAddAlias} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-2">Alias für {aliasTargetEmployee.displayName}</h2>
            <p className="text-xs text-gray-400 mb-4">Füge einen Alias-Namen hinzu, der in der Auswertung diesem Mitarbeiter zugeordnet wird.</p>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Alias-Name</label>
              <input type="text" value={aliasName} onChange={(e) => setAliasName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="z.B. Susi" autoFocus />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowAliasForm(false); setAliasTargetEmployee(null); }} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500">Abbrechen</button>
              <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500">Hinzufügen</button>
            </div>
          </form>
        </div>
      )}

      {/* Price Reduction Form Modal */}
      {showReductionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleSaveReduction} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-4">{editingReduction ? "Preisaktion bearbeiten" : "Neue Preisaktion"}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Typ</label>
                <select value={reductionFormData.itemType} onChange={(e) => setReductionFormData({ ...reductionFormData, itemType: e.target.value as "drink" | "food" })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none">
                  <option value="drink">🍺 Getränk</option>
                  <option value="food">🍔 Speise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{reductionFormData.itemType === "drink" ? "Getränk" : "Speise"}</label>
                <select value={reductionFormData.itemId} onChange={(e) => setReductionFormData({ ...reductionFormData, itemId: parseInt(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none">
                  <option value={0}>Bitte wählen...</option>
                  {(reductionFormData.itemType === "drink" ? drinks : foods).map((item) => (
                    <option key={item.id} value={item.id}>{item.name} ({item.priceGross.toFixed(2)} €)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Startzeit (HH:MM)</label>
                  <input type="time" value={reductionFormData.startTime} onChange={(e) => setReductionFormData({ ...reductionFormData, startTime: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Endzeit (HH:MM)</label>
                  <input type="time" value={reductionFormData.endTime} onChange={(e) => setReductionFormData({ ...reductionFormData, endTime: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Rabatt in %</label>
                <input type="number" min="0" max="100" value={reductionFormData.reductionPercent} onChange={(e) => setReductionFormData({ ...reductionFormData, reductionPercent: parseFloat(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" />
                <p className="text-xs text-gray-500 mt-1">z.B. 20 für 20% Rabatt</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => { setShowReductionForm(false); setEditingReduction(null); }} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500">Abbrechen</button>
              <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600 hover:bg-green-500">Speichern</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// --- SUBCOMPONENTS ---

function DrinkFormModal({editingDrink,formData,formError,setFormData,handleSave,salesPoints,drinks,onClose}:any) {
  const existingGroups = Array.from(new Set((drinks || []).map((d:any) => d.group).filter(Boolean))) as string[];
  const nettoPreview = formData.priceGross ? (parseFloat(formData.priceGross) / (1 + parseFloat(formData.taxRate || "19") / 100)).toFixed(2) : "0.00";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={handleSave} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{editingDrink?"Getränk bearbeiten":"Neues Getränk"}</h2>
        {formError && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-700">{formError}</div>}
        <div className="space-y-4">
          <div><label className="block text-sm text-gray-400 mb-1">Name *</label><input type="text" value={formData.name} onChange={(e)=>setFormData({...formData,name:e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-400 mb-1">Bruttopreis (€) *</label><input type="number" step="0.01" value={formData.priceGross} onChange={(e)=>setFormData({...formData,priceGross:e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="3.00" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">MwSt.</label><select value={formData.taxRate} onChange={(e)=>setFormData({...formData,taxRate:e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"><option value="19">19%</option><option value="7">7%</option></select></div>
          </div>
          {formData.priceGross && <p className="text-xs text-green-400 tabular-nums">= {nettoPreview} € netto</p>}
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.hasDeposit} onChange={(e)=>setFormData({...formData,hasDeposit:e.target.checked})} className="w-5 h-5 rounded accent-amber-500" /><span className="text-sm text-gray-300">Becherpfand</span></label>
          {formData.hasDeposit && <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm text-gray-400 mb-1">Pfand (€)</label><input type="number" step="0.01" value={formData.depositAmount} onChange={(e)=>setFormData({...formData,depositAmount:e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Bechergröße</label><select value={formData.cupSize} onChange={(e)=>setFormData({...formData,cupSize:e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"><option value="02">0,2 l</option><option value="04">0,4 l</option></select></div></div>}
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.isPourDrink} onChange={(e)=>setFormData({...formData,isPourDrink:e.target.checked})} className="w-5 h-5 rounded accent-orange-500" /><span className="text-sm text-gray-300">Zapfgetränk</span></label>
          <div><label className="block text-sm text-gray-400 mb-1">Gruppe (optional)</label>
            <input type="text" list="groupList" value={formData.group} onChange={(e)=>setFormData({...formData,group:e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="z.B. Kaltgetränke, Heißgetränke, Alkoholfrei" />
            <datalist id="groupList">{existingGroups.map((g)=>(<option key={g} value={g} />))}</datalist>
            <p className="text-[10px] text-gray-500 mt-1">Getränke mit gleicher Gruppe werden im Frontend zusammengefasst.</p>
          </div>
          <div><label className="block text-sm text-gray-400 mb-1">Verfügbar an Verkaufsstellen</label>
            <div className="space-y-1 max-h-32 overflow-y-auto bg-gray-700/50 rounded-lg p-2">
              {salesPoints.length === 0 ? <p className="text-xs text-gray-400">Keine Verkaufsstellen vorhanden</p> : salesPoints.map((sp:any) => (
                <label key={sp.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.salesPointIds?.includes(sp.id) || false} onChange={(e) => {
                    const ids = formData.salesPointIds || [];
                    setFormData({
                      ...formData,
                      salesPointIds: e.target.checked ? [...ids, sp.id] : ids.filter((i:number) => i !== sp.id),
                    });
                  }} className="w-4 h-4 rounded accent-amber-500" />
                  <span className="text-xs text-gray-300">{sp.name}</span>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">Keine Auswahl = überall verfügbar</p>
          </div>
          <div><label className="block text-sm text-gray-400 mb-1">Farbe</label><div className="flex items-center gap-3"><input type="color" value={formData.color} onChange={(e)=>setFormData({...formData,color:e.target.value})} className="w-12 h-10 rounded-lg border border-gray-600 cursor-pointer" /><span className="text-sm text-gray-400 font-mono">{formData.color}</span></div></div>
          <div><label className="block text-sm text-gray-400 mb-1">Bild-URL</label><input type="url" value={formData.imageUrl} onChange={(e)=>setFormData({...formData,imageUrl:e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" /></div>
          <div><label className="block text-sm text-gray-400 mb-1">Sortierung</label><input type="number" value={formData.sortOrder} onChange={(e)=>setFormData({...formData,sortOrder:e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" /></div>
        </div>
        <div className="flex gap-3 mt-6"><button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500">Abbrechen</button><button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-amber-600 hover:bg-amber-500">Speichern</button></div>
      </form>
    </div>
  );
}

function CupsTab({cupCounters,getSPName,cupTotals,setCupResetTarget,setShowCupResetConfirm}:any) {
  return (<div><div className="flex justify-between items-center mb-4 flex-wrap gap-2"><h2 className="text-lg font-bold">Becher-Übersicht</h2>
    <button onClick={()=>{setCupResetTarget("");setShowCupResetConfirm(true);}} className="px-3 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-sm font-bold border border-red-500/30">🔄 Alle nullen</button></div>
    <h3 className="text-md font-bold mb-2">Gesamt</h3>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      <div className="bg-gray-800 rounded-xl p-3 border border-gray-700"><div className="text-xs text-gray-400">0,2L ausgegeben</div><div className="text-2xl font-bold tabular-nums">{cupTotals.given02}</div></div>
      <div className="bg-gray-800 rounded-xl p-3 border border-gray-700"><div className="text-xs text-gray-400">0,2L zurück</div><div className="text-2xl font-bold tabular-nums text-green-400">{cupTotals.returned02}</div></div>
      <div className="bg-gray-800 rounded-xl p-3 border border-gray-700"><div className="text-xs text-gray-400">0,2L Umlauf</div><div className="text-2xl font-bold tabular-nums text-amber-400">{Math.max(0, cupTotals.given02 - cupTotals.returned02)}</div></div>
      <div className="bg-gray-800 rounded-xl p-3 border border-gray-700"><div className="text-xs text-gray-400">0,4L ausgegeben</div><div className="text-2xl font-bold tabular-nums">{cupTotals.given04}</div></div>
      <div className="bg-gray-800 rounded-xl p-3 border border-gray-700"><div className="text-xs text-gray-400">0,4L zurück</div><div className="text-2xl font-bold tabular-nums text-green-400">{cupTotals.returned04}</div></div>
    </div>
    <h3 className="text-md font-bold mb-2">Pro Verkaufsstelle</h3>
    {cupCounters.map((c:any)=>(<div key={c.salesPointId} className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-2">
      <div className="flex justify-between items-center mb-3"><span className="font-bold text-base">{getSPName(c.salesPointId)}</span><button onClick={()=>{setCupResetTarget(String(c.salesPointId));setShowCupResetConfirm(true);}} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-xs font-bold">🔄 nullen</button></div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-gray-700/50 rounded-lg p-2"><div className="text-[10px] text-gray-400 uppercase font-bold">0,2L</div>
          <div className="text-xs mt-1"><span className="text-gray-400">ausgegeben:</span> <strong className="tabular-nums">{c.given02}</strong></div>
          <div className="text-xs"><span className="text-gray-400">zurück:</span> <strong className="tabular-nums text-green-400">{c.returned02}</strong></div>
          <div className="text-xs border-t border-gray-600 pt-1 mt-1"><span className="text-gray-400">im Umlauf:</span> <strong className={`tabular-nums ${c.given02 - c.returned02 > 0 ? "text-amber-400" : "text-green-400"}`}>{Math.max(0, c.given02 - c.returned02)}</strong></div>
        </div>
        <div></div>
        <div className="bg-gray-700/50 rounded-lg p-2"><div className="text-[10px] text-gray-400 uppercase font-bold">0,4L</div>
          <div className="text-xs mt-1"><span className="text-gray-400">ausgegeben:</span> <strong className="tabular-nums">{c.given04}</strong></div>
          <div className="text-xs"><span className="text-gray-400">zurück:</span> <strong className="tabular-nums text-green-400">{c.returned04}</strong></div>
          <div className="text-xs border-t border-gray-600 pt-1 mt-1"><span className="text-gray-400">im Umlauf:</span> <strong className={`tabular-nums ${c.given04 - c.returned04 > 0 ? "text-amber-400" : "text-green-400"}`}>{Math.max(0, c.given04 - c.returned04)}</strong></div>
        </div>
      </div>
    </div>))}
  </div>);
}

function SimpleModal({title,error,value,onChange,onSubmit,onClose}:any){return(
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={onSubmit} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
    <h2 className="text-xl font-bold mb-4">{title}</h2>{error&&<div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-700">{error}</div>}
    <div className="mb-4"><input type="text" value={value} onChange={(e)=>onChange(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" autoFocus /></div>
    <div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button><button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-amber-600">Speichern</button></div>
  </form></div>
);}

function ConfirmModal({title,children,onConfirm,onClose}:any){return(
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
    <h2 className="text-xl font-bold mb-3 text-center text-red-400">{title}</h2>{children}
    <div className="flex gap-3 mt-4"><button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button><button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-bold bg-red-600">Ja</button></div>
  </div></div>
);}

function UsersTabSimple() {
  const [users,setUsers]=useState<any[]>([]); const [showCreate,setShowCreate]=useState(false);const [nN,setNN]=useState("");const[nP,setNP]=useState("");const[nD,setND]=useState("30");const[cE,setCE]=useState("");
  const [eU,setEU]=useState<any>(null);const[eD,setED]=useState("30");const[pU,setPU]=useState<any>(null);const[pV,setPV]=useState("");
  const reload=useCallback(async()=>{try{const r=await fetch("/api/users");if(r.ok)setUsers(await r.json())}catch(err){console.error(err)}},[]);
  useEffect(()=>{reload();},[reload]);
  async function api(p:string,m:string,b?:any){const r=await fetch(p,{method:m,headers:{"Content-Type":"application/json"},body:b?JSON.stringify(b):undefined});if(!r.ok)throw new Error((await r.json()).error||"Fehler");return r.json();}
  async function hC(e:React.FormEvent){e.preventDefault();setCE("");try{await api("/api/users","POST",{username:nN,password:nP,days:parseInt(nD)});setShowCreate(false);setNN("");setNP("");setND("30");reload();}catch(err:any){setCE(err.message||"Fehler");}}
  async function hE(id:number){try{await api("/api/users","PATCH",{userId:id,action:"extend",value:parseInt(eD)});setEU(null);reload();}catch(err){console.error(err);}}
  async function hP(id:number){try{await api("/api/users","PATCH",{userId:id,action:"resetPassword",value:pV});setPU(null);setPV("");}catch(err){console.error(err);}}
  async function hD(id:number,n:string){if(!confirm(`"${n}" wirklich löschen?`))return;try{await api("/api/users","DELETE",{userId:id});reload();}catch(err){console.error(err);}}
  async function tA(id:number){try{await api("/api/users","PATCH",{userId:id,action:"toggleActive"});reload();}catch(err){console.error(err);}}
  const dl=(e:string)=>Math.ceil((new Date(e).getTime()-Date.now())/(24*60*60*1000));const opts=[{d:1,l:"1 Tag"},{d:2,l:"2 Tage"},{d:3,l:"3 Tage"},{d:4,l:"4 Tage"},{d:14,l:"14 Tage"},{d:30,l:"30 Tage"},{d:180,l:"180 Tage"},{d:365,l:"1 Jahr"}];
  return(<div><div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Nutzer</h2><button onClick={()=>{setCE("");setShowCreate(true);}} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neuer</button></div>
    {users.map((u:any)=>{const l=dl(u.expiresAt);const e=l<0;return(<div key={u.id} className="bg-gray-800 rounded-xl p-3 border border-gray-700 mb-2">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-xs bg-purple-600">{u.username.charAt(0).toUpperCase()}</div>
        <div className="flex-1 min-w-0"><div className="font-bold truncate">{u.username}{!u.isActive&&<span className="text-[10px] bg-gray-600 px-1.5 py-0.5 rounded text-white ml-1">DEAKT</span>}{e&&<span className="text-[10px] bg-red-700 px-1.5 py-0.5 rounded text-white ml-1">ABGEL.</span>}</div>
          <div className="text-xs text-gray-400">bis {new Date(u.expiresAt).toLocaleDateString("de-DE")} · {e?<span className="text-red-400 font-bold">abgelaufen</span>:<span className={`font-bold ${l<=7?"text-amber-400":"text-green-400"}`}>{l} T</span>}</div></div>
      </div>
      <div className="flex gap-1.5 mt-2.5 flex-wrap"><button onClick={()=>setEU(u)} className="px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-xs font-bold">⏳ Verl.</button>
        <button onClick={()=>setPU(u)} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-xs font-bold">🔑 PW</button>
        <button onClick={()=>tA(u.id)} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-xs font-bold">{u.isActive?"⏸️":"▶️"}</button>
        <button onClick={()=>hD(u.id,u.username)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-xs font-bold">🗑️</button></div>
    </div>);})}
    {showCreate&&<CreateUserModal error={cE} name={nN} password={nP} days={nD} onName={setNN} onPassword={setNP} onDays={setND} onSubmit={hC} onClose={()=>setShowCreate(false)} opts={opts}/>}
    {eU&&<ExtendModal user={eU} days={eD} onDays={setED} onSubmit={()=>hE(eU.id)} onClose={()=>setEU(null)} opts={opts}/>}
    {pU&&<PasswordModal user={pU} value={pV} onChange={setPV} onSubmit={()=>hP(pU.id)} onClose={()=>setPU(null)}/>}
  </div>);
}

function CreateUserModal({error,name,password,days,onName,onPassword,onDays,onSubmit,onClose,opts}:any){return(
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={onSubmit} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
    <h2 className="text-xl font-bold mb-4">Neuer Nutzer</h2>{error&&<div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-700">{error}</div>}
    <div className="mb-3"><label className="block text-sm text-gray-400 mb-1">Name</label><input type="text" value={name} onChange={(e)=>onName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" autoFocus/></div>
    <div className="mb-3"><label className="block text-sm text-gray-400 mb-1">Passwort</label><input type="text" value={password} onChange={(e)=>onPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"/></div>
    <div className="mb-4"><select value={days} onChange={(e)=>onDays(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none">{opts.map((o:any)=>(<option key={o.d} value={o.d}>{o.l}</option>))}</select></div>
    <div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button><button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-amber-600">Anlegen</button></div>
  </form></div>
);}

function ExtendModal({user,days,onDays,onSubmit,onClose,opts}:any){return(
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={onSubmit} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
    <h2 className="text-xl font-bold mb-2">⏳ Verlängern</h2><p className="text-sm text-gray-400 mb-4">{user?.username} · bis {new Date(user?.expiresAt).toLocaleDateString("de-DE")}</p>
    <select value={days} onChange={(e)=>onDays(e.target.value)} className="w-full mb-4 px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none">{opts.map((o:any)=>(<option key={o.d} value={o.d}>{o.l}</option>))}</select>
    <div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button><button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600">Verlängern</button></div>
  </form></div>
);}

function PasswordModal({user,value,onChange,onSubmit,onClose}:any){return(
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={onSubmit} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
    <h2 className="text-xl font-bold mb-2">🔑 Passwort</h2><p className="text-sm text-gray-400 mb-4">für {user?.username}</p>
    <div className="mb-4"><input type="text" value={value} onChange={(e)=>onChange(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" autoFocus/></div>
    <div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button><button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-amber-600">Speichern</button></div>
  </form></div>
  );}

function PasswordChangeModal({isAdmin, targetUserId, targetUsername, onClose}: any) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen haben");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwörter stimmen nicht überein");
      return;
    }

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, userId: targetUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Fehler");
        return;
      }
      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch {
      setError("Verbindungsfehler");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
      <h2 className="text-xl font-bold mb-4">
        {targetUsername ? `Passwort für ${targetUsername}` : "Passwort ändern"}
      </h2>
      {error && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-700">{error}</div>}
      {success && <div className="bg-green-900/50 text-green-300 text-sm p-3 rounded-lg mb-4 border border-green-700">✅ Passwort geändert</div>}
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Neues Passwort</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" required minLength={6} autoFocus />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Passwort bestätigen</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" required minLength={6} />
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500">Abbrechen</button>
        <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600 hover:bg-green-500">Ändern</button>
      </div>
    </form>
  );
}
