import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { FREE_PIPELINE_RUNS, getUserPipelineRunCount } from "@/lib/db"

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const runsUsed = await getUserPipelineRunCount(session.user.id)

  return NextResponse.json({
    runsUsed,
    runsAllowed: FREE_PIPELINE_RUNS,
  })
}
