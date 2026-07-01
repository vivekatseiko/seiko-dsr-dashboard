import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { method } = req;

  try {
    if (method === "GET") {
      // Fetch all targets with optional filters
      const { store_code, month, year } = req.query;

      let query = supabase.from("sales_targets").select("*");

      if (store_code && store_code !== "all") {
        query = query.eq("store_code", store_code.toUpperCase());
      }
      if (month && month !== "all") {
        query = query.eq("target_month", parseInt(month));
      }
      if (year && year !== "all") {
        query = query.eq("target_year", parseInt(year));
      }

      query = query.order("target_year", { ascending: false })
                   .order("target_month", { ascending: false })
                   .order("store_code", { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error("❌ Fetch error:", error);
        return res.status(500).json({ error: error.message });
      }

      console.log(`✅ Fetched ${data?.length || 0} targets`);
      return res.status(200).json({ data });
    }

    if (method === "PUT") {
      // Update a target
      const { id, store_code, target_month, target_year, value_target, calibre_1_name, calibre_1_qty_target, calibre_2_name, calibre_2_qty_target, calibre_3_name, calibre_3_qty_target } = req.body;

      if (!id) {
        return res.status(400).json({ error: "Target ID required" });
      }

      const { data, error } = await supabase
        .from("sales_targets")
        .update({
          store_code,
          target_month,
          target_year,
          value_target,
          calibre_1_name,
          calibre_1_qty_target,
          calibre_2_name,
          calibre_2_qty_target,
          calibre_3_name,
          calibre_3_qty_target,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select();

      if (error) {
        console.error("❌ Update error:", error);
        return res.status(500).json({ error: error.message });
      }

      console.log(`✅ Updated target ID ${id}`);
      return res.status(200).json({ success: true, data: data[0] });
    }

    if (method === "DELETE") {
      // Delete a target
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: "Target ID required" });
      }

      const { error } = await supabase
        .from("sales_targets")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("❌ Delete error:", error);
        return res.status(500).json({ error: error.message });
      }

      console.log(`✅ Deleted target ID ${id}`);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("❌ Targets API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
