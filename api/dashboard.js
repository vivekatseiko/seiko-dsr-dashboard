import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { storeCode = "all" } = req.query;

    // Simple test query
    const { data, error } = await supabase
      .from("sales_master")
      .select("*")
      .limit(10);

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      totalSales: 0,
      totalQuantity: 0,
      totalDiscounts: 0,
      averageDiscount: 0,
      asp: 0,
      dailyTrend: [],
      debug: { rowsFound: data?.length || 0 },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({ error: error.message });
  }
}
