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

    // MTD default
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const finalStartDate = startDate || firstDayOfMonth.toISOString().split("T")[0];
    const finalEndDate = endDate || today.toISOString().split("T")[0];

    const startDateObj = new Date(finalStartDate + "T00:00:00");
    const endDateObj = new Date(finalEndDate + "T00:00:00");
    const periodLengthDays = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

    // Previous period: same length, ending the day before the selected start
    const historicalEndDate = new Date(startDateObj);
    historicalEndDate.setDate(historicalEndDate.getDate() - 1);
    const historicalStartDate = new Date(historicalEndDate);
    historicalStartDate.setDate(historicalStartDate.getDate() - periodLengthDays + 1);

    const historicalStartStr = historicalStartDate.toISOString().split("T")[0];
    const historicalEndStr = historicalEndDate.toISOString().split("T")[0];

    // ---- Current period ----
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
      return res.status(500).json({ error: currentError.message });
    }

    // ---- Previous period (for average reference lines) ----
    let historicalQuery = supabase
      .from("sales_master")
      .select("store_code, transaction_date, mrp, net_value, quantity")
      .gte("transaction_date", historicalStartStr)
      .lte("transaction_date", historicalEndStr);

    if (storeCode !== "all") {
      historicalQuery = historicalQuery.eq("store_code", storeCode.toUpperCase());
    }

    const { data: historicalData, error: historicalError } = await historicalQuery;

    if (historicalError) {
      return res.status(500).json({ error: historicalError.message });
    }

    // Previous-period averages: each STORE-DAY with sales is one observation.
    // Daily MRP is totalled per store per day, then averaged across those
    // store-days (weekdays and weekends separately). With one store selected
    // this is identical to that store's daily average; with many stores it
    // reads as "an average store's daily MRP".
    let historicalWeekdayAvg = null;
    let historicalWeekendAvg = null;

    if (historicalData && historicalData.length > 0) {
      const storeDayMrp = {}; // "store|date" -> daily MRP total for that store

      for (const record of historicalData) {
        const key = `${record.store_code}|${record.transaction_date}`;
        storeDayMrp[key] = (storeDayMrp[key] || 0) + parseFloat(record.mrp || 0);
      }

      const weekdayTotals = [];
      const weekendTotals = [];

      for (const [key, total] of Object.entries(storeDayMrp)) {
        const dateStr = key.split("|")[1];
        const dow = new Date(dateStr + "T00:00:00").getDay();
        if (dow === 0 || dow === 6) {
          weekendTotals.push(total);
        } else {
          weekdayTotals.push(total);
        }
      }

      historicalWeekdayAvg =
        weekdayTotals.length > 0
          ? weekdayTotals.reduce((a, b) => a + b, 0) / weekdayTotals.length
          : null;
      historicalWeekendAvg =
        weekendTotals.length > 0
          ? weekendTotals.reduce((a, b) => a + b, 0) / weekendTotals.length
          : null;
    }

    const historicalPeriod = { start: historicalStartStr, end: historicalEndStr };

    if (!currentData || currentData.length === 0) {
      const allDatesInRange = [];
      for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
        allDatesInRange.push(d.toISOString().split("T")[0]);
      }

      const emptyDailyTrend = allDatesInRange.map((date) => ({
        store_code: "UNKNOWN",
        store_name: "No Data",
        date: date,
        sales: 0,
        mrp: 0,
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
        historicalPeriod,
      });
    }

    // ---- Aggregate current period ----
    const citiesSet = new Set();
    const regionsSet = new Set();
    const storesSet = new Map();

    let totalSales = 0;
    let totalQuantity = 0;
    let totalDiscounts = 0;
    let totalMrp = 0;

    const dailyDataByStore = {};
    const storeMetrics = {};

    for (const record of currentData) {
      const netValue = parseFloat(record.net_value || 0);
      const mrpValue = parseFloat(record.mrp || 0);
      const quantity = parseInt(record.quantity || 0);
      const discountValue = parseFloat(record.discount_value || 0);
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
      totalMrp += mrpValue;

      if (!storeMetrics[code]) {
        storeMetrics[code] = {
          store_code: code,
          store_name: storeName,
          city: cityName,
          region: regionName,
          sales: 0,
          mrp: 0,
          quantity: 0,
          discount: 0,
          discount_percent: 0,
          asp: 0,
        };
      }
      storeMetrics[code].sales += netValue;
      storeMetrics[code].mrp += mrpValue;
      storeMetrics[code].quantity += quantity;
      storeMetrics[code].discount += discountValue;

      const key = `${code}|${date}`;
      if (!dailyDataByStore[key]) {
        dailyDataByStore[key] = {
          store_code: code,
          store_name: storeName,
          date: date,
          sales: 0,
          mrp: 0,
          quantity: 0,
          discount: 0,
          dayOfWeek: new Date(date + "T00:00:00").getDay(),
        };
      }
      dailyDataByStore[key].sales += netValue;
      dailyDataByStore[key].mrp += mrpValue;
      dailyDataByStore[key].quantity += quantity;
      dailyDataByStore[key].discount += discountValue;
    }

    // Zero-fill missing dates per store
    const allDatesInRange = [];
    for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
      allDatesInRange.push(d.toISOString().split("T")[0]);
    }

    const storesInData = new Set(currentData.map((r) => r.store_code));

    for (const store of storesInData) {
      for (const date of allDatesInRange) {
        const key = `${store}|${date}`;
        if (!dailyDataByStore[key]) {
          dailyDataByStore[key] = {
            store_code: store,
            store_name: storeMetrics[store]?.store_name || store,
            date: date,
            sales: 0,
            mrp: 0,
            quantity: 0,
            discount: 0,
            dayOfWeek: new Date(date + "T00:00:00").getDay(),
          };
        }
      }
    }

    // Per-store blended discount % and ASP
    for (const code in storeMetrics) {
      const store = storeMetrics[code];
      store.asp = store.quantity > 0 ? Math.round(store.sales / store.quantity) : 0;
      store.discount_percent =
        store.mrp > 0 ? parseFloat(((store.discount / store.mrp) * 100).toFixed(2)) : 0;
    }

    // Blended overall discount %
    const averageDiscount = totalMrp > 0 ? (totalDiscounts / totalMrp) * 100 : 0;
    const asp = totalQuantity > 0 ? Math.round(totalSales / totalQuantity) : 0;

    const dailyTrend = Object.values(dailyDataByStore).sort((a, b) =>
      `${a.store_code}${a.date}`.localeCompare(`${b.store_code}${b.date}`)
    );

    return res.status(200).json({
      totalSales: Math.round(totalSales),
      totalQuantity: totalQuantity,
      totalDiscounts: Math.round(totalDiscounts),
      averageDiscount: parseFloat(averageDiscount.toFixed(2)),
      asp: asp,
      dateRange: { start: finalStartDate, end: finalEndDate },
      dailyTrend: dailyTrend,
      storeData: Object.values(storeMetrics),
      cities: Array.from(citiesSet).sort(),
      regions: Array.from(regionsSet).sort(),
      stores: Array.from(storesSet.values()).sort((a, b) => a.name.localeCompare(b.name)),
      historicalWeekdayAvg: historicalWeekdayAvg ? parseFloat(historicalWeekdayAvg.toFixed(2)) : null,
      historicalWeekendAvg: historicalWeekendAvg ? parseFloat(historicalWeekendAvg.toFixed(2)) : null,
      historicalPeriod,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
