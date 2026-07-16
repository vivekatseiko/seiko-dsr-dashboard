import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function csvEscape(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { storeCode, startDate, endDate } = req.query;

    const columns = [
      "transaction_date", "store_code", "system_invoice_number", "model_number",
      "serial_number", "quantity", "mrp", "net_value", "discount_value",
      "discount_percentage", "sold_by", "family", "calibre", "customer_name",
      "mobile_number", "created_at",
    ];

    let allRows = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
      let query = supabase
        .from("sales_master")
        .select(columns.join(","))
        .order("transaction_date", { ascending: true })
        .range(from, from + pageSize - 1);

      if (storeCode && storeCode !== "all") {
        query = query.eq("store_code", storeCode.toUpperCase());
      }
      if (startDate) {
        query = query.gte("transaction_date", startDate);
      }
      if (endDate) {
        query = query.lte("transaction_date", endDate);
      }

      const { data, error } = await query;

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      allRows = allRows.concat(data || []);

      if (!data || data.length < pageSize) break;
      from += pageSize;
    }

    let csv = columns.join(",") + "\n";
    for (const row of allRows) {
      csv += columns.map((c) => csvEscape(row[c])).join(",") + "\n";
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="sales_master_export_${Date.now()}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
