# GlowGuide web app

Next.js 15 (App Router) + TypeScript + Tailwind v4 + Motion.

```
src/
├── app/
│   ├── page.tsx                 Landing page (S01)
│   ├── auth/                    Sign up / log in (S02), reset password
│   ├── (app)/                   Signed-in app: layout = providers + AppGate (auth check) + AppShell
│   │   ├── onboarding/ dashboard/ scan/ report/[id]/ environment/ products/ plan/[id]/ trip/ saved/ settings/
│   └── icon.svg                 Favicon (GlowGuide logo)
├── components/
│   ├── landing/                 Landing sections
│   ├── auth/                    Auth screens, Google button, validation
│   ├── app/                     AppShell (sidebar, top bar, phone tabs), AppGate, CityPicker, ProductDrawer
│   ├── providers/               AuthProvider, AppStateProvider, ToastProvider
│   └── ui/                      Button, Field, Modal/Drawer/ConfirmDialog, Card, Chip, Tag, Toggle, Popover…
├── lib/                         api client (auto-refresh), auth api, mock data, flags, routes
└── middleware.ts                Redirects: protected routes → /auth, signed-in visitors skip / and /auth
```

`/api/*` is proxied to the FastAPI backend (`BACKEND_URL`, default `http://127.0.0.1:8800`), so auth cookies are
first-party. Signed-in screens use the API; only the landing illustrations and the public `/report/demo` sample use
`lib/mock-data.ts`.

```bash
npm install
npm run dev     # http://localhost:3001
npm run build && npm start
```
