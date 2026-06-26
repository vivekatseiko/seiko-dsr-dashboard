// pages/upload.tsx (React/Next.js)
import React, { useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Upload.module.css";

export default function Upload() {
  const router = useRouter();
  const [storeCode, setStoreCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadId, setUploadId] = useState<number | null>(null);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const selectedFile = files[0];
      if (
        !selectedFile.name.endsWith(".xlsx") &&
        !selectedFile.name.endsWith(".xls")
      ) {
        setError("Please select a valid Excel file (.xlsx or .xls)");
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const selectedFile = files[0];
      if (
        !selectedFile.name.endsWith(".xlsx") &&
        !selectedFile.name.endsWith(".xls")
      ) {
        setError("Please select a valid Excel file (.xlsx or .xls)");
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!storeCode || !file) {
      setError("Please select a store and file");
      return;
    }

    setUploading(true);

    try {
      const userEmail = localStorage.getItem("userEmail");

      // Step 1: Initiate upload
      const initResponse = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          storeCode,
        }),
      });

      const initData = await initResponse.json();

      if (!initResponse.ok) {
        setError(initData.error || "Upload initiation failed");
        setUploading(false);
        return;
      }

      setUploadId(initData.uploadId);

      // Step 2: Process file with Supabase Edge Function
      const formData = new FormData();
      formData.append("file", file);
      formData.append("storeCode", storeCode);
      formData.append("uploadId", initData.uploadId.toString());
      formData.append(
        "existingData",
        JSON.stringify(initData.existingDataMap || [])
      );

      const processResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-sales-upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: formData,
        }
      );

      const processData = await processResponse.json();

      if (!processResponse.ok) {
        setError(processData.error || "File processing failed");
        setUploading(false);
        return;
      }

      // Update upload log with results
      const { newEntries, discrepancies, duplicates } = processData;

      const logUpdate = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/sales_uploads_log?id=eq.${initData.uploadId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            new_entries_count: newEntries.length,
            duplicate_entries_count: duplicates.length,
            discrepancy_entries_count: discrepancies.length,
            total_rows_in_file: processData.totalRows,
            status:
              discrepancies.length > 0 ? "Pending Approval" : "Completed",
          }),
        }
      );

      // Insert new entries to sales_master
      if (newEntries.length > 0) {
        const salesData = newEntries.map((entry: any) => ({
          ...entry,
          upload_id: initData.uploadId,
        }));

        await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/sales_master`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify(salesData),
          }
        );
      }

      // Insert discrepancies
      if (discrepancies.length > 0) {
        const discrepancyData = discrepancies.flatMap((item: any) =>
          item.changes.map((change: any) => ({
            upload_id: initData.uploadId,
            store_code: item.record.store_code,
            transaction_date: item.record.transaction_date,
            system_invoice_number: item.record.system_invoice_number,
            model_number: item.record.model_number,
            serial_number: item.record.serial_number,
            field_changed: change.field,
            old_value: change.oldValue,
            new_value: change.newValue,
            status: "Pending",
          }))
        );

        if (discrepancyData.length > 0) {
          await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/discrepancies`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json",
                apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
              },
              body: JSON.stringify(discrepancyData),
            }
          );
        }
      }

      setSuccess(
        `Upload successful! New entries: ${newEntries.length}, Discrepancies: ${discrepancies.length}, Duplicates: ${duplicates.length}`
      );
      setFile(null);

      if (discrepancies.length > 0) {
        setTimeout(() => {
          router.push(`/discrepancies?uploadId=${initData.uploadId}`);
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Sales Data Upload</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout
        </button>
      </div>

      <div className={styles.content}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="store" className={styles.label}>
              Select Store
            </label>
            <select
              id="store"
              value={storeCode}
              onChange={(e) => setStoreCode(e.target.value)}
              className={styles.select}
              required
            >
              <option value="">-- Select a store --</option>
              <option value="SWSPHPLUK">Phoenix Palassio (Lucknow)</option>
              <option value="SWSPMCMUM">Phoenix Market City Kurla (Mumbai)</option>
              <option value="SWSPMMPNE">Phoenix Mall of the Millennium (Pune)</option>
              <option value="SWSSCMHYD">Sarath City Mall (Hyderabad)</option>
              <option value="SWSMOABLR">Mall of Asia - Seiko (Bengaluru)</option>
              <option value="SWSLULKOC">Lulu Mall (Kochi)</option>
              <option value="SBTEXACHN">Express Avenue (Chennai)</option>
              <option value="SBTFALBLR">Falcon City (Bengaluru)</option>
            </select>
          </div>

          <div
            className={styles.dropZone}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file"
              onChange={handleFileChange}
              accept=".xlsx,.xls"
              className={styles.fileInput}
            />
            <label htmlFor="file" className={styles.dropZoneLabel}>
              <div className={styles.dropZoneIcon}>📁</div>
              <p>Drag and drop your Excel file here</p>
              <p className={styles.dropZoneSmall}>or click to select a file</p>
            </label>
          </div>

          {file && (
            <div className={styles.fileInfo}>
              <p>Selected file: {file.name}</p>
              <p className={styles.fileSize}>
                Size: {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          <button
            type="submit"
            disabled={uploading || !storeCode || !file}
            className={styles.submitButton}
          >
            {uploading ? "Processing..." : "Upload & Process"}
          </button>
        </form>

        <div className={styles.info}>
          <h3>Instructions</h3>
          <ul>
            <li>Select your store from the dropdown</li>
            <li>Upload the Excel file with sales data</li>
            <li>The system will detect duplicates and discrepancies</li>
            <li>You'll be prompted to review any discrepancies</li>
            <li>New entries will be added to the master database</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
