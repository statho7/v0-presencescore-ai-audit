import { NextResponse } from "next/server";
import { getRun } from "workflow/api";

type Context = { params: Promise<{ runId: string }> };

export async function GET(_req: Request, { params }: Context) {
  const { runId } = await params;

  let run;
  try {
    run = await getRun(runId);
  } catch {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const [status, createdAt, startedAt, completedAt] = await Promise.all([
    run.status,
    run.createdAt,
    run.startedAt,
    run.completedAt,
  ]);

  return NextResponse.json({
    runId,
    status,
    createdAt: createdAt.toISOString(),
    startedAt: startedAt?.toISOString() ?? null,
    completedAt: completedAt?.toISOString() ?? null,
  });
}
