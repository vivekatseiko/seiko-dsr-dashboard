import { useState, useEffect } from "react";
import styles from "../styles/Dashboard.module.css";

const formatIndianNumber = (num) => {
  const str = Math.round(num).toString();
  const lastThree = str.substring(str.length - 3);
  const otherNumbers = str.substring(0, str.length - 3);
  if (otherNumbers !== "") {
    return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  }
  return lastThree;
};

export default function TargetsManagement() {
  const [targets, setTargets] = useState([]);
  const [filteredTargets, setFilteredTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [filterStore, setFilterStore] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const [stores, setStores] = useState([]);
  const [months] = useState(Array.from({ length: 12 }, (_, i) => i + 1));
  const [years, setYears] = useState([]);

  useEffect(() => {
    fetchTargets();
  }, [filterStore, filterMonth, filterYear]);

  const fetchTargets = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filterStore !== "all") params.append("store_code", filterStore);
      if (filterMonth !== "all") params.append("month", filterMonth);
      if (filterYear !== "all") params.append("year", filterYear);

      const response = await fetch(`/api/targets?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to fetch targets");
        setTargets([]);
        setFilteredTargets([]);
      } else {
        setTargets(result.data || []);
        setFilteredTargets(result.data || []);

        if (result.data && result.data.length > 0) {
          const uniqueStores = [...new Set(result.data.map(t => t.store_code))].sort();
          const uniqueYears = [...new Set(result.data.map(t => t.target_year))].sort((a, b) => b - a);
          setStores(uniqueStores);
          setYears(uniqueYears);
        }
      }
    } catch (err) {
      setError(err.message);
      setTargets([]);
      setFilteredTargets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (target) => {
    setEditingId(target.id);
    setEditData({ ...target });
  };

  const handleSave = async (id) => {
    if (!editData.value_target || editData.value_target <= 0) {
      setMessage("❌ Value target must be greater than 0");
      setMessageType("error");
      return;
    }

    try {
      const response = await fetch("/api/targets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          store_code: editData.store_code,
          target_month: editData.target_month,
          target_year: editData.target_year,
          value_target: editData.value_target,
          calibre_1_name: editData.calibre_1_name || null,
          calibre_1_qty_target: editData.calibre_1_qty_target || null,
          calibre_2_name: editData.calibre_2_name || null,
          calibre_2_qty_target: editData.calibre_2_qty_target || null,
          calibre_3_name: editData.calibre_3_name || null,
          calibre_3_qty_target: editData.calibre_3_qty_target || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(`❌ Update failed: ${result.error}`);
        setMessageType("error");
      } else {
        setMessage("✅ Target updated successfully");
        setMessageType("success");
        setEditingId(null);
        fetchTargets();
        setTimeout(() => setMessage(""), 2000);
      }
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
      setMessageType("error");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this target?")) return;

    try {
      const response = await fetch(`/api/targets?id=${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(`❌ Delete failed: ${result.error}`);
        setMessageType("error");
      } else {
        setMessage("✅ Target deleted successfully");
        setMessageType("success");
        fetchTargets();
        setTimeout(() => setMessage(""), 2000);
      }
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
      setMessageType("error");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  return (
    <div className={styles.container}>
      <h1>🎯 Sales Targets Management</h1>

      {/* Filters */}
      <div style={{
        backgroundColor: "#f5f5f5",
        padding: "1.5rem",
        borderRadius: "8px",
        marginBottom: "2rem",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1rem",
      }}>
        <div>
          <label>Store:</label>
          <select value={filterStore} onChange={(e) => setFilterStore(e.target.value)}>
            <option value="all">All Stores</option>
            {stores.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Month:</label>
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
            <option value="all">All Months</option>
            {months.map(m => (
              <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Year:</label>
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
            <option value="all">All Years</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          padding: "1rem",
          marginBottom: "1rem",
          borderRadius: "4px",
          backgroundColor: messageType === "success" ? "#dcfce7" : "#fee2e2",
          color: messageType === "success" ? "#166534" : "#991b1b",
          border: messageType === "success" ? "1px solid #86efac" : "1px solid #fca5a5",
        }}>
          {message}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: "1rem",
          marginBottom: "1rem",
          borderRadius: "4px",
          backgroundColor: "#fee2e2",
          color: "#991b1b",
          border: "1px solid #fca5a5",
        }}>
          ❌ {error}
        </div>
      )}

      {/* Loading */}
      {loading && <p>Loading targets...</p>}

      {/* Table */}
      {!loading && filteredTargets.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
          }}>
            <thead>
              <tr style={{ backgroundColor: "#f0f0f0" }}>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Store</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Month</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Year</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>Value Target</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Calibre 1</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Qty</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Calibre 2</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Qty</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Calibre 3</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Qty</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTargets.map((target) => (
                <tr key={target.id} style={{ borderBottom: "1px solid #ddd" }}>
                  {editingId === target.id ? (
                    <>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                        <input
                          type="text"
                          value={editData.store_code}
                          disabled
                          style={{ width: "100%", padding: "4px" }}
                        />
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={editData.target_month}
                          onChange={(e) => setEditData({ ...editData, target_month: parseInt(e.target.value) })}
                          style={{ width: "60px", padding: "4px" }}
                        />
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
                        <input
                          type="number"
                          value={editData.target_year}
                          onChange={(e) => setEditData({ ...editData, target_year: parseInt(e.target.value) })}
                          style={{ width: "80px", padding: "4px" }}
                        />
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>
                        <input
                          type="number"
                          value={editData.value_target}
                          onChange={(e) => setEditData({ ...editData, value_target: parseFloat(e.target.value) })}
                          style={{ width: "100%", padding: "4px" }}
                        />
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                        <input
                          type="text"
                          value={editData.calibre_1_name || ""}
                          onChange={(e) => setEditData({ ...editData, calibre_1_name: e.target.value })}
                          style={{ width: "100%", padding: "4px" }}
                          placeholder="Calibre"
                        />
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                        <input
                          type="number"
                          value={editData.calibre_1_qty_target || ""}
                          onChange={(e) => setEditData({ ...editData, calibre_1_qty_target: e.target.value ? parseInt(e.target.value) : null })}
                          style={{ width: "80px", padding: "4px" }}
                          placeholder="Qty"
                        />
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                        <input
                          type="text"
                          value={editData.calibre_2_name || ""}
                          onChange={(e) => setEditData({ ...editData, calibre_2_name: e.target.value })}
                          style={{ width: "100%", padding: "4px" }}
                          placeholder="Calibre"
                        />
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                        <input
                          type="number"
                          value={editData.calibre_2_qty_target || ""}
                          onChange={(e) => setEditData({ ...editData, calibre_2_qty_target: e.target.value ? parseInt(e.target.value) : null })}
                          style={{ width: "80px", padding: "4px" }}
                          placeholder="Qty"
                        />
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                        <input
                          type="text"
                          value={editData.calibre_3_name || ""}
                          onChange={(e) => setEditData({ ...editData, calibre_3_name: e.target.value })}
                          style={{ width: "100%", padding: "4px" }}
                          placeholder="Calibre"
                        />
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                        <input
                          type="number"
                          value={editData.calibre_3_qty_target || ""}
                          onChange={(e) => setEditData({ ...editData, calibre_3_qty_target: e.target.value ? parseInt(e.target.value) : null })}
                          style={{ width: "80px", padding: "4px" }}
                          placeholder="Qty"
                        />
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
                        <button
                          onClick={() => handleSave(target.id)}
                          style={{
                            padding: "4px 8px",
                            marginRight: "4px",
                            backgroundColor: "#4CAF50",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "#999",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>{target.store_code}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{String(target.target_month).padStart(2, '0')}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{target.target_year}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>₹{formatIndianNumber(target.value_target)}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{target.calibre_1_name || "-"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{target.calibre_1_qty_target || "-"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{target.calibre_2_name || "-"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{target.calibre_2_qty_target || "-"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{target.calibre_3_name || "-"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{target.calibre_3_qty_target || "-"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
                        <button
                          onClick={() => handleEdit(target)}
                          style={{
                            padding: "4px 8px",
                            marginRight: "4px",
                            backgroundColor: "#2196F3",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(target.id)}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "#f44336",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filteredTargets.length === 0 && (
        <p style={{ textAlign: "center", color: "#999", marginTop: "2rem" }}>
          No targets found. Upload targets from the Upload page.
        </p>
      )}
    </div>
  );
}
