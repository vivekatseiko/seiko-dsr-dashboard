import { useState } from "react";
import { useRouter } from "next/router";

export default function Upload() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

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

              // Get store code from B3 of first sheet
              const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
              const storeCodeCell = firstSheet["B3"];
              const storeCode = storeCodeCell?.v;

              if (!storeCode) {
                setMessage("❌ Store code not found in cell B3");
                setMessageType("error");
                setLoading(false);
                return;
              }

              setMessage(`Found store: ${storeCode}. Reading ${workbook.SheetNames.length} sheets...`);

              let allRecords = [];

              // Process each sheet
              for (const sheetName of workbook.SheetNames) {
                try {
                  const sheet = workbook.Sheets[sheetName];
                  
                  // Convert to array format to see structure
                  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

                  if (!rows || rows.length === 0) continue;

                  // Find the header row (look for "Date" column)
                  let headerRowIndex = -1;
                  for (let i = 0; i < Math.min(rows.length, 10); i++) {
                    const row = rows[i];
                    if (row.some((cell) => cell && cell.toString().includes("Date"))) {
                      headerRowIndex = i;
                      break;
                    }
                  }

                  if (headerRowIndex === -1) continue;

                  // Extract header row
                  const headers = rows[headerRowIndex];

                  // Extract data rows (skip header and empty rows)
                  const dataRows = rows.slice(headerRowIndex + 1).filter((row) => row[0]);

                  // Map data to records
                  for (const row of dataRows) {
                    const record = {
                      store_code: storeCode.toString().toUpperCase(),
                      transaction_date: row[0] || "",
                      system_invoice_number: row[1] || "",
                      model_number: row[2] || "",
                      qty: parseInt(row[3] || 0),
                      serial_number: row[4] || "",
                      mrp: parseFloat(row[5] || 0),
                      net_value: parseFloat(row[6] || 0),
                      discount_value: parseFloat(row[7] || 0),
                      discount_percent: parseFloat(row[8] || 0),
                      family: row[10] || "",
                      calibre: row[11] || "",
                    };

                    if (record.transaction_date) {
                      allRecords.push(record);
                    }
                  }
                } catch (err) {
                  console.error(`Error processing sheet ${sheetName}:`, err);
                }
              }

              if (allRecords.length === 0) {
                setMessage("❌ No valid records found in any sheet");
                setMessageType("error");
                setLoading(false);
                return;
              }

              setMessage(`Found ${allRecords.length} records. Uploading...`);

              const userEmail = localStorage.getItem("userEmail") || "unknown";

              const response = await fetch("/api/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  records: allRecords,
                  storeCode: storeCode.toString().toUpperCase(),
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
                `✅ Success! Uploaded ${result.recordsInserted} records from ${allRecords.length} total`
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
