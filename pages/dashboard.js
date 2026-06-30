import { useState, useEffect } from "react";
import styles from "../styles/Dashboard.module.css";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storeCode, setStoreCode] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("storeCode", storeCode);
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
  }, [storeCode, startDate, endDate]);

  return (
    <div className={styles.container}>
      <h1>📊 Summary (MTD)</h1>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Store:</label>
          <select value={storeCode} onChange={(e) => setStoreCode(e.target.value)}>
            <option value="all">All Stores</option>
            <option value="SWSPHPLUK">Lucknow</option>
            <option value="SWSPMCMUM">Mumbai</option>
            <option value="SWSPMMPNE">Pune</option>
            <option value="SWSSCMHYD">Hyderabad</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Start Date:</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className={styles.filterGroup}>
          <label>End Date:</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && data && (
        <div>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <p className={styles.label}>Total Sales</p>
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
            <h2>Daily Sales Trend</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sales</th>
                  <th>Units</th>
                  <th>Discount</th>
                </tr>
              </thead>
              <tbody>
                {data.dailyTrend.map((day, idx) => (
                  <tr key={idx}>
                    <td>{day.date}</td>
                    <td>₹{(day.sales / 100000).toFixed(2)}L</td>
                    <td>{day.qty}</td>
                    <td>₹{(day.discount / 10000).toFixed(1)}K</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !data && <p>No data</p>}
    </div>
  );
}


