'use client'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="drop-error"><span>MINIMICAL DROP</span><h1>Something went wrong.</h1><p>The workspace could not be loaded correctly.</p><button onClick={() => reset()}>Try again</button></main>
}
