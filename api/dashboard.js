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
    const { storeCode = "all", startDate, endDate, city, region } = req.query;

    console.log("📊 Dashboard API:", { storeCode, startDate, endDate, city, region });

    // Calculate MTD dates if not provided
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const finalStartDate = startDate || firstDayOfMonth.toISOString().split("T")[0];
    const finalEndDate = endDate || today.toISOString().split("T")[0];

    console.log(`Date range: ${finalStartDate} to ${finalEndDate}`);

    let query = supabase
      .from("sales_master")
      .select("*, store_master(store_name, city, region)")
      .gte("transaction_date", finalStartDate)
      .lte("transaction_date", finalEndDate);

    // Filter by store code
    if (storeCode !== "all") {
      query = query.eq("store_code", storeCode.toUpperCase());
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      console.log("⚠️ No data found for this date range");
      return res.status(200).json({
        totalSales: 0,
        totalQuantity: 0,
        totalDiscounts: 0,
        averageDiscount: 0,
        asp: 0,
        dailyTrend: [],
        storeData: [],
        cities: [],
        regions: [],
        stores: [],
      });
    }

    console.log(`✅ Found ${data.length} records`);

    // Extract unique cities, regions, and stores
    const citiesSet = new Set();
    const regionsSet = new Set();
    const storesSet = new Map();

    // Calculate metrics
    let totalSales = 0;
    let totalQuantity = 0;
    let totalDiscounts = 0;
    let totalDiscountPercentage = 0;

    const dailyDataByStore = {};
    const storeMetrics = {};

    for (const record of data) {
      const netValue = parseFloat(record.net_value || 0);
      const quantity = parseInt(record.quantity || 0);
      const discountValue = parseFloat(record.discount_value || 0);
      const discountPercentage = parseFloat(record.discount_percentage || 0);
      const date = record.transaction_date || "Unknown";
      const code = record.store_code || "Unknown";
      
      // Extract store info
      const storeName = record.store_master?.store_name || code;
      const cityName = record.store_master?.city || "Unknown";
      const regionName = record.store_master?.region || "Unknown";

      citiesSet.add(cityName);
      regionsSet.add(regionName);
      storesSet.set(code, { code, name: storeName, city: cityName, region: regionName });

      // Overall metrics
      totalSales += netValue;
      totalQuantity += quantity;
      totalDiscounts += discountValue;
      totalDiscountPercentage += discountPercentage;

      // Store-specific metrics
      if (!storeMetrics[code]) {
        storeMetrics[code] = {
          store_code: code,
          store_name: storeName,
          city: cityName,
          region: regionName,
          sales: 0,
          quantity: 0,
          discount: 0,
          discount_percent: 0,
          asp: 0,
          records: 0,
        };
      }
      storeMetrics[code].sales += netValue;
      storeMetrics[code].quantity += quantity;
      storeMetrics[code].discount += discountValue;
      storeMetrics[code].discount_percent += discountPercentage;
      storeMetrics[code].records++;

      // Daily trend by store
      const key = `${code}|${date}`;
      if (!dailyDataByStore[key]) {
        dailyDataByStore[key] = {
          store_code: code,
          store_name: storeName,
          date: date,
          sales: 0,
          quantity: 0,
          discount: 0,
        };
      }
      dailyDataByStore[key].sales += netValue;
      dailyDataByStore[key].quantity += quantity;
      dailyDataByStore[key].discount += discountValue;
    }

    // Calculate ASP and average discount for each store
    for (const code in storeMetrics) {
      const store = storeMetrics[code];
      store.asp = store.quantity > 0 ? Math.round(store.sales / store.quantity) : 0;
      store.discount_percent = store.records > 0 ? parseFloat((store.discount_percent / store.records).toFixed(2)) : 0;
    }

    const recordCount = Object.values(storeMetrics).reduce((sum, s) => sum + s.records, 0);
    const averageDiscount = recordCount > 0 ? totalDiscountPercentage / recordCount : 0;
    const asp = totalQuantity > 0 ? Math.round(totalSales / totalQuantity) : 0;

    const dailyTrend = Object.values(dailyDataByStore).sort(
      (a, b) => `${a.store_code}${a.date}`.localeCompare(`${b.store_code}${b.date}`)
    );

    console.log(`✅ Calculated - Sales: ${totalSales}, Qty: ${totalQuantity}, Stores: ${Object.keys(storeMetrics).length}`);

    return res.status(200).json({
      totalSales: Math.round(totalSales),
      totalQuantity: totalQuantity,
      totalDiscounts: Math.round(totalDiscounts),
      averageDiscount: parseFloat(averageDiscount.toFixed(2)),
      asp: asp,
      dateRange: {
        start: finalStartDate,
        end: finalEndDate,
      },
      dailyTrend: dailyTrend,
      storeData: Object.values(storeMetrics),
      cities: Array.from(citiesSet).sort(),
      regions: Array.from(regionsSet).sort(),
      stores: Array.from(storesSet.values()).sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch (error) {
    console.error("❌ Dashboard error:", error);
    return res.status(500).json({ error: error.message });
  }
}
