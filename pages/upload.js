import { useState } from "react";
import { useRouter } from "next/router";

export default function Upload() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // Master list of valid store codes
  const VALID_STORE_CODES = [
    "SBTEXACHN",
    "SBTFALBLR",
    "SBTSCMKOL",
    "SBTBRVMUM",
    "SBTDLFNOI",
    "SBTPMCCHN",
    "SBTSKYMUM",
    "SBTBLRMUM",
    "SBTMKSBLR",
    "SWSPMCCHN",
    "SWSMOABLR",
    "SWSPHCIND",
    "SWSNEMCGH",
    "SWSPMCMUM",
    "SWSPMMPNE",
    "SWSSCMHYD",
    "SWSLULKOC",
    "SWSCAMKOL",
    "SWSUNMDEL",
    "SWSPHPLUK",
    "SBTPMCPNE",
  ];

  const isValidStoreCode = (code) => {
    if (!code) return false;
    const upperCode = code.toString().toUpperCase();
    return VALID_STORE_CODES.includes(upperCode);
  };

  const isDateColumn = (columnName) => {
    if (!columnName) return false;
    const name = columnName.toString().toLowerCase();
    return (
      name.includes("date") ||
      name.includes("transaction date") ||
      name.includes("invoice date")
    );
  };

  const isHeaderValue = (value) => {
    if (!value) return false;
    const str = value.toString().toLowerCase().trim();
    return (
      str === "date" ||
      str === "transaction date" ||
      str === "invoice date" ||
      str === "system invoice number" ||
      str === "model number" ||
      str === "qty" ||
      str === "quantity"
    );
  };

  const parseDate = (dateValue) => {
    if (!dateValue) return "";

    // Handle dd-mm-yyyy format
    if (typeof dateValue === "string") {
      const ddmmyyyy = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.test(dateValue);
      if (ddmmyyyy) {
        const [day, month, year] = dateValue.split("-");
        const date = new Date(year, month - 1, day);
        return date.toISOString().split("T")[0];
      }
      return dateValue;
    }

    // Handle Excel serial date
    if (typeof dateValue === "number") {
      const date = new Date((dateValue - 25569) * 86400 * 1000);
      return date.toISOString().split("T")[0];
    }

    return "";
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
                  
                  // Check store code in B3
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

                  // Find header row - look up to row 30 for flexibility
                  let headerRowIndex = -1;
                  let dateColumnIndex = -1;

                  for (let i = 0; i < Math.min(rows.length, 30); i++) {
                    const row = rows[i];
                    if (!row || row.length === 0) continue;

                    // Check if this row contains a date column
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

                  // Remove header row if it was accidentally included
                  if (isHeaderValue(dataRows[0][dateColumnIndex])) {
                    console.log(`Removing duplicate header row from data`);
                    dataRows = dataRows.slice(1);
                  }

                  if (dataRows.length === 0) {
                    console.log(`Skipping sheet "${sheetName}" - no data rows after removing headers`);
                    skippedSheets++;
                    continue;
                  }

                  // Validate first data row has valid date
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

                    if (!transactionDate) continue;

                    const mrp = parseFloat(row[5] || 0);
                    const netValue = parseFloat(row[6] || 0);
                    
                    const discountValue = mrp - netValue;
                    const discountPercentage = mrp > 0 ? (discountValue / mrp) * 100 : 0;

                    const record = {
                      store_code: sheetStoreCode.toString().toUpperCase(),
                      transaction_date: transactionDate,
                      system_invoice_number: row[1] || "",
                      model_number: row[2] || "",
                      quantity: parseInt(row[3] || 0),
                      serial_number: row[4] || "",
                      mrp: mrp,
                      net_value: netValue,
                      discount_value: parseFloat(discountValue.toFixed(2)),
                      discount_percentage: parseFloat(discountPercentage.toFixed(2)),
                      sold_by: row[9] || "",
                      family: row[10] || "",
                      calibre: row[11] || "",
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
              
              // Get the store code from the first record
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

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1>📤 Upload Sales Data</h1>
      <p>Upload Excel file with multiple month sheets</p>

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
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          disabled={loading}
        />
      </div>

      {message && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
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
    </div>
  );
}
