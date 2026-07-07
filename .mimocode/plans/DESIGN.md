# csres-checker Vue 3 Refactor — Implementation Plan

## 1. UI Component Library Recommendation: **Naive UI**

| Criteria | Element Plus | Naive UI | Ant Design Vue | PrimeVue |
|---|---|---|---|---|
| Bundle size (tree-shaken) | ~350KB | ~300KB | ~400KB | ~350KB |
| Dark/light theme | CSS vars + theme editor | **Built-in dark/light** via `useOsTheme` | CSS vars | Theme config |
| Table component | Good (el-table) | **Excellent** (n-data-table, virtual scroll) | Good | Good |
| Zh-CN community | Largest | **Strong (Tuya/Baidu alumni)** | Large (Ant Fin) | Smaller |
| Vue 3 first-class | Yes | **Yes (built for Vue 3)** | Yes | Yes |
| Style override ease | Deep selectors | **CSS vars, clean** | Deep selectors | Theme Designer |
| GitHub Pages friendly | Yes | **Yes (smaller)** | Yes (heavier) | Yes |

**Decision: Naive UI.** Rationale:
- Built-in `useOsTheme` + `darkTheme` map directly to our dual-theme requirement (dark terminal / light clean).
- `n-data-table` supports sticky headers, row hover, custom cell render — maps 1:1 to our results table.
- Smaller bundle than Element Plus/Ant Design → faster GitHub Pages loads.
- Chinese developer community overlap (main target users are Chinese engineers).
- TypeScript-first with excellent type inference for composables integration.

## 2. Project File Structure

```
csres-checker/
├── index.html                    # Vite entry (replaces old index.html)
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── build.sh                      # Updated for Vite output
├── CNAME
├── .nojekyll
├── .gitignore
├── .github/
│   └── workflows/
│       └── deploy.yml            # Updated for Vite build
├── public/                       # Static assets copied as-is
│   └── favicon.ico
├── src/
│   ├── main.ts                   # App bootstrap
│   ├── App.vue                   # Root layout
│   ├── styles/
│   │   ├── variables.css         # CSS custom properties (theme tokens)
│   │   ├── global.css            # Reset, scrollbar, terminal aesthetic
│   │   └── overrides.css         # Naive UI theme overrides
│   ├── components/
│   │   ├── AppHeader.vue         # Title + theme toggle
│   │   ├── QueryInput.vue        # Textarea + Run/Copy buttons + progress + Turnstile
│   │   ├── ResultsTable.vue      # n-data-table with badges, links, tooltips
│   │   ├── StatusBadge.vue       # Color badge (active/deprecated/upcoming)
│   │   ├── ReplaceTooltip.vue    # "被以下标准替代" tooltip
│   │   ├── TerminalLog.vue       # Log panel body
│   │   ├── LogStats.vue          # OK/EMPTY/TIME/QUERIES footer
│   │   ├── DonatePanel.vue       # Slide-out from right edge
│   │   ├── ProgressBar.vue       # Progress bar + text
│   │   └── Toast.vue             # Toast notification
│   ├── composables/
│   │   ├── useTheme.ts           # Dark/light theme, localStorage, system pref
│   │   ├── useLog.ts              # Log lines, stats counters
│   │   ├── useQuery.ts           # 3-phase waterfall orchestration
│   │   ├── useClipboard.ts       # Cell copy + markdown export
│   │   ├── useProxy.ts           # Proxy racing (2 dingyi.de proxies)
│   │   ├── useCssn.ts            # Phase 1: CSSN JSON API
│   │   ├── useGongbiaoku.ts      # Phase 2: Gongbiaoku HTML scrape
│   │   ├── useCsres.ts           # Phase 3: Csres HTML scrape (GBK)
│   │   ├── useFirebase.ts        # RTDB global counter
│   │   ├── useTurnstile.ts       # Bot protection
│   │   └── useToast.ts           # Toast notifications
│   ├── utils/
│   │   ├── normalize.ts          # normalizeKeyword, formatKeyword, normalizeStdNo, stdBase
│   │   ├── parse.ts              # parseResults, parseCsresResults
│   │   ├── constants.ts          # COLUMNS, KEYS, BASE_URL, PROXY_LIST, TURNSTILE_SITE_KEY
│   │   └── markdown.ts           # generateMarkdown export
│   └── types/
│       └── index.ts              # StandardResult, LogEntry, QueryStatus, etc.
├── worker/                       # UNCHANGED — Cloudflare Worker
│   ├── index.js
│   ├── wrangler.toml
│   └── README.md
├── app.py                        # KEEP — Flask server (optional local dev)
├── csres_checker.py              # KEEP — CLI tool
├── templates/
│   └── index.html                # KEEP — Flask template (manual sync)
├── examples/
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

## 3. Component Hierarchy

```
App.vue
├── DonatePanel.vue                    (fixed right edge, outside flex layout)
├── .app (flex row)
│   ├── .main-panel
│   │   ├── AppHeader.vue              (h1 + theme toggle)
│   │   ├── QueryInput.vue             (textarea + buttons + progress + turnstile)
│   │   │   ├── n-input (textarea)
│   │   │   ├── n-button [RUN]
│   │   │   ├── n-button [COPY MD]
│   │   │   ├── n-progress             (ProgressBar.vue)
│   │   │   └── Turnstile widget
│   │   └── ResultsTable.vue           (n-data-table)
│   │       ├── StatusBadge.vue
│   │       ├── ReplaceTooltip.vue
│   │       └── external links
│   └── .log-panel
│       ├── TerminalLog.vue            (log lines)
│       └── LogStats.vue               (OK/EMPTY/TIME/QUERIES)
└── Toast.vue                          (teleportFixed, z-index)
```

## 4. Composable Signatures

### useTheme()
```ts
function useTheme() {
  const theme = ref<'dark' | 'dark'>('dark')  // reactive
  const toggleTheme = () => void
  const setTheme = (t: 'dark' | 'light') => void
  const preferredTheme = () => 'dark' | 'light'  // reads localStorage + system pref
  return { theme, toggleTheme, setTheme, preferredTheme }
}
```

### useLog()
```ts
function useLog() {
  const logs = ref<LogEntry[]>([])
  const stats = reactive({ ok: 0, empty: 0, time: 0, queries: 0 })
  const addLog = (msg: string, type: LogType = 'info') => void
  const resetStats = () => void
  const incrementStat = (key: 'ok' | 'empty') => void
  return { logs, stats, addLog, resetStats, incrementStat }
}

