// api/dashboard.js (Vercel Function)
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
    const { metric, startDate, endDate, storeCode } = req.query;

    let query = supabase
      .from("sales_master")
      .select(
        "*, store_master(store_name, city, region)",
        { count: "exact" }
      );

    // Apply date filters
    if (startDate) {
      query = query.gte("transaction_date", startDate);
    }
    if (endDate) {
      query = query.lte("transaction_date", endDate);
    }

    // Apply store filter
    if (storeCode && storeCode !== "all") {
      query = query.eq("store_code", storeCode);
    }

    const { data: salesData, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    let result = {};

    if (metric === "sales-by-family") {
      // Sales trends by family
      const groupedByFamily = {};
      salesData.forEach((record) => {
        const family = record.family || "Unknown";
        if (!groupedByFamily[family]) {
          groupedByFamily[family] = { qty: 0, value: 0, count: 0 };
        }
        groupedByFamily[family].qty += record.quantity || 0;
        groupedByFamily[family].value += record.net_value || 0;
        groupedByFamily[family].count += 1;
      });
      result = Object.entries(groupedByFamily).map(([family, data]) => ({
        family,
        ...data,
      }));
    } else if (metric === "sales-by-calibre") {
      // Sales by calibre
      const groupedByCalibre = {};
      salesData.forEach((record) => {
        const calibre = record.calibre || "Unknown";
        if (!groupedByCalibre[calibre]) {
          groupedByCalibre[calibre] = { qty: 0, value: 0, count: 0 };
        }
        groupedByCalibre[calibre].qty += record.quantity || 0;
        groupedByCalibre[calibre].value += record.net_value || 0;
        groupedByCalibre[calibre].count += 1;
      });
      result = Object.entries(groupedByCalibre).map(([calibre, data]) => ({
        calibre,
        ...data,
      }));
    } else if (metric === "discount-trends") {
      // Discount trends over time
      const groupedByDate = {};
      salesData.forEach((record) => {
        const date = record.transaction_date;
        if (!groupedByDate[date]) {
          groupedByDate[date] = {
            totalDiscount: 0,
            avgDiscountPercent: 0,
            count: 0,
          };
        }
        groupedByDate[date].totalDiscount +=
          record.discount_value || 0;
        groupedByDate[date].avgDiscountPercent +=
          record.discount_percentage || 0;
        groupedByDate[date].count += 1;
      });

      result = Object.entries(groupedByDate)
        .map(([date, data]) => ({
          date,
          totalDiscount: data.totalDiscount,
          avgDiscountPercent: (data.avgDiscountPercent / data.count).toFixed(2),
          recordCount: data.count,
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (metric === "sales-by-store") {
      // Sales aggregated by store
      const groupedByStore = {};
      salesData.forEach((record) => {
        const storeCode = record.store_code;
        const storeName = record.store_master?.store_name || storeCode;
        const region = record.store_master?.region || "Unknown";

        if (!groupedByStore[storeCode]) {
          groupedByStore[storeCode] = {
            storeName,
            region,
            qty: 0,
            value: 0,
            count: 0,
          };
        }
        groupedByStore[storeCode].qty += record.quantity || 0;
        groupedByStore[storeCode].value += record.net_value || 0;
        groupedByStore[storeCode].count += 1;
      });
      result = Object.values(groupedByStore).sort(
        (a, b) => b.value - a.value
      );
    } else if (metric === "sales-by-region") {
      // Sales by region
      const groupedByRegion = {};
      salesData.forEach((record) => {
        const region = record.store_master?.region || "Unknown";
        if (!groupedByRegion[region]) {
          groupedByRegion[region] = { qty: 0, value: 0, count: 0 };
        }
        groupedByRegion[region].qty += record.quantity || 0;
        groupedByRegion[region].value += record.net_value || 0;
        groupedByRegion[region].count += 1;
      });
      result = Object.entries(groupedByRegion).map(([region, data]) => ({
        region,
        ...data,
      }));
    } else if (metric === "summary") {
      // Dashboard summary
      const summary = {
        totalSales: 0,
        totalQuantity: 0,
        totalDiscounts: 0,
        averageDiscount: 0,
        recordCount: salesData.length,
        topFamily: null,
        topCalibre: null,
      };

      salesData.forEach((record) => {
        summary.totalSales += record.net_value || 0;
        summary.totalQuantity += record.quantity || 0;
        summary.totalDiscounts += record.discount_value || 0;
        summary.averageDiscount +=
          (record.discount_percentage || 0) / salesData.length;
      });

      result = summary;
    } else {
      return res
        .status(400)
        .json({
          error: "Invalid metric. Use: sales-by-family, sales-by-calibre, discount-trends, sales-by-store, sales-by-region, summary",
        });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: error.message });
  }
}
