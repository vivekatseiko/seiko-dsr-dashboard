import React, { useState } from "react";
import styles from "../styles/Discrepancies.module.css";

export default function Approvals() {
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  React.useEffect(() => {
    // TODO: Fetch discrepancies from API
    setLoading(false);
  }, []);

  const handleApprove = (id: string) => {
    console.log("Approved:", id);
    // TODO: Call approval API
  };

  const handleReject = (id: string) => {
    console.log("Rejected:", id);
    // TODO: Call rejection API
  };

  return (
    <div className={styles.container}>
      <h1>Approvals & Discrepancies</h1>

      <div className={styles.filterBar}>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={styles.select}
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {loading ? (
        <p className={styles.loading}>Loading discrepancies...</p>
      ) : discrepancies.length === 0 ? (
        <p className={styles.empty}>No discrepancies found</p>
      ) : (
        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th>Upload ID</th>
                <th>Store</th>
                <th>Field</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {discrepancies.map((item) => (
                <tr key={item.id}>
                  <td>{item.uploadId}</td>
                  <td>{item.store}</td>
                  <td>{item.field}</td>
                  <td>{item.oldValue}</td>
                  <td>{item.newValue}</td>
                  <td>{item.status}</td>
                  <td>
                    {item.status === "pending" && (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleApprove(item.id)}
                          className={styles.approveBtn}
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleReject(item.id)}
                          className={styles.rejectBtn}
                        >
                          ✗ Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
