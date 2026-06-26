// api/upload.js (Vercel Function)
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import busboy from "busboy";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, storeCode } = req.body;

    if (!email || !storeCode) {
      return res.status(400).json({ error: "Missing email or storeCode" });
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from("auth_users")
      .select("*")
      .eq("email", email)
      .single();

    if (userError || !user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Create upload log entry
    const { data: uploadLog, error: logError } = await supabase
      .from("sales_uploads_log")
      .insert({
        store_code: storeCode,
        uploaded_by: email,
        file_name: `${storeCode}_${new Date().toISOString()}.xlsx`,
        status: "Processing",
      })
      .select()
      .single();

    if (logError) {
      return res.status(500).json({ error: "Failed to create upload log" });
    }

    // Get existing records for duplicate detection
    const { data: existingRecords } = await supabase
      .from("sales_master")
      .select(
        "transaction_date, system_invoice_number, model_number, serial_number, quantity, mrp, net_value, discount_value, discount_percentage, sold_by, family, calibre, customer_name, mobile_number"
      )
      .eq("store_code", storeCode);

    // Create duplicate key map
    const existingDataMap = (existingRecords || []).map((r) => [
      [
        storeCode,
        r.transaction_date,
        r.system_invoice_number,
        r.model_number,
        r.serial_number,
      ].join("|"),
      r,
    ]);

    res.status(200).json({
      uploadId: uploadLog.id,
      storeCode,
      existingDataMap,
      message: "Upload initiated. Ready for file processing.",
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
}
