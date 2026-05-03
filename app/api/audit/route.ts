import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { runAudit } from "@/workflows/audit";
import { auth } from "@/auth";
import {
  FREE_PIPELINE_RUNS,
  getRecentAuditByRestaurant,
  getUserPipelineRunCount,
  recordUserPipelineRun,
  upsertUser,
} from "@/lib/db";
import { validateInputs } from "@/lib/validate";
import { validateRestaurantName } from "@/lib/validate-agent";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const userId = session.user.id;
  const provider = userId.split(":")[0];

  await upsertUser(
    userId,
    session.user.email ?? "",
    session.user.name ?? null,
    session.user.image ?? null,
    provider,
  );

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

  // Cache hits do NOT count against the user's quota — serve them even if the
  // user has used all their free audits, since we're not running anything.
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

  // No cache hit — this will trigger a real audit, so enforce the quota.
  const runsUsed = await getUserPipelineRunCount(userId);
  if (runsUsed >= FREE_PIPELINE_RUNS) {
    return NextResponse.json(
      {
        error: "You've used both free audits. Upgrade to run more.",
        quotaExceeded: true,
      },
      { status: 403 },
    );
  }

  // Only validate the name with the LLM when we're about to actually run an
  // audit — this avoids burning an LLM call on cache hits.
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

  console.log(`[api/audit] CACHE MISS — starting workflow name="${restaurantName}" postcode="${postcode}"`);
  const run = await start(runAudit, [restaurantName, postcode]);

  await recordUserPipelineRun(userId, run.runId);

  return NextResponse.json({ runId: run.runId, cached: false });
}
