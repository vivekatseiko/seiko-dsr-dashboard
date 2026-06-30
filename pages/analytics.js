import React, { useState, useEffect } from "react";
import styles from "../styles/Dashboard.module.css";

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    // TODO: Fetch analytics data
    setLoading(false);
  }, [selectedStore, startDate, endDate]);

  return (
    <div className={styles.container}>
      <h1>Analytics & Detailed Metrics</h1>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Store:</label>
          <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
            <option value="all">All Stores</option>
            <option value="SWSPHPLUK">Phoenix Palassio (Lucknow)</option>
            <option value="SWSPMCMUM">Phoenix Market City Kurla (Mumbai)</option>
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

      {loading ? (
        <p className={styles.loading}>Loading analytics...</p>
      ) : (
        <div className={styles.content}>
          <p>Analytics data will be displayed here with line graphs</p>
        </div>
      )}
    </div>
  );
}



