import { useState, useEffect } from "react";
import styles from "../styles/Discrepancies.module.css";

const formatIndianNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return "-";
  const neg = num < 0;
  const str = Math.abs(Math.round(num)).toString();
  const lastThree = str.substring(str.length - 3);
  const otherNumbers = str.substring(0, str.length - 3);
  let out;
  if (otherNumbers !== "") {
    out = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  } else {
    out = lastThree;
  }
  return neg ? `-${out}` : out;
};

const DIFF_FIELDS = [
  "transaction_date", "quantity", "mrp", "net_value", "discount_value",
  "discount_percentage", "sold_by", "family", "calibre", "customer_name", "mobile_number",
];

function getFieldDiffs(oldValueStr, newValueStr) {
  try {
    const oldRec = JSON.parse(oldValueStr);
    const newRec = JSON.parse(newValueStr);
    const diffs = [];
    for (const field of DIFF_FIELDS) {
      const oldVal = oldRec[field];
      const newVal = newRec[field];
      if (String(oldVal ?? "") !== String(newVal ?? "")) {
        diffs.push({ field, oldVal, newVal });
      }
    }
    return diffs;
  } catch {
    return [];
  }
}

function describeNewRecord(newValueStr) {
  try {
    const r = JSON.parse(newValueStr);
    return `${r.transaction_date} • qty ${r.quantity} • net ₹${formatIndianNumber(r.net_value)}`;
  } catch {
    return "-";
  }
}

export default function Approvals() {
  const [discrepancies, setDiscrepancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/discrepancies?status=${filter}`);
      const data = await response.json();
      setDiscrepancies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error:", err);
      setDiscrepancies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, status) => {
    setActionLoading(id);
    try {
      const userEmail = localStorage.getItem("userEmail") || "unknown";
      const response = await fetch(`/api/discrepancies?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, email: userEmail }),
      });

      if (response.ok) {
        setDiscrepancies((prev) => prev.filter((d) => d.id !== id));
      } else {
        const result = await response.json();
        alert(`❌ ${result.error}`);
      }
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={styles.container}>
      <h1>✅ Approvals</h1>

      <div className={styles.filterBar}>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={styles.select}
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : discrepancies.length === 0 ? (
        <p>No items found</p>
      ) : (
        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Store</th>
                <th>Invoice</th>
                <th>Model / Serial</th>
                <th>Details</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {discrepancies.map((item) => {
                const isSerialReuse = item.field_changed === "serial_reuse";
                const diffs = isSerialReuse ? [] : getFieldDiffs(item.old_value, item.new_value);
                return (
                  <tr key={item.id}>
                    <td style={{ fontSize: "11px", fontWeight: "600" }}>
                      {isSerialReuse ? "🔁 Serial re-sold" : "✏️ Value changed"}
                    </td>
                    <td>{item.store_code}</td>
                    <td>{item.system_invoice_number}</td>
                    <td style={{ fontSize: "11px" }}>{item.model_number}<br />{item.serial_number}</td>
                    <td style={{ fontSize: "11px" }}>
                      {isSerialReuse ? (
                        <div>
                          This model+serial was already sold (no return recorded).
                          <br />
                          New transaction: {describeNewRecord(item.new_value)}
                          <br />
                          Approve = insert it anyway. Reject = discard.
                        </div>
                      ) : diffs.length === 0 ? (
                        "-"
                      ) : (
                        diffs.map((d) => (
                          <div key={d.field} style={{ marginBottom: "4px" }}>
                            <strong>{d.field}:</strong>{" "}
                            {typeof d.oldVal === "number"
                              ? formatIndianNumber(d.oldVal)
                              : String(d.oldVal ?? "-")}
                            {" → "}
                            {typeof d.newVal === "number"
                              ? formatIndianNumber(d.newVal)
                              : String(d.newVal ?? "-")}
                          </div>
                        ))
                      )}
                    </td>
                    <td>{item.status}</td>
                    <td>
                      {item.status === "pending" && (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => handleAction(item.id, "approved")}
                            className={styles.approveBtn}
                            disabled={actionLoading === item.id}
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleAction(item.id, "rejected")}
                            className={styles.rejectBtn}
                            disabled={actionLoading === item.id}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
