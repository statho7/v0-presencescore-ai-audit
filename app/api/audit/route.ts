import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { runAudit } from "@/workflows/audit";
import { getRecentAuditByRestaurant } from "@/lib/db";

export async function POST(req: Request) {
  const { restaurantName, postcode } = await req.json();

  if (!restaurantName || !postcode) {
    return NextResponse.json({ error: "restaurantName and postcode are required" }, { status: 400 });
  }

  // Check if a recent audit (< 7 days old) already exists for this restaurant.
  const recent = await getRecentAuditByRestaurant(restaurantName, postcode);
  if (recent) {
    return NextResponse.json({
      runId: recent.run_id,
      cached: true,
      cachedAt: recent.created_at,
      result: recent.result,
    });
  }

  const run = await start(runAudit, [restaurantName, postcode]);
  return NextResponse.json({ runId: run.runId, cached: false });
}