interface LogEntry { time: string; message: string; type:LogType }
type LogType = 'info' | 'success' | 'warn' | 'error' | 'highlight'
```

### useQuery()
```ts
function useQuery(deps: { log: useLogReturn, proxy: useProxyReturn }) {
  const isRunning = ref(false)
  const progress = reactive({ percent: 0, text: '' })
  const results = ref<StandardResult[]>([])
  const runQuery = async (keywords: string[], token: string) => Promise<void>
  // Internally: phase1 (cssn) → phase2 (gongbiaoku) → phase3 (csres)
  // batchSize = 4, updates progress after each batch
  return { isRunning, progress, results, runQuery }
}
```

### useProxy()
```ts
function useProxy() {
  const proxyList = [(url: string) => string, (url: string) => string]  // 2 dingyi.de
  const raceQuery = async (url: string, encoding: 'utf-8' | 'gbk' = 'utf-8') => string
  // Promise.allSettled → first valid response wins (length > 100)
  // Logs winner: `proxy${idx + 1} won (${bytes} bytes)`
  return { raceQuery, proxyList }
}
```

### useCssn(), useGongbiaoku(), useCsres()
```ts
function useCssn(proxy: useProxyReturn) {
  const query = async (keyword: string): Promise<StandardResult[]>
  // Calls proxy.raceQuery(cssnApiUrl), JSON.parse, filters by normalizeStdNo
  // Builds replaced_by mapping for 废止/作废/被代替
}

function useGongbiaoku(proxy: useProxyReturn) {
  const query = async (keyword: string): Promise<StandardResult[]>
  // Builds gongbiaoku search URL, proxy.raceQuery, parseResults()
}

function useCsres(proxy: useProxyReturn) {
  const query = async (keyword: string): Promise<StandardResult[]>
  // Builds csres s.jsp URL, proxy.raceQuery(url, 'gbk'), parseCsresResults()
}
```

### useClipboard()
```ts
function useClipboard() {
  const copy = async (text: string) => Promise<boolean>
  const copyMarkdown = (results: StandardResult[]) => Promise<void>
  return { copy, copyMarkdown }
}
```

### useFirebase()
```ts
function useFirebase() {
  const init = () => Promise<void>
  const getCount = () => Promise<number>
  const incrementCount = () => Promise<number>
  return { init, getCount, incrementCount }
}
```

### useTurnstile()
```ts
function useTurnstile() {
  const token = ref('')
  const isPending = ref(false)
  const init = (container: string) => void
  const reset = () => void
  return { token, isPending, init, reset }
}
```

### useToast()
```ts
function useToast() {
  const show = (msg: string, duration = 2000) => void
  const visible = ref(false)
  const message = ref('')
  return { show, visible, message }
}
```

## 5. Type Definitions

```ts
// src/types/index.ts
export interface StandardResult {
  query: string
  standard_number: string
  title: string
  status: string
  publish_date: string
  implement_date: string
  replaced_by?: string
}

export interface LogEntry {
  time: string
  message: string
  type: LogType
}

