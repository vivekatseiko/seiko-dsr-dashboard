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

const formatYAxisValue = (value) => {
  if (value >= 10000000) {
    return (value / 10000000).toFixed(0) + "Cr";
  } else if (value >= 100000) {
    return (value / 100000).toFixed(1) + "L";
  } else if (value >= 1000) {
    return (value / 1000).toFixed(0) + "K";
  }
  return Math.round(value).toString();
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr + "T00:00:00");
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  return `${day} ${month}`;
};

export default function Analytics() {
  const [selectedTab, setSelectedTab] = useState("family");
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [city, setCity] = useState("all");
  const [region, setRegion] = useState("all");
  const [storeCode, setStoreCode] = useState("all");
  const [family, setFamily] = useState("all");
  const [calibre, setCallibre] = useState("all");

  const [cities, setCities] = useState([]);
  const [regions, setRegions] = useState([]);
  const [stores, setStores] = useState([]);
  const [families, setFamilies] = useState([]);
  const [calibres, setCalibres] = useState([]);

  const [familyData, setFamilyData] = useState(null);
  const [regionalData, setRegionalData] = useState(null);
  const [discountData, setDiscountData] = useState(null);
  const [targetData, setTargetData] = useState(null);
  const [warrantyData, setWarrantyData] = useState(null);
  const [calibreData, setCalibreData] = useState(null);

  const [Recharts, setRecharts] = useState(null);

  useEffect(() => {
    import("recharts").then((module) => {
      setRecharts(module);
    });
  }, []);

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate, city, region, storeCode, family, calibre, selectedTab]);

  const fetchAnalytics = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.append("startDate", startDate);
      params.append("endDate", endDate);
      if (city !== "all") params.append("city", city);
      if (region !== "all") params.append("region", region);
      if (storeCode !== "all") params.append("storeCode", storeCode);
      if (family !== "all") params.append("family", family);
      if (calibre !== "all") params.append("calibre", calibre);
      params.append("metric", selectedTab);

      const response = await fetch(`/api/analytics?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to fetch analytics");
      } else {
        if (selectedTab === "family") setFamilyData(result);
        if (selectedTab === "regional") setRegionalData(result);
        if (selectedTab === "discount") setDiscountData(result);
        if (selectedTab === "target") setTargetData(result);
        if (selectedTab === "warranty") setWarrantyData(result);
        if (selectedTab === "calibre") setCalibreData(result);

        // Extract filter options from results
        extractFilterOptions(result);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const extractFilterOptions = (data) => {
    // This would typically come from a separate API call
    // For now, we'll keep the filters basic
  };

  const handleResetFilters = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
    setCity("all");
    setRegion("all");
    setStoreCode("all");
    setFamily("all");
    setCallibre("all");
    setSelectedMetric("revenue");
  };

  return (
    <div className={styles.container}>
      <h1>📈 Analytics Dashboard</h1>

      {/* Filters */}
      <div
        style={{
          backgroundColor: "#f5f5f5",
          padding: "1.5rem",
          borderRadius: "8px",
          marginBottom: "2rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
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
          </select>
        </div>

        <div>
          <label>Region:</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="all">All Regions</option>
          </select>
        </div>

        <div>
          <label>Store:</label>
          <select value={storeCode} onChange={(e) => setStoreCode(e.target.value)}>
            <option value="all">All Stores</option>
          </select>
        </div>

        <div>
          <label>Family:</label>
          <select value={family} onChange={(e) => setFamily(e.target.value)}>
            <option value="all">All Families</option>
          </select>
        </div>

        <div>
          <label>Calibre:</label>
          <select value={calibre} onChange={(e) => setCallibre(e.target.value)}>
            <option value="all">All Calibres</option>
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
            Reset
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "2rem",
          borderBottom: "2px solid #ddd",
          overflowX: "auto",
        }}
      >
        {[
          { key: "family", label: "👨‍👩‍👧 Family Performance" },
          { key: "regional", label: "🌍 Regional Performance" },
          { key: "discount", label: "💰 Discount % Ranking" },
          { key: "target", label: "🎯 Target vs Achievement" },
          { key: "warranty", label: "🛡️ Warranty Uptake" },
          { key: "calibre", label: "⌚ Calibre Saliency" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setSelectedTab(tab.key);
              setSelectedMetric("revenue");
            }}
            style={{
              padding: "10px 15px",
              backgroundColor: selectedTab === tab.key ? "#2196F3" : "transparent",
              color: selectedTab === tab.key ? "white" : "#333",
              border: "none",
              cursor: "pointer",
              fontWeight: selectedTab === tab.key ? "bold" : "normal",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
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
      {loading && <p>Loading analytics...</p>}

      {/* TAB 1: Family Performance */}
      {selectedTab === "family" && !loading && familyData && (
        <div>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ fontWeight: "bold", marginRight: "1rem" }}>Metric:</label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
            >
              <option value="revenue">Revenue</option>
              <option value="units">Units</option>
            </select>
          </div>

          {familyData.charts && familyData.charts.length > 0 ? (
            <div>
              {familyData.charts.map((chart, idx) => (
                <div key={idx} style={{ marginBottom: "2rem", overflowX: "auto" }}>
                  <h3>{chart.family}</h3>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "1rem",
                    marginBottom: "1rem",
                  }}>
                    <div style={{
                      backgroundColor: "#f0f0f0",
                      padding: "1rem",
                      borderRadius: "4px",
                    }}>
                      <p style={{ margin: 0, fontSize: "12px", color: "#999" }}>Current {selectedMetric === "revenue" ? "Revenue" : "Units"}</p>
                      <p style={{ margin: "0.5rem 0 0 0", fontSize: "18px", fontWeight: "bold" }}>
                        {selectedMetric === "revenue"
                          ? `₹${(chart.currentRevenue / 100000).toFixed(2)}L`
                          : formatIndianNumber(chart.currentUnits)}
                      </p>
                    </div>

                    <div style={{
                      backgroundColor: "#f0f0f0",
                      padding: "1rem",
                      borderRadius: "4px",
                    }}>
                      <p style={{ margin: 0, fontSize: "12px", color: "#999" }}>Previous {selectedMetric === "revenue" ? "Revenue" : "Units"}</p>
                      <p style={{ margin: "0.5rem 0 0 0", fontSize: "18px", fontWeight: "bold" }}>
                        {selectedMetric === "revenue"
                          ? `₹${(chart.prevRevenue / 100000).toFixed(2)}L`
                          : formatIndianNumber(chart.prevUnits)}
                      </p>
                    </div>

                    <div style={{
                      backgroundColor: chart[selectedMetric === "revenue" ? "revenueGrowth" : "unitsGrowth"] >= 0 ? "#dcfce7" : "#fee2e2",
                      padding: "1rem",
                      borderRadius: "4px",
                    }}>
                      <p style={{ margin: 0, fontSize: "12px", color: "#999" }}>Growth %</p>
                      <p style={{
                        margin: "0.5rem 0 0 0",
                        fontSize: "18px",
                        fontWeight: "bold",
                        color: chart[selectedMetric === "revenue" ? "revenueGrowth" : "unitsGrowth"] >= 0 ? "#166534" : "#991b1b",
                      }}>
                        {(chart[selectedMetric === "revenue" ? "revenueGrowth" : "unitsGrowth"]).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {Recharts && (
                    <Recharts.ComposedChart
                      width={1200}
                      height={350}
                      data={selectedMetric === "revenue" ? chart.currentTrendData : chart.currentTrendData}
                      margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
                    >
                      <Recharts.CartesianGrid strokeDasharray="3 3" />
                      <Recharts.XAxis
                        dataKey="formattedDate"
                        interval={Math.max(0, Math.ceil(chart.currentTrendData.length / 10) - 1)}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <Recharts.YAxis tickFormatter={formatYAxisValue} />
                      <Recharts.Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div style={{
                                backgroundColor: "#fff",
                                padding: "10px",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                                fontSize: "12px",
                              }}>
                                <p style={{ margin: 0 }}>📅 {d.date}</p>
                                <p style={{ margin: 0 }}>
                                  {selectedMetric === "revenue" 
                                    ? `💰 ₹${(d.revenue / 100000).toFixed(2)}L` 
                                    : `📦 ${formatIndianNumber(d.units)}`}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Recharts.Legend />
                      <Recharts.Line
                        type="monotone"
                        dataKey={selectedMetric === "revenue" ? "revenue" : "units"}
                        stroke="#1f77b4"
                        name={selectedMetric === "revenue" ? "Current Revenue" : "Current Units"}
                        connectNulls={false}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          if (!payload) return null;
                          if (payload.isWeekend) {
                            return <circle cx={cx} cy={cy} r={5} fill="#1f77b4" opacity={0.9} strokeWidth={2} stroke="#1f77b4" />;
                          }
                          return <circle cx={cx} cy={cy} r={2.5} fill="#1f77b4" />;
                        }}
                      />
                    </Recharts.ComposedChart>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#999" }}>No data available for selected filters.</p>
          )}
        </div>
      )}

      {/* TAB 2: Regional Performance */}
      {selectedTab === "regional" && !loading && regionalData && (
        <div>
          {regionalData.regionalData && regionalData.regionalData.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                  border: "1px solid #ddd",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f0f0f0" }}>
                    <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Region</th>
                    <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Store Count</th>
                    <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>Total Revenue</th>
                    <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>Avg Revenue/Store</th>
                    <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Total Units</th>
                    <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Avg Units/Store</th>
                    <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Avg Discount %</th>
                  </tr>
                </thead>
                <tbody>
                  {regionalData.regionalData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #ddd" }}>
                      <td style={{ padding: "10px", border: "1px solid #ddd", fontWeight: "bold" }}>{row.region}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{row.storeCount}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>
                        ₹{(row.totalRevenue / 100000).toFixed(2)}L
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>
                        ₹{(row.avgRevenuePerStore / 100000).toFixed(2)}L
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
                        {formatIndianNumber(row.totalUnits)}
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
                        {formatIndianNumber(Math.round(row.avgUnitsPerStore))}
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
                        {row.avgDiscountPercent.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "#999" }}>No regional data available.</p>
          )}
        </div>
      )}

      {/* TAB 3: Discount % Ranking */}
      {selectedTab === "discount" && !loading && discountData && (
        <div>
          {discountData.rankingData && discountData.rankingData.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                  border: "1px solid #ddd",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f0f0f0" }}>
                    <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Rank</th>
                    <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Store</th>
                    <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Avg Discount %</th>
                  </tr>
                </thead>
                <tbody>
                  {discountData.rankingData.map((row, idx) => (
                    <tr key={idx} style={{
                      borderBottom: "1px solid #ddd",
                      backgroundColor: row.avgDiscountPercent > 15 ? "#fee2e2" : row.avgDiscountPercent > 10 ? "#fff3e0" : "#dcfce7",
                    }}>
                      <td style={{ padding: "10px", border: "1px solid #ddd", fontWeight: "bold" }}>{idx + 1}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>{row.storeName}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center", fontWeight: "bold" }}>
                        {row.avgDiscountPercent.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "#999" }}>No discount data available.</p>
          )}
        </div>
      )}

      {/* TAB 4: Target vs Achievement */}
      {selectedTab === "target" && !loading && targetData && (
        <div>
          {targetData.targetAchievementData && targetData.targetAchievementData.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                  border: "1px solid #ddd",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f0f0f0" }}>
                    <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Store</th>
                    <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>Target</th>
                    <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>Achieved</th>
                    <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Achievement %</th>
                  </tr>
                </thead>
                <tbody>
                  {targetData.targetAchievementData.map((row, idx) => {
                    const achievementPercent = row.achievementPercent;
                    const bgColor = achievementPercent >= 100 ? "#dcfce7" : achievementPercent >= 75 ? "#fff3e0" : "#fee2e2";
                    const textColor = achievementPercent >= 100 ? "#166534" : achievementPercent >= 75 ? "#b45309" : "#991b1b";

                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid #ddd" }}>
                        <td style={{ padding: "10px", border: "1px solid #ddd", fontWeight: "bold" }}>{row.storeName}</td>
                        <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>
                          ₹{(row.target / 100000).toFixed(2)}L
                        </td>
                        <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>
                          ₹{(row.achieved / 100000).toFixed(2)}L
                        </td>
                        <td
                          style={{
                            padding: "10px",
                            border: "1px solid #ddd",
                            textAlign: "center",
                            backgroundColor: bgColor,
                            color: textColor,
                            fontWeight: "bold",
                            borderRadius: "3px",
                          }}
                        >
                          {achievementPercent.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "#999" }}>No target data available.</p>
          )}
        </div>
      )}

      {/* TAB 5: Warranty Uptake */}
      {selectedTab === "warranty" && !loading && warrantyData && (
        <div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}>
            <div style={{
              backgroundColor: "#f0f0f0",
              padding: "1rem",
              borderRadius: "4px",
            }}>
              <p style={{ margin: 0, fontSize: "12px", color: "#999" }}>Current Period Warranty %</p>
              <p style={{ margin: "0.5rem 0 0 0", fontSize: "22px", fontWeight: "bold" }}>
                {warrantyData.currentPercent.toFixed(2)}%
              </p>
            </div>

            <div style={{
              backgroundColor: "#f0f0f0",
              padding: "1rem",
              borderRadius: "4px",
            }}>
              <p style={{ margin: 0, fontSize: "12px", color: "#999" }}>Previous Period Warranty %</p>
              <p style={{ margin: "0.5rem 0 0 0", fontSize: "22px", fontWeight: "bold" }}>
                {warrantyData.prevPercent.toFixed(2)}%
              </p>
            </div>

            <div style={{
              backgroundColor: warrantyData.growth >= 0 ? "#dcfce7" : "#fee2e2",
              padding: "1rem",
              borderRadius: "4px",
            }}>
              <p style={{ margin: 0, fontSize: "12px", color: "#999" }}>Change in %</p>
              <p style={{
                margin: "0.5rem 0 0 0",
                fontSize: "22px",
                fontWeight: "bold",
                color: warrantyData.growth >= 0 ? "#166534" : "#991b1b",
              }}>
                {warrantyData.growth.toFixed(2)}%
              </p>
            </div>
          </div>

          {Recharts && warrantyData.currentTrendData && (
            <Recharts.ComposedChart
              width={1200}
              height={350}
              data={warrantyData.currentTrendData}
              margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
            >
              <Recharts.CartesianGrid strokeDasharray="3 3" />
              <Recharts.XAxis
                dataKey="formattedDate"
                interval={Math.max(0, Math.ceil(warrantyData.currentTrendData.length / 10) - 1)}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <Recharts.YAxis domain={[0, 100]} label={{ value: "Warranty %", angle: -90, position: "insideLeft" }} />
              <Recharts.Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div style={{
                        backgroundColor: "#fff",
                        padding: "10px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}>
                        <p style={{ margin: 0 }}>📅 {d.date}</p>
                        <p style={{ margin: 0 }}>📊 {d.warranty}/{d.total} transactions</p>
                        <p style={{ margin: 0 }}>🛡️ {d.warrantyPercent.toFixed(2)}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Recharts.Legend />
              <Recharts.Line
                type="monotone"
                dataKey="warrantyPercent"
                stroke="#4CAF50"
                name="Current Warranty %"
                connectNulls={false}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (!payload) return null;
                  if (payload.isWeekend) {
                    return <circle cx={cx} cy={cy} r={5} fill="#4CAF50" opacity={0.9} strokeWidth={2} stroke="#4CAF50" />;
                  }
                  return <circle cx={cx} cy={cy} r={2.5} fill="#4CAF50" />;
                }}
              />
            </Recharts.ComposedChart>
          )}
        </div>
      )}

      {/* TAB 6: Calibre Saliency */}
      {selectedTab === "calibre" && !loading && calibreData && (
        <div>
          {calibreData.calibreData && calibreData.calibreData.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                  border: "1px solid #ddd",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f0f0f0" }}>
                    <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Rank</th>
                    <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Calibre</th>
                    <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Total Units</th>
                    <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {calibreData.calibreData.map((row) => (
                    <tr key={row.rank} style={{ borderBottom: "1px solid #ddd" }}>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center", fontWeight: "bold" }}>
                        #{row.rank}
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>{row.calibre}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
                        {formatIndianNumber(row.totalUnits)}
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>
                        ₹{(row.totalRevenue / 100000).toFixed(2)}L
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "#999" }}>No calibre data available.</p>
          )}
        </div>
      )}
    </div>
  );
}
