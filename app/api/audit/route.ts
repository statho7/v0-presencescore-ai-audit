import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { runAudit } from "@/workflows/audit";

export async function POST(req: Request) {
  const { restaurantName, postcode } = await req.json();

  if (!restaurantName || !postcode) {
    return NextResponse.json({ error: "restaurantName and postcode are required" }, { status: 400 });
  }

  const run = await start(runAudit, [restaurantName, postcode]);
  return NextResponse.json({ runId: run.runId });
}
