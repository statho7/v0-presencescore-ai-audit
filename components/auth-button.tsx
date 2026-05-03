"use client"

import { signIn, signOut, useSession } from "next-auth/react"
import { Github } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.92h5.45c-.24 1.42-1.7 4.16-5.45 4.16-3.28 0-5.96-2.72-5.96-6.08s2.68-6.08 5.96-6.08c1.87 0 3.12.8 3.84 1.48l2.62-2.52C16.84 3.6 14.66 2.6 12 2.6 6.84 2.6 2.66 6.78 2.66 11.94S6.84 21.28 12 21.28c5.46 0 9.08-3.84 9.08-9.24 0-.62-.06-1.1-.16-1.84H12z"
      />
    </svg>
  )
}

export function AuthButton() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <Skeleton className="h-8 w-32 rounded-full" />
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => signIn("google")}
          className="gap-2"
        >
          <GoogleIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Sign in with Google</span>
          <span className="sm:hidden">Google</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => signIn("github")}
          className="gap-2"
        >
          <Github className="h-4 w-4" />
          <span className="hidden sm:inline">Sign in with GitHub</span>
          <span className="sm:hidden">GitHub</span>
        </Button>
      </div>
    )
  }

  const name = session.user.name ?? "User"
  const truncated = name.length > 16 ? `${name.slice(0, 16)}…` : name

  return (
    <div className="flex items-center gap-3 text-sm">
      {session.user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={session.user.image || "/placeholder.svg"}
          alt={name}
          className="h-7 w-7 rounded-full ring-1 ring-border"
        />
      ) : (
        <div className="h-7 w-7 rounded-full bg-muted ring-1 ring-border" aria-hidden="true" />
      )}
      <span className="hidden text-muted-foreground sm:inline">{truncated}</span>
      <button
        type="button"
        onClick={() => signOut()}
        className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Sign out
      </button>
    </div>
  )
}
