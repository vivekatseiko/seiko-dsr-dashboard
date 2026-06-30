import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { metric, storeCode = "all", startDate, endDate } = req.query;

  try {
    // Build date filter for MTD (Month to Date)
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const dateFrom = startDate || firstDayOfMonth.toISOString().split("T")[0];
    const dateTo = endDate || today.toISOString().split("T")[0];

    // Base query
    let query = supabase
      .from("sales_master")
      .select("*")
      .gte("transaction_date", dateFrom)
      .lte("transaction_date", dateTo);

    // Add store filter if specified
    if (storeCode && storeCode !== "all") {
      query = query.eq("store_code",
