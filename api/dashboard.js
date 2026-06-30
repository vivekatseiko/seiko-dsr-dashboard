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
    const { storeCode = "all", startDate, endDate } = req.query;

    console.log("📊 Dashboard API called:", { storeCode, startDate, endDate });

    let query = supabase.from("sales_master").select("*");

    // Filter by store code
    if (storeCode !== "all") {
      query = query.eq("store_code", storeCode.toUpperCase());
    }

    // Filter by date range
    if (startDate) {
      query = query.gte("transaction_date", startDate);
    }
    if (endDate) {
      query = query.lte("transaction_date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      console.log("⚠️ No data found");
      return res.status(200).json({
        totalSales: 0,
        totalQuantity: 0,
        totalDiscounts: 0,
        averageDiscount: 0,
        asp: 0,
        dailyTrend: [],
      });
    }

    console.log(`✅ Found ${data.length} records`);

    // Calculate metrics
    let totalSales = 0;
    let totalQuantity = 0;
    let totalDiscounts = 0;
    let totalDiscountPercentage = 0;
    let recordCount = 0;

    const dailyData = {};

    for (const record of data) {
      const netValue = parseFloat(record.net_value || 0);
      const quantity = parseInt(record.quantity || 0);
      const discountValue = parseFloat(record.discount_value || 0);
      const discountPercentage = parseFloat(record.discount_percentage || 0);
      const date = record.transaction_date || "Unknown";

      totalSales += netValue;
      totalQuantity += quantity;
      totalDiscounts += discountValue;
      totalDiscountPercentage += discountPercentage;
      recordCount++;

      // Group by date
      if (!dailyData[date]) {
        dailyData[date] = {
          date: date,
          sales: 0,
          qty: 0,
          discount: 0,
        };
      }
      dailyData[date].sales += netValue;
      dailyData[date].qty += quantity;
      dailyData[date].discount += discountValue;
    }

    const averageDiscount = recordCount > 0 ? totalDiscountPercentage / recordCount : 0;
    const asp = totalQuantity > 0 ? Math.round(totalSales / totalQuantity) : 0;

    const dailyTrend = Object.values(dailyData).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    console.log(`✅ Calculated metrics - Sales: ${totalSales}, Qty: ${totalQuantity}, Discount: ${totalDiscounts}`);

    return res.status(200).json({
      totalSales: Math.round(totalSales),
      totalQuantity: totalQuantity,
      totalDiscounts: Math.round(totalDiscounts),
      averageDiscount: parseFloat(averageDiscount.toFixed(2)),
      asp: asp,
      dailyTrend: dailyTrend,
    });
  } catch (error) {
    console.error("❌ Dashboard error:", error);
    return res.status(500).json({ error: error.message });
  }
}
