// api/uploads-log.js (Vercel Function)
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
    const { storeCode, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from("sales_uploads_log")
      .select("*", { count: "exact" })
      .order("upload_timestamp", { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (storeCode && storeCode !== "all") {
      query = query.eq("store_code", storeCode);
    }

    const { data: logs, error, count } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      logs,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error("Uploads log error:", error);
    res.status(500).json({ error: error.message });
  }
}
