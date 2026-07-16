import { useState, useEffect } from "react";
import { useRouter } from "next/router";
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

export default function Upload() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("sales");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [fileType, setFileType] = useState("sales");

  // Progress bar state
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");

  const [targets, setTargets] = useState([]);
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [targetsError, setTargetsError] = useState("");
  const [filterStore, setFilterStore] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [stores, setStores] = useState([]);
  const [years, setYears] = useState([]);

  const VALID_STORE_CODES = [
    "SBTEXACHN", "SBTFALBLR", "SBTSCMKOL", "SBTBRVMUM", "SBTDLFNOI",
    "SBTPMCCHN", "SBTSKYMUM", "SBTBLRMUM", "SBTMKSBLR", "SWSPMCCHN",
    "SWSMOABLR", "SWSPHCIND", "SWSNEMCGH", "SWSPMCMUM", "SWSPMMPNE",
    "SWSSCMHYD", "SWSLULKOC", "SWSCAMKOL", "SWSUNMDEL", "SWSPHPLUK",
    "SBTPMCPNE",
    "GSSEXACHN", "GSSMOABLR", "GSSPPMMUM", "GSSSLCDEL", "GSSSUBCBLR",
  ];

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    if (activeTab === "targets") {
      fetchTargets();
    }
  }, [activeTab, filterStore, filterMonth, filterYear]);

  const setStage = (percent, label) => {
    setProgress(percent);
    setProgressLabel(label);
  };

  const fetchTargets = async () => {
    setTargetsLoading(true);
    setTargetsError("");
    try {
      const params = new URLSearchParams();
      if (filterStore !== "all") params.append("store_code", filterStore);
      if (filterMonth !== "all") params.append("month", filterMonth);
      if (filterYear !== "all") params.append("year", filterYear);

      const response = await fetch(`/api/targets?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        setTargetsError(result.error || "Failed to fetch targets");
        setTargets([]);
      } else {
        setTargets(result.data || []);

        if (result.data && result.data.length > 0) {
          const uniqueStores = [...new Set(result.data.map((t) => t.store_code))].sort();
          const uniqueYears = [...new Set(result.data.map((t) => t.target_year))].sort((a, b) => b - a);
          setStores(uniqueStores);
          setYears(uniqueYears);
        }
      }
    } catch (err) {
      setTargetsError(err.message);
      setTargets([]);
    } finally {
      setTargetsLoading(false);
    }
  };

  const handleDeleteTarget = async (id) => {
    if (!confirm("Are you sure you want to delete this target?")) return;

    try {
      const response = await fetch(`/api/targets?id=${id}`, { method: "DELETE" });
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

  const isValidStoreCode = (code) => {
    if (!code) return false;
    return VALID_STORE_CODES.includes(code.toString().toUpperCase().trim());
  };

  const isDateColumn = (columnName) => {
    if (!columnName) return false;
    const name = columnName.toString().toLowerCase();
    return name.includes("date");
  };

  const parseDate = (dateValue) => {
    if (!dateValue) return "";
    if (typeof dateValue === "string") {
      const ddmmyyyy = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.test(dateValue);
      if (ddmmyyyy) {
        const [day, month, year] = dateValue.split("-");
        const date = new Date(year, month - 1, day);
        return date.toISOString().split("T")[0];
      }
      return dateValue;
    }
    if (typeof dateValue === "number") {
      const date = new Date((dateValue - 25569) * 86400 * 1000);
      return date.toISOString().split("T")[0];
    }
    return "";
  };

  // Find the store code anywhere in the top rows, not just B3
  const findStoreCode = (sheet, XLSX) => {
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i];
      if (!row) continue;
      for (let j = 0; j < Math.min(row.length, 10); j++) {
        const val = row[j];
        if (val && isValidStoreCode(val)) {
          return val.toString().toUpperCase().trim();
        }
      }
    }
    return null;
  };

  const handleTargetFileUpload = async (file) => {
    setLoading(true);
    setStage(5, "Reading target file...");
    setMessage("");
    setMessageType("info");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const script = document.createElement("script");
        script.src = "https://cdn.sheetjs.com/xlsx-0.18.5/package/dist/xlsx.full.min.js";

        script.onerror = () => {
          setMessage("❌ Failed to load Excel library.");
          setMessageType("error");
          setLoading(false);
        };

        script.onload = async () => {
          try {
            setStage(25, "Parsing target data...");
            const XLSX = window.XLSX;
            const workbook = XLSX.read(event.target.result, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

            const targetRecords = [];

            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (!row || row.length < 7) continue;

              const storeCode = row[0]?.toString().toUpperCase().trim();
              const month = parseInt(row[2]);
              const year = parseInt(row[3]);
              const valueTarget = parseFloat(row[4]);

              if (!isValidStoreCode(storeCode) || !month || !year || !valueTarget || month < 1 || month > 12) {
                continue;
              }

              targetRecords.push({
                store_code: storeCode,
                target_month: month,
                target_year: year,
                value_target: valueTarget,
                calibre_1_name: row[5] ? row[5].toString() : null,
                calibre_1_qty_target: row[6] ? parseInt(row[6]) : null,
                calibre_2_name: row[7] ? row[7].toString() : null,
                calibre_2_qty_target: row[8] ? parseInt(row[8]) : null,
                calibre_3_name: row[9] ? row[9].toString() : null,
                calibre_3_qty_target: row[10] ? parseInt(row[10]) : null,
              });
            }

            if (targetRecords.length === 0) {
              setMessage("❌ No valid target data found in file.");
              setMessageType("error");
              setLoading(false);
              return;
            }

            setStage(60, `Uploading ${targetRecords.length} target records...`);

            const userEmail = localStorage.getItem("userEmail") || "unknown";

            const response = await fetch("/api/targets-upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ records: targetRecords, uploadedBy: userEmail }),
            });

            const result = await response.json();

            if (!response.ok) {
              setMessage(`❌ Upload Failed: ${result.error}`);
              setMessageType("error");
              setLoading(false);
              return;
            }

            setStage(100, "Done");
            setMessage(`✅ Uploaded ${result.recordsInserted} target records`);
            setMessageType("success");
            setLoading(false);
            setTimeout(() => {
              setMessage("");
              fetchTargets();
            }, 2000);
          } catch (err) {
            setMessage(`❌ Error: ${err.message}`);
            setMessageType("error");
            setLoading(false);
          }
        };

        document.head.appendChild(script);
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
      setMessageType("error");
      setLoading(false);
    }
  };

  const handleSalesFileUpload = async (file) => {
    setLoading(true);
    setStage(5, "Reading file...");
    setMessage("");
    setMessageType("info");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        setStage(12, "Loading Excel library...");
        const script = document.createElement("script");
        script.src = "https://cdn.sheetjs.com/xlsx-0.18.5/package/dist/xlsx.full.min.js";

        script.onerror = () => {
          setMessage("❌ Failed to load Excel library.");
          setMessageType("error");
          setLoading(false);
        };

        script.onload = async () => {
          try {
            const XLSX = window.XLSX;
            const workbook = XLSX.read(event.target.result, { type: "array" });

            const allRecords = [];
            const rejectedRows = [];
            let processedSheets = 0;
            let skippedSheets = 0;

            const totalSheets = workbook.SheetNames.length;
            let sheetIdx = 0;

            for (const sheetName of workbook.SheetNames) {
              sheetIdx++;
              // Parsing occupies 15% - 60% of the bar, split across sheets
              setStage(
                15 + Math.round((sheetIdx / totalSheets) * 45),
                `Parsing sheet ${sheetIdx}/${totalSheets}: ${sheetName}`
              );

              try {
                const sheet = workbook.Sheets[sheetName];

                const sheetStoreCode = findStoreCode(sheet, XLSX);

                if (!sheetStoreCode) {
                  skippedSheets++;
                  continue;
                }

                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

                if (!rows || rows.length === 0) {
                  skippedSheets++;
                  continue;
                }

                let headerRowIndex = -1;
                let dateColumnIndex = -1;

                for (let i = 0; i < Math.min(rows.length, 30); i++) {
                  const row = rows[i];
                  if (!row || row.length === 0) continue;
                  for (let j = 0; j < row.length; j++) {
                    if (isDateColumn(row[j])) {
                      headerRowIndex = i;
                      dateColumnIndex = j;
                      break;
                    }
                  }
                  if (headerRowIndex !== -1) break;
                }

                if (headerRowIndex === -1) {
                  skippedSheets++;
                  continue;
                }

                let dataRows = rows.slice(headerRowIndex + 1).filter((row) => row[dateColumnIndex]);

                if (dataRows.length > 0 && isDateColumn(dataRows[0][dateColumnIndex])) {
                  dataRows = dataRows.slice(1);
                }

                if (dataRows.length === 0) {
                  skippedSheets++;
                  continue;
                }

                if (!parseDate(dataRows[0][dateColumnIndex])) {
                  skippedSheets++;
                  continue;
                }

                processedSheets++;

                for (const row of dataRows) {
                  const transactionDate = parseDate(row[dateColumnIndex]);
                  const quantity = parseInt(row[3] || 0);

                  if (!transactionDate || isNaN(quantity) || quantity === 0) continue;

                  // One row per physical unit: each row has one serial number
                  if (Math.abs(quantity) !== 1) {
                    rejectedRows.push({
                      sheet: sheetName,
                      date: transactionDate,
                      model: (row[2] ?? "").toString(),
                      serial: (row[4] ?? "").toString(),
                      reason: `Qty is ${quantity} — each unit must be its own row with its own serial number (qty 1, or -1 for a return)`,
                    });
                    continue;
                  }

                  // Invoice number is mandatory
                  const invoiceNumber = (row[1] ?? "").toString().trim();
                  if (!invoiceNumber) {
                    rejectedRows.push({
                      sheet: sheetName,
                      date: transactionDate,
                      model: (row[2] ?? "").toString(),
                      serial: (row[4] ?? "").toString(),
                      reason: "Missing invoice number",
                    });
                    continue;
                  }

                  const mrp = parseFloat(row[5] || 0);
                  const netValue = parseFloat(row[6] || 0);
                  const discountValue = mrp - netValue;
                  const discountPercentage = mrp !== 0 ? (discountValue / mrp) * 100 : 0;

                  // Cross-check against the file's own Discount Value column
                  const rawDisc = row[7];
                  const fileDiscount =
                    rawDisc === "" || rawDisc === null || rawDisc === undefined
                      ? null
                      : parseFloat(rawDisc);

                  if (fileDiscount !== null && !isNaN(fileDiscount) && Math.abs(fileDiscount - discountValue) > 1) {
                    rejectedRows.push({
                      sheet: sheetName,
                      date: transactionDate,
                      model: (row[2] ?? "").toString(),
                      serial: (row[4] ?? "").toString(),
                      reason: `Discount mismatch: file says ${fileDiscount.toFixed(0)}, but MRP(${mrp.toFixed(0)}) - Net(${netValue.toFixed(0)}) = ${discountValue.toFixed(0)}`,
                    });
                    continue;
                  }

                  allRecords.push({
                    store_code: sheetStoreCode,
                    transaction_date: transactionDate,
                    system_invoice_number: invoiceNumber,
                    model_number: (row[2] ?? "").toString().trim(),
                    quantity: quantity,
                    serial_number: (row[4] ?? "").toString().trim(),
                    mrp: mrp,
                    net_value: netValue,
                    discount_value: parseFloat(discountValue.toFixed(2)),
                    discount_percentage: parseFloat(discountPercentage.toFixed(2)),
                    sold_by: (row[9] ?? "").toString().trim(),
                    family: (row[11] ?? "").toString().trim(),
                    calibre: (row[12] ?? "").toString().trim(),
                    customer_name: (row[16] ?? "").toString().trim(),
                    mobile_number: (row[17] ?? "").toString().trim(),
                  });
                }
              } catch (err) {
                console.error(`Error on sheet ${sheetName}:`, err);
                skippedSheets++;
              }
            }

            // Fail loudly on any bad row - nothing gets uploaded
            if (rejectedRows.length > 0) {
              console.warn("Rejected rows:", rejectedRows);
              const detail = rejectedRows
                .slice(0, 8)
                .map((r) => `${r.sheet} • ${r.date} • ${r.model || "?"} • ${r.serial || "?"}\n    → ${r.reason}`)
                .join("\n");
              let msg = `❌ ${rejectedRows.length} row(s) REJECTED:\n\n${detail}`;
              if (rejectedRows.length > 8) {
                msg += `\n\n...and ${rejectedRows.length - 8} more (see browser console)`;
              }
              msg += `\n\nNothing was uploaded. Fix these rows in the source file and re-upload.`;
              setMessage(msg);
              setMessageType("error");
              setLoading(false);
              return;
            }

            if (allRecords.length === 0) {
              setMessage(`❌ No valid data found. Processed: ${processedSheets} sheets, Skipped: ${skippedSheets} sheets`);
              setMessageType("error");
              setLoading(false);
              return;
            }

            setStage(65, `Uploading ${allRecords.length} records to server...`);

            const userEmail = localStorage.getItem("userEmail") || "unknown";
            const uploadStoreCode = allRecords[0]?.store_code || "UNKNOWN";

            const response = await fetch("/api/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                records: allRecords,
                storeCode: uploadStoreCode,
                userEmail,
              }),
            });

            const result = await response.json();

            if (!response.ok) {
              setMessage(`❌ Upload Failed: ${result.error}`);
              setMessageType("error");
              setLoading(false);
              return;
            }

            let summary = `✅ ${result.recordsInserted} new record(s) uploaded from ${processedSheets} sheet(s).`;
            if (result.duplicatesSkipped > 0) {
              summary += `\n${result.duplicatesSkipped} duplicate(s) skipped (already in database).`;
            }
            if (result.discrepanciesFlagged > 0) {
              summary += `\n⚠ ${result.discrepanciesFlagged} row(s) conflict with existing data — awaiting approval on the Discrepancies page.`;
            }

            // ---- Reconciliation: compare file totals vs database totals per month ----
            setStage(85, "Reconciling database against file...");
            try {
              const fileTotals = {};
              for (const r of allRecords) {
                const ym = r.transaction_date.substring(0, 7);
                if (!fileTotals[ym]) {
                  fileTotals[ym] = { net: 0, mrp: 0, rows: 0 };
                }
                fileTotals[ym].net += r.net_value;
                fileTotals[ym].mrp += r.mrp;
                fileTotals[ym].rows += 1;
              }

              const monthKeys = Object.keys(fileTotals).sort();
              const recon = await fetch(
                `/api/reconcile?storeCode=${uploadStoreCode}&months=${monthKeys.join(",")}`
              );
              const reconResult = await recon.json();

              if (recon.ok && reconResult.data) {
                const ghostWarnings = [];
                const pendingNotes = [];

                for (const ym of monthKeys) {
                  const f = fileTotals[ym];
                  const d = reconResult.data[ym];
                  if (!d) continue;

                  const diff = d.total_net - f.net;

                  if (diff > 1) {
                    ghostWarnings.push(
                      `${ym}: database ₹${Math.round(d.total_net).toLocaleString("en-IN")} vs file ₹${Math.round(f.net).toLocaleString("en-IN")} (+₹${Math.round(diff).toLocaleString("en-IN")}, ${d.row_count - f.rows} extra row(s))`
                    );
                  } else if (diff < -1 && result.discrepanciesFlagged > 0) {
                    pendingNotes.push(
                      `${ym}: database is ₹${Math.round(-diff).toLocaleString("en-IN")} below file — expected, rows are pending approval`
                    );
                  } else if (diff < -1) {
                    ghostWarnings.push(
                      `${ym}: database ₹${Math.round(d.total_net).toLocaleString("en-IN")} is BELOW file ₹${Math.round(f.net).toLocaleString("en-IN")} (−₹${Math.round(-diff).toLocaleString("en-IN")}) — rows missing from database`
                    );
                  }
                }

                if (ghostWarnings.length > 0) {
                  summary += `\n\n🔴 RECONCILIATION MISMATCH — database does not match your file:\n${ghostWarnings.join("\n")}\n\nLikely cause: a previously uploaded row was edited or removed in the file, leaving a stale copy in the database. Contact admin to investigate.`;
                  setStage(100, "Done - with warnings");
                  setMessage(summary);
                  setMessageType("error");
                  setLoading(false);
                  return;
                } else {
                  summary += `\n\n✓ Reconciled: database matches file totals for ${monthKeys.join(", ")}.`;
                  if (pendingNotes.length > 0) {
                    summary += `\n${pendingNotes.join("\n")}`;
                  }
                }
              }
            } catch (reconErr) {
              summary += `\n\n(Reconciliation check could not run: ${reconErr.message})`;
            }

            setStage(100, "Done");
            setMessage(summary);
            setMessageType("success");
            setLoading(false);
            setTimeout(() => router.push("/dashboard"), 3500);
          } catch (err) {
            setMessage(`❌ Error: ${err.message}`);
            setMessageType("error");
            setLoading(false);
          }
        };

        document.head.appendChild(script);
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
      setMessageType("error");
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileType === "sales") {
      handleSalesFileUpload(file);
    } else {
      handleTargetFileUpload(file);
    }

    // allow re-selecting the same file
    e.target.value = "";
  };

  return (
    <div className={styles.container}>
      <h1>📤 Upload & Manage</h1>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "2px solid #ddd" }}>
        <button
          onClick={() => setActiveTab("sales")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "sales" ? "#2196F3" : "transparent",
            color: activeTab === "sales" ? "white" : "#333",
            border: "none",
            cursor: "pointer",
            fontWeight: activeTab === "sales" ? "bold" : "normal",
          }}
        >
          📤 Upload Sales & Targets
        </button>
        <button
          onClick={() => setActiveTab("targets")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "targets" ? "#2196F3" : "transparent",
            color: activeTab === "targets" ? "white" : "#333",
            border: "none",
            cursor: "pointer",
            fontWeight: activeTab === "targets" ? "bold" : "normal",
          }}
        >
          🎯 Manage Targets
        </button>
      </div>

      {/* Progress bar */}
      {loading && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
            <span style={{ fontSize: "12px", color: "#374151", fontWeight: "600" }}>{progressLabel}</span>
            <span style={{ fontSize: "12px", color: "#6b7280" }}>{progress}%</span>
          </div>
          <div style={{
            width: "100%",
            height: "10px",
            backgroundColor: "#e5e7eb",
            borderRadius: "6px",
            overflow: "hidden",
          }}>
            <div style={{
              width: `${progress}%`,
              height: "100%",
              backgroundColor: "#2196F3",
              borderRadius: "6px",
              transition: "width 0.3s ease",
            }} />
          </div>
        </div>
      )}

      {message && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            borderRadius: "4px",
            whiteSpace: "pre-wrap",
            fontFamily: "monospace",
            fontSize: "12px",
            lineHeight: "1.6",
            backgroundColor:
              messageType === "success" ? "#dcfce7" : messageType === "error" ? "#fee2e2" : "#dbeafe",
            color:
              messageType === "success" ? "#166534" : messageType === "error" ? "#991b1b" : "#1e40af",
            border:
              messageType === "success"
                ? "1px solid #86efac"
                : messageType === "error"
                ? "1px solid #fca5a5"
                : "1px solid #93c5fd",
          }}
        >
          {message}
        </div>
      )}

      {activeTab === "sales" && (
        <div>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ fontWeight: "bold", marginBottom: "0.5rem", display: "block" }}>
              Select File Type:
            </label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              style={{
                padding: "0.75rem",
                borderRadius: "4px",
                border: "1px solid #ccc",
                fontSize: "14px",
                width: "100%",
                maxWidth: "300px",
              }}
            >
              <option value="sales">Sales Data File</option>
              <option value="target">Sales Target File</option>
            </select>
          </div>

          <div
            style={{
              backgroundColor: "#e3f2fd",
              padding: "1rem",
              borderRadius: "4px",
              marginBottom: "1.5rem",
              fontSize: "13px",
              color: "#1565c0",
            }}
          >
            {fileType === "sales" ? (
              <p>
                📊 <strong>Sales Data File.</strong> Rows are rejected if: invoice number is
                missing, qty is not 1 / -1 (one row per serial), or MRP − Net doesn't match the
                stated Discount. If any row fails, nothing is uploaded.
              </p>
            ) : (
              <p>
                🎯 <strong>Sales Target File:</strong> Store Code | Store Name | Month (1-12) | Year
                | Value Target | Calibre 1 | Qty | Calibre 2 | Qty | Calibre 3 | Qty
              </p>
            )}
          </div>

          <div
            style={{
              border: "2px dashed #ccc",
              padding: "2rem",
              textAlign: "center",
              borderRadius: "8px",
              marginTop: "2rem",
            }}
          >
            <input
              type="file"
              accept={fileType === "sales" ? ".xlsx,.xls" : ".csv,.xlsx,.xls"}
              onChange={handleFileUpload}
              disabled={loading}
            />
          </div>
        </div>
      )}

      {activeTab === "targets" && (
        <div>
          <div
            style={{
              backgroundColor: "#f5f5f5",
              padding: "1.5rem",
              borderRadius: "8px",
              marginBottom: "2rem",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            <div>
              <label>Store:</label>
              <select value={filterStore} onChange={(e) => setFilterStore(e.target.value)}>
                <option value="all">All Stores</option>
                {stores.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Month:</label>
              <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                <option value="all">All Months</option>
                {months.map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Year:</label>
              <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                <option value="all">All Years</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {targetsError && (
            <div
              style={{
                padding: "1rem",
                marginBottom: "1rem",
                borderRadius: "4px",
                backgroundColor: "#fee2e2",
                color: "#991b1b",
                border: "1px solid #fca5a5",
              }}
            >
              ❌ {targetsError}
            </div>
          )}

          {targetsLoading && <p>Loading targets...</p>}

          {!targetsLoading && targets.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", border: "1px solid #ddd" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f0f0f0" }}>
                    <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "left", minWidth: "80px" }}>Store</th>
                    <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center", minWidth: "50px" }}>Month</th>
                    <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center", minWidth: "50px" }}>Year</th>
                    <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "right", minWidth: "100px" }}>Value Target</th>
                    <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center", minWidth: "65px" }}>Cal 1</th>
                    <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center", minWidth: "50px" }}>Qty</th>
                    <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center", minWidth: "65px" }}>Cal 2</th>
                    <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center", minWidth: "50px" }}>Qty</th>
                    <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center", minWidth: "65px" }}>Cal 3</th>
                    <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center", minWidth: "50px" }}>Qty</th>
                    <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center", minWidth: "75px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {targets.map((target) => (
                    <tr key={target.id} style={{ borderBottom: "1px solid #ddd" }}>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>{target.store_code}</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center" }}>{String(target.target_month).padStart(2, "0")}</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center" }}>{target.target_year}</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd", textAlign: "right" }}>₹{formatIndianNumber(target.value_target)}</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center", fontSize: "10px" }}>{target.calibre_1_name || "-"}</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center" }}>{target.calibre_1_qty_target || "-"}</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center", fontSize: "10px" }}>{target.calibre_2_name || "-"}</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center" }}>{target.calibre_2_qty_target || "-"}</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center", fontSize: "10px" }}>{target.calibre_3_name || "-"}</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center" }}>{target.calibre_3_qty_target || "-"}</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center", whiteSpace: "nowrap" }}>
                        <button
                          onClick={() => handleDeleteTarget(target.id)}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "#f44336",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                            fontSize: "11px",
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!targetsLoading && targets.length === 0 && (
            <p style={{ textAlign: "center", color: "#999", marginTop: "2rem" }}>
              No targets found. Upload targets from the Upload Sales & Targets tab.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
