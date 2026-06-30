import { useState, useEffect } from "react";
import styles from "../styles/Dashboard.module.css";

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

  // For displaying chart
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
  if (data.dailyTrend) {
    for (const record of data.dailyTrend) {
      const store = record.store_code;
      if (!chartDataByStore[store]) {
        chartDataByStore[store] = [];
      }
      
      // Determine if weekday or weekend
      const isWeekend = record.dayOfWeek === 0 || record.dayOfWeek === 6;
      
      chartDataByStore[store].push({
        date: record.date,
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
            ₹{(data.totalSales / 100000).toFixed(2)}L
          </p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.label}>Units Sold</p>
          <p className={styles.value}>{data.totalQuantity}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.label}>Total Discount</p>
          <p className={styles.value}>
            ₹{(data.totalDiscounts / 100000).toFixed(2)}L
          </p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.label}>Avg Discount %</p>
          <p className={styles.value}>{data.averageDiscount.toFixed(2)}%</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.label}>ASP</p>
          <p className={styles.value}>₹{data.asp}</p>
        </div>
      </div>

      {/* Last Month Averages */}
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
        <div>
          <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>
            Last Month Weekday Avg
          </p>
          <p style={{ margin: 0, fontSize: "1.2rem" }}>
            ₹{(data.lastMonthWeekdayAvg / 100000).toFixed(2)}L
          </p>
        </div>
        <div>
          <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>
            Last Month Weekend Avg
          </p>
          <p style={{ margin: 0, fontSize: "1.2rem" }}>
            ₹{(data.lastMonthWeekendAvg / 100000).toFixed(2)}L
          </p>
        </div>
      </div>

      {/* Line Chart by Store */}
      {Recharts && Object.keys(chartDataByStore).length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Daily Sales Trend (by Store)</h2>
          {Object.entries(chartDataByStore).map(([store, trendData]) => (
            <div key={store} style={{ marginTop: "2rem", overflowX: "auto" }}>
              <h3>{store}</h3>
              <Recharts.LineChart width={1200} height={400} data={trendData}>
                <Recharts.CartesianGrid strokeDasharray="3 3" />
                <Recharts.XAxis
                  dataKey="date"
                  interval={Math.ceil(trendData.length / 10)}
                />
                <Recharts.YAxis />
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
                          }}
                        >
                          <p style={{ margin: 0 }}>Date: {data.date}</p>
                          <p style={{ margin: 0 }}>Sales: ₹{(data.sales / 100000).toFixed(2)}L</p>
                          <p style={{ margin: 0 }}>Qty: {data.quantity}</p>
                          <p style={{ margin: 0 }}>{dayType}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Recharts.Legend />
                
                {/* Actual sales line */}
                <Recharts.Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#8884d8"
                  name="Daily Sales (₹)"
                  connectNulls={true}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (payload.isWeekend) {
                      return (
                        <circle cx={cx} cy={cy} r={4} fill="#ff7300" />
                      );
                    }
                    return <circle cx={cx} cy={cy} r={3} fill="#8884d8" />;
                  }}
                />

                {/* Last month weekday average */}
                <Recharts.ReferenceLine
                  y={data.lastMonthWeekdayAvg}
                  stroke="#82ca9d"
                  strokeDasharray="5 5"
                  name={`Last Month Weekday Avg (₹${(data.lastMonthWeekdayAvg / 100000).toFixed(2)}L)`}
                  label="Last Month Weekday Avg"
                />

                {/* Last month weekend average */}
                <Recharts.ReferenceLine
                  y={data.lastMonthWeekendAvg}
                  stroke="#ffc658"
                  strokeDasharray="5 5"
                  name={`Last Month Weekend Avg (₹${(data.lastMonthWeekendAvg / 100000).toFixed(2)}L)`}
                  label="Last Month Weekend Avg"
                />
              </Recharts.LineChart>
              
              {/* Legend for weekend highlighting */}
              <div style={{ marginTop: "1rem", fontSize: "14px" }}>
                <span style={{ marginRight: "2rem" }}>
                  <span style={{ display: "inline-block", width: "12px", height: "12px", backgroundColor: "#8884d8", marginRight: "0.5rem" }}></span>
                  Weekday
                </span>
                <span style={{ marginRight: "2rem" }}>
                  <span style={{ display: "inline-block", width: "12px", height: "12px", backgroundColor: "#ff7300", marginRight: "0.5rem" }}></span>
                  Weekend
                </span>
                <span style={{ marginRight: "2rem" }}>
                  <span style={{ display: "inline-block", width: "12px", height: "12px", backgroundColor: "#82ca9d", marginRight: "0.5rem", border: "1px dashed #82ca9d" }}></span>
                  Last Month Weekday Avg
                </span>
                <span>
                  <span style={{ display: "inline-block", width: "12px", height: "12px", backgroundColor: "#ffc658", marginRight: "0.5rem", border: "1px dashed #ffc658" }}></span>
                  Last Month Weekend Avg
                </span>
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
                    <td>{day.date}</td>
                    <td>{day.store_code}</td>
                    <td>₹{(day.sales / 100000).toFixed(2)}L</td>
                    <td>{day.quantity}</td>
                    <td>₹{(day.discount / 10000).toFixed(1)}K</td>
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
                  <td>₹{(store.sales / 100000).toFixed(2)}L</td>
                  <td>{store.quantity}</td>
                  <td>₹{(store.discount / 10000).toFixed(1)}K</td>
                  <td>{store.discount_percent.toFixed(2)}%</td>
                  <td>₹{store.asp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
