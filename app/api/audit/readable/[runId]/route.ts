import { NextRequest } from "next/server";
import { getRun } from "workflow/api";
import { auditExists, saveAudit } from "@/lib/db";
import type { AuditResult } from "@/lib/audit-data";

export const maxDuration = 300;

type Context = { params: Promise<{ runId: string }> };

export async function GET(_req: NextRequest, { params }: Context) {
  const { runId } = await params;

  let run;
  try {
    run = await getRun(runId);
  } catch {
    return Response.json({ error: "Run not found" }, { status: 404 });
  }

  const readable = run.getReadable();
  const encoder = new TextEncoder();

  // Track whether we've already persisted in this connection so the same
  // result isn't written twice if multiple terminal-ish events come through.
  let persisted = false;

  async function persistIfNeeded(result: AuditResult) {
    if (persisted) return;
    persisted = true;
    try {
      const exists = await auditExists(runId);
      if (exists) {
        console.log("[audit/readable] audit already persisted runId=%s", runId);
        return;
      }
      await saveAudit(runId, result.restaurantName, result.postcode, result);
      console.log(
        "[audit/readable] persisted audit runId=%s name=%s",
        runId,
        result.restaurantName,
      );
    } catch (err) {
      console.error(
        "[audit/readable] failed to persist audit runId=%s",
        runId,
        err,
      );
    }
  }

  const sseStream = (readable as unknown as ReadableStream).pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        // The workflow emits structured event objects. We need to peek at
        // them so we can save the final result to Neon when the run finishes,
        // while still forwarding every event verbatim to the client.
        const event =
          typeof chunk === "string"
            ? safeParse(chunk)
            : (chunk as { type?: string; result?: AuditResult });

        if (event && event.type === "done" && event.result) {
          // Fire-and-forget — don't block the SSE stream on the DB write.
          void persistIfNeeded(event.result);
        }

        const data = typeof chunk === "string" ? chunk : JSON.stringify(chunk);
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      },
    }),
  );

  return new Response(sseStream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function safeParse(s: string): { type?: string; result?: AuditResult } | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
