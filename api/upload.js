import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  console.log("🔵 [1] API Upload called");

  if (req.method !== "POST") {
    console.log("❌ [2] Method not POST:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { records, storeCode, userEmail } = req.body;
    console.log("🔵 [3] Received data:", { recordsCount: records?.length, storeCode, userEmail });

    if (!records || !storeCode || !userEmail) {
      console.log("❌ [4] Missing required fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    const uploadTimestamp = new Date().toISOString();
    console.log("🔵 [5] Upload timestamp:", uploadTimestamp);

    console.log("🔵 [6] Creating upload log entry...");
    
    // Create upload log entry
    const { data: uploadLog, error: logError } = await supabase
      .from("sales_uploads_log")
      .insert({
        store_code: storeCode,
        uploaded_by: userEmail,
        upload_timestamp: uploadTimestamp,
        file_name: `${storeCode}_${uploadTimestamp}.xlsx`,
        status: "Processing",
        total_rows_in_file: records.length,
        new_entries_count: 0,
        duplicate_entries_count: 0,
        discrepancy_entries_count: 0,
        error_message: null,
      })
      .select()
      .single();

    if (logError) {
      console.error("❌ [7] Upload log creation failed:", logError);
      console.error("Error message:", logError.message);
      console.error("Error details:", JSON.stringify(logError));
      return res.status(500).json({ error: `Failed to create upload log: ${logError.message}` });
    }

    console.log("✅ [8] Upload log created with ID:", uploadLog.id);

    try {
      console.log("🔵 [9] Inserting records into sales_master...");
      
      const { error: insertError, data: insertData } = await supabase
        .from("sales_master")
        .insert(
          records.map((r) => ({
            store_code: r.store_code,
            transaction_date: r.transaction_date,
            system_invoice_number: r.system_invoice_number,
            model_number: r.model_number,
            quantity: r.quantity,
            serial_number: r.serial_number,
            mrp: r.mrp,
            net_value: r.net_value,
            discount_value: r.discount_value,
            discount_percentage: r.discount_percentage,
            sold_by: r.sold_by,
            family: r.family,
            calibre: r.calibre,
            customer_name: r.customer_name,
            mobile_number: r.mobile_number,
          }))
        );

      if (insertError) {
        console.error("❌ [10] Insert error:", insertError);
        console.error("Error message:", insertError.message);
        throw insertError;
      }

      console.log("✅ [11] Records inserted successfully. Count:", records.length);

      console.log("🔵 [12] Updating upload log to Completed...");
      
      const { error: updateError } = await supabase
        .from("sales_uploads_log")
        .update({ 
          status: "Completed",
          new_entries_count: records.length,
        })
        .eq("id", uploadLog.id);

      if (updateError) {
        console.error("❌ [13] Update log error:", updateError);
        throw updateError;
      }

      console.log("✅ [14] Upload log updated to Completed");

      return res.status(200).json({
        success: true,
        uploadId: uploadLog.id,
        recordsInserted: records.length,
        storeCode,
      });
    } catch (err) {
      console.error("❌ [15] Insert/Update error:", err);
      console.error("Error message:", err.message);

      console.log("🔵 [16] Updating upload log with error status...");
      
      const { error: updateErr } = await supabase
        .from("sales_uploads_log")
        .update({ 
          status: "Failed",
          error_message: err.message,
        })
        .eq("id", uploadLog.id);

      if (updateErr) {
        console.error("❌ [17] Failed to update error log:", updateErr);
      } else {
        console.log("✅ [18] Error log updated");
      }

      return res.status(500).json({ error: err.message });
    }
  } catch (error) {
    console.error("❌ [19] Main error:", error);
    console.error("Error message:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
