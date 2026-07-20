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

const inr = (n) => Math.round(n).toLocaleString("en-IN");

export default function Upload() {
  const [activeTab, setActiveTab] = useState("sales");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [fileType, setFileType] = useState("sales");
  const [userRole, setUserRole] = useState("");

  // Progress bar state
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");

  // Targets state
  const [targets, setTargets] = useState([]);
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [targetsError, setTargetsError] = useState("");
  const [filterStore, setFilterStore] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [stores, setStores] = useState([]);
  const [years, setYears] = useState([]);

  // Integrity check state
  const [integrityData, setIntegrityData] = useState(null);
  const [integrityResult, setIntegrityResult] = useState(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [selectedGhosts, setSelectedGhosts] = useState([]);

  // Download state
  const [exportStores, setExportStores] = useState([]);
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");

  const VALID_STORE_CODES = [
    "SBTEXACHN", "SBTFALBLR", "SBTSCMKOL", "SBTBRVMUM", "SBTDLFNOI",
    "SBTPMCCHN", "SBTSKYMUM", "SBTBLRMUM", "SBTMKSBLR", "SWSPMCPNE",
    "SWSMOABLR", "SWSPHCIND", "SWSNEMCGH", "SWSPMCMUM", "SWSPMMPNE",
    "SWSSCMHYD", "SWSLULKOC", "SWSCAMKOL", "SWSUNMDEL", "SWSPHPLUK",
    "SWSPMCBLR",
    "GSSEXACHN", "GSSMOABLR", "GSSPPMMUM", "GSSSLCDEL", "GSSUBCBLR",
  ];

  const MONTH_MAP = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8,
    sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    setUserRole(localStorage.getItem("userRole") || "");
  }, []);

  useEffect(() => {
    if (activeTab === "targets") {
      fetchTargets();
    }
  }, [activeTab, filterStore, filterMonth, filterYear]);

  const setStage = (percent, label) => {
    setProgress(Math.min(100, Math.round(percent)));
    setProgressLabel(label);
  };

  const toggleExportStore = (code) => {
    setExportStores((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
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
    return columnName.toString().toLowerCase().includes("date");
  };

  // STRICT date parser. Returns "YYYY-MM-DD" or "" (never a raw passthrough).
  // Accepts: Excel serial numbers, "DD-MM-YYYY" (dashes), "M/D/YY" or "MM/DD/YYYY" (slashes).
  const parseDate = (dateValue) => {
    let result = "";

    if (dateValue === null || dateValue === undefined || dateValue === "") return "";

    if (typeof dateValue === "number") {
      const date = new Date((dateValue - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        result = date.toISOString().split("T")[0];
      }
    } else if (typeof dateValue === "string") {
      const s = dateValue.trim();

      const dashMatch = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);

      if (dashMatch) {
        // DD-MM-YYYY
        const [, d, m, y] = dashMatch;
        const date = new Date(Number(y), Number(m) - 1, Number(d));
        if (!isNaN(date.getTime()) && date.getDate() === Number(d) && date.getMonth() === Number(m) - 1) {
          result = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        }
      } else if (slashMatch) {
        // M/D/YY or MM/DD/YYYY (US order - this is how Excel emits text dates)
        let [, m, d, y] = slashMatch;
        let year = Number(y);
        if (year < 100) year += 2000;
        const date = new Date(year, Number(m) - 1, Number(d));
        if (!isNaN(date.getTime()) && date.getDate() === Number(d) && date.getMonth() === Number(m) - 1) {
          result = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        }
      } else if (isoMatch) {
        result = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
      }
    }

    // Final gate: must be a real YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) return "";
    return result;
  };

  // "April-26" / "April 26" / "Apr-2026" -> "2026-04"; null if the name isn't a month sheet
  const sheetMonthFromName = (sheetName) => {
    const m = sheetName.trim().toLowerCase().match(/^([a-z]+)[\s-]+(\d{2,4})$/);
    if (!m) return null;
    const mon = MONTH_MAP[m[1]];
    if (!mon) return null;
    let year = parseInt(m[2]);
    if (year < 100) year += 2000;
    return `${year}-${String(mon).padStart(2, "0")}`;
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

  const loadXLSX = () =>
    new Promise((resolve, reject) => {
      if (window.XLSX) return resolve(window.XLSX);
      const script = document.createElement("script");
      script.src = "https://cdn.sheetjs.com/xlsx-0.18.5/package/dist/xlsx.full.min.js";
      script.onload = () => resolve(window.XLSX);
      script.onerror = () => reject(new Error("Failed to load Excel library"));
      document.head.appendChild(script);
    });

  const readFileAsArrayBuffer = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsArrayBuffer(file);
    });

  const handleDownload = () => {
    const params = new URLSearchParams();
    if (exportStores.length > 0) params.append("storeCodes", exportStores.join(","));
    if (exportStart) params.append("startDate", exportStart);
    if (exportEnd) params.append("endDate", exportEnd);
    window.location.href = `/api/sales-export?${params.toString()}`;
  };

  // ---------------------------------------------------------------
  // Integrity check handlers
  // ---------------------------------------------------------------
  const runIntegrityCheck = async () => {
    if (!integrityData) return;
    setIntegrityLoading(true);
    setIntegrityResult(null);
    setSelectedGhosts([]);
    try {
      const response = await fetch("/api/integrity-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(integrityData),
      });
      const result = await response.json();
      if (!response.ok) {
        alert(`Check failed: ${result.error}`);
      } else {
        setIntegrityResult(result);
        setSelectedGhosts(result.ghosts.map((g) => g.id));
      }
    } catch (err) {
      alert(`Check failed: ${err.message}`);
    } finally {
      setIntegrityLoading(false);
    }
  };

  const deleteSelectedGhosts = async () => {
    if (selectedGhosts.length === 0) return;
    const ghostRows = integrityResult.ghosts.filter((g) => selectedGhosts.includes(g.id));
    const total = ghostRows.reduce((s, g) => s + parseFloat(g.net_value || 0), 0);

    if (!confirm(
      `Delete ${selectedGhosts.length} row(s) totalling ₹${inr(total)} from the database?\n\nThis cannot be undone.`
    )) return;

    setIntegrityLoading(true);
    try {
      const userEmail = localStorage.getItem("userEmail") || "unknown";
      const response = await fetch("/api/integrity-check", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedGhosts,
          storeCode: integrityData.storeCode,
          userEmail,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        alert(`Delete failed: ${result.error}`);
      } else {
        setMessage(
          (prev) => prev + `\n\n🧹 Cleanup done: ${result.deleted} row(s) removed (₹${inr(result.deletedValue)}). Re-upload the file to verify reconciliation.`
        );
        setIntegrityResult(null);
        setIntegrityData(null);
        setSelectedGhosts([]);
      }
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setIntegrityLoading(false);
    }
  };

  const toggleGhost = (id) => {
    setSelectedGhosts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ---------------------------------------------------------------
  // Process ONE sales file end-to-end. Returns { ok, text }.
  // ---------------------------------------------------------------
  const processSalesFile = async (file, XLSX, pBase, pSpan) => {
    const buffer = await readFileAsArrayBuffer(file);
    const workbook = XLSX.read(buffer, { type: "array" });

    const allRecords = [];
    const rejectedRows = [];
    let processedSheets = 0;
    let skippedSheets = 0;

    const totalSheets = workbook.SheetNames.length;
    let sheetIdx = 0;

    for (const sheetName of workbook.SheetNames) {
      sheetIdx++;
      setStage(
        pBase + (sheetIdx / totalSheets) * pSpan * 0.6,
        `${file.name} — parsing sheet ${sheetIdx}/${totalSheets}: ${sheetName}`
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

        // Month lock: sheet "April-26" only accepts dates in 2026-04
        const sheetYM = sheetMonthFromName(sheetName);

        processedSheets++;

        for (const row of dataRows) {
          const rawDate = row[dateColumnIndex];
          const quantity = parseInt(row[3] || 0);

          if ((rawDate === "" || rawDate === null) && (isNaN(quantity) || quantity === 0)) continue;
          if (isNaN(quantity) || quantity === 0) continue;

          const transactionDate = parseDate(rawDate);

          // Strict date gate: unparseable date = rejected row, never silent
          if (!transactionDate) {
            rejectedRows.push({
              sheet: sheetName,
              date: String(rawDate),
              model: (row[2] ?? "").toString(),
              serial: (row[4] ?? "").toString(),
              reason: `Unrecognized date "${rawDate}" — must be a real date (DD-MM-YYYY, M/D/YY, or Excel date cell)`,
            });
            continue;
          }

          // Month lock
          if (sheetYM && transactionDate.substring(0, 7) !== sheetYM) {
            rejectedRows.push({
              sheet: sheetName,
              date: transactionDate,
              model: (row[2] ?? "").toString(),
              serial: (row[4] ?? "").toString(),
              reason: `Date ${transactionDate} doesn't belong in sheet "${sheetName}" (expected ${sheetYM}). Check for swapped day/month or a wrong year.`,
            });
            continue;
          }

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

    // Fail loudly per file
    if (rejectedRows.length > 0) {
      console.warn(`Rejected rows in ${file.name}:`, rejectedRows);
      const detail = rejectedRows
        .slice(0, 10)
        .map((r) => `${r.sheet} • ${r.date} • ${r.model || "?"} • ${r.serial || "?"}\n    → ${r.reason}`)
        .join("\n");
      let text = `❌ ${rejectedRows.length} row(s) REJECTED:\n${detail}`;
      if (rejectedRows.length > 10) {
        text += `\n...and ${rejectedRows.length - 10} more (see browser console)`;
      }
      text += `\nNothing from this file was uploaded. Fix these rows and re-upload.`;
      return { ok: false, text };
    }

    if (allRecords.length === 0) {
      return {
        ok: false,
        text: `❌ No valid data found. Processed: ${processedSheets} sheet(s), Skipped: ${skippedSheets} sheet(s)`,
      };
    }

    // File-level totals for the report
    const fileQty = allRecords.reduce((s, r) => s + r.quantity, 0);
    const fileMrp = allRecords.reduce((s, r) => s + r.mrp, 0);
    const fileNet = allRecords.reduce((s, r) => s + r.net_value, 0);

    setStage(pBase + pSpan * 0.65, `${file.name} — uploading ${allRecords.length} records...`);

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
      return { ok: false, text: `❌ Upload Failed: ${result.error}` };
    }

    let text = `✅ ${result.recordsInserted} new record(s) uploaded from ${processedSheets} sheet(s).`;
    text += `\nFile totals: qty ${fileQty} | MRP ₹${inr(fileMrp)} | Net ₹${inr(fileNet)}`;
    if (result.duplicatesSkipped > 0) {
      text += `\n${result.duplicatesSkipped} duplicate(s) skipped (already in database).`;
    }
    if (result.discrepanciesFlagged > 0) {
      text += `\n⚠ ${result.discrepanciesFlagged} row(s) conflict with existing data — awaiting approval on the Approvals page.`;
    }

    // Reconciliation
    setStage(pBase + pSpan * 0.85, `${file.name} — reconciling against database...`);
    let hadGhosts = false;
    try {
      const fileTotals = {};
      for (const r of allRecords) {
        const ym = r.transaction_date.substring(0, 7);
        if (!fileTotals[ym]) {
          fileTotals[ym] = { net: 0, mrp: 0, qty: 0, rows: 0 };
        }
        fileTotals[ym].net += r.net_value;
        fileTotals[ym].mrp += r.mrp;
        fileTotals[ym].qty += r.quantity;
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
        const monthLines = [];

        for (const ym of monthKeys) {
          const f = fileTotals[ym];
          const d = reconResult.data[ym];
          if (!d) continue;

          const diff = d.total_net - f.net;

          monthLines.push(
            `${ym}: ${f.rows} rows | qty ${f.qty} | MRP ₹${inr(f.mrp)} | Net ₹${inr(f.net)}`
          );

          if (diff > 1) {
            ghostWarnings.push(
              `${ym}: database ₹${inr(d.total_net)} vs file ₹${inr(f.net)} (+₹${inr(diff)}, ${d.row_count - f.rows} extra row(s))`
            );
          } else if (diff < -1 && result.discrepanciesFlagged > 0) {
            pendingNotes.push(
              `${ym}: database is ₹${inr(-diff)} below file — expected, rows are pending approval`
            );
          } else if (diff < -1) {
            ghostWarnings.push(
              `${ym}: database ₹${inr(d.total_net)} is BELOW file ₹${inr(f.net)} (−₹${inr(-diff)}) — rows missing from database`
            );
          }
        }

        text += `\nPer month:\n${monthLines.join("\n")}`;

        if (ghostWarnings.length > 0) {
          hadGhosts = true;
          text += `\n🔴 RECONCILIATION MISMATCH:\n${ghostWarnings.join("\n")}\nUse the Investigate button below to see and fix the exact rows.`;
          setIntegrityData({
            storeCode: uploadStoreCode,
            months: monthKeys,
            fileRows: allRecords.map((r) => ({
              system_invoice_number: r.system_invoice_number,
              serial_number: r.serial_number,
              quantity: r.quantity,
              transaction_date: r.transaction_date,
              model_number: r.model_number,
              net_value: r.net_value,
            })),
          });
        } else {
          text += `\n✓ Reconciled: database matches file totals for ${monthKeys.join(", ")}.`;
          if (pendingNotes.length > 0) {
            text += `\n${pendingNotes.join("\n")}`;
          }
        }
      }
    } catch (reconErr) {
      text += `\n(Reconciliation check could not run: ${reconErr.message})`;
    }

    return { ok: !hadGhosts, text };
  };

  // ---------------------------------------------------------------
  // Process ONE target file. Returns { ok, text }.
  // ---------------------------------------------------------------
  const processTargetFile = async (file, XLSX, pBase, pSpan) => {
    const buffer = await readFileAsArrayBuffer(file);
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    setStage(pBase + pSpan * 0.3, `${file.name} — parsing target data...`);

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
      return { ok: false, text: "❌ No valid target data found in file." };
    }

    setStage(pBase + pSpan * 0.6, `${file.name} — uploading ${targetRecords.length} target records...`);

    const userEmail = localStorage.getItem("userEmail") || "unknown";

    const response = await fetch("/api/targets-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: targetRecords, uploadedBy: userEmail }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { ok: false, text: `❌ Upload Failed: ${result.error}` };
    }

    return { ok: true, text: `✅ Uploaded ${result.recordsInserted} target records` };
  };

  // ---------------------------------------------------------------
  // Driver: processes ALL selected files sequentially
  // ---------------------------------------------------------------
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    setLoading(true);
    setMessage("");
    setMessageType("info");
    setIntegrityData(null);
    setIntegrityResult(null);
    setSelectedGhosts([]);
    setStage(2, "Loading Excel library...");

    let XLSX;
    try {
      XLSX = await loadXLSX();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
      setMessageType("error");
      setLoading(false);
      return;
    }

    const results = [];
    const span = 96 / files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const pBase = 2 + i * span;
      setStage(pBase, `File ${i + 1}/${files.length}: ${file.name}`);

      try {
        const result =
          fileType === "sales"
            ? await processSalesFile(file, XLSX, pBase, span)
            : await processTargetFile(file, XLSX, pBase, span);
        results.push({ name: file.name, ...result });
      } catch (err) {
        results.push({ name: file.name, ok: false, text: `❌ Error: ${err.message}` });
      }
    }

    setStage(100, "Done");

    const anyFailed = results.some((r) => !r.ok);
    const report =
      files.length === 1
        ? results[0].text
        : results.map((r) => `━━ ${r.name} ━━\n${r.text}`).join("\n\n");

    setMessage(report);
    setMessageType(anyFailed ? "error" : "success");
    setLoading(false);

    if (fileType === "target") {
      fetchTargets();
    }
  };

  const tabStyle = (tab) => ({
    padding: "10px 20px",
    backgroundColor: activeTab === tab ? "#2196F3" : "transparent",
    color: activeTab === tab ? "white" : "#333",
    border: "none",
    cursor: "pointer",
    fontWeight: activeTab === tab ? "bold" : "normal",
  });

  return (
    <div className={styles.container}>
      <h1>📤 Upload & Manage</h1>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "2px solid #ddd" }}>
        <button onClick={() => setActiveTab("sales")} style={tabStyle("sales")}>
          📤 Upload Sales & Targets
        </button>
        <button onClick={() => setActiveTab("targets")} style={tabStyle("targets")}>
          🎯 Manage Targets
        </button>
        {userRole === "admin" && (
          <button onClick={() => setActiveTab("download")} style={tabStyle("download")}>
            📥 Download Data
          </button>
        )}
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

      {/* Integrity Check panel */}
      {integrityData && !integrityResult && (
        <div style={{ marginBottom: "1.5rem" }}>
          <button
            onClick={runIntegrityCheck}
            disabled={integrityLoading}
            style={{
              padding: "0.6rem 1.2rem",
              backgroundColor: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            {integrityLoading ? "Checking..." : "🔍 Investigate mismatch"}
          </button>
        </div>
      )}

      {integrityResult && (
        <div style={{
          marginBottom: "1.5rem",
          border: "1px solid #fca5a5",
          borderRadius: "8px",
          padding: "1rem",
          backgroundColor: "#fff",
        }}>
          <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "15px" }}>
            🔍 Integrity report — {integrityData.storeCode}
          </h3>

          {integrityResult.ghosts.length > 0 && (
            <>
              <p style={{ fontSize: "13px", marginBottom: "0.5rem" }}>
                <strong>{integrityResult.ghosts.length} row(s) in the database but NOT in your file</strong>{" "}
                (total ₹{inr(integrityResult.ghostTotal)}) — stale copies or misattributed data:
              </p>
              <div style={{ maxHeight: "260px", overflowY: "auto", border: "1px solid #eee", borderRadius: "6px", marginBottom: "0.75rem" }}>
                <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f9fafb", position: "sticky", top: 0 }}>
                      <th style={{ padding: "6px", textAlign: "left" }}>
                        <input
                          type="checkbox"
                          checked={selectedGhosts.length === integrityResult.ghosts.length}
                          onChange={(e) =>
                            setSelectedGhosts(e.target.checked ? integrityResult.ghosts.map((g) => g.id) : [])
                          }
                        />
                      </th>
                      <th style={{ padding: "6px", textAlign: "left" }}>Date</th>
                      <th style={{ padding: "6px", textAlign: "left" }}>Invoice</th>
                      <th style={{ padding: "6px", textAlign: "left" }}>Model</th>
                      <th style={{ padding: "6px", textAlign: "left" }}>Serial</th>
                      <th style={{ padding: "6px", textAlign: "right" }}>Net ₹</th>
                      <th style={{ padding: "6px", textAlign: "left" }}>Uploaded by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {integrityResult.ghosts.map((g) => (
                      <tr key={g.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "6px" }}>
                          <input
                            type="checkbox"
                            checked={selectedGhosts.includes(g.id)}
                            onChange={() => toggleGhost(g.id)}
                          />
                        </td>
                        <td style={{ padding: "6px" }}>{g.transaction_date}</td>
                        <td style={{ padding: "6px" }}>{g.system_invoice_number}</td>
                        <td style={{ padding: "6px" }}>{g.model_number}</td>
                        <td style={{ padding: "6px" }}>{g.serial_number}</td>
                        <td style={{ padding: "6px", textAlign: "right" }}>{inr(g.net_value)}</td>
                        <td style={{ padding: "6px" }}>{g.upload_info}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {userRole === "admin" ? (
                <button
                  onClick={deleteSelectedGhosts}
                  disabled={integrityLoading || selectedGhosts.length === 0}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: selectedGhosts.length > 0 ? "#dc2626" : "#e5e7eb",
                    color: selectedGhosts.length > 0 ? "white" : "#9ca3af",
                    border: "none",
                    borderRadius: "6px",
                    cursor: selectedGhosts.length > 0 ? "pointer" : "not-allowed",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                >
                  🗑 Delete {selectedGhosts.length} selected row(s)
                </button>
              ) : (
                <p style={{ fontSize: "12px", color: "#991b1b" }}>
                  Only an admin can delete these rows. Share this report with your admin.
                </p>
              )}
            </>
          )}

          {integrityResult.missing.length > 0 && (
            <p style={{ fontSize: "12px", marginTop: "0.75rem", color: "#6b7280" }}>
              ℹ {integrityResult.missing.length} row(s) in your file are not in the database — these are
              either pending approval or were held back by validation. No action needed here.
            </p>
          )}

          {integrityResult.ghosts.length === 0 && integrityResult.missing.length === 0 && (
            <p style={{ fontSize: "13px" }}>No differences found — database and file agree at row level.</p>
          )}
        </div>
      )}

      {/* TAB 1: Upload */}
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
                📊 <strong>Sales Data File(s).</strong> You can select multiple files — processed one
                at a time. Rows are rejected if: the date is unreadable or doesn't match the sheet's
                month, invoice number is missing, qty is not 1 / -1, or MRP − Net doesn't match the
                stated Discount. A file with any bad row uploads nothing from that file.
              </p>
            ) : (
              <p>
                🎯 <strong>Sales Target File(s):</strong> Store Code | Store Name | Month (1-12) |
                Year | Value Target | Calibre 1 | Qty | Calibre 2 | Qty | Calibre 3 | Qty
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
              multiple
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

      {/* TAB 3: Download Data (admin only) */}
      {activeTab === "download" && userRole === "admin" && (
        <div>
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
            <p>
              📥 <strong>Consolidated Sales Data (CSV).</strong> Tick stores to include —
              leave all unticked to download every store. Dates optional.
            </p>
          </div>

          <div style={{ backgroundColor: "#f5f5f5", padding: "1.5rem", borderRadius: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <label style={{ fontSize: "13px", fontWeight: "600" }}>
                Stores {exportStores.length > 0 ? `(${exportStores.length} selected)` : "(all)"}
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => setExportStores([...VALID_STORE_CODES])}
                  style={{ padding: "4px 10px", fontSize: "11px", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", backgroundColor: "white" }}
                >
                  Select all
                </button>
                <button
                  onClick={() => setExportStores([])}
                  style={{ padding: "4px 10px", fontSize: "11px", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", backgroundColor: "white" }}
                >
                  Clear
                </button>
              </div>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "0.4rem",
              maxHeight: "220px",
              overflowY: "auto",
              backgroundColor: "white",
              border: "1px solid #ddd",
              borderRadius: "6px",
              padding: "0.75rem",
              marginBottom: "1.25rem",
            }}>
              {VALID_STORE_CODES.slice().sort().map((code) => (
                <label key={code} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "12px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={exportStores.includes(code)}
                    onChange={() => toggleExportStore(code)}
                  />
                  {code}
                </label>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", alignItems: "end" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "13px", fontWeight: "600" }}>From (optional)</label>
                <input
                  type="date"
                  value={exportStart}
                  onChange={(e) => setExportStart(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem", borderRadius: "4px", border: "1px solid #ccc" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "13px", fontWeight: "600" }}>To (optional)</label>
                <input
                  type="date"
                  value={exportEnd}
                  onChange={(e) => setExportEnd(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem", borderRadius: "4px", border: "1px solid #ccc" }}
                />
              </div>
              <div>
                <button
                  onClick={handleDownload}
                  style={{
                    width: "100%",
                    padding: "0.7rem 1rem",
                    backgroundColor: "#2196F3",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  📥 Download CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
