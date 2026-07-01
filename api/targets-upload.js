import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  console.log("🎯 Targets Upload API called");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { records, uploadedBy } = req.body;

    console.log("📥 Received records:", records?.length);

    if (!records || records.length === 0) {
      return res.status(400).json({ error: "No records provided" });
    }

    if (!uploadedBy) {
      return res.status(400).json({ error: "User email required" });
    }

    // Validate all records first
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      if (!record.store_code || !record.target_month || !record.target_year || !record.value_target) {
        return res.status(400).json({ 
          error: `Record ${i + 1}: Missing required fields (store_code, target_month, target_year, value_target)` 
        });
      }

      if (record.target_month < 1 || record.target_month > 12) {
        return res.status(400).json({ 
          error: `Record ${i + 1}: Invalid month (must be 1-12)` 
        });
      }
    }

    console.log("✅ All records validated");

    // Upsert records (insert or update if exists)
    const { data, error } = await supabase
      .from("sales_targets")
      .upsert(
        records.map(r => ({
          store_code: r.store_code,
          target_month: r.target_month,
          target_year: r.target_year,
          value_target: r.value_target,
          calibre_1_name: r.calibre_1_name,
          calibre_1_qty_target: r.calibre_1_qty_target,
          calibre_2_name: r.calibre_2_name,
          calibre_2_qty_target: r.calibre_2_qty_target,
          calibre_3_name: r.calibre_3_name,
          calibre_3_qty_target: r.calibre_3_qty_target,
          uploaded_by: uploadedBy,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "store_code,target_month,target_year" }
      );

    if (error) {
      console.error("❌ Upsert error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Successfully upserted ${records.length} target records`);

    return res.status(200).json({
      success: true,
      recordsInserted: records.length,
      message: `Uploaded ${records.length} target records`,
    });
  } catch (error) {
    console.error("❌ Targets Upload error:", error);
    return res.status(500).json({ error: error.message });
  }
}
