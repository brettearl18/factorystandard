# Ormsby Hub — Design System Export

Visual-only handoff for replicating the navy/orange admin app shell in another Next.js + Tailwind project. **No routes, auth, or business logic included.**

---

## 1. Design tokens

### Approach

- **Tailwind theme extension** for brand colors (`sidebar`, `accent`, `bg`, `border`, `teal`, `blue`)
- **CSS variables** in `globals.css` for body foreground/background only (`--foreground-rgb`, `--background-rgb`)
- **Tailwind slate scale** for most UI text, borders, and neutrals (not redefined in theme)

### Brand palette (exact values)

| Token | Hex | RGB | Usage |
|-------|-----|-----|--------|
| `sidebar` | `#0B1220` | `11, 18, 32` | Fixed left nav background |
| `sidebar.light` | `#101B2E` | `16, 27, 46` | Defined in theme; rarely used directly |
| `accent` | `#FF5A1F` | `255, 90, 31` | Primary CTA, progress bars, badge default |
| `accent-light` | `#FF7A45` | `255, 122, 69` | Primary hover |
| `bg` | `#F5F7FB` | `245, 247, 251` | Page + topbar background |
| `border` | `#E7ECF3` | `231, 236, 243` | Topbar bottom border (theme token) |
| `teal` | `#10B981` | `16, 185, 129` | Success accents, verified states |
| `blue` | `#3B82F6` | `59, 130, 246` | Info stat icon backgrounds |

### Semantic / Tailwind slate usage (not in theme — copy these classes)

| Role | Classes | Approx hex |
|------|---------|------------|
| Page title | `text-slate-900` | `#0F172A` |
| Body / labels | `text-slate-600`, `text-slate-700` | `#475569`, `#334155` |
| Muted / subtitle | `text-slate-500` | `#64748B` |
| Caption / placeholder | `text-slate-400` | `#94A3B8` |
| Card border | `border-slate-200` | `#E2E8F0` |
| Card surface | `bg-white` | `#FFFFFF` |
| Icon well (neutral) | `bg-slate-100` | `#F1F5F9` |
| Ghost hover | `hover:bg-slate-50`, `hover:bg-slate-100` | light gray |

### State colors

| State | Background | Text | Border |
|-------|------------|------|--------|
| Success alert | `bg-emerald-50` or `bg-green-50` | `text-emerald-800` / `text-green-800` | optional `border-emerald-200` |
| Error alert | `bg-red-50` | `text-red-800` | `border-red-200` |
| Warning | `bg-amber-50`, `bg-yellow-100` | `text-amber-800`, `text-yellow-800` | — |
| Destructive button | `border-red-200 text-red-600 hover:bg-red-50` | — | — |
| Active filter (success) | `bg-emerald-600 text-white` | — | — |

### Sidebar-specific (on `#0B1220`)

| Element | Value |
|---------|--------|
| Primary text | `text-white` |
| Secondary text | `text-white/80` |
| Muted | `text-white/70`, `text-white/60`, `text-white/50` |
| Section headers | `text-white/45`, `text-[11px] font-semibold uppercase tracking-wider` |
| Dividers | `bg-white/10` |
| Nav hover | `hover:bg-white/5` |
| Nav active (standard) | `bg-white/10` |
| Nav active (admin) | `bg-red-500/20 border border-red-500/30` |
| Admin section label | `text-red-300/80` |
| Logo icon well | `bg-white/10`, `rounded-2xl` |
| Tier card inset | `background: rgba(255, 255, 255, 0.07)` |
| Progress fill | `linear-gradient(90deg, #FF5A1F, #FF7A45)` |

### Dark vs light model

**Light main + dark sidebar only.** The authenticated app is **not** full dark mode:

- **Dark:** sidebar (`#0B1220`), mobile drawer, public link-in-bio page (`#0a0a0a` — separate marketing surface)
- **Light:** main content area (`bg-bg` / `#F5F7FB`), white cards, white inputs

