import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Returns per-month totals from sales_master for one store.
// Query: ?storeCode=SBTBLRMUM&months=2026-04,2026-05,2026-06
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { storeCode, months } = req.query;

    if (!storeCode || !months) {
      return res.status(400).json({ error: "storeCode and months are required" });
    }

    const monthList = months.split(",").map((m) => m.trim()).filter(Boolean);
    const result = {};

    for (const ym of monthList) {
      const [year, month] = ym.split("-").map(Number);
      if (!year || !month) continue;

      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      let rows = [];
      let from = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("sales_master")
          .select("mrp, net_value, quantity")
          .eq("store_code", storeCode.toUpperCase())
          .gte("transaction_date", startDate)
          .lte("transaction_date", endDate)
          .range(from, from + pageSize - 1);

        if (error) {
          return res.status(500).json({ error: error.message });
        }

        rows = rows.concat(data || []);
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }

      result[ym] = {
        row_count: rows.length,
        total_mrp: rows.reduce((s, r) => s + (r.mrp || 0), 0),
        total_net: rows.reduce((s, r) => s + (r.net_value || 0), 0),
        total_qty: rows.reduce((s, r) => s + (r.quantity || 0), 0),
      };
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
