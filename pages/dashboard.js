import { useState, useEffect } from "react";
import styles from "../styles/Dashboard.module.css";

const STORE_COLORS = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
  "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5",
  "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5",
  "#393b79", "#637939", "#8c6d31", "#843c39", "#7b4173", "#5254a3",
];

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
    return (value / 10000000).toFixed(1) + "Cr";
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

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [city, setCity] = useState("all");
  const [region, setRegion] = useState("all");
  const [storeCode, setStoreCode] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [Recharts, setRecharts] = useState(null);

  useEffect(() => {
    import("recharts").then((module) => {
      setRecharts(module);
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [city, region, storeCode, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (storeCode !== "all") params.append("storeCode", storeCode);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (city !== "all") params.append("city", city);
      if (region !== "all") params.append("region", region);

      const response = await fetch(`/api/dashboard?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to fetch data");
        setData(null);
      } else {
        setData(result);
      }
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setCity("all");
    setRegion("all");
    setStoreCode("all");
    setStartDate("");
    setEndDate("");
  };

  if (!data) {
    return (
      <div className={styles.container}>
        <h1>📊 Summary (MTD)</h1>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>❌ {error}</p>}
      </div>
    );
  }

  // ---- Build ONE combined dataset: a row per date, a column per store (daily MRP) ----
  const storeList = [];
  const dateMap = {};

  if (data.dailyTrend) {
    for (const record of data.dailyTrend) {
      const store = record.store_code;
      if (store === "UNKNOWN") continue;
      if (!storeList.includes(store)) storeList.push(store);

      if (!dateMap[record.date]) {
        const isWeekend = record.dayOfWeek === 0 || record.dayOfWeek === 6;
        dateMap[record.date] = {
          date: record.date,
          formattedDate: formatDate(record.date),
          isWeekend,
          dayOfWeek: record.dayOfWeek,
          weekendBand: isWeekend ? 1 : 0,
        };
      }
      dateMap[record.date][store] = record.mrp || 0;
      dateMap[record.date][`${store}__net`] = record.sales || 0;
      dateMap[record.date][`${store}__qty`] = record.quantity || 0;
    }
  }

  storeList.sort();
  const combinedData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

  // Y axis: max across every store's daily MRP, plus reference lines when shown
  const showRefLines = storeList.length >= 1;
  const allValues = [];
  for (const row of combinedData) {
    for (const s of storeList) {
      allValues.push(row[s] || 0);
    }
  }
  if (showRefLines) {
    if (data.historicalWeekdayAvg !== null) allValues.push(data.historicalWeekdayAvg);
    if (data.historicalWeekendAvg !== null) allValues.push(data.historicalWeekendAvg);
  }
  const maxY = Math.max(...allValues, 1) * 1.15;

  return (
    <div className={styles.container}>
      <h1>📊 Summary (MTD)</h1>

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
          <label>City:</label>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="all">All Cities</option>
            {data.cities && data.cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Region:</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="all">All Regions</option>
            {data.regions && data.regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Store:</label>
          <select value={storeCode} onChange={(e) => setStoreCode(e.target.value)}>
            <option value="all">All Stores</option>
            {data.stores && data.stores.map((s) => (
              <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>

        <div>
          <label>Start Date:</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        <div>
          <label>End Date:</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <p className={styles.label}>Total Sales</p>
          <p className={styles.value}>₹{formatIndianNumber(Math.round(data.totalSales / 100000))}L</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.label}>Units Sold</p>
          <p className={styles.value}>{formatIndianNumber(data.totalQuantity)}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.label}>Total Discount</p>
          <p className={styles.value}>₹{formatIndianNumber(Math.round(data.totalDiscounts / 100000))}L</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.label}>Avg Discount %</p>
          <p className={styles.value}>{data.averageDiscount.toFixed(2)}%</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.label}>ASP</p>
          <p className={styles.value}>₹{formatIndianNumber(data.asp)}</p>
        </div>
      </div>

      {/* Previous Period Averages */}
      {(data.historicalWeekdayAvg !== null || data.historicalWeekendAvg !== null) && (
        <div style={{
          marginTop: "2rem",
          padding: "1rem",
          backgroundColor: "#f0f0f0",
          borderRadius: "8px",
        }}>
          <p style={{ margin: "0 0 0.75rem 0", fontSize: "12px", color: "#666" }}>
            📊 Previous period comparison ({data.historicalPeriod?.start} to {data.historicalPeriod?.end}) — average daily MRP per store, over days with sales
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            {data.historicalWeekdayAvg !== null && (
              <div>
                <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>Prev. Period Weekday Avg</p>
                <p style={{ margin: 0, fontSize: "1.2rem" }}>₹{(data.historicalWeekdayAvg / 100000).toFixed(2)}L / day</p>
              </div>
            )}
            {data.historicalWeekendAvg !== null && (
              <div>
                <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>Prev. Period Weekend Avg</p>
                <p style={{ margin: 0, fontSize: "1.2rem" }}>₹{(data.historicalWeekendAvg / 100000).toFixed(2)}L / day</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Combined Chart */}
      {Recharts && combinedData.length > 0 && storeList.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Daily Sales Trend — MRP Value ({storeList.length} store{storeList.length > 1 ? "s" : ""})</h2>

          <div style={{ overflowX: "auto" }}>
            <Recharts.ComposedChart
              width={1200}
              height={450}
              data={combinedData}
              margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
              barCategoryGap={0}
              barGap={0}
            >
              <Recharts.CartesianGrid strokeDasharray="3 3" />
              <Recharts.XAxis
                dataKey="formattedDate"
                interval={Math.max(0, Math.ceil(combinedData.length / 12) - 1)}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <Recharts.YAxis
                yAxisId="sales"
                tickFormatter={formatYAxisValue}
                domain={[0, maxY]}
                allowDataOverflow={false}
              />
              <Recharts.YAxis yAxisId="band" hide domain={[0, 1]} />
              <Recharts.Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const row = payload[0].payload;
                    const dayType = row.isWeekend ? "Weekend 🌅" : "Weekday 📅";
                    return (
                      <div style={{
                        backgroundColor: "#fff",
                        padding: "10px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}>
                        <p style={{ margin: 0, fontWeight: "bold" }}>📅 {row.date} — {dayType}</p>
                        {storeList.map((s, i) => (
                          row[s] !== undefined && (
                            <p key={s} style={{ margin: "2px 0 0 0", color: STORE_COLORS[i % STORE_COLORS.length] }}>
                              {s}: MRP ₹{((row[s] || 0) / 100000).toFixed(2)}L | Net ₹{((row[`${s}__net`] || 0) / 100000).toFixed(2)}L | Qty {row[`${s}__qty`] || 0}
                            </p>
                          )
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Recharts.Legend />

              {/* Weekend background band */}
              <Recharts.Bar
                yAxisId="band"
                dataKey="weekendBand"
                name="Weekend"
                fill="#ffb366"
                opacity={0.3}
                isAnimationActive={false}
              />

              {/* One line per store */}
              {storeList.map((store, i) => (
                <Recharts.Line
                  key={store}
                  yAxisId="sales"
                  type="monotone"
                  dataKey={store}
                  stroke={STORE_COLORS[i % STORE_COLORS.length]}
                  name={store}
                  strokeWidth={2}
                  connectNulls={false}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (!payload || cx === undefined || cy === undefined) return null;
                    const r = payload.isWeekend ? 5 : 2.5;
                    return <circle key={`${store}-${payload.date}`} cx={cx} cy={cy} r={r} fill={STORE_COLORS[i % STORE_COLORS.length]} />;
                  }}
                />
              ))}

              {/* Previous-period reference lines: single-store view only */}
              {showRefLines && data.historicalWeekdayAvg !== null && (
                <Recharts.ReferenceLine
                  yAxisId="sales"
                  y={data.historicalWeekdayAvg}
                  stroke="#000"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
              )}
              {showRefLines && data.historicalWeekendAvg !== null && (
                <Recharts.ReferenceLine
                  yAxisId="sales"
                  y={data.historicalWeekendAvg}
                  stroke="#000"
                  strokeDasharray="10 5"
                  strokeWidth={2}
                />
              )}
            </Recharts.ComposedChart>
          </div>

          <div style={{ marginTop: "1rem", fontSize: "12px", display: "flex", flexWrap: "wrap", gap: "2rem" }}>
            <span>● Small dot = weekday, large dot = weekend</span>
            <span style={{ backgroundColor: "#ffb366", opacity: 0.5, padding: "2px 6px", borderRadius: "3px" }}>Weekend background</span>
            {showRefLines && data.historicalWeekdayAvg !== null && (
              <span>— — Weekday Avg ₹{(data.historicalWeekdayAvg / 100000).toFixed(2)}L (previous period: {data.historicalPeriod?.start} to {data.historicalPeriod?.end})</span>
            )}
            {showRefLines && data.historicalWeekendAvg !== null && (
              <span>— — Weekend Avg ₹{(data.historicalWeekendAvg / 100000).toFixed(2)}L (previous period)</span>
            )}
          </div>
        </div>
      )}

      {/* Daily Trend Table */}
      {data.dailyTrend && data.dailyTrend.length > 0 && (
        <div className={styles.trendContainer} style={{ marginTop: "2rem" }}>
          <h2>Daily Sales Detail</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Store</th>
                <th>MRP Value</th>
                <th>Net Value</th>
                <th>Units</th>
                <th>Discount</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {data.dailyTrend.map((day, idx) => {
                const dayType = day.dayOfWeek === 0 || day.dayOfWeek === 6 ? "Weekend" : "Weekday";
                return (
                  <tr
                    key={idx}
                    style={{
                      backgroundColor: day.dayOfWeek === 0 || day.dayOfWeek === 6 ? "#fff3e0" : "white",
                    }}
                  >
                    <td>{formatDate(day.date)}</td>
                    <td>{day.store_code}</td>
                    <td>₹{((day.mrp || 0) / 100000).toFixed(2)}L</td>
                    <td>₹{(day.sales / 100000).toFixed(2)}L</td>
                    <td>{formatIndianNumber(day.quantity)}</td>
                    <td>₹{formatIndianNumber(Math.round(day.discount / 10000))}K</td>
                    <td>{dayType}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Store Performance Table */}
      {data.storeData && data.storeData.length > 0 && (
        <div className={styles.trendContainer} style={{ marginTop: "2rem" }}>
          <h2>Store-wise Performance</h2>
          <table>
            <thead>
              <tr>
                <th>Store</th>
                <th>City</th>
                <th>Region</th>
                <th>MRP Value</th>
                <th>Net Value</th>
                <th>Units</th>
                <th>Discount</th>
                <th>Avg Disc %</th>
                <th>ASP</th>
              </tr>
            </thead>
            <tbody>
              {data.storeData.map((store) => (
                <tr key={store.store_code}>
                  <td>{store.store_name}</td>
                  <td>{store.city}</td>
                  <td>{store.region}</td>
                  <td>₹{((store.mrp || 0) / 100000).toFixed(2)}L</td>
                  <td>₹{(store.sales / 100000).toFixed(2)}L</td>
                  <td>{formatIndianNumber(store.quantity)}</td>
                  <td>₹{formatIndianNumber(Math.round(store.discount / 10000))}K</td>
                  <td>{store.discount_percent.toFixed(2)}%</td>
                  <td>₹{formatIndianNumber(store.asp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
