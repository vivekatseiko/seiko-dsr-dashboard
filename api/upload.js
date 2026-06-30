import React, { useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Upload.module.css";

export default function Upload() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setMessage("");
    setLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event: any) => {
        try {
          // Load xlsx from CDN
          const script = document.createElement("script");
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js";
          script.onload = async () => {
            const XLSX = (window as any).XLSX;
            const data = event.target.result;
            const workbook = XLSX.read(data, { type: "array" });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (!jsonData || jsonData.length === 0) {
              setMessageType("error");
              setMessage("Excel file is empty");
              setLoading(false);
              return;
            }

            // Auto-detect store code
            const firstRow: any = jsonData[0];
            let storeCode = "";

            const storeCodeKeys = [
              "store_code",
              "Store Code",
              "StoreCode",
              "store",
              "Store",
            ];

            for (const key of storeCodeKeys) {
              if (firstRow[key]) {
                storeCode = firstRow[key].toString().toUpperCase();
                break;
              }
            }

            if (!storeCode) {
              setMessageType("error");
              setMessage(
                "Could not detect store code from file. Add a 'store_code' column."
              );
              setLoading(false);
              return;
            }

            // Transform data
            const records = jsonData.map((row: any) => ({
              store_code: storeCode,
              transaction_date: row["Date"] || row["date"] || "",
              system_invoice_number: row["System Invoice Number"] || "",
              model_number: row["Model Number"] || "",
              qty: parseInt(row["Qty"] || "0"),
              serial_number: row["Serial Number"] || "",
              mrp: parseFloat(row["MRP"] || "0"),
              net_value: parseFloat(row["Net Value"] || "0"),
              discount_value: parseFloat(row["Discount Value"] || "0"),
              discount_percent: parseFloat(row["Discount %"] || "0"),
              family: row["Family"] || "",
              calibre: row["Calibre"] || "",
            }));

            const userEmail =
              localStorage.getItem("userEmail") || "unknown@seiko.com";

            // Upload
            const response = await fetch("/api/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                records,
                storeCode,
                userEmail,
              }),
            });

            const result = await response.json();

            if (!response.ok) {
              setMessageType("error");
              setMessage(`Upload failed: ${result.error}`);
            } else {
              setMessageType("success");
              setMessage(
                `✅ Uploaded ${result.recordsInserted} records from ${storeCode}`
              );
              setTimeout(() => router.push("/dashboard"), 2000);
            }

            setLoading(false);
          };
          document.head.appendChild(script);
        } catch (err: any) {
          setMessageType("error");
          setMessage(`Error: ${err.message}`);
          setLoading(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      setMessageType("error");
      setMessage(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>📤 Upload Sales Data</h1>

      <div className={styles.uploadBox}>
        <p>Select an Excel file to upload</p>
        <p style={{ fontSize: "12px", color: "#666" }}>
          (Store code auto-detected from file)
        </p>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          disabled={loading}
          style={{ marginTop: "1rem" }}
        />

        {fileName && (
          <p style={{ marginTop: "1rem", fontSize: "14px", color: "#666" }}>
            Selected: {fileName}
          </p>
        )}

        {loading && <p style={{ marginTop: "1rem" }}>Processing...</p>}

        {message && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              borderRadius: "4px",
              backgroundColor:
                messageType === "success" ? "#f0fdf4" : "#fef2f2",
              color: messageType === "success" ? "#16a34a" : "#e24b4a",
              border:
                messageType === "success"
                  ? "1px solid #16a34a"
                  : "1px solid #e24b4a",
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
