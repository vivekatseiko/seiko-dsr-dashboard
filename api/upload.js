import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normDate(d) {
  if (!d) return "";
  return String(d).split("T")[0];
}

function isClose(a, b, epsilon = 0.01) {
  const numA = parseFloat(a);
  const numB = parseFloat(b);
  if (isNaN(numA) || isNaN(numB)) return false;
  return Math.abs(numA - numB) < epsilon;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { records, storeCode, userEmail } = req.body;

    if (!records || !storeCode || !userEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const uploadTimestamp = new Date().toISOString();

    const { data: uploadLog, error: logError } = await supabase
      .from("sales_uploads_log")
      .insert({
        store_code: storeCode,
        uploaded_by: userEmail,
        upload_timestamp: uploadTimestamp,
        file_name: `${storeCode}_${uploadTimestamp}.xlsx`,
        status: "Processing",
        total_rows_in_file: records.length,
        new_entries_count: 0,
        duplicate_entries_count: 0,
        discrepancy_entries_count: 0,
        error_message: null,
      })
      .select()
      .single();

    if (logError) {
      return res.status(500).json({ error: `Failed to create upload log: ${logError.message}` });
    }

    try {
      // ---------- 1. Fetch existing rows sharing an invoice number ----------
      const invoiceNumbers = [...new Set(records.map((r) => r.system_invoice_number).filter(Boolean))];

      let existingRows = [];
      if (invoiceNumbers.length > 0) {
        const { data: existingData, error: fetchError } = await supabase
          .from("sales_master")
          .select("*")
          .eq("store_code", storeCode)
          .in("system_invoice_number", invoiceNumbers);

        if (fetchError) throw fetchError;
        existingRows = existingData || [];
      }

      const existingMap = {};
      for (const row of existingRows) {
        const key = `${row.system_invoice_number}|${row.serial_number}|${row.quantity}`;
        existingMap[key] = row;
      }

      // ---------- 2. Classify: duplicate / value-conflict / candidate ----------
      const candidates = [];
      const toFlag = []; // { type, existing, incoming }
      let duplicateCount = 0;
      const seenInBatch = new Set();

      for (const r of records) {
        const key = `${r.system_invoice_number}|${r.serial_number}|${r.quantity}`;

        if (seenInBatch.has(key)) {
          duplicateCount++;
          continue;
        }

        const existing = existingMap[key];

        if (!existing) {
          seenInBatch.add(key);
          candidates.push(r);
          continue;
        }

        const sameDate = normDate(existing.transaction_date) === normDate(r.transaction_date);
        const sameNet = isClose(existing.net_value, r.net_value);

        if (sameDate && sameNet) {
          duplicateCount++;
          continue;
        }

        toFlag.push({ type: "full_record", existing, incoming: r });
      }

      // ---------- 3. Serial-reuse check (model + serial scoped) ----------
      // A +1 sale of a model+serial whose net position is already >= 1
      // (i.e. sold and not returned) goes to the approval queue.
      const serials = [...new Set(candidates.map((r) => (r.serial_number || "").trim()).filter(Boolean))];

      const positions = {}; // "model|serial" -> net quantity currently in DB

      if (serials.length > 0) {
        const { data: serialRows, error: serialError } = await supabase
          .from("sales_master")
          .select("model_number, serial_number, quantity, transaction_date, system_invoice_number, net_value")
          .eq("store_code", storeCode)
          .in("serial_number", serials);

        if (serialError) throw serialError;

        for (const row of serialRows || []) {
          const k = `${row.model_number}|${row.serial_number}`;
          positions[k] = (positions[k] || 0) + (row.quantity || 0);
        }
      }

      // Process in date order so sale -> return -> resale nets correctly
      const sorted = [...candidates].sort((a, b) =>
        normDate(a.transaction_date).localeCompare(normDate(b.transaction_date))
      );

      const toInsert = [];

      for (const r of sorted) {
        const serial = (r.serial_number || "").trim();

        // Rows without a serial (e.g. some returns) skip this check
        if (!serial) {
          toInsert.push(r);
          continue;
        }

        const k = `${r.model_number}|${serial}`;
        const pos = positions[k] || 0;

        if (r.quantity > 0 && pos >= 1) {
          // Same model+serial already sold and not returned - needs admin approval
          toFlag.push({ type: "serial_reuse", existing: null, incoming: r });
          continue;
        }

        positions[k] = pos + r.quantity;
        toInsert.push(r);
      }

      // ---------- 4. Insert clean records ----------
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("sales_master")
          .insert(
            toInsert.map((r) => ({
              store_code: r.store_code,
              transaction_date: r.transaction_date,
              system_invoice_number: r.system_invoice_number,
              model_number: r.model_number,
              quantity: r.quantity,
              serial_number: r.serial_number,
              mrp: r.mrp,
              net_value: r.net_value,
              discount_value: r.discount_value,
              discount_percentage: r.discount_percentage,
              sold_by: r.sold_by,
              family: r.family,
              calibre: r.calibre,
              customer_name: r.customer_name,
              mobile_number: r.mobile_number,
              upload_id: uploadLog.id,
            }))
          );

        if (insertError) throw insertError;
      }

      // ---------- 5. Flag conflicts for admin review ----------
      if (toFlag.length > 0) {
        const { error: flagError } = await supabase
          .from("discrepancies")
          .insert(
            toFlag.map(({ type, existing, incoming }) => ({
              upload_id: uploadLog.id,
              store_code: storeCode,
              transaction_date: existing ? existing.transaction_date : incoming.transaction_date,
              system_invoice_number: incoming.system_invoice_number,
              model_number: incoming.model_number,
              serial_number: incoming.serial_number,
              field_changed: type, // 'full_record' or 'serial_reuse'
              old_value: existing ? JSON.stringify(existing) : null,
              new_value: JSON.stringify(incoming),
              status: "pending",
            }))
          );

        if (flagError) throw flagError;
      }

      // ---------- 6. Update upload log ----------
      const { error: updateError } = await supabase
        .from("sales_uploads_log")
        .update({
          status: "Completed",
          new_entries_count: toInsert.length,
          duplicate_entries_count: duplicateCount,
          discrepancy_entries_count: toFlag.length,
        })
        .eq("id", uploadLog.id);

      if (updateError) throw updateError;

      return res.status(200).json({
        success: true,
        uploadId: uploadLog.id,
        recordsInserted: toInsert.length,
        duplicatesSkipped: duplicateCount,
        discrepanciesFlagged: toFlag.length,
        storeCode,
      });
    } catch (err) {
      const fullError = [err.message, err.details, err.hint].filter(Boolean).join(" | ");

      await supabase
        .from("sales_uploads_log")
        .update({
          status: "Failed",
          error_message: fullError,
        })
        .eq("id", uploadLog.id);

      return res.status(500).json({ error: fullError });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
