import { useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Upload.module.css";

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
            return;
          };

          script.onload = async () => {
            try {
              setMessage("Parsing Excel file...");

              const XLSX = window.XLSX;
              const workbook = XLSX.read(event.target.result, { type: "array" });
              const worksheet = workbook.Sheets[workbook.SheetNames[0]];

              // Get store code from B3
              const storeCodeCell = worksheet["B3"];
              const storeCode = storeCodeCell?.v;

              if (!storeCode) {
                setMessage("❌ Store code not found in cell B3");
                setMessageType("error");
                setLoading(false);
                return;
              }

              setMessage("Reading data table...");

              // Read the actual data table (starting from row with headers)
              const jsonData = XLSX.utils.sheet_to_json(worksheet);

              if (!jsonData || jsonData.length === 0) {
                setMessage("❌ No data found in Excel file");
                setMessageType("error");
                setLoading(false);
                return;
              }

              setMessage(`Preparing ${jsonData.length} records...`);

              const records = jsonData
                .filter((row) => row["Date"]) // Skip empty rows
                .map((row) => ({
                  store_code: storeCode.toString().toUpperCase(),
                  transaction_date: row["Date"] || "",
                  system_invoice_number: row["System Invoice Number"] || "",
                  model_number: row["Model Number"] || "",
                  qty: parseInt(row["Qty"] || 0),
                  serial_number: row["Serial Number"] || "",
                  mrp: parseFloat(row["MRP"] || 0),
                  net_value: parseFloat(row["Net Value"] || 0),
                  discount_value: parseFloat(row["Discount Value"] || 0),
                  discount_percent: parseFloat(row["Discount %"] || 0),
                  family: row["Family"] || "",
                  calibre: row["Calibre"] || "",
                }));

              if (records.length === 0) {
                setMessage("❌ No valid records found");
                setMessageType("error");
                setLoading(false);
                return;
              }

              const userEmail = localStorage.getItem("userEmail") || "unknown";

              setMessage("Uploading to server...");

              const response = await fetch("/api/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  records,
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
                `✅ Success! Uploaded ${result.recordsInserted} records`
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
      <p>Select an Excel file (store code from B3)</p>

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
