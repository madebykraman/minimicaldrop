const fs = require('node:fs')
const path = require('node:path')

const file = path.join(process.cwd(), 'app', 'u', '[token]', 'workspace-v5.tsx')
let source = fs.readFileSync(file, 'utf8')

if (!source.includes('const [navigating, setNavigating]')) {
  source = source.replace(/const \[used, setUsed\] = useState\(0\); const \[pending, setPending\] = useState\(0\); const \[loading, setLoading\] = useState\(true\); const \[error, setError\] = useState\(''\); const \[recoveries, setRecoveries\] = useState<Recovery\[\]>\(\[\]\); const \[queue, setQueue\] = useState<QueueItem\[\]>\(\[\]\)(; const \[resumeTarget, setResumeTarget\] = useState<Recovery \| null>\(null\))?/, m => `${m}; const [navigating, setNavigating] = useState(false)`, 1)
}

const marker = '<section className="v5-workspace">'
if (!source.includes('className="v5-nav-status"')) {
  source = source.replace(marker, '<section className="v5-workspace">{navigating && <div className="v5-nav-status" role="status"><Loader2 size={15} className="v5-spin"/><span>Opening folder</span></div>}', 1)
}

fs.writeFileSync(file, source)
