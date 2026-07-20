import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normStr(v) {
  return String(v ?? "").trim();
}

function rowKey(r) {
  return `${normStr(r.system_invoice_number)}|${normStr(r.serial_number)}|${r.quantity}`;
}

export default async function handler(req, res) {
  try {
    // ---------- POST: diff uploaded file rows against the database ----------
    if (req.method === "POST") {
      const { storeCode, months, fileRows } = req.body;

      if (!storeCode || !months || !Array.isArray(fileRows)) {
        return res.status(400).json({ error: "storeCode, months, and fileRows are required" });
      }

      // Fetch all DB rows for this store in the affected months
      let dbRows = [];
      for (const ym of months) {
        const [year, month] = ym.split("-").map(Number);
        if (!year || !month) continue;

        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        let from = 0;
        const pageSize = 1000;
        while (true) {
          const { data, error } = await supabase
            .from("sales_master")
            .select("id, transaction_date, system_invoice_number, model_number, serial_number, quantity, net_value, mrp, upload_id, created_at")
            .eq("store_code", storeCode.toUpperCase())
            .gte("transaction_date", startDate)
            .lte("transaction_date", endDate)
            .range(from, from + pageSize - 1);

          if (error) return res.status(500).json({ error: error.message });

          dbRows = dbRows.concat(data || []);
          if (!data || data.length < pageSize) break;
          from += pageSize;
        }
      }

      const fileKeys = new Set(fileRows.map(rowKey));
      const dbKeys = new Set(dbRows.map(rowKey));

      // Ghosts: in DB, not in file
      const ghosts = dbRows.filter((r) => !fileKeys.has(rowKey(r)));
      // Missing: in file, not in DB
      const missing = fileRows.filter((r) => !dbKeys.has(rowKey(r)));

      // Which uploads created the ghosts - for provenance display
      const uploadIds = [...new Set(ghosts.map((g) => g.upload_id).filter(Boolean))];
      let uploads = [];
      if (uploadIds.length > 0) {
        const { data: uploadData } = await supabase
          .from("sales_uploads_log")
          .select("id, uploaded_by, upload_timestamp, file_name")
          .in("id", uploadIds);
        uploads = uploadData || [];
      }
      const uploadMap = {};
      for (const u of uploads) uploadMap[u.id] = u;

      return res.status(200).json({
        ghosts: ghosts.map((g) => ({
          ...g,
          upload_info: g.upload_id && uploadMap[g.upload_id]
            ? `${uploadMap[g.upload_id].uploaded_by} on ${String(uploadMap[g.upload_id].upload_timestamp).split("T")[0]}`
            : "unknown upload",
        })),
        missing,
        ghostTotal: ghosts.reduce((s, g) => s + parseFloat(g.net_value || 0), 0),
      });
    }

    // ---------- DELETE: remove specific ghost rows by id, with audit ----------
    if (req.method === "DELETE") {
      const { ids, storeCode, userEmail } = req.body;

      if (!Array.isArray(ids) || ids.length === 0 || !storeCode || !userEmail) {
        return res.status(400).json({ error: "ids, storeCode, and userEmail are required" });
      }

      // Fetch what's being deleted, for the audit record
      const { data: toDelete, error: fetchError } = await supabase
        .from("sales_master")
        .select("id, transaction_date, system_invoice_number, serial_number, net_value")
        .in("id", ids)
        .eq("store_code", storeCode.toUpperCase());

      if (fetchError) return res.status(500).json({ error: fetchError.message });

      if (!toDelete || toDelete.length === 0) {
        return res.status(404).json({ error: "No matching rows found" });
      }

      const deletedValue = toDelete.reduce((s, r) => s + parseFloat(r.net_value || 0), 0);

      // Guard: only delete ids that belong to this store (enforced by the .eq above)
      const safeIds = toDelete.map((r) => r.id);

      const { error: deleteError } = await supabase
        .from("sales_master")
        .delete()
        .in("id", safeIds);

      if (deleteError) return res.status(500).json({ error: deleteError.message });

      // Audit trail entry
      await supabase.from("sales_uploads_log").insert({
        store_code: storeCode.toUpperCase(),
        uploaded_by: userEmail,
        upload_timestamp: new Date().toISOString(),
        file_name: "INTEGRITY_CLEANUP",
        status: "Cleanup",
        total_rows_in_file: 0,
        new_entries_count: 0,
        duplicate_entries_count: 0,
        discrepancy_entries_count: 0,
        error_message: `Deleted ${safeIds.length} ghost row(s), total ₹${Math.round(deletedValue)}: ${toDelete
          .map((r) => `${r.transaction_date}/${r.system_invoice_number}/${r.serial_number}`)
          .join("; ")
          .substring(0, 900)}`,
      });

      return res.status(200).json({
        deleted: safeIds.length,
        deletedValue: Math.round(deletedValue),
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
