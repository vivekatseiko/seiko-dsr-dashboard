// api/discrepancies.js (Vercel Function)
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      // Fetch pending discrepancies
      const { uploadId } = req.query;

      if (!uploadId) {
        return res.status(400).json({ error: "uploadId required" });
      }

      const { data: discrepancies, error } = await supabase
        .from("discrepancies")
        .select("*")
        .eq("upload_id", uploadId)
        .eq("status", "Pending")
        .order("created_at", { ascending: false });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ discrepancies });
    } else if (req.method === "POST") {
      // Approve or reject discrepancies
      const { action, discrepancyIds, email } = req.body;

      if (!action || !discrepancyIds || !Array.isArray(discrepancyIds)) {
        return res.status(400).json({ error: "Invalid request" });
      }

      if (action === "approve") {
        // Update discrepancy status and apply changes to sales_master
        for (const discrepancyId of discrepancyIds) {
          const { data: discrepancy } = await supabase
            .from("discrepancies")
            .select("*")
            .eq("id", discrepancyId)
            .single();

          if (!discrepancy) continue;

          // Get the new value to apply
          const newValue = discrepancy.new_value;
          const fieldChanged = discrepancy.field_changed;

          // Update the sales_master record
          const { error: updateError } = await supabase
            .from("sales_master")
            .update({
              [fieldChanged]: newValue,
              updated_at: new Date().toISOString(),
            })
            .eq("system_invoice_number", discrepancy.system_invoice_number)
            .eq("model_number", discrepancy.model_number)
            .eq("serial_number", discrepancy.serial_number)
            .eq("store_code", discrepancy.store_code)
            .eq("transaction_date", discrepancy.transaction_date);

          if (updateError) {
            console.error("Update error:", updateError);
            continue;
          }

          // Update discrepancy status
          await supabase
            .from("discrepancies")
            .update({
              status: "Approved",
              approved_by: email,
              approved_at: new Date().toISOString(),
            })
            .eq("id", discrepancyId);

          // Log to audit trail
          await supabase.from("audit_trail").insert({
            action: "Discrepancy Approved",
            user_email: email,
            details: {
              discrepancyId,
              field: fieldChanged,
              oldValue: discrepancy.old_value,
              newValue: newValue,
            },
          });
        }

        return res.status(200).json({ message: "Discrepancies approved" });
      } else if (action === "reject") {
        // Mark discrepancies as rejected
        for (const discrepancyId of discrepancyIds) {
          await supabase
            .from("discrepancies")
            .update({
              status: "Rejected",
              rejected_at: new Date().toISOString(),
            })
            .eq("id", discrepancyId);

          // Log to audit trail
          await supabase.from("audit_trail").insert({
            action: "Discrepancy Rejected",
            user_email: email,
            details: { discrepancyId },
          });
        }

        return res.status(200).json({ message: "Discrepancies rejected" });
      }

      return res.status(400).json({ error: "Invalid action" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Discrepancy error:", error);
    res.status(500).json({ error: error.message });
  }
}
