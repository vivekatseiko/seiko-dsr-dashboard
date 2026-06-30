import { useState, useEffect } from "react";
import styles from "../styles/Dashboard.module.css";

// Color palette for different stores (distinct, readable colors)
const STORE_COLORS = [
  "#1f77b4", // Blue
  "#ff7f0e", // Orange
  "#2ca02c", // Green
  "#d62728", // Red
  "#9467bd", // Purple
  "#8c564b", // Brown
  "#e377c2", // Pink
  "#7f7f7f", // Gray
  "#bcbd22", // Yellow-green
  "#17becf", // Cyan
];

// Format number to Indian numeral system (e.g., 1,00,000)
const formatIndianNumber = (num) => {
  const str = Math.round(num).toString();
  const lastThree = str.substring(str.length - 3);
  const otherNumbers = str.substring(0, str.length - 3);
  if (otherNumbers !== "") {
    return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  }
  return lastThree;
};

// Format Y-axis values (K, L, Cr)
const formatYAxisValue = (value) => {
  if (value >= 10000000) {
    // Crores
    return (value / 10000000).toFixed(0) + "Cr";
  } else if (value >= 100000) {
    // Lakhs
    return (value / 100000).toFixed(1) + "L";
  } else if (value >= 1000) {
    // Thousands
    return (value / 1000).toFixed(0) + "K";
  }
  return Math.round(value).toString();
};

// Format large numbers in Lakhs
const formatInLakhs = (num) => {
  if (num >= 100000) {
    return (num / 100000).toFixed(2) + "L";
  }
  return "₹" + formatIndianNumber(Math.round(num));
};

// Format date to "01 Apr" format
const formatDate = (dateStr) => {
  const date = new Date(dateStr + "T00:00:00");
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  return `${day} ${month}`;
};

