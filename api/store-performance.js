import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Every (year, month) pair the date range touches
function monthsInRange(startDate, endDate) {
  const out = [];
  const s = new Date(startDate);
  const e = new Date(endDate);
  let y = s.getFullYear();
  let m = s.getMonth() + 1;
  const endY = e.getFullYear();
  const endM = e.getMonth() + 1;

  while (y < endY || (y === endY && m <= endM)) {
    out.push({ year: y, month: m });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { startDate, endDate, storeCode, city, region } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }

    const periods = monthsInRange(startDate, endDate);

    // 1. Targets — only for months the selected range actually covers
    const { data: allTargets, error: targetError } = await supabase
      .from("sales_targets")
      .select("*");

    if (targetError) {
      return res.status(500).json({ error: targetError.message });
    }

    const targets = (allTargets || []).filter((t) =>
      periods.some((p) => p.year === t.target_year && p.month === t.target_month)
    );

    // 2. Sales — paginated so we never silently cap at 1000 rows
    let sales = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
      let salesQuery = supabase
        .from("sales_master")
        .select(
          `store_code, transaction_date, mrp, net_value, discount_value, quantity,
           calibre, customer_e_warranty, store_master(store_name, city, region)`
        )
        .gte("transaction_date", startDate)
        .lte("transaction_date", endDate)
        .range(from, from + pageSize - 1);

      if (storeCode && storeCode !== "all") {
        salesQuery = salesQuery.eq("store_code", storeCode.toUpperCase());
      }

      const { data, error: salesError } = await salesQuery;

      if (salesError) {
        return res.status(500).json({ error: salesError.message });
      }

      sales = sales.concat(data || []);
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }

    // 3. Aggregate by store
    const storeMetrics = {};

    for (const sale of sales) {
      const code = sale.store_code;

      if (!storeMetrics[code]) {
        storeMetrics[code] = {
          store_code: code,
          store_name: sale.store_master?.store_name || code,
          city: sale.store_master?.city || "",
          region: sale.store_master?.region || "",
          total_mrp: 0,
          total_net: 0,
          total_discount: 0,
          total_quantity: 0,
          transaction_count: 0,
          warranty_count: 0,
          calibre_sales: {},
        };
      }

      const s = storeMetrics[code];
      const qty = sale.quantity || 0;

      // Returns carry negative qty, so line totals net out correctly
      s.total_mrp += (sale.mrp || 0) * qty;
      s.total_net += (sale.net_value || 0) * qty;
      s.total_discount += (sale.discount_value || 0) * qty;
      s.total_quantity += qty;
      s.transaction_count += 1;

      if (sale.customer_e_warranty) {
        s.warranty_count += 1;
      }

      const calibre = sale.calibre || "Unknown";
      if (!s.calibre_sales[calibre]) {
        s.calibre_sales[calibre] = { value: 0, qty: 0 };
      }
      s.calibre_sales[calibre].value += (sale.net_value || 0) * qty;
      s.calibre_sales[calibre].qty += qty;
    }

    // 4. Final metrics
    const storePerformance = Object.values(storeMetrics).map((store) => {
      // Sum targets across every month in range (handles multi-month spans)
      const storeTargets = targets.filter((t) => t.store_code === store.store_code);

      const valueTarget = storeTargets.reduce((sum, t) => sum + (parseFloat(t.value_target) || 0), 0);

      // Blended discount: total discount as a share of total MRP - not an average of percentages
      const discountPercent = store.total_mrp > 0
        ? (store.total_discount / store.total_mrp) * 100
        : 0;

      const warrantyPercent = store.transaction_count > 0
        ? (store.warranty_count / store.transaction_count) * 100
        : 0;

      const valueAchievementPercent = valueTarget > 0
        ? (store.total_net / valueTarget) * 100
        : 0;

      // Calibre targets, summed by name across the months in range
      const calibreTargets = {};
      for (const t of storeTargets) {
        for (const i of [1, 2, 3]) {
          const name = t[`calibre_${i}_name`];
          const qty = t[`calibre_${i}_qty_target`];
          if (name) {
            calibreTargets[name] = (calibreTargets[name] || 0) + (parseInt(qty) || 0);
          }
        }
      }

      const calibreMetrics = Object.entries(calibreTargets).map(([name, target_qty]) => {
        const achieved = store.calibre_sales[name]?.qty || 0;
        return {
          name,
          target: target_qty,
          achieved,
          achievement_percent: target_qty > 0 ? (achieved / target_qty) * 100 : 0,
        };
      });

      return {
        store_code: store.store_code,
        store_name: store.store_name,
        city: store.city,
        region: store.region,
        value_target: valueTarget,
        mrp_value: store.total_mrp,
        value_achieved: store.total_net,
        discount_value: store.total_discount,
        value_achievement_percent: valueAchievementPercent,
        calibre_metrics: calibreMetrics,
        avg_discount_percent: parseFloat(discountPercent.toFixed(2)),
        warranty_percent: parseFloat(warrantyPercent.toFixed(2)),
        total_quantity: store.total_quantity,
      };
    });

    let filtered = storePerformance;

    if (city && city !== "all") {
      filtered = filtered.filter((s) => s.city === city);
    }
    if (region && region !== "all") {
      filtered = filtered.filter((s) => s.region === region);
    }

    filtered = filtered.sort((a, b) => a.store_code.localeCompare(b.store_code));

    return res.status(200).json({ data: filtered });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
