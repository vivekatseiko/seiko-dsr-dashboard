import { useState, useEffect } from "react";

const formatIndianNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return "0";
  const neg = num < 0;
  const str = Math.abs(Math.round(num)).toString();
  const lastThree = str.substring(str.length - 3);
  const otherNumbers = str.substring(0, str.length - 3);
  let out;
  if (otherNumbers !== "") {
    out = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  } else {
    out = lastThree;
  }
  return neg ? `-${out}` : out;
};

const toLakhs = (num) => {
  if (num === null || num === undefined || isNaN(num)) return "0.00";
  return (num / 100000).toFixed(2);
};

const getAchievementColor = (percent) => {
  if (percent >= 100) return "#10b981";
  if (percent >= 75) return "#f59e0b";
  return "#ef4444";
};

const GRID = "1.8fr 1fr 1fr 1fr 0.85fr 0.8fr 1.2fr 0.9fr 0.8fr";

export default function StorePerformance() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const totals = data.reduce(
    (acc, s) => ({
      target: acc.target + (s.value_target || 0),
      mrp: acc.mrp + (s.mrp_value || 0),
      net: acc.net + (s.value_achieved || 0),
      discount: acc.discount + (s.discount_value || 0),
      qty: acc.qty + (s.total_quantity || 0),
    }),
    { target: 0, mrp: 0, net: 0, discount: 0, qty: 0 }
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
      `}</style>

      <div style={{ maxWidth: "100%", padding: "1.5rem", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
        <h1 style={{
          fontSize: "34px",
          fontWeight: "700",
          marginBottom: "1.5rem",
          color: "#1f2937",
          fontFamily: "'Playfair Display', serif",
          letterSpacing: "-0.5px",
        }}>
          Store Performance
        </h1>

        {/* Filters */}
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "1rem 1.5rem",
          borderRadius: "12px",
          marginBottom: "2rem",
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: "0.5rem 0.75rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "12px",
                backgroundColor: "white",
                color: "#1f2937",
                width: "140px",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: "0.5rem 0.75rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "12px",
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
                marginLeft: "auto",
              }}
            >
              Clear
            </button>
          )}
        </div>

        {error && (
          <div style={{
            padding: "1rem",
            marginBottom: "1rem",
            borderRadius: "8px",
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            border: "1px solid #fca5a5",
            fontSize: "13px",
          }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280", fontSize: "14px" }}>
            Loading...
          </div>
        )}

        {!loading && !startDate && !endDate && (
          <div style={{
            textAlign: "center",
            padding: "3rem 1rem",
            backgroundColor: "#f9fafb",
            borderRadius: "12px",
          }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", color: "#6b7280", marginBottom: "0.5rem" }}>
              Select a date range
            </p>
            <p style={{ fontSize: "13px", color: "#9ca3af" }}>
              Choose start and end dates to view performance
            </p>
          </div>
        )}

        {!loading && data.length > 0 && (
          <div style={{ overflow: "hidden" }}>
            {/* Header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: GRID,
              backgroundColor: "#1f2937",
              color: "white",
              fontWeight: "600",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>
              <div style={{ padding: "0.75rem 0.6rem" }}>Store</div>
              <div style={{ padding: "0.75rem 0.6rem", textAlign: "right" }}>Target</div>
              <div style={{ padding: "0.75rem 0.6rem", textAlign: "right" }}>MRP Value</div>
              <div style={{ padding: "0.75rem 0.6rem", textAlign: "right" }}>Net Value</div>
              <div style={{ padding: "0.75rem 0.6rem", textAlign: "right" }}>Discount</div>
              <div style={{ padding: "0.75rem 0.6rem", textAlign: "center" }}>Disc %</div>
              <div style={{ padding: "0.75rem 0.6rem" }}>Calibres</div>
              <div style={{ padding: "0.75rem 0.6rem", textAlign: "center" }}>Ach %</div>
              <div style={{ padding: "0.75rem 0.6rem", textAlign: "center" }}>Detail</div>
            </div>

            {/* Rows */}
            {data.map((store, idx) => {
              const validCalibres = store.calibre_metrics.filter((c) => c.target > 0);
              const isOpen = expandedStore === store.store_code;

              return (
                <div key={store.store_code}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: GRID,
                    backgroundColor: idx % 2 === 0 ? "#fff" : "#f9fafb",
                    fontSize: "12px",
                    borderBottom: "1px solid #e5e7eb",
                    alignItems: "center",
                  }}>
                    <div style={{ padding: "0.85rem 0.6rem", fontWeight: "600", color: "#111827" }}>
                      {store.store_name}
                    </div>
                    <div style={{ padding: "0.85rem 0.6rem", textAlign: "right", color: "#6b7280" }}>
                      ₹{toLakhs(store.value_target)}L
                    </div>
                    <div style={{ padding: "0.85rem 0.6rem", textAlign: "right", color: "#374151" }}>
                      ₹{toLakhs(store.mrp_value)}L
                    </div>
                    <div style={{ padding: "0.85rem 0.6rem", textAlign: "right", fontWeight: "600", color: "#111827" }}>
                      ₹{toLakhs(store.value_achieved)}L
                    </div>
                    <div style={{ padding: "0.85rem 0.6rem", textAlign: "right", color: "#b45309" }}>
                      ₹{toLakhs(store.discount_value)}L
                    </div>
                    <div style={{ padding: "0.85rem 0.6rem", textAlign: "center", color: "#374151" }}>
                      {store.avg_discount_percent.toFixed(2)}%
                    </div>
                    <div style={{ padding: "0.85rem 0.6rem", color: "#6b7280", fontSize: "11px" }}>
                      {validCalibres.length > 0 ? validCalibres.map((c) => c.name).join(", ") : "—"}
                    </div>
                    <div style={{ padding: "0.4rem 0.3rem", textAlign: "center" }}>
                      <span style={{
                        display: "block",
                        padding: "0.45rem 0.2rem",
                        backgroundColor: getAchievementColor(store.value_achievement_percent),
                        color: "white",
                        fontWeight: "700",
                        borderRadius: "5px",
                        fontSize: "11px",
                      }}>
                        {store.value_achievement_percent.toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ padding: "0.85rem 0.6rem", textAlign: "center" }}>
                      {validCalibres.length > 0 && (
                        <button
                          onClick={() => setExpandedStore(isOpen ? null : store.store_code)}
                          title="Calibre target vs achieved"
                          style={{
                            padding: "0.35rem 0.6rem",
                            backgroundColor: isOpen ? "#3b82f6" : "#e5e7eb",
                            color: isOpen ? "white" : "#374151",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "10px",
                            fontWeight: "600",
                          }}
                        >
                          {isOpen ? "Hide" : "Show"}
                        </button>
                      )}
                    </div>
                  </div>

                  {isOpen && validCalibres.length > 0 && (
                    <div style={{
                      backgroundColor: "#f0f9ff",
                      padding: "1.25rem",
                      borderBottom: "2px solid #bfdbfe",
                    }}>
                      <p style={{
                        fontWeight: "600",
                        marginBottom: "1rem",
                        color: "#1f2937",
                        fontSize: "13px",
                        fontFamily: "'Playfair Display', serif",
                      }}>
                        Calibre Target vs Achieved
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "1rem" }}>
                        {validCalibres.map((cal, i) => (
                          <div key={i} style={{
                            backgroundColor: "white",
                            padding: "1rem",
                            borderRadius: "8px",
                            border: "1px solid #bfdbfe",
                          }}>
                            <p style={{ fontSize: "12px", fontWeight: "700", color: "#1f2937", marginBottom: "0.6rem" }}>
                              {cal.name}
                            </p>
                            <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "0.2rem" }}>
                              Target: <strong style={{ color: "#111827" }}>{cal.target} units</strong>
                            </div>
                            <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "0.6rem" }}>
                              Achieved: <strong style={{ color: "#111827" }}>{cal.achieved} units</strong>
                            </div>
                            <div style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              color: "white",
                              backgroundColor: getAchievementColor(cal.achievement_percent),
                              padding: "0.4rem",
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
              );
            })}

            {/* Totals */}
            <div style={{
              display: "grid",
              gridTemplateColumns: GRID,
              backgroundColor: "#111827",
              color: "white",
              fontSize: "12px",
              fontWeight: "700",
              alignItems: "center",
            }}>
              <div style={{ padding: "0.85rem 0.6rem" }}>TOTAL ({data.length})</div>
              <div style={{ padding: "0.85rem 0.6rem", textAlign: "right" }}>₹{toLakhs(totals.target)}L</div>
              <div style={{ padding: "0.85rem 0.6rem", textAlign: "right" }}>₹{toLakhs(totals.mrp)}L</div>
              <div style={{ padding: "0.85rem 0.6rem", textAlign: "right" }}>₹{toLakhs(totals.net)}L</div>
              <div style={{ padding: "0.85rem 0.6rem", textAlign: "right", color: "#fbbf24" }}>₹{toLakhs(totals.discount)}L</div>
              <div style={{ padding: "0.85rem 0.6rem", textAlign: "center" }}>
                {totals.mrp > 0 ? ((totals.discount / totals.mrp) * 100).toFixed(2) : "0.00"}%
              </div>
              <div style={{ padding: "0.85rem 0.6rem", fontSize: "11px", fontWeight: "500", color: "#9ca3af" }}>
                {totals.qty} units
              </div>
              <div style={{ padding: "0.85rem 0.6rem", textAlign: "center" }}>
                {totals.target > 0 ? ((totals.net / totals.target) * 100).toFixed(1) : "0.0"}%
              </div>
              <div />
            </div>

            {/* Reconciliation check */}
            <div style={{
              marginTop: "0.75rem",
              padding: "0.6rem 0.9rem",
              backgroundColor: "#f9fafb",
              borderRadius: "6px",
              fontSize: "11px",
              color: "#6b7280",
            }}>
              Check: MRP ₹{formatIndianNumber(totals.mrp)} − Net ₹{formatIndianNumber(totals.net)} = ₹{formatIndianNumber(totals.mrp - totals.net)}
              {Math.abs((totals.mrp - totals.net) - totals.discount) > 1 && (
                <span style={{ color: "#dc2626", fontWeight: "600" }}>
                  {" "}⚠ does not match stored discount ₹{formatIndianNumber(totals.discount)}
                </span>
              )}
            </div>
          </div>
        )}

        {!loading && data.length === 0 && startDate && endDate && (
          <div style={{
            textAlign: "center",
            padding: "2rem",
            color: "#9ca3af",
            fontSize: "14px",
            backgroundColor: "#f9fafb",
            borderRadius: "12px",
          }}>
            No data for this range.
          </div>
        )}
      </div>
    </>
  );
}
