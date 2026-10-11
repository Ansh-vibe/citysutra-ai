import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getRepository } from "@/server/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbOk = false;
  try {
    await db.execute(sql`select 1`);
    dbOk = true;
  } catch {
    dbOk = false;
  }
  const repo = getRepository();
  return Response.json({
    ok: dbOk,
    time: new Date().toISOString(),
    backendMode: repo.mode,
    persistence: dbOk ? repo.mode : "unavailable",
  });
}
