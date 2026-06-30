// pages/discrepancies.tsx (React/Next.js)
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Discrepancies.module.css";

interface Discrepancy {
  id: number;
  store_code: string;
  transaction_date: string;
  system_invoice_number: string;
  model_number: string;
  serial_number: string;
  field_changed: string;
  old_value: any;
  new_value: any;
  status: string;
}

export default function Discrepancies() {
  const router = useRouter();
  const { uploadId } = router.query;
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!uploadId) return;

    const fetchDiscrepancies = async () => {
      try {
        const response = await fetch(`/api/discrepancies?uploadId=${uploadId}`);
        const data = await response.json();

        if (response.ok) {
          setDiscrepancies(data.discrepancies || []);
        } else {
          setError(data.error || "Failed to load discrepancies");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchDiscrepancies();
  }, [uploadId]);

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const toggleSelectAll = () => {
    if (selected.size === discrepancies.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(discrepancies.map((d) => d.id)));
    }
  };

  const handleApprove = async () => {
    if (selected.size === 0) {
      setError("Select discrepancies to approve");
      return;
    }

    setProcessing(true);
    try {
      const userEmail = localStorage.getItem("userEmail");
      const response = await fetch("/api/discrepancies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          discrepancyIds: Array.from(selected),
          email: userEmail,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh discrepancies
        setDiscrepancies(
          discrepancies.filter((d) => !selected.has(d.id))
        );
        setSelected(new Set());

        if (discrepancies.length === selected.size) {
          // All discrepancies approved, go back
          setTimeout(() => router.push("/upload"), 1500);
        }
      } else {
        setError(data.error || "Approval failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (selected.size === 0) {
      setError("Select discrepancies to reject");
      return;
    }

    setProcessing(true);
    try {
      const userEmail = localStorage.getItem("userEmail");
      const response = await fetch("/api/discrepancies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          discrepancyIds: Array.from(selected),
          email: userEmail,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setDiscrepancies(
          discrepancies.filter((d) => !selected.has(d.id))
        );
        setSelected(new Set());
      } else {
        setError(data.error || "Rejection failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <p>Loading discrepancies...</p>
      </div>
    );
  }

  if (discrepancies.length === 0) {
    return (
      <div className={styles.container}>
        <h1>No Discrepancies</h1>
        <p>All uploaded data matches the existing records.</p>
        <button
          onClick={() => router.push("/upload")}
          className={styles.backButton}
        >
          Back to Upload
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Review Discrepancies</h1>
        <p>Found {discrepancies.length} discrepancies that need approval</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.actions}>
        <label className={styles.selectAllLabel}>
          <input
            type="checkbox"
            checked={selected.size === discrepancies.length}
            onChange={toggleSelectAll}
          />
          Select All ({selected.size}/{discrepancies.length})
        </label>

        <div className={styles.buttons}>
          <button
            onClick={handleApprove}
            disabled={selected.size === 0 || processing}
            className={styles.approveButton}
          >
            {processing ? "Processing..." : "Approve Selected"}
          </button>
          <button
            onClick={handleReject}
            disabled={selected.size === 0 || processing}
            className={styles.rejectButton}
          >
            {processing ? "Processing..." : "Reject Selected"}
          </button>
        </div>
      </div>

      <div className={styles.table}>
        <table>
          <thead>
            <tr>
              <th>Select</th>
              <th>Invoice #</th>
              <th>Model</th>
              <th>Serial</th>
              <th>Field Changed</th>
              <th>Old Value</th>
              <th>New Value</th>
            </tr>
          </thead>
          <tbody>
            {discrepancies.map((disc) => (
              <tr key={disc.id} className={selected.has(disc.id) ? styles.selected : ""}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(disc.id)}
                    onChange={() => toggleSelect(disc.id)}
                  />
                </td>
                <td>{disc.system_invoice_number}</td>
                <td>{disc.model_number}</td>
                <td>{disc.serial_number}</td>
                <td className={styles.fieldName}>{disc.field_changed}</td>
                <td className={styles.oldValue}>
                  {String(disc.old_value).substring(0, 50)}
                </td>
                <td className={styles.newValue}>
                  {String(disc.new_value).substring(0, 50)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
