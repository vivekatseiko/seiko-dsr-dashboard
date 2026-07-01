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
    if (startDate && endDate) {
      fetchData();
    }
  }, [startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.append("startDate", startDate);
      params.append("endDate", endDate);

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
    setStartDate("");
    setEndDate("");
    setData([]);
  };

  return (
    <div className={styles.container} style={{ maxWidth: "100%", padding: "1.5rem" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "1.5rem", color: "#1f2937" }}>
        🏪 Store Performance
      </h1>

      {/* Compact Filter Section */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "1rem 1.5rem",
        borderRadius: "12px",
        marginBottom: "2rem",
        display: "flex",
        gap: "1rem",
        alignItems: "center",
        flexWrap: "wrap",
        maxWidth: "100%",
      }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <label style={{ fontSize: "12px", fontWeight: "600", color: "white", whiteSpace: "nowrap" }}>
            From
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "12px",
              fontFamily: "inherit",
              backgroundColor: "white",
              color: "#1f2937",
              width: "140px",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <label style={{ fontSize: "12px", fontWeight: "600", color: "white", whiteSpace: "nowrap" }}>
            To
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "12px",
              fontFamily: "inherit",
              backgroundColor: "white",
              color: "#1f2937",
              width: "140px",
            }}
          />
        </div>

        {startDate && endDate && (
          <button
            onClick={handleResetFilters}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "rgba(255,255,255,0.2)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
              fontFamily: "inherit",
              transition: "all 0.2s",
              marginLeft: "auto",
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = "rgba(255,255,255,0.3)"}
            onMouseOut={(e) => e.target.style.backgroundColor = "rgba(255,255,255,0.2)"}
          >
            Clear Filters
          </button>
        )}
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
      {loading && startDate && endDate && (
        <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280", fontSize: "14px", fontFamily: "inherit" }}>
          ⏳ Loading store performance data...
        </div>
      )}

      {/* Empty State */}
      {!loading && startDate === "" && endDate === "" && (
        <div style={{
          textAlign: "center",
          padding: "3rem 1rem",
          color: "#9ca3af",
          fontSize: "14px",
          fontFamily: "inherit",
          backgroundColor: "#f9fafb",
          borderRadius: "12px",
        }}>
          📅 Select start and end dates to view store performance
        </div>
      )}

      {/* Data Table */}
      {!loading && data.length > 0 && startDate && endDate && (
        <div style={{ overflowX: "auto", maxWidth: "100%", WebkitOverflowScrolling: "touch" }}>
          {/* Header Row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "2.5fr 1.1fr 1.1fr 0.9fr 1.3fr 1fr 1fr 1fr",
            gap: "0px",
            backgroundColor: "#1f2937",
            color: "white",
            fontWeight: "600",
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            fontFamily: "inherit",
            minWidth: "100%",
          }}>
            <div style={{ padding: "0.75rem 1rem" }}>Store</div>
            <div style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Target</div>
            <div style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Achieved</div>
            <div style={{ padding: "0.75rem 1rem", textAlign: "center" }}>Ach %</div>
            <div style={{ padding: "0.75rem 1rem" }}>Calibre Performance</div>
            <div style={{ padding: "0.75rem 1rem", textAlign: "center" }}>Discount %</div>
            <div style={{ padding: "0.75rem 1rem", textAlign: "center" }}>Warranty %</div>
            <div style={{ padding: "0.75rem 1rem", textAlign: "center" }}> </div>
          </div>

          {/* Store Rows */}
          {data.map((store, idx) => {
            const validCalibreMetrics = store.calibre_metrics.filter(c => c.target > 0);

            return (
              <div key={store.store_code}>
                {/* Main Row */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "2.5fr 1.1fr 1.1fr 0.9fr 1.3fr 1fr 1fr 1fr",
                  gap: "0px",
                  backgroundColor: idx % 2 === 0 ? "#fff" : "#f9fafb",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  borderBottom: "1px solid #e5e7eb",
                  transition: "background-color 0.2s",
                  minWidth: "100%",
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "#fff" : "#f9fafb"}
                >
                  <div style={{ padding: "1rem", fontWeight: "600", color: "#111827" }}>
                    {store.store_name}
                  </div>
                  <div style={{ padding: "1rem", textAlign: "right", color: "#374151" }}>
                    ₹{formatIndianNumber(store.value_target)}
                  </div>
                  <div style={{ padding: "1rem", textAlign: "right", color: "#374151" }}>
                    ₹{(store.value_achieved / 100000).toFixed(2)}L
                  </div>
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
                    {validCalibreMetrics.length > 0 ? validCalibreMetrics.map(c => c.name).join(", ") : "—"}
                  </div>
                  <div style={{ padding: "1rem", textAlign: "center", color: "#374151" }}>
                    {store.avg_discount_percent.toFixed(2)}%
                  </div>
                  <div style={{ padding: "1rem", textAlign: "center", color: "#374151" }}>
                    {store.warranty_percent.toFixed(2)}%
                  </div>
                  <div style={{ padding: "1rem", textAlign: "center" }}>
                    {validCalibreMetrics.length > 0 && (
                      <button
                        onClick={() => setExpandedStore(expandedStore === store.store_code ? null : store.store_code)}
                        style={{
                          padding: "0.4rem 0.7rem",
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
                        {expandedStore === store.store_code ? "Hide" : "Show"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Calibre Breakdown - Expandable */}
                {expandedStore === store.store_code && validCalibreMetrics.length > 0 && (
                  <div style={{
                    backgroundColor: "#f0f9ff",
                    padding: "1.5rem",
                    borderBottom: "2px solid #bfdbfe",
                    fontFamily: "inherit",
                    gridColumn: "1 / -1",
                  }}>
                    <p style={{ fontWeight: "600", marginBottom: "1rem", color: "#1f2937", fontSize: "12px" }}>
                      Calibre Achievements
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                      {validCalibreMetrics.map((cal, cidx) => (
                        <div key={cidx} style={{
                          backgroundColor: "white",
                          padding: "1rem",
                          borderRadius: "8px",
                          border: "1px solid #bfdbfe",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                        }}>
                          <p style={{ fontSize: "12px", fontWeight: "700", color: "#1f2937", marginBottom: "0.75rem" }}>
                            {cal.name}
                          </p>
                          <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "0.25rem" }}>
                            Target: <span style={{ fontWeight: "600", color: "#111827" }}>{cal.target} units</span>
                          </div>
                          <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "0.75rem" }}>
                            Achieved: <span style={{ fontWeight: "600", color: "#111827" }}>{cal.achieved} units</span>
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
                            {cal.achievement_percent.toFixed(1)}% Achieved
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && data.length === 0 && startDate && endDate && (
        <div style={{
          textAlign: "center",
          padding: "2rem",
          color: "#9ca3af",
          fontSize: "14px",
          fontFamily: "inherit",
          backgroundColor: "#f9fafb",
          borderRadius: "12px",
        }}>
          No data found for selected dates.
        </div>
      )}
    </div>
  );
}
