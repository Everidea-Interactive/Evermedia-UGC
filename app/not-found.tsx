import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <p className="text-sm uppercase tracking-[0.28em] text-muted-foreground">
          Not Found
        </p>
        <h1 className="text-balance font-display text-3xl font-semibold">
          This page does not exist
        </h1>
        <p className="text-sm text-muted-foreground">
          Return to the studio workspace and continue configuring your
          generation flow.
        </p>
        <Button asChild>
          <Link href="/">Back to Workspace</Link>
        </Button>
      </div>
    </main>
  )
}
