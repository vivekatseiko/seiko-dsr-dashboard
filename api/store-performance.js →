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
    const { startDate, endDate, storeCode, city, region } = req.query;

    console.log("📊 Store Performance API called with:", { startDate, endDate, storeCode, city, region });

    // Fetch targets for the period
    let targetQuery = supabase.from("sales_targets").select("*");

    if (startDate && endDate) {
      const startMonth = new Date(startDate).getMonth() + 1;
      const startYear = new Date(startDate).getFullYear();
      const endMonth = new Date(endDate).getMonth() + 1;
      const endYear = new Date(endDate).getFullYear();

      // For simplicity, we'll get targets that match the selected period
      targetQuery = targetQuery
        .gte("target_year", startYear)
        .lte("target_year", endYear);
    }

    const { data: targets, error: targetError } = await targetQuery;

    if (targetError) {
      console.error("❌ Target fetch error:", targetError);
      return res.status(500).json({ error: targetError.message });
    }

    console.log(`✅ Fetched ${targets?.length || 0} targets`);

    // Fetch sales data for the period
    let salesQuery = supabase
      .from("sales_master")
      .select(
        `
        store_code,
        transaction_date,
        net_value,
        quantity,
        discount_percentage,
        calibre,
        customer_e_warranty,
        store_master(store_name, city, region)
      `
      )
      .eq("is_approved", true);

    if (startDate) {
      salesQuery = salesQuery.gte("transaction_date", startDate);
    }
    if (endDate) {
      salesQuery = salesQuery.lte("transaction_date", endDate);
    }
    if (storeCode && storeCode !== "all") {
      salesQuery = salesQuery.eq("store_code", storeCode.toUpperCase());
    }

    const { data: sales, error: salesError } = await salesQuery;

    if (salesError) {
      console.error("❌ Sales fetch error:", salesError);
      return res.status(500).json({ error: salesError.message });
    }

    console.log(`✅ Fetched ${sales?.length || 0} sales records`);

    // Aggregate sales by store
    const storeMetrics = {};

    for (const sale of sales) {
      const code = sale.store_code;

      if (!storeMetrics[code]) {
        storeMetrics[code] = {
          store_code: code,
          store_name: sale.store_master?.store_name || code,
          city: sale.store_master?.city || "",
          region: sale.store_master?.region || "",
          total_value: 0,
          total_quantity: 0,
          total_discount_percent: 0,
          transaction_count: 0,
          warranty_count: 0,
          calibre_sales: {}, // {calibre: {value, qty}}
        };
      }

      storeMetrics[code].total_value += sale.net_value || 0;
      storeMetrics[code].total_quantity += sale.quantity || 0;
      storeMetrics[code].total_discount_percent += sale.discount_percentage || 0;
      storeMetrics[code].transaction_count += 1;

      if (sale.customer_e_warranty) {
        storeMetrics[code].warranty_count += 1;
      }

      // Track calibre-wise sales
      const calibre = sale.calibre || "Unknown";
      if (!storeMetrics[code].calibre_sales[calibre]) {
        storeMetrics[code].calibre_sales[calibre] = { value: 0, qty: 0 };
      }
      storeMetrics[code].calibre_sales[calibre].value += sale.net_value || 0;
      storeMetrics[code].calibre_sales[calibre].qty += sale.quantity || 0;
    }

    // Calculate final metrics
    const storePerformance = Object.values(storeMetrics).map((store) => {
      const target = targets.find(
        (t) => t.store_code === store.store_code
      );

      const avgDiscountPercent = store.transaction_count > 0
        ? store.total_discount_percent / store.transaction_count
        : 0;

      const warrantyPercent = store.transaction_count > 0
        ? (store.warranty_count / store.transaction_count) * 100
        : 0;

      const valueAchievementPercent = target && target.value_target > 0
        ? (store.total_value / target.value_target) * 100
        : 0;

      // Calculate calibre achievements
      const calibreMetrics = [];
      
      if (target) {
        // Calibre 1
        if (target.calibre_1_name) {
          const achieved = store.calibre_sales[target.calibre_1_name]?.qty || 0;
          const target_qty = target.calibre_1_qty_target || 0;
          const achievement = target_qty > 0 ? (achieved / target_qty) * 100 : 0;
          
          calibreMetrics.push({
            name: target.calibre_1_name,
            target: target_qty,
            achieved: achieved,
            achievement_percent: achievement,
          });
        }

        // Calibre 2
        if (target.calibre_2_name) {
          const achieved = store.calibre_sales[target.calibre_2_name]?.qty || 0;
          const target_qty = target.calibre_2_qty_target || 0;
          const achievement = target_qty > 0 ? (achieved / target_qty) * 100 : 0;
          
          calibreMetrics.push({
            name: target.calibre_2_name,
            target: target_qty,
            achieved: achieved,
            achievement_percent: achievement,
          });
        }

        // Calibre 3
        if (target.calibre_3_name) {
          const achieved = store.calibre_sales[target.calibre_3_name]?.qty || 0;
          const target_qty = target.calibre_3_qty_target || 0;
          const achievement = target_qty > 0 ? (achieved / target_qty) * 100 : 0;
          
          calibreMetrics.push({
            name: target.calibre_3_name,
            target: target_qty,
            achieved: achieved,
            achievement_percent: achievement,
          });
        }
      }

      return {
        store_code: store.store_code,
        store_name: store.store_name,
        city: store.city,
        region: store.region,
        value_target: target?.value_target || 0,
        value_achieved: store.total_value,
        value_achievement_percent: valueAchievementPercent,
        calibre_metrics: calibreMetrics,
        avg_discount_percent: parseFloat(avgDiscountPercent.toFixed(2)),
        warranty_percent: parseFloat(warrantyPercent.toFixed(2)),
      };
    });

    // Filter by city and region if provided
    let filtered = storePerformance;

    if (city && city !== "all") {
      filtered = filtered.filter((s) => s.city === city);
    }

    if (region && region !== "all") {
      filtered = filtered.filter((s) => s.region === region);
    }

    filtered = filtered.sort((a, b) => a.store_code.localeCompare(b.store_code));

    console.log(`✅ Calculated metrics for ${filtered.length} stores`);

    return res.status(200).json({ data: filtered });
  } catch (error) {
    console.error("❌ Store Performance API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
