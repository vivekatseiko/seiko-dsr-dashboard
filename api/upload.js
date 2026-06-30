import React, { useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Upload.module.css";

declare global {
  interface Window {
    XLSX: any;
  }
}

export default function Upload() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [fileName, setFileName] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setMessage("");
    setLoading(true);

    try {
      // Dynamically load xlsx library
      if (!window.XLSX) {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js";
        script.onload = () => processFile(file);
        document.head.appendChild(script);
      } else {
        processFile(file);
      }
    } catch (err) {
      setMessageType("error");
      setMessage(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
      setLoading(false);
    }
  };

  const processFile = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target?.result;
        const workbook = window.XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = window.XLSX.utils.sheet_to_json(worksheet);

        if (!jsonData || jsonData.length === 0) {
          setMessageType("error");
          setMessage("Excel file is empty");
          setLoading(false);
          return;
        }

        // Auto-detect store code from first row (assuming there's a store_code or similar column)
        const firstRow = jsonData[0] as Record<string, any>;
        let storeCode = "";

        // Try to find store code in common column names
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
            "Could not detect store code from Excel file. Ensure there is a 'store_code' column."
          );
          setLoading(false);
          return;
        }

        // Transform Excel columns to match database schema
        const records = jsonData.map((row: Record<string, any>) => ({
          store_code: storeCode,
          transaction_date: formatDate(row["Date"] || row["date"]),
          system_invoice_number: row["System Invoice Number"] || row["system_invoice_number"] || "",
          model_number: row["Model Number"] || row["model_number"] || "",
          qty: parseInt(row["Qty"] || row["qty"] || "0"),
          serial_number: row["Serial Number"] || row["serial_number"] || "",
          mrp: parseFloat(row["MRP"] || row["mrp"] || "0"),
          net_value: parseFloat(row["Net Value"] || row["net_value"] || "0"),
          discount_value: parseFloat(row["Discount Value"] || row["discount_value"] || "0"),
          discount_percent: parseFloat(row["Discount %"] || row["discount_percent"] || "0"),
          family: row["Family"] || row["family"] || "",
          calibre: row["Calibre"] || row["calibre"] || "",
        }));

        // Get user email from localStorage
        const userEmail = localStorage.getItem("userEmail") || "unknown@seiko.com";

        // Send to backend
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
            `✅ Success! Uploaded ${result.recordsInserted} records from ${storeCode}`
          );
          setTimeout(() => router.push("/dashboard"), 2000);
        }

        setLoading(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      setMessageType("error");
      setMessage(`Error processing file: ${err instanceof Error ? err.message : "Unknown error"}`);
      setLoading(false);
    }
  };

  const formatDate = (excelDate: any): string => {
    if (!excelDate) return new Date().toISOString().split("T")[0];

    if (typeof excelDate === "string") {
      return excelDate;
    }

    if (typeof excelDate === "number") {
      // Excel date serial number
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return date.toISOString().split("T")[0];
    }

    return new Date().toISOString().split("T")[0];
  };

  return (
    <div className={styles.container}>
      <h1>📤 Upload Sales Data</h1>

      <div className={styles.uploadBox}>
        <p>Select an Excel file to upload</p>
        <p style={{ fontSize: "12px", color: "#666" }}>
          (Store code will be auto-detected from the file)
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

        {loading && <p style={{ marginTop: "1rem" }}>Processing file...</p>}

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
