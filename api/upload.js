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
      // 1. Fetch existing rows for this store sharing an invoice number with the incoming file
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

      // 2. Lookup map keyed on invoice|serial|quantity (matches the DB unique constraint)
      const existingMap = {};
      for (const row of existingRows) {
        const key = `${row.system_invoice_number}|${row.serial_number}|${row.quantity}`;
        existingMap[key] = row;
      }

      // 3. Classify each incoming record
      const toInsert = [];
      const toFlag = [];
      let duplicateCount = 0;
      const seenInBatch = new Set();

      for (const r of records) {
        const key = `${r.system_invoice_number}|${r.serial_number}|${r.quantity}`;

        // Guard against the same line appearing twice within one file
        if (seenInBatch.has(key)) {
          duplicateCount++;
          continue;
        }

        const existing = existingMap[key];

        if (!existing) {
          seenInBatch.add(key);
          toInsert.push(r);
          continue;
        }

        const sameDate = normDate(existing.transaction_date) === normDate(r.transaction_date);
        const sameNet = isClose(existing.net_value, r.net_value);

        if (sameDate && sameNet) {
          duplicateCount++;
          continue;
        }

        toFlag.push({ existing, incoming: r });
      }

      // 4. Insert new/valid records
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

      // 5. Flag conflicts for admin review
      if (toFlag.length > 0) {
        const { error: flagError } = await supabase
          .from("discrepancies")
          .insert(
            toFlag.map(({ existing, incoming }) => ({
              upload_id: uploadLog.id,
              store_code: storeCode,
              transaction_date: existing.transaction_date,
              system_invoice_number: incoming.system_invoice_number,
              model_number: incoming.model_number,
              serial_number: incoming.serial_number,
              field_changed: "full_record",
              old_value: JSON.stringify(existing),
              new_value: JSON.stringify(incoming),
              status: "pending",
            }))
          );

        if (flagError) throw flagError;
      }

      // 6. Update upload log
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
