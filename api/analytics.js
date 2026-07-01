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
    const { startDate, endDate, storeCode, city, region, family, calibre, metric } = req.query;

    console.log("📊 Analytics API called with:", { startDate, endDate, metric });

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate required" });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const periodDays = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

    // Calculate previous period
    const prevEndDate = new Date(startDateObj);
    prevEndDate.setDate(prevEndDate.getDate() - 1);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevStartDate.getDate() - periodDays + 1);

    const prevStartDateStr = prevStartDate.toISOString().split("T")[0];
    const prevEndDateStr = prevEndDate.toISOString().split("T")[0];

    // Fetch current period sales
    let currentQuery = supabase
      .from("sales_master")
      .select(
        `
        store_code,
        transaction_date,
        net_value,
        quantity,
        discount_percentage,
        calibre,
        family,
        customer_e_warranty,
        store_master(store_name, city, region)
      `
      )
      .eq("is_approved", true)
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate);

    if (storeCode && storeCode !== "all") {
      currentQuery = currentQuery.eq("store_code", storeCode.toUpperCase());
    }
    if (city && city !== "all") {
      currentQuery = currentQuery.eq("store_master.city", city);
    }
    if (region && region !== "all") {
      currentQuery = currentQuery.eq("store_master.region", region);
    }
    if (family && family !== "all") {
      currentQuery = currentQuery.eq("family", family);
    }
    if (calibre && calibre !== "all") {
      currentQuery = currentQuery.eq("calibre", calibre);
    }

    const { data: currentData, error: currentError } = await currentQuery;

    if (currentError) {
      console.error("❌ Current period fetch error:", currentError);
      return res.status(500).json({ error: currentError.message });
    }

    // Fetch previous period sales (same filters except dates)
    let prevQuery = supabase
      .from("sales_master")
      .select(
        `
        store_code,
        transaction_date,
        net_value,
        quantity,
        discount_percentage,
        calibre,
        family,
        customer_e_warranty,
        store_master(store_name, city, region)
      `
      )
      .eq("is_approved", true)
      .gte("transaction_date", prevStartDateStr)
      .lte("transaction_date", prevEndDateStr);

    if (storeCode && storeCode !== "all") {
      prevQuery = prevQuery.eq("store_code", storeCode.toUpperCase());
    }
    if (city && city !== "all") {
      prevQuery = prevQuery.eq("store_master.city", city);
    }
    if (region && region !== "all") {
      prevQuery = prevQuery.eq("store_master.region", region);
    }
    if (family && family !== "all") {
      prevQuery = prevQuery.eq("family", family);
    }
    if (calibre && calibre !== "all") {
      prevQuery = prevQuery.eq("calibre", calibre);
    }

    const { data: prevData, error: prevError } = await prevQuery;

    if (prevError) {
      console.error("❌ Previous period fetch error:", prevError);
      return res.status(500).json({ error: prevError.message });
    }

    console.log(`✅ Current period: ${currentData?.length || 0} records`);
    console.log(`✅ Previous period: ${prevData?.length || 0} records`);

    // Analytics based on metric type
    if (metric === "family") {
      const familyAnalytics = analyzeFamilyPerformance(currentData, prevData, startDate, endDate, prevStartDateStr, prevEndDateStr);
      return res.status(200).json(familyAnalytics);
    }

    if (metric === "regional") {
      const regionalAnalytics = analyzeRegionalPerformance(currentData);
      return res.status(200).json(regionalAnalytics);
    }

    if (metric === "discount") {
      const discountAnalytics = analyzeDiscountRanking(currentData);
      return res.status(200).json(discountAnalytics);
    }

    if (metric === "target") {
      const targetAnalytics = await analyzeTargetVsAchievement(currentData, startDate, endDate, storeCode);
      return res.status(200).json(targetAnalytics);
    }

    if (metric === "warranty") {
      const warrantyAnalytics = analyzeWarrantyUptake(currentData, prevData, startDate, endDate, prevStartDateStr, prevEndDateStr);
      return res.status(200).json(warrantyAnalytics);
    }

    if (metric === "calibre") {
      const calibreAnalytics = analyzeCalibreSaliency(currentData);
      return res.status(200).json(calibreAnalytics);
    }

    return res.status(400).json({ error: "Unknown metric type" });
  } catch (error) {
    console.error("❌ Analytics API error:", error);
    return res.status(500).json({ error: error.message });
  }
}

