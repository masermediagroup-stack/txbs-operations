import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

const { values } = parseArgs({ options: {
  path: { type: "string" },
  "approved-by": { type: "string" },
  reason: { type: "string" },
  execute: { type: "boolean", default: false },
} });
if (!values.path || !values["approved-by"] || !values.reason || values.reason.trim().length < 20) {
  throw new Error("Supply --path, --approved-by (active Operator UUID), and --reason (at least 20 characters). Review retention obligations and approval before using --execute.");
}
if (!values.execute) {
  console.log(JSON.stringify({ preview: true, objectPath: values.path, approvedBy: values["approved-by"], reason: values.reason }, null, 2));
} else {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Set server-only SUPABASE_URL and SUPABASE_SECRET_KEY for the approved environment.");
  const client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: requestId, error: requestError } = await client.rpc("begin_evidence_retention", {
    p_object_path: values.path, p_approved_by: values["approved-by"], p_reason: values.reason,
  });
  if (requestError) throw new Error(requestError.message);
  console.log(`Retention audit request: ${requestId}`);
  const { error: deleteError } = await client.storage.from("operational-media").remove([values.path]);
  const { error: auditError } = await client.rpc("finish_evidence_retention", {
    p_request_id: requestId, p_outcome: deleteError ? "Failed" : "Deleted", p_error: deleteError?.message ?? null,
  });
  if (auditError) throw new Error(`Audit completion failed for ${requestId}. Inspect Storage and reconcile this existing request before retrying: ${auditError.message}`);
  if (deleteError) throw new Error(`Deletion failed and was audited: ${deleteError.message}`);
  console.log("Evidence deleted through Storage; append-only audit retained.");
}