export type LogType = 'info' | 'success' | 'warn' | 'error' | 'highlight'

export type ThemeMode = 'dark' | 'light'

export interface QueryProgress {
  percent: number
  text: string
}

export interface LogStats {
  ok: number
  empty: number
  time: number
  queries: number
}
```

## 6. Build Configuration

### vite.config.ts
```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  base: '/',           // GitHub Pages /<repo>/ if project page; '/' if custom domain
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'naive-ui': ['naive-ui'],
        },
      },
    },
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
})
```

### build.sh (updated)
```bash
#!/bin/bash
set -e
echo "Building for production..."

# Vite build (outputs to dist/)
npm run build

# Replace secrets (same sed approach, works on dist/index.html)
if [ -n "$FIREBASE_API_KEY" ]; then
  sed -i 's/\${FIREBASE_API_KEY}/'"${FIREBASE_API_KEY}"'/g' dist/index.html
  echo "Replaced FIREBASE_API_KEY"
fi

if [ -n "$TURNSTILE_SITE_KEY" ]; then
  sed -i 's/0x4AAAAAAAPlaceholder/'"${TURNSTILE_SITE_KEY}"'/g' dist/index.html
  echo "Replaced TURNSTILE_SITE_KEY"
fi

echo "Build complete!"
ls -la dist/
```

### deploy.yml (updated for Vite)
- Same structure but `npm ci && npm run build` replaces `chmod +x build.sh && ./build.sh`
- Secrets flow unchanged: `FIREBASE_API_KEY`, `TURNSTILE_SITE_KEY`

## 7. Firebase & Turnstile CDN Loading in Vite

**Problem:** Firebase and Turnstile are loaded via `<script>` tags in current index.html. In Vite, `index.html` is the entry point and supports script tags natively.

**Solution: Hybrid approach.**

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>标准查新工具</title>
  <!-- CDN scripts loaded traditionally (no bundling needed) -->
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

**Rationale:**
- Firebase compat API is global — no Vite-friendly npm package advantage for our use case (RTDB only).
- Turnstile must be global (`turnstile.render()`) — npm wrapper exists but adds complexity for no benefit.
- DOMPurify: **switch to npm** (`import DOMPurify from 'dompurify'`) — tree-shakeable, type-safe.
- These 3rd-party scripts are loaded via `<script>` in index.html (not bundled), keeping them as external globals.
- `useFirebase` and `useTurnstile` composables access `window.firebase` and `window.turnstile`.

## 8. Proxy Racing + 3-Phase Waterfall Architecture

```
useQuery.runQuery(keywords, turnstileToken)
│
├─ Phase 1: CSSN (parallel, batch=4)
│   ├─ batch.map(kw => useCssn.query(kw))
│   │   └─ useCssn → useProxy.raceQuery(cssnUrl)
│   │       └─ Promise.allSettled([proxy1(url), proxy2(url)])
│   │           └─ fetchWithRetry(url, retries=3, timeout=15s)
│   ├─ Collected hits → results, misses → emptyKeywords
│   └─ Update progress %, render table
│
├─ Phase 2: Gongbiaoku (only emptyKeywords, batch=4)
│   ├─ batch.map(kw => useGongbiaoku.query(kw))
│   │   └─ useGongbiaoku → useProxy.raceQuery(gbUrl)
│   │       └─ encode params, parseResults(html)
│   ├─ hits → results, misses → stillEmpty
│   └─ Update progress %, render table
│
└─ Phase 3: Csres (only stillEmpty, batch=4)
    ├─ batch.map(kw => useCsres.query(kw))
    │   └─ useCsres → useProxy.raceQuery(csresUrl, 'gbk')
    │       └─ GBK decode via TextDecoder in worker, parseCsresResults(html)
    ├─ hits → results
    └─ Final render, log COMPLETE