// Family Performance Analysis
function analyzeFamilyPerformance(currentData, prevData, startDate, endDate, prevStartDateStr, prevEndDateStr) {
  const familyTrend = {};

  // Process current period
  for (const sale of currentData) {
    const family = sale.family || "Unknown";
    const date = sale.transaction_date;
    const dayOfWeek = new Date(date + "T00:00:00").getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (!familyTrend[family]) {
      familyTrend[family] = {
        name: family,
        currentData: {},
        prevData: {},
      };
    }

    if (!familyTrend[family].currentData[date]) {
      familyTrend[family].currentData[date] = { revenue: 0, units: 0, isWeekend };
    }

    familyTrend[family].currentData[date].revenue += sale.net_value || 0;
    familyTrend[family].currentData[date].units += sale.quantity || 0;
  }

  // Process previous period
  for (const sale of prevData) {
    const family = sale.family || "Unknown";
    const date = sale.transaction_date;
    const dayOfWeek = new Date(date + "T00:00:00").getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (!familyTrend[family]) {
      familyTrend[family] = {
        name: family,
        currentData: {},
        prevData: {},
      };
    }

    if (!familyTrend[family].prevData[date]) {
      familyTrend[family].prevData[date] = { revenue: 0, units: 0, isWeekend };
    }

    familyTrend[family].prevData[date].revenue += sale.net_value || 0;
    familyTrend[family].prevData[date].units += sale.quantity || 0;
  }

  // Convert to chart format
  const charts = [];

  for (const [family, data] of Object.entries(familyTrend)) {
    const currentTrendData = [];
    const prevTrendData = [];

    // Build current period data
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const formattedDate = `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleString("en-US", { month: "short" })}`;

      const sale = data.currentData[dateStr] || { revenue: 0, units: 0 };
      currentTrendData.push({
        date: dateStr,
        formattedDate,
        revenue: sale.revenue,
        units: sale.units,
        isWeekend,
      });
    }

    // Build previous period data
    const prevStartDateObj = new Date(prevStartDateStr);
    const prevEndDateObj = new Date(prevEndDateStr);
    for (let d = new Date(prevStartDateObj); d <= prevEndDateObj; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const formattedDate = `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleString("en-US", { month: "short" })}`;

      const sale = data.prevData[dateStr] || { revenue: 0, units: 0 };
      prevTrendData.push({
        date: dateStr,
        formattedDate,
        revenue: sale.revenue,
        units: sale.units,
        isWeekend,
      });
    }

    const currentRevenue = Object.values(data.currentData).reduce((sum, d) => sum + d.revenue, 0);
    const currentUnits = Object.values(data.currentData).reduce((sum, d) => sum + d.units, 0);
    const prevRevenue = Object.values(data.prevData).reduce((sum, d) => sum + d.revenue, 0);
    const prevUnits = Object.values(data.prevData).reduce((sum, d) => sum + d.units, 0);

    charts.push({
      family,
      currentRevenue,
      currentUnits,
      prevRevenue,
      prevUnits,
      revenueGrowth: prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0,
      unitsGrowth: prevUnits > 0 ? ((currentUnits - prevUnits) / prevUnits) * 100 : 0,
      currentTrendData,
      prevTrendData,
    });
  }

  return { charts };
}

