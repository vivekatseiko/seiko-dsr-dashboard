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
  if (percent >= 100) return "#10b981";
  if (percent >= 75) return "#f59e0b";
  return "#ef4444";
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
      <h1 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "2rem", color: "#1f2937" }}>
        🏪 Store-wise Performance
      </h1>

      {/* Filters Section */}
      <div style={{
        backgroundColor: "#f3f4f6",
        padding: "1.5rem",
        borderRadius: "12px",
        marginBottom: "2rem",
        display: "flex",
        gap: "1rem",
        alignItems: "flex-end",
        flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: "150px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "0.5rem" }}>
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "13px",
              fontFamily: "inherit",
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: "150px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "0.5rem" }}>
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "13px",
              fontFamily: "inherit",
            }}
          />
        </div>
        <button
          onClick={handleResetFilters}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#6366f1",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "600",
            fontFamily: "inherit",
            transition: "background-color 0.3s",
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = "#4f46e5"}
          onMouseOut={(e) => e.target.style.backgroundColor = "#6366f1"}
        >
          Reset Filters
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: "1rem",
          marginBottom: "1rem",
          borderRadius: "8px",
          backgroundColor: "#fee2e2",
          color: "#991b1b",
          border: "1px solid #fca5a5",
          fontSize: "13px",
          fontFamily: "inherit",
        }}>
          ❌ {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280", fontSize: "14px", fontFamily: "inherit" }}>
          Loading store performance data...
        </div>
      )}

      {/* Data Table */}
      {!loading && data.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          {/* Header Row - Once at Top */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.2fr 1.2fr 0.9fr 1.5fr 1fr 1fr 0.6fr",
            gap: "0px",
            backgroundColor: "#1f2937",
            color: "white",
            fontWeight: "600",
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            fontFamily: "inherit",
          }}>
            <div style={{ padding: "1rem" }}>Store Name</div>
            <div style={{ padding: "1rem", textAlign: "right" }}>Value Target</div>
            <div style={{ padding: "1rem", textAlign: "right" }}>Value Achieved</div>
            <div style={{ padding: "1rem", textAlign: "center" }}>Ach %</div>
            <div style={{ padding: "1rem" }}>Calibres</div>
            <div style={{ padding: "1rem", textAlign: "center" }}>Disc %</div>
            <div style={{ padding: "1rem", textAlign: "center" }}>Warranty %</div>
            <div style={{ padding: "1rem", textAlign: "center" }}>Details</div>
          </div>

          {/* Store Rows */}
          {data.map((store, idx) => (
            <div key={store.store_code}>
              {/* Main Row */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.2fr 1.2fr 0.9fr 1.5fr 1fr 1fr 0.6fr",
                gap: "0px",
                backgroundColor: idx % 2 === 0 ? "#fff" : "#f9fafb",
                fontSize: "13px",
                fontFamily: "inherit",
                borderBottom: "1px solid #e5e7eb",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "#fff" : "#f9fafb"}
              >
                <div style={{ padding: "1rem", fontWeight: "600", color: "#111827" }}>{store.store_name}</div>
                <div style={{ padding: "1rem", textAlign: "right", color: "#374151" }}>₹{formatIndianNumber(store.value_target)}</div>
                <div style={{ padding: "1rem", textAlign: "right", color: "#374151" }}>₹{(store.value_achieved / 100000).toFixed(2)}L</div>
                <div style={{
                  padding: "1rem",
                  textAlign: "center",
                  backgroundColor: getAchievementColor(store.value_achievement_percent),
                  color: "white",
                  fontWeight: "700",
                  borderRadius: "6px",
                  margin: "0.25rem",
                }}>
                  {store.value_achievement_percent.toFixed(1)}%
                </div>
                <div style={{ padding: "1rem", color: "#374151", fontSize: "12px" }}>
                  {store.calibre_metrics.length > 0 ? store.calibre_metrics.map(c => c.name).join(", ") : "—"}
                </div>
                <div style={{ padding: "1rem", textAlign: "center", color: "#374151" }}>{store.avg_discount_percent.toFixed(2)}%</div>
                <div style={{ padding: "1rem", textAlign: "center", color: "#374151" }}>{store.warranty_percent.toFixed(2)}%</div>
                <div style={{ padding: "1rem", textAlign: "center" }}>
                  <button
                    onClick={() => setExpandedStore(expandedStore === store.store_code ? null : store.store_code)}
                    style={{
                      padding: "0.5rem 0.75rem",
                      backgroundColor: expandedStore === store.store_code ? "#3b82f6" : "#e5e7eb",
                      color: expandedStore === store.store_code ? "white" : "#374151",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "600",
                      fontFamily: "inherit",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => {
                      if (expandedStore !== store.store_code) {
                        e.target.style.backgroundColor = "#d1d5db";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (expandedStore !== store.store_code) {
                        e.target.style.backgroundColor = "#e5e7eb";
                      }
                    }}
                  >
                    {expandedStore === store.store_code ? "▲" : "▼"}
                  </button>
                </div>
              </div>

              {/* Calibre Breakdown - Expandable */}
              {expandedStore === store.store_code && store.calibre_metrics.length > 0 && (
                <div style={{
                  backgroundColor: "#f0f9ff",
                  padding: "1.5rem",
                  borderBottom: "2px solid #e5e7eb",
                  fontFamily: "inherit",
                }}>
                  <p style={{ fontWeight: "600", marginBottom: "1rem", color: "#1f2937", fontSize: "13px" }}>
                    Calibre-wise Breakdown
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem" }}>
                    {store.calibre_metrics.map((cal, cidx) => (
                      <div key={cidx} style={{
                        backgroundColor: "white",
                        padding: "1rem",
                        borderRadius: "8px",
                        border: "1px solid #dbeafe",
                      }}>
                        <p style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "0.5rem" }}>
                          {cal.name}
                        </p>
                        <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "0.25rem" }}>
                          Target: <span style={{ fontWeight: "600", color: "#111827" }}>{cal.target}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "0.5rem" }}>
                          Achieved: <span style={{ fontWeight: "600", color: "#111827" }}>{cal.achieved}</span>
                        </div>
                        <div style={{
                          fontSize: "12px",
                          fontWeight: "700",
                          color: "white",
                          backgroundColor: getAchievementColor(cal.achievement_percent),
                          padding: "0.5rem",
                          borderRadius: "4px",
                          textAlign: "center",
                        }}>
                          {cal.achievement_percent.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && data.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "2rem",
          color: "#9ca3af",
          fontSize: "14px",
          fontFamily: "inherit",
        }}>
          No data found for selected dates.
        </div>
      )}
    </div>
  );
}