```

**Key invariant:** Proxy racing happens inside `useProxy.raceQuery()` — each data source calls it. The worker handles GBK→UTF8 conversion for csres.com (worker detects hostname).

## 9. Python Files Decision: **KEEP but isolate**

| File | Action | Rationale |
|---|---|---|
| `csres_checker.py` | **KEEP** | CLI tool, documented in README, used by some users |
| `app.py` | **KEEP** | Flask dev server, useful for local testing without Node |
| `templates/index.html` | **KEEP but mark** | Auto-sync note in README; or deprecate in favor of Vite dev server |
| `requirements.txt` | **KEEP** | Python deps for CLI |
| `Dockerfile` + `docker-compose.yml` | **KEEP** | Optional containerized Flask deploy |
| `examples/` | **KEEP** | Sample keyword files |

Add to README: "Frontend now uses Vue 3 + Vite. Python files are CLI tools only."

## 10. Migration Strategy: **Fresh `src/` with parallel operation**

### Phase A: Scaffold (1-2 hours)
1. `npm init`, install deps: `vue`, `naive-ui`, `@vicons/ionicons5`, `dompurify`, `vite`, `@vitejs/plugin-vue`, `typescript`, `vue-tsc`
2. Create `vite.config.ts`, `tsconfig.json`, `index.html` (Vite entry)
3. Create `src/main.ts`, `src/App.vue` (empty layout)
4. Verify `npm run dev` loads blank page at localhost:5173

### Phase B: Core Composables (2-3 hours)
1. Port `utils/constants.ts`, `utils/normalize.ts`, `utils/parse.ts` (pure functions, easy)
2. Implement `useTheme()`, `useLog()`, `useToast()` (low risk)
3. Implement `useProxy()` (proxy racing logic)
4. Implement `useCssn()`, `useGongbiaoku()`, `useCsres()` (data sources)

### Phase C: Query Orchestration (1-2 hours)
1. Implement `useQuery()` (3-phase waterfall)
2. Implement `useFirebase()`, `useTurnstile()`
3. Wire up `useClipboard()`

### Phase D: Components (2-3 hours)
1. Build `App.vue` layout (flex row: main-panel + log-panel)
2. Build `QueryInput.vue`, `ResultsTable.vue` (Naive UI data table)
3. Build `TerminalLog.vue`, `LogStats.vue`
4. Build `DonatePanel.vue`, `ProgressBar.vue`, `StatusBadge.vue`, `ReplaceTooltip.vue`

### Phase E: Styling (1-2 hours)
1. Port CSS variables to `styles/variables.css` (dark/light tokens)
2. Port terminal aesthetic (scanlines, dots, monospace) to `styles/global.css`
3. Write Naive UI theme overrides in `styles/overrides.css`
4. Port responsive media queries

### Phase F: Build & Deploy (1 hour)
1. Update `build.sh` for Vite
2. Update `deploy.yml` workflow
3. Test `npm run build` → `dist/`
4. Verify secret injection works
5. Test deploy to GitHub Pages (staging branch)

### Phase G: Validation (1 hour)
1. Feature parity checklist — all 17 features verified
2. Mobile responsive check
3. Theme toggle check
4. Check bundle size (`npm run build` output)
5. Lighthouse Performance audit

**Estimated total: ~10-14 hours** (can be split across sittings)

### Risk Mitigation
- Keep old `index.html` in repo until new version is deployed and verified
- Deploy Vue version to a `vue-dev` branch first, verify at `csres.yeye.moe/vue-dev/`
- Use Cloudflare Worker as-is — no changes needed
- Rollback: revert to old index.html-based commit, old deploy.yml

## 11. Implementation Order (Recommended Sprint Sequence)

| Step | Task | Depends On | Est. |
|---|---|---|---|
| 1 | Scaffold Vite + Vue 3 + TS project | — | 1h |
| 2 | Install Naive UI, configure theme tokens | Step 1 | 0.5h |
| 3 | Port utils (normalize, parse, constants) | Step 1 | 1h |
| 4 | Implement useProxy composable | Step 3 | 1h |
| 5 | Implement useCssn, useGongbiaoku, useCsres | Step 4 | 2h |
| 6 | Implement useQuery orchestrator | Step 5 | 1.5h |
| 7 | Implement useTheme, useLog, useToast, useClipboard, useFirebase, useTurnstile | Step 3 | 1.5h |
| 8 | Build App.vue layout + all child components | Step 6, 7 | 3h |
| 9 | Style: CSS vars, terminal aesthetic, responsive, Naive overrides | Step 8 | 2h |
| 10 | Update build.sh + deploy.yml | Step 1 | 0.5h |
| 11 | Test in browser, verify feature parity | Step 9, 10 | 1h |
| **Total** | | | **~15h** |

## 12. Key Design Decisions Summary

| Decision | Choice | Why |
|---|---|---|
| UI library | **Naive UI** | Best dark/light theme support, smallest bundle, Vue 3 native |
| Language | **TypeScript** | Type safety for complex data flow (3-phase waterfall) |
| State management | **Composables only** | No Pinia needed — app is single-page, no cross-page state |
| Styling | **CSS vars + Naive theme overrides** | Dual theme via `data-theme` attribute on `<html>` |
| Firebase/Turnstile | **CDN `<script>` tags in index.html** | Global API, no npm benefit, keeps bundle small |
| DOMPurify | **npm package** | Tree-shakeable, type-safe import |
| Worker | **No changes** | Already handles GBK, rate limiting, SSRF protection |
| Python files | **Keep** | CLI tool still useful, documented |
| Migration | **Fresh src/** | Cleaner than incremental; old index.html kept as fallback |
| Bundle splitting | **Separate naive-ui chunk** | Faster initial load, cached independently |
