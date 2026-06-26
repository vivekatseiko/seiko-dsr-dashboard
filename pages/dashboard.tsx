// pages/dashboard.tsx (React/Next.js)
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Dashboard.module.css";

interface DashboardMetric {
  [key: string]: any;
}

export default function Dashboard() {
  const router = useRouter();
  const [salesByFamily, setSalesByFamily] = useState<DashboardMetric[]>([]);
  const [salesByCalibre, setSalesByCalibre] = useState<DashboardMetric[]>([]);
  const [discountTrends, setDiscountTrends] = useState<DashboardMetric[]>([]);
  const [salesByRegion, setSalesByRegion] = useState<DashboardMetric[]>([]);
  const [summary, setSummary] = useState<DashboardMetric>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStore, setSelectedStore] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          storeCode: selectedStore,
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
        });

        const metrics = [
          "sales-by-family",
          "sales-by-calibre",
          "discount-trends",
          "sales-by-region",
          "summary",
        ];

        const responses = await Promise.all(
          metrics.map((metric) =>
            fetch(
              `/api/dashboard?metric=${metric}&${queryParams.toString()}`
            ).then((r) => r.json())
          )
        );

        setSalesByFamily(responses[0]);
        setSalesByCalibre(responses[1]);
        setDiscountTrends(responses[2]);
        setSalesByRegion(responses[3]);
        setSummary(responses[4]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedStore, startDate, endDate]);

  const handleFilterChange = () => {
    // Filters are applied via useEffect
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Sales Dashboard</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="store">Store:</label>
          <select
            id="store"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
          >
            <option value="all">All Stores</option>
            <option value="SWSPHPLUK">Phoenix Palassio (Lucknow)</option>
            <option value="SWSPMCMUM">Phoenix Market City Kurla (Mumbai)</option>
            <option value="SWSPMMPNE">Phoenix Mall of the Millennium (Pune)</option>
            <option value="SWSSCMHYD">Sarath City Mall (Hyderabad)</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="startDate">Start Date:</label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="endDate">End Date:</label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <p className={styles.loading}>Loading dashboard data...</p>
      ) : (
        <div className={styles.content}>
          <div className={styles.summaryCard}>
            <h2>Summary</h2>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span className={styles.label}>Total Sales Value</span>
                <span className={styles.value}>
                  ₹{(summary.totalSales || 0).toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.label}>Total Quantity</span>
                <span className={styles.value}>{summary.totalQuantity || 0}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.label}>Total Discounts</span>
                <span className={styles.value}>
                  ₹{(summary.totalDiscounts || 0).toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.label}>Avg Discount %</span>
                <span className={styles.value}>
                  {(summary.averageDiscount || 0).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <div className={styles.cardGrid}>
            <div className={styles.card}>
              <h3>Sales by Family</h3>
              <div className={styles.tableSmall}>
                <table>
                  <thead>
                    <tr>
                      <th>Family</th>
                      <th>Qty</th>
                      <th>Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(salesByFamily || []).slice(0, 8).map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.family}</td>
                        <td>{item.qty}</td>
                        <td>
                          {item.value.toLocaleString("en-IN", {
                            maximumFractionDigits: 0,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.card}>
              <h3>Sales by Calibre</h3>
              <div className={styles.tableSmall}>
                <table>
                  <thead>
                    <tr>
                      <th>Calibre</th>
                      <th>Qty</th>
                      <th>Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(salesByCalibre || []).slice(0, 8).map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.calibre}</td>
                        <td>{item.qty}</td>
                        <td>
                          {item.value.toLocaleString("en-IN", {
                            maximumFractionDigits: 0,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.card}>
              <h3>Sales by Region</h3>
              <div className={styles.tableSmall}>
                <table>
                  <thead>
                    <tr>
                      <th>Region</th>
                      <th>Qty</th>
                      <th>Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(salesByRegion || []).map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.region}</td>
                        <td>{item.qty}</td>
                        <td>
                          {item.value.toLocaleString("en-IN", {
                            maximumFractionDigits: 0,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.card}>
              <h3>Discount Trends</h3>
              <div className={styles.tableSmall}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Total Discount (₹)</th>
                      <th>Avg %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(discountTrends || []).slice(-10).map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.date}</td>
                        <td>
                          {item.totalDiscount.toLocaleString("en-IN", {
                            maximumFractionDigits: 0,
                          })}
                        </td>
                        <td>{item.avgDiscountPercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <button
          onClick={() => router.push("/upload")}
          className={styles.navButton}
        >
          Upload More Data
        </button>
      </div>
    </div>
  );
}
