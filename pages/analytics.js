import { useState, useEffect } from "react";
import styles from "../styles/Dashboard.module.css";

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedStore, setSelectedStore] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [timeRange, setTimeRange] = useState("month");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("storeCode", selectedStore);
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);

        const response = await fetch(`/api/dashboard?${params.toString()}`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedStore, startDate, endDate]);

  return (
    <div className={styles.container}>
      <h1>📈 Analytics & Detailed Metrics</h1>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Store:</label>
          <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
            <option value="all">All Stores</option>
            <option value="SWSPHPLUK">Lucknow</option>
            <option value="SWSPMCMUM">Mumbai</option>
            <option value="SWSPMMPNE">Pune</option>
            <option value="SWSSCMHYD">Hyderabad</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Time Range:</label>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {timeRange === "custom" && (
          <>
            <div className={styles.filterGroup}>
              <label>Start Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className={styles.filterGroup}>
              <label>End Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      {loading ? (
        <p>Loading analytics...</p>
      ) : data ? (
        <div>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <p className={styles.label}>Total Sales Value</p>
              <p className={styles.value}>₹{(data.totalSales / 100000).toFixed(2)}L</p>
            </div>

            <div className={styles.summaryCard}>
              <p className={styles.label}>Units Sold</p>
              <p className={styles.value}>{data.totalQuantity}</p>
            </div>

            <div className={styles.summaryCard}>
              <p className={styles.label}>Total Discount</p>
              <p className={styles.value}>₹{(data.totalDiscounts / 100000).toFixed(2)}L</p>
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

          <div className={styles.trendContainer}>
            <h2>Metrics Over Time</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sales</th>
                  <th>Units</th>
                  <th>Discount</th>
                  <th>Avg Disc %</th>
                </tr>
              </thead>
              <tbody>
                {data.dailyTrend.map((day, idx) => (
                  <tr key={idx}>
                    <td>{day.date}</td>
                    <td>₹{(day.sales / 100000).toFixed(2)}L</td>
                    <td>{day.qty}</td>
                    <td>₹{(day.discount / 10000).toFixed(1)}K</td>
                    <td>{((day.discount / day.sales) * 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p>No data available</p>
      )}
    </div>
  );
}
