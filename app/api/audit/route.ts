import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { runAudit } from "@/workflows/audit";
import { getRecentAuditByRestaurant } from "@/lib/db";
import { validateInputs } from "@/lib/validate";
import { validateRestaurantName } from "@/lib/validate-agent";

export async function POST(req: Request) {
  const { restaurantName, postcode } = await req.json();

  if (!restaurantName || !postcode) {
    return NextResponse.json({ error: "restaurantName and postcode are required" }, { status: 400 });
  }

  const deterministicResult = validateInputs(restaurantName, postcode);
  if (!deterministicResult.valid) {
    return NextResponse.json(
      { error: deterministicResult.message, field: deterministicResult.field },
      { status: 400 },
    );
  }

  try {
    const llmResult = await validateRestaurantName(restaurantName, postcode);
    if (!llmResult.valid) {
      return NextResponse.json(
        {
          error: `"${restaurantName}" doesn't look like a real restaurant name. Please check the spelling.`,
          field: "restaurantName",
        },
        { status: 400 },
      );
    }
  } catch (err) {
    console.error("[api/audit] LLM name validation failed, failing open:", err);
  }

  // Check if a recent audit (< 7 days old) already exists for this restaurant.
  const recent = await getRecentAuditByRestaurant(restaurantName, postcode);
  if (recent) {
    console.log(
      `[api/audit] CACHE HIT name="${restaurantName}" postcode="${postcode}" -> runId=${recent.run_id} createdAt=${recent.created_at}`,
    );
    return NextResponse.json({
      runId: recent.run_id,
      cached: true,
      cachedAt: recent.created_at,
      result: recent.result,
    });
  }

  console.log(`[api/audit] CACHE MISS — starting workflow name="${restaurantName}" postcode="${postcode}"`);
  const run = await start(runAudit, [restaurantName, postcode]);
  return NextResponse.json({ runId: run.runId, cached: false });
}
