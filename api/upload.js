import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { records, storeCode, userEmail } = req.body;

    if (!records || !storeCode || !userEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const uploadTimestamp = new Date().toISOString();

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
      console.error("Upload log error:", logError);
      return res.status(500).json({ error: "Failed to create upload log" });
    }

    try {
      // Insert records into sales_master
      const { error: insertError } = await supabase
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
        throw insertError;
      }

      // Update upload log to Completed
      await supabase
        .from("sales_uploads_log")
        .update({ 
          status: "Completed",
          new_entries_count: records.length,
        })
        .eq("id", uploadLog.id);

      return res.status(200).json({
        success: true,
        uploadId: uploadLog.id,
        recordsInserted: records.length,
        storeCode,
      });
    } catch (err) {
      console.error("Insert error:", err);

      // Update upload log with error
      await supabase
        .from("sales_uploads_log")
        .update({ 
          status: "Failed",
          error_message: err.message,
        })
        .eq("id", uploadLog.id);

      return res.status(500).json({ error: err.message });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: error.message });
  }
}
