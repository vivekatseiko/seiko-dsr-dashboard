import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { status } = req.query;

      let query = supabase
        .from("discrepancies")
        .select("*")
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data || []);
    }

    if (req.method === "PATCH") {
      const { id } = req.query;
      const { status, email } = req.body;

      if (!id || !status) {
        return res.status(400).json({ error: "id and status required" });
      }

      const { data: discrepancy, error: fetchError } = await supabase
        .from("discrepancies")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !discrepancy) {
        return res.status(404).json({ error: "Discrepancy not found" });
      }

      if (status === "approved") {
        const newRecord = JSON.parse(discrepancy.new_value);

        if (discrepancy.field_changed === "serial_reuse") {
          // Approval means: insert the flagged transaction as a new row
          const { error: insertError } = await supabase
            .from("sales_master")
            .insert({
              store_code: newRecord.store_code,
              transaction_date: newRecord.transaction_date,
              system_invoice_number: newRecord.system_invoice_number,
              model_number: newRecord.model_number,
              quantity: newRecord.quantity,
              serial_number: newRecord.serial_number,
              mrp: newRecord.mrp,
              net_value: newRecord.net_value,
              discount_value: newRecord.discount_value,
              discount_percentage: newRecord.discount_percentage,
              sold_by: newRecord.sold_by,
              family: newRecord.family,
              calibre: newRecord.calibre,
              customer_name: newRecord.customer_name,
              mobile_number: newRecord.mobile_number,
              upload_id: discrepancy.upload_id,
            });

          if (insertError) {
            return res.status(500).json({ error: insertError.message });
          }
        } else {
          // Value-change conflict: approval means update the existing row
          const { error: updateError } = await supabase
            .from("sales_master")
            .update({
              transaction_date: newRecord.transaction_date,
              quantity: newRecord.quantity,
              mrp: newRecord.mrp,
              net_value: newRecord.net_value,
              discount_value: newRecord.discount_value,
              discount_percentage: newRecord.discount_percentage,
              sold_by: newRecord.sold_by,
              family: newRecord.family,
              calibre: newRecord.calibre,
              customer_name: newRecord.customer_name,
              mobile_number: newRecord.mobile_number,
              updated_at: new Date().toISOString(),
            })
            .eq("store_code", discrepancy.store_code)
            .eq("system_invoice_number", discrepancy.system_invoice_number)
            .eq("model_number", discrepancy.model_number)
            .eq("serial_number", discrepancy.serial_number)
            .eq("transaction_date", discrepancy.transaction_date);

          if (updateError) {
            return res.status(500).json({ error: updateError.message });
          }
        }

        const { error: statusError } = await supabase
          .from("discrepancies")
          .update({
            status: "approved",
            approved_by: email || "unknown",
            approved_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (statusError) {
          return res.status(500).json({ error: statusError.message });
        }

        return res.status(200).json({ message: "Approved" });
      }

      if (status === "rejected") {
        const { error: deleteError } = await supabase
          .from("discrepancies")
          .delete()
          .eq("id", id);

        if (deleteError) {
          return res.status(500).json({ error: deleteError.message });
        }

        return res.status(200).json({ message: "Rejected and removed" });
      }

      return res.status(400).json({ error: "Invalid status value" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