// Regional Performance Analysis
function analyzeRegionalPerformance(currentData) {
  const regionalMetrics = {};

  for (const sale of currentData) {
    const region = sale.store_master?.region || "Unknown";
    const storeCode = sale.store_code;

    if (!regionalMetrics[region]) {
      regionalMetrics[region] = {
        region,
        stores: new Set(),
        totalRevenue: 0,
        totalUnits: 0,
        totalDiscount: 0,
        transactionCount: 0,
      };
    }

    regionalMetrics[region].stores.add(storeCode);
    regionalMetrics[region].totalRevenue += sale.net_value || 0;
    regionalMetrics[region].totalUnits += sale.quantity || 0;
    regionalMetrics[region].totalDiscount += sale.discount_percentage || 0;
    regionalMetrics[region].transactionCount += 1;
  }

  const regionalData = Object.values(regionalMetrics)
    .map((r) => ({
      region: r.region,
      storeCount: r.stores.size,
      totalRevenue: r.totalRevenue,
      avgRevenuePerStore: r.stores.size > 0 ? r.totalRevenue / r.stores.size : 0,
      totalUnits: r.totalUnits,
      avgUnitsPerStore: r.stores.size > 0 ? r.totalUnits / r.stores.size : 0,
      avgDiscountPercent: r.transactionCount > 0 ? r.totalDiscount / r.transactionCount : 0,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  return { regionalData };
}

// Discount Ranking Analysis
function analyzeDiscountRanking(currentData) {
  const storeDiscounts = {};

  for (const sale of currentData) {
    const storeCode = sale.store_code;
    const storeName = sale.store_master?.store_name || storeCode;

    if (!storeDiscounts[storeCode]) {
      storeDiscounts[storeCode] = {
        storeCode,
        storeName,
        totalDiscount: 0,
        transactionCount: 0,
      };
    }

    storeDiscounts[storeCode].totalDiscount += sale.discount_percentage || 0;
    storeDiscounts[storeCode].transactionCount += 1;
  }

  const rankingData = Object.values(storeDiscounts)
    .map((s) => ({
      storeCode: s.storeCode,
      storeName: s.storeName,
      avgDiscountPercent: s.transactionCount > 0 ? s.totalDiscount / s.transactionCount : 0,
    }))
    .sort((a, b) => b.avgDiscountPercent - a.avgDiscountPercent);

  return { rankingData };
}

// Target vs Achievement Analysis
async function analyzeTargetVsAchievement(currentData, startDate, endDate, storeCode) {
  // Fetch targets
  const { data: targets } = await supabase.from("sales_targets").select("*");

  const storeMetrics = {};

  for (const sale of currentData) {
    const code = sale.store_code;

    if (!storeMetrics[code]) {
      storeMetrics[code] = {
        storeCode: code,
        storeName: sale.store_master?.store_name || code,
        totalRevenue: 0,
        totalUnits: 0,
      };
    }

    storeMetrics[code].totalRevenue += sale.net_value || 0;
    storeMetrics[code].totalUnits += sale.quantity || 0;
  }

  const targetAchievementData = Object.values(storeMetrics)
    .map((store) => {
      const target = targets?.find((t) => t.store_code === store.storeCode);
      const achievementPercent = target && target.value_target > 0
        ? (store.totalRevenue / target.value_target) * 100
        : 0;

      return {
        storeCode: store.storeCode,
        storeName: store.storeName,
        target: target?.value_target || 0,
        achieved: store.totalRevenue,
        achievementPercent,
      };
    })
    .sort((a, b) => b.achieved - a.achieved);

  return { targetAchievementData };
}

// Warranty Uptake Analysis
function analyzeWarrantyUptake(currentData, prevData, startDate, endDate, prevStartDateStr, prevEndDateStr) {
  const warrantyTrend = {};

  // Current period
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const formattedDate = `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleString("en-US", { month: "short" })}`;

    warrantyTrend[dateStr] = {
      date: dateStr,
      formattedDate,
      total: 0,
      warranty: 0,
      isWeekend,
    };
  }

  for (const sale of currentData) {
    const date = sale.transaction_date;
    if (warrantyTrend[date]) {
      warrantyTrend[date].total += 1;
      if (sale.customer_e_warranty) {
        warrantyTrend[date].warranty += 1;
      }
    }
  }

  // Previous period
  const prevTrendData = {};
  const prevStartDateObj = new Date(prevStartDateStr);
  const prevEndDateObj = new Date(prevEndDateStr);
  for (let d = new Date(prevStartDateObj); d <= prevEndDateObj; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const formattedDate = `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleString("en-US", { month: "short" })}`;

    prevTrendData[dateStr] = {
      date: dateStr,
      formattedDate,
      total: 0,
      warranty: 0,
      isWeekend,
    };
  }

  for (const sale of prevData) {
    const date = sale.transaction_date;
    if (prevTrendData[date]) {
      prevTrendData[date].total += 1;
      if (sale.customer_e_warranty) {
        prevTrendData[date].warranty += 1;
      }
    }
  }

  const currentTrendData = Object.values(warrantyTrend).map((d) => ({
    ...d,
    warrantyPercent: d.total > 0 ? (d.warranty / d.total) * 100 : 0,
  }));

  const prevTrendDataArray = Object.values(prevTrendData).map((d) => ({
    ...d,
    warrantyPercent: d.total > 0 ? (d.warranty / d.total) * 100 : 0,
  }));

  const currentTotal = Object.values(warrantyTrend).reduce((sum, d) => sum + d.total, 0);
  const currentWarranty = Object.values(warrantyTrend).reduce((sum, d) => sum + d.warranty, 0);
  const currentPercent = currentTotal > 0 ? (currentWarranty / currentTotal) * 100 : 0;

  const prevTotal = Object.values(prevTrendData).reduce((sum, d) => sum + d.total, 0);
  const prevWarranty = Object.values(prevTrendData).reduce((sum, d) => sum + d.warranty, 0);
  const prevPercent = prevTotal > 0 ? (prevWarranty / prevTotal) * 100 : 0;

  return {
    currentTrendData,
    prevTrendData: prevTrendDataArray,
    currentPercent,
    prevPercent,
    growth: prevPercent > 0 ? currentPercent - prevPercent : 0,
  };
}

// Calibre Saliency Analysis
function analyzeCalibreSaliency(currentData) {
  const calibreMetrics = {};

  for (const sale of currentData) {
    const calibre = sale.calibre || "Unknown";

    if (!calibreMetrics[calibre]) {
      calibreMetrics[calibre] = {
        calibre,
        totalRevenue: 0,
        totalUnits: 0,
      };
    }

    calibreMetrics[calibre].totalRevenue += sale.net_value || 0;
    calibreMetrics[calibre].totalUnits += sale.quantity || 0;
  }

  const calibreData = Object.values(calibreMetrics)
    .sort((a, b) => b.totalUnits - a.totalUnits)
    .slice(0, 10)
    .map((c, idx) => ({
      rank: idx + 1,
      calibre: c.calibre,
      totalRevenue: c.totalRevenue,
      totalUnits: c.totalUnits,
    }));

  return { calibreData };
}
