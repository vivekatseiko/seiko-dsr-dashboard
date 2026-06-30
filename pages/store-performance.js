import React, { useState, useEffect } from "react";
import styles from "../styles/Dashboard.module.css";

export default function StorePerformance() {
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<any[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    // TODO: Fetch store performance data
    setLoading(false);
  }, [startDate, endDate]);

  return (
    <div className={styles.container}>
      <h1>Store Performance Analysis</h1>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Start Date:</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        <div className={styles.filterGroup}>
          <label>End Date:</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <p className={styles.loading}>Loading store performance data...</p>
      ) : (
        <div className={styles.content}>
          <p>Store performance table will be displayed here</p>
        </div>
      )}
    </div>
  );
}