// Custom shape for weekend background
const WeekendBackground = (props) => {
  const { x, y, width, height, data } = props;

  if (!data || data.length === 0) return null;

  const xScale = width / data.length;
  const backgrounds = [];

  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    if (point.isWeekend) {
      backgrounds.push(
        <rect
          key={`weekend-${i}`}
          x={i * xScale}
          y={y}
          width={xScale}
          height={height}
          fill="#fff3e0"
          fillOpacity={0.5}
        />
      );
    }
  }

  return <g>{backgrounds}</g>;
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters
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

  // Group daily trend by store for charting
  const chartDataByStore = {};
  const uniqueStores = [];

  if (data.dailyTrend) {
    for (const record of data.dailyTrend) {
      const store = record.store_code;
      if (!chartDataByStore[store]) {
        chartDataByStore[store] = [];
        uniqueStores.push(store);
      }
      
      const isWeekend = record.dayOfWeek === 0 || record.dayOfWeek === 6;
      
      chartDataByStore[store].push({
        date: record.date,
        formattedDate: formatDate(record.date),
        sales: record.sales,
        quantity: record.quantity,
        discount: record.discount,
        isWeekend: isWeekend,
        dayOfWeek: record.dayOfWeek,
      });
    }
  }

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
            {data.cities &&
              data.cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label>Region:</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="all">All Regions</option>
            {data.regions &&
              data.regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label>Store:</label>
          <select value={storeCode} onChange={(e) => setStoreCode(e.target.value)}>
            <option value="all">All Stores</option>
            {data.stores &&
              data.stores.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name} ({s.code})
                </option>
              ))}
          </select>
        </div>

        <div>
          <label>Start Date:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label>End Date:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
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
          <p className={styles.value}>
            ₹{formatIndianNumber(Math.round(data.totalSales / 100000))}L
          </p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.label}>Units Sold</p>
          <p className={styles.value}>{formatIndianNumber(data.totalQuantity)}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.label}>Total Discount</p>
          <p className={styles.value}>
            ₹{formatIndianNumber(Math.round(data.totalDiscounts / 100000))}L
          </p>
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

      {/* Historical Averages (only if data exists) */}
      {(data.historicalWeekdayAvg !== null || data.historicalWeekendAvg !== null) && (
        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            backgroundColor: "#f0f0f0",
            borderRadius: "8px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          {data.historicalWeekdayAvg !== null && (
            <div>
              <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>
                Historical Weekday Avg
              </p>
              <p style={{ margin: 0, fontSize: "1.2rem" }}>
                ₹{formatIndianNumber(Math.round(data.historicalWeekdayAvg / 100000))}L
              </p>
            </div>
          )}
          {data.historicalWeekendAvg !== null && (
            <div>
              <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>
                Historical Weekend Avg
              </p>
              <p style={{ margin: 0, fontSize: "1.2rem" }}>
                ₹{formatIndianNumber(Math.round(data.historicalWeekendAvg / 100000))}L
              </p>
            </div>
          )}
        </div>
      )}

      {/* Line Chart by Store */}
      {Recharts && Object.keys(chartDataByStore).length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Daily Sales Trend (by Store)</h2>
          {Object.entries(chartDataByStore).map(([store, trendData], storeIdx) => (
            <div key={store} style={{ marginTop: "2rem", overflowX: "auto" }}>
              <h3>{store}</h3>
              <Recharts.LineChart
                width={1200}
                height={400}
                data={trendData}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                {/* Weekend background highlighting */}
                <Recharts.ReferenceLine
                  isFront={false}
                  alwaysShow={true}
                  shape={(props) => {
                    const { xAxis, yAxis } = props.chartInstance || {};
                    if (!xAxis || !yAxis) return null;

                    const backgrounds = [];
                    for (let i = 0; i < trendData.length; i++) {
                      if (trendData[i].isWeekend) {
                        const x = xAxis.p2c(i);
                        const nextX = i < trendData.length - 1 ? xAxis.p2c(i + 1) : xAxis.p2c(i) + 50;
                        backgrounds.push(
                          <rect
                            key={`weekend-${i}`}
                            x={x}
                            y={yAxis.p2c(yAxis.domain[1])}
                            width={nextX - x}
                            height={yAxis.p2c(yAxis.domain[0]) - yAxis.p2c(yAxis.domain[1])}
                            fill="#fff3e0"
                            fillOpacity={0.6}
                          />
                        );
                      }
                    }
                    return <g>{backgrounds}</g>;
                  }}
                />

                <Recharts.CartesianGrid strokeDasharray="3 3" />
                <Recharts.XAxis
                  dataKey="formattedDate"
                  interval={Math.max(0, Math.ceil(trendData.length / 12) - 1)}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <Recharts.YAxis
                  tickFormatter={formatYAxisValue}
                />
                <Recharts.Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const dayType = data.isWeekend ? "Weekend" : "Weekday";
                      return (
                        <div
                          style={{
                            backgroundColor: "#fff",
                            padding: "10px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            fontSize: "12px",
                          }}
                        >
                          <p style={{ margin: 0 }}>Date: {data.date}</p>
                          <p style={{ margin: 0 }}>Sales: ₹{formatIndianNumber(Math.round(data.sales / 100000))}L</p>
                          <p style={{ margin: 0 }}>Qty: {formatIndianNumber(data.quantity)}</p>
                          <p style={{ margin: 0 }}>{dayType}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Recharts.Legend />
                
                {/* Store sales line */}
                <Recharts.Line
                  type="monotone"
                  dataKey="sales"
                  stroke={STORE_COLORS[storeIdx % STORE_COLORS.length]}
                  name={`${store} Sales (₹)`}
                  connectNulls={true}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (payload.isWeekend) {
                      return (
                        <circle cx={cx} cy={cy} r={4} fill={STORE_COLORS[storeIdx % STORE_COLORS.length]} opacity={0.6} />
                      );
                    }
                    return <circle cx={cx} cy={cy} r={3} fill={STORE_COLORS[storeIdx % STORE_COLORS.length]} />;
                  }}
                />

                {/* Historical averages */}
                {data.historicalWeekdayAvg !== null && (
                  <Recharts.ReferenceLine
                    y={data.historicalWeekdayAvg}
                    stroke="#000"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    name={`Historical Weekday Avg (₹${formatIndianNumber(Math.round(data.historicalWeekdayAvg / 100000))}L)`}
                    label={{ value: "Weekday Avg", position: "right", fill: "#000", fontSize: 12 }}
                  />
                )}

                {data.historicalWeekendAvg !== null && (
                  <Recharts.ReferenceLine
                    y={data.historicalWeekendAvg}
                    stroke="#000"
                    strokeDasharray="10 5"
                    strokeWidth={2}
                    name={`Historical Weekend Avg (₹${formatIndianNumber(Math.round(data.historicalWeekendAvg / 100000))}L)`}
                    label={{ value: "Weekend Avg", position: "right", fill: "#000", fontSize: 12 }}
                  />
                )}
              </Recharts.LineChart>
              
              {/* Legend */}
              <div style={{ marginTop: "1rem", fontSize: "12px", display: "flex", flexWrap: "wrap", gap: "2rem" }}>
                <span>
                  <span
                    style={{
                      display: "inline-block",
                      width: "12px",
                      height: "12px",
                      backgroundColor: STORE_COLORS[storeIdx % STORE_COLORS.length],
                      marginRight: "0.5rem",
                    }}
                  ></span>
                  Weekday
                </span>
                <span>
                  <span
                    style={{
                      display: "inline-block",
                      width: "12px",
                      height: "12px",
                      backgroundColor: STORE_COLORS[storeIdx % STORE_COLORS.length],
                      marginRight: "0.5rem",
                      opacity: 0.6,
                    }}
                  ></span>
                  Weekend
                </span>
                <span style={{ backgroundColor: "#fff3e0", padding: "2px 6px", borderRadius: "3px" }}>
                  Weekend Highlight
                </span>
                {data.historicalWeekdayAvg !== null && (
                  <span>
                    <span
                      style={{
                        display: "inline-block",
                        width: "12px",
                        height: "2px",
                        backgroundColor: "#000",
                        marginRight: "0.5rem",
                      }}
                    ></span>
                    Historical Weekday Avg
                  </span>
                )}
                {data.historicalWeekendAvg !== null && (
                  <span>
                    <span
                      style={{
                        display: "inline-block",
                        width: "12px",
                        height: "2px",
                        backgroundColor: "#000",
                        marginRight: "0.5rem",
                        position: "relative",
                      }}
                    ></span>
                    Historical Weekend Avg
                  </span>
                )}
              </div>
            </div>
          ))}
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
                <th>Sales</th>
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
                      backgroundColor:
                        day.dayOfWeek === 0 || day.dayOfWeek === 6
                          ? "#fff3e0"
                          : "white",
                    }}
                  >
                    <td>{formatDate(day.date)}</td>
                    <td>{day.store_code}</td>
                    <td>₹{formatIndianNumber(Math.round(day.sales / 100000))}L</td>
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
                <th>Sales</th>
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
                  <td>₹{formatIndianNumber(Math.round(store.sales / 100000))}L</td>
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
