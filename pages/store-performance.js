import { useState, useEffect } from "react";
import styles from "../styles/Dashboard.module.css";

export default function StorePerformance() {
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [region, setRegion] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("storeCode", "all");
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);

        const response = await fetch(`/api/dashboard?${params.toString()}`);
        const result = await response.json();
        
        // For now, show placeholder data
        setStores([
          {
            store: "Phoenix Palassio (Lucknow)",
            code: "SWSPHPLUK",
            region: "North",
            sales: 45200000,
            units: 245,
            asp: 18400,
            discount: 9.2,
          },
          {
            store: "Phoenix Market City Kurla (Mumbai)",
            code: "SWSPMCMUM",
            region: "West",
            sales: 62500000,
            units: 318,
            asp: 19700,
            discount: 10.1,
          },
          {
            store: "Sarath City Mall (Hyderabad)",
            code: "SWSSCMHYD",
            region: "South",
            sales: 38900000,
            units: 189,
            asp: 20600,
            discount: 8.5,
          },
          {
            store: "Mall of Asia - Seiko (Bengaluru)",
            code: "SWSMOABLR",
            region: "South",
            sales: 51300000,
            units: 287,
            asp: 17800,
            discount: 9.8,
          },
        ]);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  return (
    <div className={styles.container}>
      <h1>Store Performance Analysis</h1>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Region:</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="all">All Regions</option>
            <option value="North">North</option>
            <option value="South">South</option>
            <option value="East">East</option>
            <option value="West">West</option>
          </select>
        </div>

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
      </div>

      {loading ? (
        <p>Loading store performance data...</p>
      ) : stores.length === 0 ? (
        <p>No data available</p>
      ) : (
        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th>Store Name</th>
                <th>Store Code</th>
                <th>Region</th>
                <th>Sales Value</th>
                <th>Units</th>
                <th>ASP</th>
                <th>Avg Disc %</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store, idx) => (
                <tr key={idx}>
                  <td>{store.store}</td>
                  <td>{store.code}</td>
                  <td>{store.region}</td>
                  <td>₹{(store.sales / 100000).toFixed(2)}L</td>
                  <td>{store.units}</td>
                  <td>₹{store.asp.toLocaleString()}</td>
                  <td>{store.discount.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );


}
