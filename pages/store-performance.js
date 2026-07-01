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
  if (percent >= 100) return "#4CAF50";
  if (percent >= 75) return "#FF9800";
  return "#f44336";
};

export default function StorePerformance() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedStore, setExpandedStore] = useState(null);

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/store-performance?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to fetch data");
        setData([]);
      } else {
        setData(result.data || []);
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
  };

  return (
    <div className={styles.container}>
      <h1>🏪 Store-wise Performance</h1>

      {/* Filters */}
      <div style={{ marginBottom: "2rem", display: "flex", gap: "1rem", alignItems: "flex-end" }}>
        <div>
          <label>Start Date:</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label>End Date:</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
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
          Reset
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: "1rem",
          marginBottom: "1rem",
          borderRadius: "4px",
          backgroundColor: "#fee2e2",
          color: "#991b1b",
          border: "1px solid #fca5a5",
        }}>
          ❌ {error}
        </div>
      )}

      {/* Loading */}
      {loading && <p>Loading...</p>}

      {/* Table */}
      {!loading && data.length > 0 && (
        <div>
          {data.map((store) => (
            <div key={store.store_code} style={{ marginBottom: "2rem" }}>
              {/* Store Header Row */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr 1fr 1fr 0.5fr",
                gap: "0px",
                marginBottom: "0px",
                backgroundColor: "#f0f0f0",
                fontWeight: "bold",
                fontSize: "12px",
              }}>
                <div style={{ padding: "10px", borderBottom: "1px solid #ddd", borderRight: "1px solid #ddd" }}>Store</div>
                <div style={{ padding: "10px", borderBottom: "1px solid #ddd", borderRight: "1px solid #ddd", textAlign: "right" }}>Value Target</div>
                <div style={{ padding: "10px", borderBottom: "1px solid #ddd", borderRight: "1px solid #ddd", textAlign: "right" }}>Value Achieved</div>
                <div style={{ padding: "10px", borderBottom: "1px solid #ddd", borderRight: "1px solid #ddd", textAlign: "center" }}>Ach %</div>
                <div style={{ padding: "10px", borderBottom: "1px solid #ddd", borderRight: "1px solid #ddd" }}>Calibres</div>
                <div style={{ padding: "10px", borderBottom: "1px solid #ddd", borderRight: "1px solid #ddd", textAlign: "center" }}>Discount %</div>
                <div style={{ padding: "10px", borderBottom: "1px solid #ddd", borderRight: "1px solid #ddd", textAlign: "center" }}>Warranty %</div>
                <div style={{ padding: "10px", borderBottom: "1px solid #ddd", textAlign: "center" }}>Expand</div>
              </div>

              {/* Store Data Row */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr 1fr 1fr 0.5fr",
                gap: "0px",
                backgroundColor: "#fff",
                fontSize: "12px",
              }}>
                <div style={{ padding: "10px", borderBottom: "1px solid #ddd", borderRight: "1px solid #ddd", fontWeight: "bold" }}>{store.store_name}</div>
                <div style={{ padding: "10px", borderBottom: "1px solid #ddd", borderRight: "1px solid #ddd", textAlign: "right" }}>₹{formatIndianNumber(store.value_target)}</div>
                <div style={{ padding: "10px", borderBottom: "1px solid #ddd", borderRight: "1px solid #ddd", textAlign: "right" }}>₹{(store.value_achieved / 100000).toFixed(2)}L</div>
                <div style={{
                  padding: "10px",
                  borderBottom: "1px solid #ddd",
                  borderRight: "1px solid #ddd",
                  textAlign: "center",
                  backgroundColor: getAchievementColor(store.value_achievement_percent),
                  color: "white",
                  fontWeight: "bold",
                }}>
                  {store.value_achievement_percent.toFixed(1)}%
                </div>
                <div style={{ padding: "10px", borderBottom: "1px solid #ddd", borderRight: "1px solid #ddd" }}>
                  {store.calibre_metrics.length > 0 ? store.calibre_metrics.map(c => c.name).join(", ") : "-"}
                </div>
                <div style={{ padding: "10px", borderBottom: "1px solid #ddd", borderRight: "1px solid #ddd", textAlign: "center" }}>{store.avg_discount_percent.toFixed(2)}%</div>
                <div style={{ padding: "10px", borderBottom: "1px solid #ddd", borderRight: "1px solid #ddd", textAlign: "center" }}>{store.warranty_percent.toFixed(2)}%</div>
                <div style={{ padding: "10px", borderBottom: "1px solid #ddd", textAlign: "center" }}>
                  <button
                    onClick={() => setExpandedStore(expandedStore === store.store_code ? null : store.store_code)}
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
                </div>
              </div>

              {/* Calibre Breakdown */}
              {expandedStore === store.store_code && store.calibre_metrics.length > 0 && (
                <div style={{ backgroundColor: "#f9f9f9", padding: "1rem", borderBottom: "2px solid #ddd" }}>
                  <p style={{ fontWeight: "bold", marginBottom: "1rem" }}>Calibre Breakdown:</p>
                  {store.calibre_metrics.map((cal, idx) => (
                    <div key={idx} style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1fr",
                      gap: "0px",
                      marginBottom: "0.5rem",
                      fontSize: "11px",
                    }}>
                      <div style={{ padding: "8px", border: "1px solid #ddd" }}>{cal.name}</div>
                      <div style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center" }}>{cal.target}</div>
                      <div style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center" }}>{cal.achieved}</div>
                      <div style={{
                        padding: "8px",
                        border: "1px solid #ddd",
                        textAlign: "center",
                        backgroundColor: getAchievementColor(cal.achievement_percent),
                        color: "white",
                        fontWeight: "bold",
                      }}>
                        {cal.achievement_percent.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && data.length === 0 && (
        <p style={{ textAlign: "center", color: "#999" }}>No data found.</p>
      )}
    </div>
  );
}
