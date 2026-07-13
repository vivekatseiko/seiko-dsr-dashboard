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

  // Targets Management State
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
          const uniqueStores = [...new Set(result.data.map(t => t.store_code))].sort();
          const uniqueYears = [...new Set(result.data.map(t => t.target_year))].sort((a, b) => b - a);
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

  const isValidStoreCode = (code) => {
    if (!code) return false;
    const upperCode = code.toString().toUpperCase();
    return VALID_STORE_CODES.includes(upperCode);
  };

  const isDateColumn = (columnName) => {
    if (!columnName) return false;
    const name = columnName.toString().toLowerCase();
    return name.includes("date") || name.includes("transaction date") || name.includes("invoice date");
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

  const handleTargetFileUpload = async (file) => {
    setLoading(true);
    setMessage("Reading target file...");
    setMessageType("info");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          setMessage("Loading Excel library...");

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
              const sheet = workbook.Sheets[workbook.SheetNames[0]];
              const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

              setMessage("Parsing target data...");

              let targetRecords = [];
              let processedRows = 0;

              for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length < 7) continue;

                const storeCode = row[0]?.toString().toUpperCase().trim();
                const month = parseInt(row[2]);
                const year = parseInt(row[3]);
                const valueTarget = parseFloat(row[4]);

                if (!isValidStoreCode(storeCode) || !month || !year || !valueTarget || month < 1 || month > 12) {
                  console.log(`⚠️ Skipping row ${i + 1}: Invalid data`);
                  continue;
                }

                const record = {
                  store_code: storeCode,
                  target_month: month,
                  target_year: year,
                  value_target: valueTarget,
                  calibre_1_name: row[5] || null,
                  calibre_1_qty_target: row[6] ? parseInt(row[6]) : null,
                  calibre_2_name: row[7] || null,
                  calibre_2_qty_target: row[8] ? parseInt(row[8]) : null,
                  calibre_3_name: row[9] || null,
                  calibre_3_qty_target: row[10] ? parseInt(row[10]) : null,
                };

                targetRecords.push(record);
                processedRows++;
              }

              if (targetRecords.length === 0) {
                setMessage("❌ No valid target data found in file.");
                setMessageType("error");
                setLoading(false);
                return;
              }

              setMessage(`Found ${targetRecords.length} target records. Uploading...`);

              const userEmail = localStorage.getItem("userEmail") || "unknown";

              const response = await fetch("/api/targets-upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  records: targetRecords,
                  uploadedBy: userEmail,
                }),
              });

              const result = await response.json();

              if (!response.ok) {
                setMessage(`❌ Upload Failed: ${result.error}`);
                setMessageType("error");
                setLoading(false);
                return;
              }

              setMessage(`✅ Success! Uploaded ${result.recordsInserted} target records`);
              setMessageType("success");
              setLoading(false);
              setTimeout(() => {
                setMessage("");
                fetchTargets();
              }, 2000);
            } catch (err) {
              console.error("Error:", err);
              setMessage(`❌ Error: ${err.message}`);
              setMessageType("error");
              setLoading(false);
            }
          };

          document.head.appendChild(script);
        } catch (err) {
          console.error("Error:", err);
          setMessage(`❌ Error: ${err.message}`);
          setMessageType("error");
          setLoading(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error("Error:", err);
      setMessage(`❌ Error: ${err.message}`);
      setMessageType("error");
      setLoading(false);
    }
  };

  const handleSalesFileUpload = async (file) => {
    setLoading(true);
    setMessage("Reading Excel file...");
    setMessageType("info");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          setMessage("Loading Excel library...");

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

              setMessage(`Found ${workbook.SheetNames.length} sheets. Processing...`);

              let allRecords = [];
              let processedSheets = 0;
              let skippedSheets = 0;

              for (const sheetName of workbook.SheetNames) {
                try {
                  const sheet = workbook.Sheets[sheetName];

                  const storeCodeCell = sheet["B3"];
                  const sheetStoreCode = storeCodeCell?.v;

                  if (!sheetStoreCode) {
                    console.log(`Skipping sheet "${sheetName}" - store code missing in B3`);
                    skippedSheets++;
                    continue;
                  }

                  if (!isValidStoreCode(sheetStoreCode)) {
                    console.log(`Skipping sheet "${sheetName}" - store code "${sheetStoreCode}" not in master list`);
                    skippedSheets++;
                    continue;
                  }

                  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

                  if (!rows || rows.length === 0) {
                    console.log(`Skipping sheet "${sheetName}" - no rows`);
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
                    console.log(`Skipping sheet "${sheetName}" - no Date column found`);
                    skippedSheets++;
                    continue;
                  }

                  let dataRows = rows.slice(headerRowIndex + 1).filter((row) => row[dateColumnIndex]);

                  if (dataRows.length === 0) {
                    console.log(`Skipping sheet "${sheetName}" - no data rows after headers`);
                    skippedSheets++;
                    continue;
                  }

                  if (isDateColumn(dataRows[0][dateColumnIndex])) {
                    console.log(`Removing duplicate header row from data`);
                    dataRows = dataRows.slice(1);
                  }

                  if (dataRows.length === 0) {
                    console.log(`Skipping sheet "${sheetName}" - no data rows after removing headers`);
                    skippedSheets++;
                    continue;
                  }

                  const firstDataValue = dataRows[0][dateColumnIndex];
                  const parsedDate = parseDate(firstDataValue);

                  if (!parsedDate) {
                    console.log(`Skipping sheet "${sheetName}" - invalid date format: ${firstDataValue}`);
                    skippedSheets++;
                    continue;
                  }

                  processedSheets++;
                  console.log(`Processing sheet "${sheetName}" (store: ${sheetStoreCode}) with ${dataRows.length} rows`);

                  for (const row of dataRows) {
                    const transactionDate = parseDate(row[dateColumnIndex]);
                    const quantity = parseInt(row[3] || 0);

                    if (!transactionDate || isNaN(quantity) || quantity === 0) continue;

                    const mrp = parseFloat(row[5] || 0);
                    const netValue = parseFloat(row[6] || 0);

                    const discountValue = mrp - netValue;
                    const discountPercentage = mrp > 0 ? (discountValue / mrp) * 100 : 0;

                    const record = {
                      store_code: sheetStoreCode.toString().toUpperCase(),
                      transaction_date: transactionDate,
                      system_invoice_number: row[1] || "",
                      model_number: row[2] || "",
                      quantity: quantity,
                      serial_number: row[4] || "",
                      mrp: mrp,
                      net_value: netValue,
                      discount_value: parseFloat(discountValue.toFixed(2)),
                      discount_percentage: parseFloat(discountPercentage.toFixed(2)),
                      sold_by: row[9] || "",
                      family: row[11] || "",
                      calibre: row[12] || "",
                      customer_name: row[16] || "",
                      mobile_number: row[17] || "",
                    };

                    allRecords.push(record);
                  }
                } catch (err) {
                  console.error(`Error processing sheet ${sheetName}:`, err);
                  skippedSheets++;
                }
              }

              if (allRecords.length === 0) {
                setMessage(`❌ No valid data found. Processed: ${processedSheets} sheets, Skipped: ${skippedSheets} sheets`);
                setMessageType("error");
                setLoading(false);
                return;
              }

              setMessage(`Found ${allRecords.length} records from ${processedSheets} sheet(s). Uploading... (Skipped: ${skippedSheets})`);

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

              setMessage(
                `✅ Success! Uploaded ${result.recordsInserted} records from ${processedSheets} sheets (${skippedSheets} skipped)`
              );
              setMessageType("success");
              setTimeout(() => router.push("/dashboard"), 2000);
            } catch (err) {
              console.error("Error:", err);
              setMessage(`❌ Error: ${err.message}`);
              setMessageType("error");
              setLoading(false);
            }
          };

          document.head.appendChild(script);
        } catch (err) {
          console.error("Error:", err);
          setMessage(`❌ Error: ${err.message}`);
          setMessageType("error");
          setLoading(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error("Error:", err);
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
  };

  return (
    <div className={styles.container}>
      <h1>📤 Upload & Manage</h1>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "2rem",
          borderBottom: "2px solid #ddd",
        }}
      >
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

      {/* Message */}
      {message && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            borderRadius: "4px",
            backgroundColor:
              messageType === "success"
                ? "#dcfce7"
                : messageType === "error"
                ? "#fee2e2"
                : "#dbeafe",
            color:
              messageType === "success"
                ? "#166534"
                : messageType === "error"
                ? "#991b1b"
                : "#1e40af",
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

      {/* TAB 1: Upload Sales & Targets */}
      {activeTab === "sales" && (
        <div>
          {/* File Type Selector */}
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

          {/* Instructions */}
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
              <p>📊 <strong>Sales Data File:</strong> Upload Excel file with monthly sheets containing sales transactions (Date, Invoice #, Model, etc.)</p>
            ) : (
              <p>🎯 <strong>Sales Target File:</strong> Upload CSV/Excel with columns: Store Code | Store Name | Month (1-12) | Year | Value Target | Calibre 1 | Qty | Calibre 2 | Qty | Calibre 3 | Qty</p>
            )}
          </div>

          {/* File Upload */}
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

      {/* TAB 2: Manage Targets */}
      {activeTab === "targets" && (
        <div>
          {/* Filters */}
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

          {/* Error */}
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

          {/* Loading */}
          {targetsLoading && <p>Loading targets...</p>}

          {/* Table */}
          {!targetsLoading && targets.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "11px",
                  border: "1px solid #ddd",
                }}
              >
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
                      <td style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center" }}>{String(target.target_month).padStart(2, '0')}</td>
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
