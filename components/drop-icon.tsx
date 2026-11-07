import { Folder } from 'lucide-react'

/** Shared Finder-style app mark used on the homepage, client and studio. */
export default function DropIcon({ className = '', size = 22 }: { className?: string; priority?: boolean; size?: number }) {
  return <span className={`drop-unified-icon ${className}`} style={{ width: size, height: size }} aria-hidden="true">
    <Folder size={Math.max(14, Math.round(size * .55))} strokeWidth={1.9}/>
  </span>
}
