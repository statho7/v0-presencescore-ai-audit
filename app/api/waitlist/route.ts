import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "email is required" }, { status: 400 })
    }

    console.log(`[api/waitlist] new signup email="${email}"`)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[api/waitlist] failed:", err)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
