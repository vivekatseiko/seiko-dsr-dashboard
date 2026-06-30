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
    setMessage("");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js";
        script.onload = async () => {
          const XLSX = window.XLSX;
          const workbook = XLSX.read(event.target.result, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (!jsonData || jsonData.length === 0) {
            setMessage("Excel file is empty");
            setMessageType("error");
            setLoading(false);
            return;
          }

          const firstRow = jsonData[0];
          let storeCode = null;

          if (firstRow["store_code"]) storeCode = firstRow["store_code"];
          else if (firstRow["Store Code"]) storeCode = firstRow["Store Code"];
          else if (firstRow["StoreCode"]) storeCode = firstRow["StoreCode"];

          if (!storeCode) {
            setMessage(
              "Could not find store_code in Excel. Add a 'store_code' column."
            );
            setMessageType("error");
            setLoading(false);
            return;
          }

          const records = jsonData.map((row) => ({
            store_code: storeCode.toString().toUpperCase(),
            transaction_date: row["Date"] || row["date"] || "",
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

          const userEmail = localStorage.getItem("userEmail") || "unknown";

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

          if (response.ok) {
            setMessage(
              `✅ Success! Uploaded ${result.recordsInserted} records from ${storeCode}`
            );
            setMessageType("success");
            setTimeout(() => router.push("/dashboard"), 2000);
          } else {
            setMessage(`Error: ${result.error}`);
            setMessageType("error");
          }

          setLoading(false);
        };
        document.head.appendChild(script);
      } catch (err) {
        setMessage(`Error: ${err.message}`);
        setMessageType("error");
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1>📤 Upload Sales Data</h1>
      <p>Select an Excel file (store code will be auto-detected)</p>

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

      {loading && <p style={{ marginTop: "1rem" }}>Processing file...</p>}

      {message && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            borderRadius: "4px",
            backgroundColor:
              messageType === "success" ? "#dcfce7" : "#fee2e2",
            color: messageType === "success" ? "#166534" : "#991b1b",
            border:
              messageType === "success"
                ? "1px solid #86efac"
                : "1px solid #fca5a5",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}


