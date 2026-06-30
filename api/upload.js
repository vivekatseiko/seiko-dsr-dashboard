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
        total_records: records.length,
      })
      .select()
      .single();

    if (logError) {
      return res.status(500).json({ error: "Failed to create upload log" });
    }

    // Call Edge Function
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-sales-upload`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          records,
          storeCode,
          uploadId: uploadLog.id,
        }),
      }
    );

    const edgeFunctionResult = await response.json();

    if (!response.ok) {
      return res
        .status(500)
        .json({ error: edgeFunctionResult.error || "Edge function failed" });
    }

    // Update upload log
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
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: error.message });
  }
}
