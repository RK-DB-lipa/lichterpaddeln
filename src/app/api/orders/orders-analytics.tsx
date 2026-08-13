"use client";

import { useState, useEffect } from "react";

export default function OrdersAnalytics() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Test-Komponente geladen");
    
    fetch("/api/orders")
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => {
        console.log("Daten erhalten:", d);
        setData(d);
      })
      .catch(err => {
        console.error("Fehler:", err);
        setError(err.message);
      });
  }, []);

  return (
    <div className="p-4 bg-red-900/30 border-4 border-red-500 rounded-xl">
      <h2 className="text-2xl font-bold mb-4">🔧 TEST-KOMPONENTE SICHTBAR!</h2>
      
      {error && (
        <div className="bg-red-700 p-3 rounded mb-4">
          ❌ Fehler: {error}
        </div>
      )}
      
      {data ? (
        <div>
          <p className="mb-2">✅ Daten geladen!</p>
          <p className="mb-2">Bestellungen: <strong>{data.orders?.length || 0}</strong></p>
          <p className="mb-2">Getränke-Zusammenfassung: <strong>{data.drinkSummary?.length || 0}</strong> Einträge</p>
          <p>Gesamtumsatz: <strong>{data.totals?.totalRevenue || 0} €</strong></p>
        </div>
      ) : (
        <p>⏳ Lade...</p>
      )}
    </div>
  );
}
