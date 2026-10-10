import { pool } from "@workspace/db";

// Database-backed counters and a per-account lock prevent parallel guesses from
// bypassing the limit, including across deployment instances. No PINs are stored.
export async function checkLogin(key: string, limit: number, check: () => Promise<boolean>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 71938))", [key]);
    await client.query("INSERT INTO login_attempts(key) VALUES ($1) ON CONFLICT DO NOTHING", [key]);
    const { rows: [state] } = await client.query("SELECT *, now() < locked_until AS locked FROM login_attempts WHERE key=$1 FOR UPDATE", [key]);
    if (state.locked) { await client.query("COMMIT"); return "locked" as const; }
    if (await check()) {
      await client.query("DELETE FROM login_attempts WHERE key=$1", [key]);
      await client.query("COMMIT"); return "ok" as const;
    }
    const { rows: [next] } = await client.query(
      `UPDATE login_attempts SET
       failures=CASE WHEN window_started_at < now()-interval '15 minutes' THEN 1 ELSE failures+1 END,
       window_started_at=CASE WHEN window_started_at < now()-interval '15 minutes' THEN now() ELSE window_started_at END,
       locked_until=CASE WHEN (CASE WHEN window_started_at < now()-interval '15 minutes' THEN 1 ELSE failures+1 END) >= $2 THEN now()+interval '15 minutes' ELSE NULL END
       WHERE key=$1 RETURNING locked_until`, [key, limit]);
    await client.query("COMMIT");
    return next.locked_until ? "locked" as const : "wrong" as const;
  } catch (e) { await client.query("ROLLBACK"); throw e; }
  finally { client.release(); }
}
