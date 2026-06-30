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

    // Create upload log
    const { data: uploadLog, error: logError } = await supabase
      .from("sales_uploads_log")
      .insert({
        store_code: storeCode,
        uploaded_by: userEmail,
        file_name: `${storeCode}_${new Date().toISOString()}.xlsx`,
        status: "Processing",
        total_rows_in_file: records.length,
      })
      .select()
      .single();

    if (logError) {
      return res.status(500).json({ error: "Failed to create upload log" });
    }

    // Insert directly instead of calling Edge Function
    try {
      const { error: insertError } = await supabase
        .from("sales_master")
        .insert(
          records.map((r) => ({
            store_code: storeCode,
            transaction_date: r.transaction_date,
            system_invoice_number: r.system_invoice_number,
            model_number: r.model_number,
            qty: r.qty,
            serial_number: r.serial_number,
            mrp: r.mrp,
            net_value: r.net_value,
            discount_value: r.discount_value,
            discount_percent: r.discount_percent,
            family: r.family,
            calibre: r.calibre,
          }))
        );

      if (insertError) {
        throw insertError;
      }

      // Update status
      await supabase
        .from("sales_uploads_log")
        .update({ status: "Completed" })
        .eq("id", uploadLog.id);

      return res.status(200).json({
        success: true,
        uploadId: uploadLog.id,
        recordsInserted: records.length,
        storeCode,
      });
    } catch (err) {
      // If insert fails, update log with error
      await supabase
        .from("sales_uploads_log")
        .update({ 
          status: "Failed",
          error_message: err.message 
        })
        .eq("id", uploadLog.id);

      return res.status(500).json({ error: err.message });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: error.message });
  }
}
