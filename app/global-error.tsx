'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body><main className="drop-error"><span>MINIMICAL DROP</span><h1>Something went wrong.</h1><p>The application hit an unexpected error.</p><button onClick={() => reset()}>Try again</button></main></body></html>
}
