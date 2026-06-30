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

    // Calculate last month dates
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1);
    const lastMonthStartStr = lastMonthStart.toISOString().split("T")[0];
    const lastMonthEndStr = lastMonthEnd.toISOString().split("T")[0];

    console.log(`Current month: ${finalStartDate} to ${finalEndDate}`);
    console.log(`Last month: ${lastMonthStartStr} to ${lastMonthEndStr}`);

    // Fetch current month data
    let query = supabase
      .from("sales_master")
      .select("*, store_master(store_name, city, region)")
      .gte("transaction_date", finalStartDate)
      .lte("transaction_date", finalEndDate);

    if (storeCode !== "all") {
      query = query.eq("store_code", storeCode.toUpperCase());
    }

    const { data: currentData, error: currentError } = await query;

    if (currentError) {
      console.error("❌ Supabase error:", currentError);
      return res.status(500).json({ error: currentError.message });
    }

    // Fetch last month data for comparison
    let lastMonthQuery = supabase
      .from("sales_master")
      .select("transaction_date, net_value, quantity")
      .gte("transaction_date", lastMonthStartStr)
      .lte("transaction_date", lastMonthEndStr);

    if (storeCode !== "all") {
      lastMonthQuery = lastMonthQuery.eq("store_code", storeCode.toUpperCase());
    }

    const { data: lastMonthData, error: lastMonthError } = await lastMonthQuery;

    if (lastMonthError) {
      console.error("❌ Last month error:", lastMonthError);
      return res.status(500).json({ error: lastMonthError.message });
    }

    // Calculate last month weekday/weekend averages
    let lastMonthWeekdayTotal = 0;
    let lastMonthWeekdayCount = 0;
    let lastMonthWeekendTotal = 0;
    let lastMonthWeekendCount = 0;

    if (lastMonthData && lastMonthData.length > 0) {
      for (const record of lastMonthData) {
        const date = new Date(record.transaction_date);
        const dayOfWeek = date.getDay();
        const netValue = parseFloat(record.net_value || 0);

        // 0 = Sunday, 6 = Saturday
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          lastMonthWeekendTotal += netValue;
          lastMonthWeekendCount++;
        } else {
          lastMonthWeekdayTotal += netValue;
          lastMonthWeekdayCount++;
        }
      }
    }

    const lastMonthWeekdayAvg = lastMonthWeekdayCount > 0 ? lastMonthWeekdayTotal / lastMonthWeekdayCount : 0;
    const lastMonthWeekendAvg = lastMonthWeekendCount > 0 ? lastMonthWeekendTotal / lastMonthWeekendCount : 0;

    if (!currentData || currentData.length === 0) {
      console.log("⚠️ No data found for current period");
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
        lastMonthWeekdayAvg: parseFloat(lastMonthWeekdayAvg.toFixed(2)),
        lastMonthWeekendAvg: parseFloat(lastMonthWeekendAvg.toFixed(2)),
      });
    }

    console.log(`✅ Found ${currentData.length} records`);

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
    const allDates = new Set();

    for (const record of currentData) {
      const netValue = parseFloat(record.net_value || 0);
      const quantity = parseInt(record.quantity || 0);
      const discountValue = parseFloat(record.discount_value || 0);
      const discountPercentage = parseFloat(record.discount_percentage || 0);
      const date = record.transaction_date || "Unknown";
      const code = record.store_code || "Unknown";
      
      allDates.add(date);

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
          dayOfWeek: new Date(date).getDay(),
        };
      }
      dailyDataByStore[key].sales += netValue;
      dailyDataByStore[key].quantity += quantity;
      dailyDataByStore[key].discount += discountValue;
    }

    // Fill missing dates with 0 for each store
    const sortedDates = Array.from(allDates).sort();
    const storesInData = new Set(currentData.map((r) => r.store_code));

    for (const store of storesInData) {
      for (const date of sortedDates) {
        const key = `${store}|${date}`;
        if (!dailyDataByStore[key]) {
          const storeName = storeMetrics[store]?.store_name || store;
          dailyDataByStore[key] = {
            store_code: store,
            store_name: storeName,
            date: date,
            sales: 0,
            quantity: 0,
            discount: 0,
            dayOfWeek: new Date(date).getDay(),
          };
        }
      }
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
      lastMonthWeekdayAvg: parseFloat(lastMonthWeekdayAvg.toFixed(2)),
      lastMonthWeekendAvg: parseFloat(lastMonthWeekendAvg.toFixed(2)),
    });
  } catch (error) {
    console.error("❌ Dashboard error:", error);
    return res.status(500).json({ error: error.message });
  }
}
