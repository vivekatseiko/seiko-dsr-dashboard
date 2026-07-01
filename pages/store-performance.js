import { useState, useEffect } from "react";
import styles from "../styles/Dashboard.module.css";

const formatIndianNumber = (num) => {
  const str = Math.round(num).toString();
  const lastThree = str.substring(str.length - 3);
  const otherNumbers = str.substring(0, str.length - 3);
  if (otherNumbers !== "") {
    return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  }
  return lastThree;
};

const getAchievementColor = (percent) => {
  if (percent >= 100) return "#4CAF50"; // Green
  if (percent >= 75) return "#FF9800"; // Orange
  return "#f44336"; // Red
};

export default function StorePerformance() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [city, setCity] = useState("all");
  const [region, setRegion] = useState("all");
  const [storeCode, setStoreCode] = useState("all");

  const [cities, setCities] = useState([]);
  const [regions, setRegions] = useState([]);
  const [stores, setStores] = useState([]);

  const [expandedStore, setExpandedStore] = useState(null);

  useEffect(() => {
    // Set default date range to MTD
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, city, region, storeCode]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (city !== "all") params.append("city", city);
      if (region !== "all") params.append("region", region);
      if (storeCode !== "all") params.append("storeCode", storeCode);

      const response = await fetch(`/api/store-performance?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to fetch data");
        setData([]);
      } else {
        setData(result.data || []);

        // Extract unique cities, regions, stores
        if (result.data && result.data.length > 0) {
          const uniqueCities = [...new Set(result.data.map(s => s.city).filter(c => c))].sort();
          const uniqueRegions = [...new Set(result.data.map(s => s.region).filter(r => r))].sort();
          const uniqueStores = [...new Set(result.data.map(s => ({ code: s.store_code, name: s.store_name })))].sort((a, b) => a.code.localeCompare(b.code));

          setCities(uniqueCities);
          setRegions(uniqueRegions);
          setStores(uniqueStores);
        }
      }
    } catch (err) {
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
    setCity("all");
    setRegion("all");
    setStoreCode("all");
  };

  return (
    <div className={styles.container}>
      <h1>🏪 Store-wise Performance</h1>

      {/* Filters */}
      <div
        style={{
          backgroundColor: "#f5f5f5",
          padding: "1.5rem",
          borderRadius: "8px",
          marginBottom: "2rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        <div>
          <label>Start Date:</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        <div>
          <label>End Date:</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <div>
          <label>City:</label>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="all">All Cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Region:</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="all">All Regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Store:</label>
          <select value={storeCode} onChange={(e) => setStoreCode(e.target.value)}>
            <option value="all">All Stores</option>
            {stores.map((s) => (
              <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button
            onClick={handleResetFilters}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#666",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            borderRadius: "4px",
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            border: "1px solid #fca5a5",
          }}
        >
          ❌ {error}
        </div>
      )}

      {/* Loading */}
      {loading && <p>Loading store performance data...</p>}

      {/* Table */}
      {!loading && data.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
              border: "1px solid #ddd",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f0f0f0" }}>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Store</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>Value Target</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>Value Achieved</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Ach %</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Calibres</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Discount %</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Warranty %</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Expand</th>
              </tr>
            </thead>
            <tbody>
              {data.map((store) => (
                <tbody key={store.store_code}>
                  {/* Main Row */}
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "10px", border: "1px solid #ddd", fontWeight: "bold" }}>
                      {store.store_name}
                    </td>
                    <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>
                      ₹{formatIndianNumber(store.value_target)}
                    </td>
                    <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>
                      ₹{(store.value_achieved / 100000).toFixed(2)}L
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        border: "1px solid #ddd",
                        textAlign: "center",
                        backgroundColor: getAchievementColor(store.value_achievement_percent),
                        color: "white",
                        fontWeight: "bold",
                      }}
                    >
                      {store.value_achievement_percent.toFixed(1)}%
                    </td>
                    <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
                      {store.calibre_metrics.length > 0 ? (
                        <span>{store.calibre_metrics.map(c => c.name).join(", ")}</span>
                      ) : (
                        <span style={{ color: "#999" }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
                      {store.avg_discount_percent.toFixed(2)}%
                    </td>
                    <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
                      {store.warranty_percent.toFixed(2)}%
                    </td>
                    <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
                      <button
                        onClick={() =>
                          setExpandedStore(expandedStore === store.store_code ? null : store.store_code)
                        }
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "#2196F3",
                          color: "white",
                          border: "none",
                          borderRadius: "3px",
                          cursor: "pointer",
                          fontSize: "11px",
                        }}
                      >
                        {expandedStore === store.store_code ? "▲" : "▼"}
                      </button>
                    </td>
                  </tr>

                  {/* Calibre Breakdown Row */}
                  {expandedStore === store.store_code && store.calibre_metrics.length > 0 && (
                    <tr style={{ backgroundColor: "#f9f9f9", borderBottom: "2px solid #ddd" }}>
                      <td colSpan="8" style={{ padding: "15px", border: "1px solid #ddd" }}>
                        <div style={{ marginLeft: "20px" }}>
                          <p style={{ fontWeight: "bold", marginBottom: "10px" }}>Calibre-wise Breakdown:</p>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              fontSize: "11px",
                              backgroundColor: "white",
                            }}
                          >
                            <thead>
                              <tr style={{ backgroundColor: "#f0f0f0" }}>
                                <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "left" }}>
                                  Calibre
                                </th>
                                <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center" }}>
                                  Target Qty
                                </th>
                                <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center" }}>
                                  Achieved Qty
                                </th>
                                <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center" }}>
                                  Achievement %
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {store.calibre_metrics.map((calibre, idx) => (
                                <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                                    {calibre.name}
                                  </td>
                                  <td style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center" }}>
                                    {calibre.target}
                                  </td>
                                  <td style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center" }}>
                                    {calibre.achieved}
                                  </td>
                                  <td
                                    style={{
                                      padding: "8px",
                                      border: "1px solid #ddd",
                                      textAlign: "center",
                                      backgroundColor: getAchievementColor(calibre.achievement_percent),
                                      color: "white",
                                      fontWeight: "bold",
                                      borderRadius: "3px",
                                    }}
                                  >
                                    {calibre.achievement_percent.toFixed(1)}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}

                  {expandedStore === store.store_code && store.calibre_metrics.length === 0 && (
                    <tr style={{ backgroundColor: "#f9f9f9", borderBottom: "2px solid #ddd" }}>
                      <td colSpan="8" style={{ padding: "15px", border: "1px solid #ddd", color: "#999" }}>
                        No calibre targets set for this store.
                      </td>
                    </tr>
                  )}
                </tbody>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && data.length === 0 && (
        <p style={{ textAlign: "center", color: "#999", marginTop: "2rem" }}>
          No data found for selected filters.
        </p>
      )}
    </div>
  );
}
