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

    // Calculate period length in days
    const startDateObj = new Date(finalStartDate + "T00:00:00");
    const endDateObj = new Date(finalEndDate + "T00:00:00");
    const periodLengthMs = endDateObj - startDateObj;
    const periodLengthDays = Math.ceil(periodLengthMs / (1000 * 60 * 60 * 24)) + 1;

    console.log(`Current period: ${finalStartDate} to ${finalEndDate} (${periodLengthDays} days)`);

    // Calculate historical period (same length, before start date)
    const historicalEndDate = new Date(startDateObj);
    historicalEndDate.setDate(historicalEndDate.getDate() - 1);
    const historicalStartDate = new Date(historicalEndDate);
    historicalStartDate.setDate(historicalStartDate.getDate() - periodLengthDays + 1);

    const historicalStartStr = historicalStartDate.toISOString().split("T")[0];
    const historicalEndStr = historicalEndDate.toISOString().split("T")[0];

    console.log(`Historical period: ${historicalStartStr} to ${historicalEndStr}`);

    // Fetch current period data
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

    // Fetch historical data
    let historicalQuery = supabase
      .from("sales_master")
      .select("transaction_date, net_value, quantity")
      .gte("transaction_date", historicalStartStr)
      .lte("transaction_date", historicalEndStr);

    if (storeCode !== "all") {
      historicalQuery = historicalQuery.eq("store_code", storeCode.toUpperCase());
    }

    const { data: historicalData, error: historicalError } = await historicalQuery;

    if (historicalError) {
      console.error("❌ Historical data error:", historicalError);
      return res.status(500).json({ error: historicalError.message });
    }

    // Check if historical data is sufficient (at least 80% of period)
    let historicalWeekdayAvg = null;
    let historicalWeekendAvg = null;

    if (historicalData && historicalData.length > 0) {
      const historicalDatesCount = new Set(historicalData.map(r => r.transaction_date)).size;
      const minRequiredDates = Math.ceil(periodLengthDays * 0.8);

      if (historicalDatesCount >= minRequiredDates) {
        let histWeekdayTotal = 0;
        let histWeekdayCount = 0;
        let histWeekendTotal = 0;
        let histWeekendCount = 0;

        for (const record of historicalData) {
          const date = new Date(record.transaction_date + "T00:00:00");
          const dayOfWeek = date.getDay();
          const netValue = parseFloat(record.net_value || 0);

          if (dayOfWeek === 0 || dayOfWeek === 6) {
            histWeekendTotal += netValue;
            histWeekendCount++;
          } else {
            histWeekdayTotal += netValue;
            histWeekdayCount++;
          }
        }

        historicalWeekdayAvg = histWeekdayCount > 0 ? histWeekdayTotal / histWeekdayCount : null;
        historicalWeekendAvg = histWeekendCount > 0 ? histWeekendTotal / histWeekendCount : null;
      } else {
        console.log(`⚠️ Insufficient historical data: ${historicalDatesCount}/${minRequiredDates} dates`);
      }
    }

    if (!currentData || currentData.length === 0) {
      console.log("⚠️ No data found for current period");
      
      // Still generate empty date range
      const allDatesInRange = [];
      for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
        allDatesInRange.push(d.toISOString().split("T")[0]);
      }

      const emptyDailyTrend = allDatesInRange.map(date => ({
        store_code: "UNKNOWN",
        store_name: "No Data",
        date: date,
        sales: 0,
        quantity: 0,
        discount: 0,
        dayOfWeek: new Date(date + "T00:00:00").getDay(),
      }));

      return res.status(200).json({
        totalSales: 0,
        totalQuantity: 0,
        totalDiscounts: 0,
        averageDiscount: 0,
        asp: 0,
        dailyTrend: emptyDailyTrend,
        storeData: [],
        cities: [],
        regions: [],
        stores: [],
        historicalWeekdayAvg: historicalWeekdayAvg ? parseFloat(historicalWeekdayAvg.toFixed(2)) : null,
        historicalWeekendAvg: historicalWeekendAvg ? parseFloat(historicalWeekendAvg.toFixed(2)) : null,
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

    for (const record of currentData) {
      const netValue = parseFloat(record.net_value || 0);
      const quantity = parseInt(record.quantity || 0);
      const discountValue = parseFloat(record.discount_value || 0);
      const discountPercentage = parseFloat(record.discount_percentage || 0);
      const date = record.transaction_date || "Unknown";
      const code = record.store_code || "Unknown";

      const storeName = record.store_master?.store_name || code;
      const cityName = record.store_master?.city || "Unknown";
      const regionName = record.store_master?.region || "Unknown";

      citiesSet.add(cityName);
      regionsSet.add(regionName);
      storesSet.set(code, { code, name: storeName, city: cityName, region: regionName });

      totalSales += netValue;
      totalQuantity += quantity;
      totalDiscounts += discountValue;
      totalDiscountPercentage += discountPercentage;

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

      const key = `${code}|${date}`;
      if (!dailyDataByStore[key]) {
        dailyDataByStore[key] = {
          store_code: code,
          store_name: storeName,
          date: date,
          sales: 0,
          quantity: 0,
          discount: 0,
          dayOfWeek: new Date(date + "T00:00:00").getDay(),
        };
      }
      dailyDataByStore[key].sales += netValue;
      dailyDataByStore[key].quantity += quantity;
      dailyDataByStore[key].discount += discountValue;
    }

    // Generate all dates in range
    const allDatesInRange = [];
    for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
      allDatesInRange.push(d.toISOString().split("T")[0]);
    }

    console.log(`📅 Generated ${allDatesInRange.length} dates in range`);

    // Fill missing dates with 0 for each store
    const storesInData = new Set(currentData.map((r) => r.store_code));

    for (const store of storesInData) {
      for (const date of allDatesInRange) {
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
            dayOfWeek: new Date(date + "T00:00:00").getDay(),
          };
          console.log(`🔵 Added zero entry: ${store} on ${date}`);
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

    console.log(`✅ Final: ${dailyTrend.length} daily records, ${Object.keys(storeMetrics).length} stores`);

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
      historicalWeekdayAvg: historicalWeekdayAvg ? parseFloat(historicalWeekdayAvg.toFixed(2)) : null,
      historicalWeekendAvg: historicalWeekendAvg ? parseFloat(historicalWeekendAvg.toFixed(2)) : null,
      periodLengthDays: periodLengthDays,
    });
  } catch (error) {
    console.error("❌ Dashboard error:", error);
    return res.status(500).json({ error: error.message });
  }
}
