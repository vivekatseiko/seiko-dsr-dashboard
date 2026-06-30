import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Discrepancies.module.css";

export default function Discrepancies() {
  const router = useRouter();
  const [discrepancies, setDiscrepancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/discrepancies?status=${filter}`);
        const data = await response.json();
        setDiscrepancies(data || []);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filter]);

  const handleApprove = async (id) => {
    try {
      const response = await fetch(`/api/discrepancies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      if (response.ok) {
        setDiscrepancies(discrepancies.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const handleReject = async (id) => {
    try {
      const response = await fetch(`/api/discrepancies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });

      if (response.ok) {
        setDiscrepancies(discrepancies.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error("Error:", err);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Discrepancies</h1>

      <div className={styles.filterBar}>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={styles.select}
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : discrepancies.length === 0 ? (
        <p>No discrepancies found</p>
      ) : (
        <div className={styles.table}>
          <table>
            <thead>
              <tr>
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
                  <td>{item.store_code}</td>
                  <td>{item.field_name}</td>
                  <td>{item.old_value}</td>
                  <td>{item.new_value}</td>
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