---

## 2. Typography

### Font

- **Family:** [Inter](https://fonts.google.com/specimen/Inter) via `next/font/google`
- **Weights used:** 400 (body), 500 (buttons, labels), 600 (headings, nav active), 700–800 (login hero only)

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-bg`}>{children}</body>
    </html>
  )
}
```

No secondary display font. Icons: **Lucide React** (`lucide-react`), typically `h-4 w-4` in nav, `h-5 w-5` in section headers.

### Type scale (typical)

| Element | Classes |
|---------|---------|
| Page title | `text-2xl font-semibold text-slate-900` |
| Page subtitle | `text-sm text-slate-500 mt-1` |
| Section title (in card) | `text-lg font-semibold text-slate-900` or `text-xl font-semibold` |
| Stat number | `text-2xl font-semibold text-slate-900` |
| Stat label | `text-sm text-slate-600` |
| Nav item | `text-sm` (white on sidebar) |
| Nav section header | `text-[11px] font-semibold uppercase tracking-wider` |
| Sidebar app name | `text-sm font-semibold leading-none` |
| Sidebar tagline | `text-xs text-white/60 mt-1` |
| Body | `text-sm text-slate-600` |
| Caption / meta | `text-xs text-slate-500` or `text-[10px] text-slate-400` |
| Form label (admin) | `text-[11px] font-medium text-slate-600` |
| Button | `text-sm font-medium` |
| Login title | `text-3xl font-extrabold text-gray-900` |

---

## 3. Layout shell

### Page structure (repeated on every authenticated page)

There is **no single `AppLayout` wrapper** — each page composes:

```tsx
<div className="flex min-h-screen">
  <Sidebar />
  <div className="flex-1 lg:ml-[260px]">
    <Topbar />
    <div className="px-6 pb-10 pt-6">
      {/* page content */}
    </div>
  </div>
</div>
```

### Sidebar

| Property | Value |
|----------|--------|
| Width | `260px` (`w-[260px]`) |
| Position | `fixed left-0 top-0 bottom-0 z-30` |
| Background | `bg-sidebar` → `#0B1220` |
| Visibility | `hidden lg:flex` (mobile uses drawer) |
| Scroll | inner `overflow-y-auto` |

**Logo block:** `px-5 py-5`, icon `h-10 w-10 rounded-2xl bg-white/10`, app name + tagline.

**Nav sections:** `NavMenuSections` — section title + `space-y-1` links with `rounded-xl`, `px-3 py-2.5`.

**Admin block:** divider `h-px bg-white/10`, label **Admin** in `text-red-300/80`, then admin nav (red-tinted active state).

**Footer:** legal links `text-xs text-white/70`, `border-t border-white/10`.

**Optional tier card:** glass panel at bottom of nav scroll area (owner progress) — skip for Factory Standards unless needed.

### Top bar

| Property | Value |
|----------|--------|
| Container | `flex items-center gap-3 px-4 sm:px-6 py-4 bg-bg border-b border-border` |
| Search | `max-w-xl`, icon `left-3`, input `pl-9 rounded-2xl border-slate-200 bg-white` |
| Hidden on mobile | search `hidden sm:block` |
| Actions | ghost icon buttons `rounded-2xl`, profile link, sign-out |

Sign-out lives in **Topbar**, not sidebar.

### Main content

| Property | Value |
|----------|--------|
| Offset | `lg:ml-[260px]` |
| Padding | `px-6 pb-10 pt-6` (some pages use `p-6`) |
| Background | inherits `bg-bg` from body |
| Max width | **none globally** — individual pages use `max-w-4xl` etc. when needed |
| Section spacing | `space-y-6` between major blocks |
| Grids | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4` for stats |

### Key layout files

| File | Role |
|------|------|
| `app/layout.tsx` | Root font + `bg-bg` |
| `app/globals.css` | CSS variables, minimal utilities |
| `components/layout/Sidebar.tsx` | Fixed navy sidebar |
| `components/layout/Topbar.tsx` | Light header bar |
| `components/layout/NavMenuSections.tsx` | Nav link rendering + active states |
| `components/layout/MobileNavDrawer.tsx` | `w-[280px] bg-sidebar`, overlay `bg-black/50` |

---

## 4. Core components

### Primary button

```tsx
// components/ui/button.tsx — default variant
<Button className="rounded-2xl bg-accent text-white hover:bg-accent-light">
  Save
</Button>

// Equivalent raw classes
className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium bg-accent text-white hover:bg-accent-light focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
```

### Secondary / outline button

```tsx
<Button variant="outline" className="rounded-2xl">
  Refresh
</Button>

// variant = border border-slate-200 bg-white hover:bg-slate-50
```

### Ghost button

```tsx
<Button variant="ghost" className="rounded-2xl">
  <Bell className="h-4 w-4" />
</Button>

// hover:bg-slate-100
```

### Destructive outline

```tsx
<Button variant="outline" className="rounded-2xl border-red-200 text-red-600 hover:bg-red-50">
  Reject
</Button>
```

### Stat / metric card

```tsx
<Card className="rounded-2xl border shadow-sm">
  <CardContent className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm text-slate-600">Total Guitars</div>
        <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      </div>
      <div className="h-10 w-10 rounded-xl bg-teal-100 flex items-center justify-center">
        <Icon className="h-5 w-5 text-teal" />
      </div>
    </div>
  </CardContent>
</Card>
```

**Icon well colors by metric type:**

- Blue: `bg-blue-100` + `text-blue-600`
- Teal: `bg-teal-100` + `text-teal`
- Yellow: `bg-yellow-100` + `text-yellow-600`
- Gray: `bg-gray-100` + `text-gray-600`
- Purple: `bg-purple-100` + `text-purple-600`

Compact variant (`StatPill`): same card, `p-4`, label `text-sm font-medium text-slate-600`, value `text-xl font-semibold`.

### Content panel / card

```tsx
// components/ui/card.tsx
<Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
  <CardContent className="p-6">{children}</CardContent>
</Card>
```

Nested list row: `Card` with `CardContent className="p-4"` inside a `space-y-3` stack.

### Welcome / hero card (dashboard)

```tsx
<Card className="rounded-2xl border shadow-sm overflow-hidden">
  <div
    className="p-6"
    style={{
      background:
        'radial-gradient(1200px 400px at 10% 20%, rgba(255,90,31,0.12), transparent 60%), radial-gradient(900px 400px at 70% 10%, rgba(59,130,246,0.10), transparent 55%), #FFFFFF',
    }}
  >
    {/* welcome copy */}
  </div>
</Card>
```

### Badges

**Default (orange count):**

```tsx
<Badge className="rounded-xl bg-accent text-white">3 pending</Badge>
```

**Secondary:**

```tsx
<Badge variant="secondary" className="rounded-xl bg-slate-100 text-slate-700" />
```

**Status — Verified:**

```tsx
<Badge className="rounded-xl bg-[#ECFDF5] text-teal">Verified</Badge>
```

**Status — Active role (solid):**

```tsx
<Badge className="rounded-xl bg-red-500 text-white border-0 font-semibold text-xs px-2 py-0.5">Admin</Badge>
```

**Beta (sidebar only):**

```tsx
<span className="shrink-0 rounded-md border border-teal-400/35 bg-teal-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-teal-200">
  Beta
</span>
```

**Notification dot:**

```tsx
<span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-bg" />
```

### Form input

```tsx
// components/ui/input.tsx
<input className="flex h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2" />

// Search with icon
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
  <Input className="pl-9 rounded-2xl" placeholder="Search…" />
</div>

// Native select (admin filters)
<select className="px-4 py-2 rounded-2xl border border-slate-200 bg-white text-sm" />
```

### Alert / toast banners

```tsx
// Success
<div className="mb-4 p-3 rounded-xl text-sm bg-emerald-50 text-emerald-800">{msg}</div>

// Error
<div className="mb-4 p-3 rounded-xl text-sm bg-red-50 text-red-800">{msg}</div>
```

### List rows (card-based, not HTML tables)

```tsx
<div className="space-y-3">
  {items.map((item) => (
    <Card key={item.id} className="rounded-2xl border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-300 to-slate-400" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">{item.title}</h3>
              <p className="text-sm text-slate-500">{item.meta}</p>
            </div>
          </div>
          <Button className="rounded-2xl bg-accent text-white">Action</Button>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

### Page header pattern

```tsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-2xl font-semibold text-slate-900">Page Title</h1>
    <p className="mt-1 text-sm text-slate-500">Short description</p>
  </div>
  <Button className="rounded-2xl bg-accent text-white">Primary action</Button>
</div>
```

---

## 5. Tailwind / CSS setup

### Dependencies

```json
{
  "tailwindcss": "^3.x",
  "@tailwindcss/typography": "^0.5.x",
  "lucide-react": "^0.x"
}
```

### Full `tailwind.config.ts`

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#0B1220',
          light: '#101B2E',
        },
        accent: {
          DEFAULT: '#FF5A1F',
          light: '#FF7A45',
        },
        bg: {
          DEFAULT: '#F5F7FB',
        },
        border: {
          DEFAULT: '#E7ECF3',
        },
        teal: {
          DEFAULT: '#10B981',
        },
        blue: {
          DEFAULT: '#3B82F6',
        },
      },
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
export default config
```

### Full `globals.css` (minimal — copy as-is)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 15, 23, 42;
  --background-rgb: 245, 247, 251;
}

body {
  color: rgb(var(--foreground-rgb));
  background: rgb(var(--background-rgb));
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

**Note:** Ormsby Hub does **not** use shared utilities like `.panel` or `.stat-card` — patterns are inline Tailwind on components.

### Border radius convention

- **Primary radius:** `rounded-2xl` (1rem) — buttons, cards, inputs, nav items
- **Smaller wells:** `rounded-xl` — icon containers, badges, avatars
- **Pills:** `rounded-full` — notification dots, progress track

---

## 6. Brand assets

| Asset | Path | Usage |
|-------|------|--------|
| Logo (PNG) | `/ormsby-logo.png` | Login, thank-you pages, emails |
| Favicon | `/favicon.ico` + `/favicon.svg` | SVG: navy `#0B1220` square, orange `#FF5A1F` “O” |
| Sidebar logo | Lucide `Guitar` icon in `bg-white/10` well | No image in sidebar by default |

**Login:** centered logo `width={180}`, page `bg-gray-50` (slightly different from app `bg-bg` — consider unifying to `#F5F7FB`).

**Dashboard hero:** optional radial orange/blue gradients on white (see Welcome card above). Optional banner image with white gradient overlay for artist dashboards.

---

## 7. Reference pages (what to screenshot in Hub)

| Pattern | Best reference in Hub |
|---------|------------------------|
| Navy sidebar + section headers | Any authenticated page — `/dashboard`, `/admin` |
| Light main + white cards | `/dashboard`, `/admin/vault` |
| Stat metric grid | `/admin/vault` (5-column stats with colored icon wells) |
| Orange primary CTAs | `/admin` (“Moderation Queue”), any admin Save button |
| Page title + subtitle | `/admin/users`, `/admin/vault` |
| Search + filters in card | `/admin/users`, `/admin/vault` |
| Card list rows (not table) | `/admin/users` |
| Status badges | `/admin/vault` (Verified / Claimed / Unclaimed) |
| Success/error banners | Any admin form save message |
| Login + orange CTA | `/login` |
| Topbar search + profile | `/dashboard` with Topbar visible |
| Admin nav (red active) | Sidebar when logged in as admin |

---

## 8. Copy-paste: minimal UI primitives

### `components/ui/button.tsx`

```tsx
import * as React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const baseClasses =
      'inline-flex items-center justify-center rounded-2xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
    const sizeClasses = {
      default: 'px-4 py-2 text-sm',
      sm: 'px-3 py-1.5 text-xs',
      lg: 'px-6 py-3 text-base',
      icon: 'p-2',
    }
    const variantClasses = {
      default: 'bg-accent text-white hover:bg-accent-light',
      outline: 'border border-slate-200 bg-white hover:bg-slate-50',
      ghost: 'hover:bg-slate-100',
    }
    return (
      <button
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
export { Button }
```

### `components/ui/card.tsx`

```tsx
import * as React from 'react'

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className || ''}`} {...props} />
  )
)
Card.displayName = 'Card'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={`p-6 ${className || ''}`} {...props} />
  )
)
CardContent.displayName = 'CardContent'

export { Card, CardContent }
```

### Sidebar nav item (simplified)

```tsx
<Link
  href={href}
  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
    isActive ? 'bg-white/10' : 'hover:bg-white/5'
  }`}
>
  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-white/70'}`} />
  <span className={`text-sm ${isActive ? 'text-white' : 'text-white/80'}`}>{label}</span>
  {isActive && <ChevronRight className="ml-auto h-4 w-4 text-white/70" />}
</Link>
```

---

## 9. What **not** to copy (visual-only guidance)

Skip these unless Factory Standards needs them explicitly:

| Skip | Why |
|------|-----|
| **Beta pills** on nav | Product-specific; teal badge on dark nav is optional |
| **Tier progress card** in sidebar | Owner gamification — not core admin chrome |
| **VIP / amber accents** | Separate gold/amber palette for VIP flows (`text-amber-300`, `bg-amber-50`) |
| **Public link-in-bio dark theme** (`#0a0a0a`) | Different surface from admin app; orange/black marketing layout |
| **Red-tinted admin nav section** | Only if you have a separate admin zone; otherwise use same nav active style |
| **Community / leaderboard / artist** badges | Role-specific badge colors (purple artist, green creator, etc.) |
| **VIP blob animations** | `vip-blob`, `vip-shine` keyframes in tailwind config — marketing fluff |
| **Pickup matcher custom CSS** | `.pm-range`, `.pm-noise` in globals.css — tool-specific |
| **Legal footer block** in sidebar | Replace with your own footer links |
| **Login `bg-gray-50`** | Slightly off-brand vs `bg-bg`; unify when porting |

### Do copy

- Navy `#0B1220` sidebar + `#F5F7FB` main
- Orange `#FF5A1F` primary actions
- `rounded-2xl` everywhere
- White cards on light gray page
- Inter + Lucide
- Topbar + fixed sidebar + `lg:ml-[260px]` content offset
- Card-based list rows instead of dense HTML tables

---

## 10. Quick checklist for Factory Standards

- [ ] Extend Tailwind with `sidebar`, `accent`, `bg`, `border`, `teal`, `blue`
- [ ] Set `body` to Inter + `bg-bg`
- [ ] Build `Sidebar` (260px, `#0B1220`) + `Topbar` (`bg-bg`, bottom border)
- [ ] Use `rounded-2xl` on buttons, inputs, cards
- [ ] Primary CTA: `bg-accent hover:bg-accent-light text-white`
- [ ] Page shell: `px-6 pt-6 pb-10`, titles `text-2xl font-semibold text-slate-900`
- [ ] Stats: white card + colored `rounded-xl` icon well
- [ ] Alerts: `rounded-xl` + emerald/red-50 backgrounds
- [ ] Skip beta tags, tier widgets, VIP gold theme unless needed

---

*Exported from Ormsby Hub codebase — visual tokens and components only.*
