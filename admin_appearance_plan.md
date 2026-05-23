# NexHRMS — Admin Appearance & Customization Plan
### Full Theme Engine · Branding · Layout · Module Flags · Navigation Control

> **Stack:** Next.js 16 App Router · Zustand + persist · Tailwind v4 · CSS custom properties (oklch)
> **Approach:** All customization stored in a new `appearance.store.ts`, applied via a `CSSVarInjector` 
> component at the root layout level. Zero runtime dependencies beyond what's already installed.

---

## What Gets Built (7 Feature Groups)

| # | Feature Group | Where in UI | Complexity |
|---|--------------|-------------|------------|
| 1 | Color Themes + Primary Color | Settings → Appearance | Medium |
| 2 | Typography + Radius + Density | Settings → Appearance | Low |
| 3 | Branding (Logo, Name, Login Page) | Settings → Branding | Low |
| 4 | Module Feature Flags | Settings → Modules | Low |
| 5 | Navigation Customization | Settings → Navigation | Medium |
| 6 | Topbar & Shell Config | Settings → Appearance | Low |
| 7 | Login Page Customization | Settings → Branding | Low |

---

## Architecture

```
src/
├── store/
│   └── appearance.store.ts     ← NEW: all customization state + persist
├── components/
│   └── shell/
│       ├── theme-provider.tsx  ← EXTEND: inject CSS vars + font class
│       ├── app-shell.tsx       ← EXTEND: density class + topbar banner
│       ├── topbar.tsx          ← EXTEND: show company name/logo
│       └── sidebar.tsx         ← EXTEND: respect nav config
├── app/
│   ├── layout.tsx              ← EXTEND: add CSSVarInjector
│   ├── login/
│   │   └── page.tsx            ← EXTEND: read branding config
│   └── settings/
│       ├── appearance/
│       │   └── page.tsx        ← NEW: theme + density + radius + font
│       ├── branding/
│       │   └── page.tsx        ← NEW: logo, name, login page
│       ├── modules/
│       │   └── page.tsx        ← NEW: feature flag toggles
│       └── navigation/
│           └── page.tsx        ← NEW: nav order, labels, visibility
```

---

## Feature Group 1 — Color Themes + Primary Color

### How It Works
Tailwind v4 uses CSS custom properties (`--primary`, `--background`, etc.) defined in `globals.css`.
By injecting a `<style>` tag at the root with overridden values, the entire color scheme changes 
without touching any component.

### 1.1 Color Preset Themes (8 built-in)

| Theme Name | Primary Color | Preview |
|-----------|--------------|---------|
| `default` | Neutral black / white | Current behavior |
| `violet` | `oklch(0.584 0.249 292)` | Deep violet |
| `indigo` | `oklch(0.551 0.241 266)` | Indigo blue |
| `blue` | `oklch(0.546 0.245 262)` | Brand blue |
| `emerald` | `oklch(0.616 0.168 160)` | Emerald green |
| `rose` | `oklch(0.627 0.255 15)` | Rose red |
| `amber` | `oklch(0.769 0.188 84)` | Warm amber |
| `slate` | `oklch(0.446 0.043 252)` | Slate blue-gray |

Each preset defines: `--primary`, `--primary-foreground`, `--ring`, `--sidebar-primary`, 
`--sidebar-primary-foreground`, and their corresponding chart colors.

### 1.2 Custom Color Picker
Admin can pick ANY color from a color input. The store converts the hex to an oklch value
and applies it as `--primary`. A live preview swatch updates as they pick.

### 1.3 Dark Mode per Theme
Each preset has a light and dark variant, both stored. Switching dark/light mode applies
the correct variant of the active preset.

### Store Shape
```ts
colorTheme: "default" | "violet" | "indigo" | "blue" | "emerald" | "rose" | "amber" | "slate" | "custom";
customPrimaryHex: string;       // used only when colorTheme === "custom"
```

---

## Feature Group 2 — Typography, Radius, Density

### 2.1 Border Radius
Controls `--radius` CSS variable globally (affects ALL cards, buttons, inputs, badges).

| Option | Value | Look |
|--------|-------|------|
| `sharp` | `0rem` | Square corners |
| `slight` | `0.25rem` | Barely rounded |
| `default` | `0.625rem` | Current default |
| `rounded` | `0.75rem` | More pill |
| `pill` | `1.5rem` | Very rounded |

### 2.2 Font Family
Applied via a CSS class on `<html>`. Uses Google Fonts loaded lazily.

| Option | CSS | Preview |
|--------|-----|---------|
| `geist` (default) | `var(--font-geist-sans)` | Current font |
| `inter` | `'Inter', sans-serif` | Clean, neutral |
| `roboto` | `'Roboto', sans-serif` | Material-style |
| `system` | `system-ui, sans-serif` | OS default |
| `mono` | `var(--font-geist-mono)` | Monospace for devs |

### 2.3 UI Density
Applies a CSS class to `<body>` that scales padding/spacing via a custom property `--density-scale`.

| Option | Class | Effect |
|--------|-------|--------|
| `compact` | `density-compact` | Tighter padding, smaller row heights |
| `default` | — | No change |
| `relaxed` | `density-relaxed` | More whitespace, larger click targets |

Implementation: add CSS rules in `globals.css`:
```css
.density-compact { --density-scale: 0.75; }
.density-relaxed { --density-scale: 1.25; }
```
Then use `p-[calc(1rem*var(--density-scale,1))]` in app-shell padding.

### Store Shape
```ts
radius: "sharp" | "slight" | "default" | "rounded" | "pill";
fontFamily: "geist" | "inter" | "roboto" | "system" | "mono";
density: "compact" | "default" | "relaxed";
```

---

## Feature Group 3 — Branding

### 3.1 What Can Be Branded

| Field | Used In | Notes |
|-------|---------|-------|
| `companyName` | Topbar, Login page, Settings page title | Replaces "NexHRMS Inc." |
| `logoUrl` | Sidebar logo, Login page | URL string (upload or external link) |
| `logoTextVisible` | Sidebar expanded state | Toggle showing text next to logo |
| `faviconUrl` | Browser tab | Injected as `<link rel="icon">` in layout.tsx |
| `brandTagline` | Login page subtitle | e.g. "Powering your HR workflows" |
| `accentBadgeText` | Topbar badge | e.g. "Enterprise" / "v2.1" — optional |

### 3.2 Logo Handling
Since there's no file upload backend, two options:
1. **URL input** — admin pastes a public image URL (Cloudinary, S3, etc.)
2. **Base64 embed** — admin uploads a file, it's read as base64 and stored in Zustand persist

Base64 approach works fully offline and fits within the 5MB localStorage limit for typical logos.

```ts
logoUrl: string;          // base64 data URI OR https:// URL
logoStorageType: "url" | "base64";
```

### 3.3 Favicon
Same approach as logo. Injected via `useEffect` in the root layout client component:
```ts
useEffect(() => {
  if (brandingStore.faviconUrl) {
    const link = document.querySelector("link[rel='icon']") || document.createElement("link");
    link.setAttribute("rel", "icon");
    link.setAttribute("href", brandingStore.faviconUrl);
    document.head.appendChild(link);
  }
}, [brandingStore.faviconUrl]);
```

### Store Shape
```ts
companyName: string;
logoUrl: string;
logoStorageType: "url" | "base64";
logoTextVisible: boolean;
faviconUrl: string;
brandTagline: string;
accentBadgeText: string;
```

---

## Feature Group 4 — Module Feature Flags

Admin can disable entire modules. Disabled modules:
- Are hidden from the sidebar navigation
- Show an "access denied" / "module disabled" page if navigated to directly
- Are excluded from Permission setup (no point assigning perms to a disabled module)

### 4.1 Available Module Toggles

| Module | Flag | Default |
|--------|------|---------|
| Employees | `moduleEmployees` | ✅ enabled |
| Attendance | `moduleAttendance` | ✅ |
| Leave | `moduleLeave` | ✅ |
| Payroll | `modulePayroll` | ✅ |
| Loans | `moduleLoans` | ✅ |
| Projects | `moduleProjects` | ✅ |
| Reports | `moduleReports` | ✅ |
| Timesheets | `moduleTimesheets` | ✅ |
| Audit Log | `moduleAudit` | ✅ |
| Notifications | `moduleNotifications` | ✅ |
| Kiosk | `moduleKiosk` | ✅ |

### 4.2 Enforcement Points
1. **Sidebar** — `useMemo` in `sidebar.tsx` already filters by permission. Add a second filter against `enabledModules`.
2. **Page level** — Each page's access guard checks `useAppearanceStore((s) => s.modules.modulePayroll)` etc., shows a `ModuleDisabled` component if false.
3. **Constants** — `NAV_ITEMS` gets a `moduleFlag` field mapped to the appearance store key.

### 4.3 UI
Card grid, one card per module, toggle switch + module icon + description. 
A warning banner appears if a critical module (Employees / Payroll) is disabled.

### Store Shape
```ts
modules: {
  moduleEmployees: boolean;
  moduleAttendance: boolean;
  moduleLeave: boolean;
  modulePayroll: boolean;
  moduleLoans: boolean;
  moduleProjects: boolean;
  moduleReports: boolean;
  moduleTimesheets: boolean;
  moduleAudit: boolean;
  moduleNotifications: boolean;
  moduleKiosk: boolean;
};
```

---

## Feature Group 5 — Navigation Customization

Admin can per-item: **rename**, **reorder**, **hide**, change **icon** (from an icon picker).

### 5.1 Nav Item Config Shape
```ts
interface NavItemOverride {
  href: string;           // key — immutable original path
  label?: string;         // overridden display label
  icon?: string;          // overridden Lucide icon name
  hidden: boolean;        // whether to hide from sidebar
  order: number;          // sort position
}
```

### 5.2 Sidebar Reads Overrides
The sidebar merges system `NAV_ITEMS` with overrides from the store:
```ts
const navOverrides = useAppearanceStore((s) => s.navOverrides);
const finalNav = useMemo(() => 
  NAV_ITEMS
    .map(item => {
      const override = navOverrides.find(o => o.href === item.href);
      return override
        ? { ...item, label: override.label ?? item.label, icon: override.icon ?? item.icon, hidden: override.hidden, order: override.order }
        : { ...item, hidden: false, order: NAV_ITEMS.indexOf(item) };
    })
    .filter(item => !item.hidden)
    .sort((a, b) => a.order - b.order),
  [navOverrides]
);
```

### 5.3 Navigation Editor UI
- Vertical sortable list (up/down buttons, same pattern as dashboard builder)
- Each row: drag handle + icon preview + label input + icon picker button + hide toggle
- Icon picker: searchable grid of 50 most useful Lucide icons
- "Reset to defaults" button restores all overrides

### Store Shape
```ts
navOverrides: NavItemOverride[];
```

---

## Feature Group 6 — App Shell Config

Fine-grained control over the shell chrome.

### 6.1 Options

| Setting | Default | Options |
|---------|---------|---------|
| `sidebarDefaultOpen` | `true` | true/false (persisted across login) |
| `sidebarVariant` | `neutral` | `neutral` (current) / `colored` (uses primary color) |
| `topbarBannerEnabled` | `false` | Shows a dismissible announcement banner below the topbar |
| `topbarBannerText` | `""` | e.g. "System maintenance on Feb 28 at 10PM" |
| `topbarBannerColor` | `"info"` | `info` / `warning` / `success` / `error` |
| `showCompanyNameInTopbar` | `true` | Replaces "NexHRMS" text with `companyName` |
| `showRoleBadgeInTopbar` | `true` | Shows user's role slug badge |
| `pageHeaderStyle` | `default` | `default` / `minimal` (smaller h1 + less spacing on page titles) |

### 6.2 Sidebar Colored Variant
When `sidebarVariant === "colored"`:
- Sidebar background becomes `--primary`
- Nav links use `--primary-foreground` as text
- Active state uses a lighter `--primary/20` overlay

Implemented via a CSS class `sidebar-colored` on the sidebar root div.

### Store Shape
```ts
sidebarDefaultOpen: boolean;
sidebarVariant: "neutral" | "colored";
topbarBannerEnabled: boolean;
topbarBannerText: string;
topbarBannerColor: "info" | "warning" | "success" | "error";
showCompanyNameInTopbar: boolean;
showRoleBadgeInTopbar: boolean;
pageHeaderStyle: "default" | "minimal";
```

---

## Feature Group 7 — Login Page Customization

The login page is the first impression. Admins can customize:

### 7.1 Login Page Options

| Setting | Default | Description |
|---------|---------|-------------|
| `loginBackground` | `gradient` | `gradient` / `solid` / `image` |
| `loginBgGradientFrom` | `#6366f1` | Start color of gradient |
| `loginBgGradientTo` | `#3b82f6` | End color |
| `loginBgImageUrl` | `""` | Custom background image URL |
| `loginBgOverlayOpacity` | `0.5` | Darken overlay on image bg |
| `loginCardStyle` | `centered` | `centered` (card in middle) / `split` (left panel + right form) |
| `loginHeading` | `"Welcome back"` | Main heading text |
| `loginSubheading` | `"Sign in to continue"` | Sub-heading |
| `loginShowLogo` | `true` | Show company logo above heading |
| `loginFooterText` | `""` | e.g. "© 2026 NexHRMS Inc. All rights reserved." |

### 7.2 Split Layout Option
When `loginCardStyle === "split"`:
- Left half: brand background (gradient or image) + logo + tagline
- Right half: white/dark form panel

---

## New Store: `appearance.store.ts`

Complete unified store for all of the above:

```ts
interface AppearanceState {
  // Color
  colorTheme: ThemeName;
  customPrimaryHex: string;
  // Typography
  radius: RadiusOption;
  fontFamily: FontOption;
  density: DensityOption;
  // Branding
  companyName: string;
  logoUrl: string;
  logoStorageType: "url" | "base64";
  logoTextVisible: boolean;
  faviconUrl: string;
  brandTagline: string;
  accentBadgeText: string;
  // Modules
  modules: ModuleFlags;
  // Navigation
  navOverrides: NavItemOverride[];
  // Shell
  sidebarVariant: "neutral" | "colored";
  topbarBannerEnabled: boolean;
  topbarBannerText: string;
  topbarBannerColor: "info" | "warning" | "success" | "error";
  showCompanyNameInTopbar: boolean;
  showRoleBadgeInTopbar: boolean;
  pageHeaderStyle: "default" | "minimal";
  // Login
  loginBackground: "gradient" | "solid" | "image";
  loginBgGradientFrom: string;
  loginBgGradientTo: string;
  loginBgImageUrl: string;
  loginBgOverlayOpacity: number;
  loginCardStyle: "centered" | "split";
  loginHeading: string;
  loginSubheading: string;
  loginShowLogo: boolean;
  loginFooterText: string;
  // Actions
  setColorTheme: (theme: ThemeName, customHex?: string) => void;
  setRadius: (r: RadiusOption) => void;
  setFontFamily: (f: FontOption) => void;
  setDensity: (d: DensityOption) => void;
  setBranding: (patch: Partial<BrandingFields>) => void;
  setModule: (key: keyof ModuleFlags, enabled: boolean) => void;
  setNavOverride: (href: string, patch: Partial<NavItemOverride>) => void;
  resetNavOverrides: () => void;
  setShell: (patch: Partial<ShellConfig>) => void;
  setLoginConfig: (patch: Partial<LoginConfig>) => void;
  resetToDefaults: () => void;
  exportConfig: () => string;
  importConfig: (json: string) => { ok: boolean; error?: string };
}
```

**persist key:** `nexhrms-appearance`, version 1

---

## ThemeProvider Extension

The existing `ThemeProvider` is extended to:
1. Apply CSS custom property overrides via `<style>` injection
2. Apply font link tag for Google Fonts if needed
3. Apply radius, density, sidebar-colored classes

```tsx
// theme-provider.tsx (extended)
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAuthStore((s) => s.theme);
  const { colorTheme, customPrimaryHex, radius, fontFamily, density, sidebarVariant } = useAppearanceStore();

  // 1. Dark/light mode (existing)
  useEffect(() => { /* existing dark/light logic */ }, [theme]);

  // 2. Color theme → inject CSS vars
  useEffect(() => {
    const vars = colorTheme === "custom"
      ? buildCustomVars(customPrimaryHex)
      : THEME_PRESETS[colorTheme];
    
    let styleEl = document.getElementById("nexhrms-theme-vars");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "nexhrms-theme-vars";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `:root { ${vars} }`;
  }, [colorTheme, customPrimaryHex]);

  // 3. Radius
  useEffect(() => {
    document.documentElement.style.setProperty("--radius", RADIUS_VALUES[radius]);
  }, [radius]);

  // 4. Density class
  useEffect(() => {
    document.body.classList.remove("density-compact", "density-relaxed");
    if (density !== "default") document.body.classList.add(`density-${density}`);
  }, [density]);

  // 5. Font
  useEffect(() => {
    document.documentElement.setAttribute("data-font", fontFamily);
    // inject Google Font link if needed
  }, [fontFamily]);

  return <>{children}</>;
}
```

---

## Settings Pages Layout

### Settings → Appearance (`/settings/appearance`)
**Tabs:** Theme | Typography | Shell

**Theme tab:**
- Color preset grid (8 swatches, click to select) + "Custom" option with color picker
- Dark/Light/System mode toggle (moved here from account section)
- Live preview panel (shows a mini dashboard mockup reflecting current settings)

**Typography tab:**
- Radius slider with 5 positions (visual preview of card corners)
- Font family selector with live font preview text
- Density selector: Compact / Default / Relaxed cards

**Shell tab:**
- Sidebar variant toggle (Neutral / Colored)
- Topbar: company name toggle, role badge toggle
- Topbar announcement banner: enable/disable, text, color
- Page header style: Default / Minimal

---

### Settings → Branding (`/settings/branding`)
**Sections:** Identity | Login Page

**Identity:**
- Company name field
- Logo uploader (drag-drop or URL input) with preview
- Favicon uploader with preview
- Brand tagline field
- Accent badge text (optional topbar badge)
- "Preview in sidebar" mini sidebar preview

**Login Page:**
- Background style: Gradient / Solid / Image → conditional fields
- Card layout: Centered / Split
- Heading + sub-heading fields
- Footer text field
- Full-page live preview button (opens `/login` in a modal)

---

### Settings → Modules (`/settings/modules`)
Grid of module toggle cards. Each card:
- Module icon (large)
- Module name
- Short description ("Manage employee loan advances and deductions")
- Toggle switch
- Warning badge on Employees/Payroll: "Disabling this hides the module from all users"

A "Restore All Modules" button at the top.

---

### Settings → Navigation (`/settings/navigation`)
Vertical list of all nav items with:
- Drag (or up/down buttons) to reorder
- Label input (editable)
- Icon picker button → popover with 60-icon searchable grid
- Eye/EyeOff toggle to show/hide
- "Custom pages" section below (from page-builder, read-only here)
- Reset to defaults button

---

## Settings Hub Updates

The main Settings page (`/settings`) gets 4 new admin cards:

| Card | Icon | Link |
|------|------|------|
| Appearance | `Palette` | `/settings/appearance` |
| Branding | `Building2` | `/settings/branding` |
| Modules | `Layers` | `/settings/modules` |
| Navigation | `Navigation` | `/settings/navigation` |

All 4 are `isSuperAdmin` only (like Roles, Dashboard Builder, Page Builder).

---

## Export / Import

The appearance store exposes `exportConfig()` / `importConfig()` returning a portable JSON:
```json
{
  "version": "1.0",
  "exportedAt": "2026-02-21T00:00:00Z",
  "colorTheme": "violet",
  "radius": "default",
  "fontFamily": "inter",
  "density": "compact",
  "branding": { "companyName": "Acme Corp", "logoUrl": "..." },
  "modules": { "moduleLoans": false },
  "navOverrides": [{ "href": "/projects", "hidden": true }],
  "shell": { "sidebarVariant": "colored", "topbarBannerEnabled": true, "topbarBannerText": "..." },
  "login": { "loginCardStyle": "split", "loginHeading": "Welcome to Acme" }
}
```

An "Export Appearance" button and "Import Appearance" button live at the bottom of 
Settings → Appearance, allowing white-labeling configs to be copied between instances.

---

## Color Theme Presets (CSS vars)

Each preset overrides `--primary` and `--sidebar-primary` (and their foregrounds). 
All other tokens derive naturally from shadcn's theming system.

```ts
const THEME_PRESETS: Record<ThemeName, string> = {
  default: "", // no overrides, use globals.css defaults
  violet: `
    --primary: oklch(0.584 0.249 292);
    --primary-foreground: oklch(0.985 0 0);
    --ring: oklch(0.584 0.249 292);
    --sidebar-primary: oklch(0.584 0.249 292);
    --sidebar-primary-foreground: oklch(0.985 0 0);
  `,
  indigo: `
    --primary: oklch(0.551 0.241 266);
    --primary-foreground: oklch(0.985 0 0);
    --ring: oklch(0.551 0.241 266);
    --sidebar-primary: oklch(0.551 0.241 266);
    --sidebar-primary-foreground: oklch(0.985 0 0);
  `,
  blue: `
    --primary: oklch(0.546 0.245 262);
    --primary-foreground: oklch(0.985 0 0);
    --ring: oklch(0.546 0.245 262);
    --sidebar-primary: oklch(0.546 0.245 262);
    --sidebar-primary-foreground: oklch(0.985 0 0);
  `,
  emerald: `
    --primary: oklch(0.616 0.168 160);
    --primary-foreground: oklch(0.985 0 0);
    --ring: oklch(0.616 0.168 160);
    --sidebar-primary: oklch(0.616 0.168 160);
    --sidebar-primary-foreground: oklch(0.985 0 0);
  `,
  rose: `
    --primary: oklch(0.627 0.255 15);
    --primary-foreground: oklch(0.985 0 0);
    --ring: oklch(0.627 0.255 15);
    --sidebar-primary: oklch(0.627 0.255 15);
    --sidebar-primary-foreground: oklch(0.985 0 0);
  `,
  amber: `
    --primary: oklch(0.769 0.188 84);
    --primary-foreground: oklch(0.15 0 0);
    --ring: oklch(0.769 0.188 84);
    --sidebar-primary: oklch(0.769 0.188 84);
    --sidebar-primary-foreground: oklch(0.15 0 0);
  `,
  slate: `
    --primary: oklch(0.446 0.043 252);
    --primary-foreground: oklch(0.985 0 0);
    --ring: oklch(0.446 0.043 252);
    --sidebar-primary: oklch(0.446 0.043 252);
    --sidebar-primary-foreground: oklch(0.985 0 0);
  `,
};
```

---

## Implementation Roadmap

### Session 1 — Store + ThemeProvider Extension
- Create `src/store/appearance.store.ts` (full typed store, all defaults, persist)
- Extend `ThemeProvider` to read from appearance store and inject CSS vars + classes
- Add `globals.css` density classes
- Verify live color theme switching works in browser

### Session 2 — Appearance Settings Page (Theme + Typography)
- Create `/settings/appearance/page.tsx`
- Color preset swatches component
- Custom color picker with oklch conversion
- Radius slider (5 positions)
- Font selector + lazy Google Fonts injection
- Density selector
- Live mini-preview panel

### Session 3 — Appearance Settings Page (Shell tab + Topbar Banner)
- Sidebar variant toggle (Neutral / Colored) + CSS class implementation
- Topbar banner: enable/text/color → `AppShell` reads from store
- Company name in topbar (reads `companyName` from store)
- Page header style (minimal vs default — affects `<h1>` sizing)

### Session 4 — Branding Page (Identity)
- Company name field (updates topbar + settings header instantly)
- Logo uploader: file input → FileReader → base64 → store; OR URL input
- Favicon injector via useEffect in root layout
- Tagline + accent badge text fields
- Mini sidebar preview showing logo + name live

### Session 5 — Branding Page (Login Customization)
- Background style: gradient / solid / image controls
- Split vs Centered card layout toggle
- Heading / subheading / footer text fields
- Modify `/login/page.tsx` to read from appearance store
- Full-page preview of login in an iframe/dialog

### Session 6 — Modules Page
- Feature flag cards grid (11 modules)
- Toggle calls `setModule()` in store
- Sidebar updated to filter by module flags (layered on top of permission filter)
- Each page renders `<ModuleDisabled />` if its module flag is false
- Warning dialog when disabling Employees or Payroll

### Session 7 — Navigation Page
- Nav item list with up/down reorder
- Label edit (controlled inputs per item)
- Icon picker (searchable popover with 60+ Lucide icons)
- Hide/show toggle per item
- Sidebar reads overrides from store
- Reset to defaults

### Session 8 — Export/Import + Settings Hub + Polish
- Export/import JSON for all appearance settings
- Add 4 new admin cards to main Settings page
- End-to-end QA: switch themes, change logo, disable modules, reorder nav
- Verify dark mode + colored sidebar + all fonts look correct together
- Commit + push

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| oklch not supported in all browsers | Low | Fallback: use `hsl()` values for all presets, keep oklch as bonus |
| Base64 logo bloats localStorage | Low | Cap at 500KB, show warning if file too large |
| Density mode breaks specific layouts | Medium | Test compact on attendance/payroll (busiest tables) |
| Custom CSS vars conflict with dark mode | Medium | Always inject vars inside both `:root` and `.dark` blocks |
| Disabling Employees module breaks payroll deductions | Low | Show dependency warning dialog before disabling |
| Font switching causes FOUC | Low | Preload font link in `<head>` via `useEffect`, not lazy import |

---

## Summary

| Setting Page | New | Features Added |
|-------------|-----|----------------|
| `/settings/appearance` | ✅ NEW | 8 color themes + custom picker, radius, font, density, sidebar variant, topbar banner |
| `/settings/branding` | ✅ NEW | Logo (upload + URL), company name, favicon, tagline, full login page customization |
| `/settings/modules` | ✅ NEW | 11 feature flag toggles, disable entire modules site-wide |
| `/settings/navigation` | ✅ NEW | Rename, reorder, hide, change icon for every nav item |
| `appearance.store.ts` | ✅ NEW | Single persist store for all 35+ customization fields |
| `theme-provider.tsx` | 🔄 EXTEND | CSS var injection, font injection, density + sidebar classes |
| `app-shell.tsx` | 🔄 EXTEND | Topbar banner, density-aware padding |
| `sidebar.tsx` | 🔄 EXTEND | Nav overrides, module filtering, colored variant |
| `/login/page.tsx` | 🔄 EXTEND | Background, layout, text, logo from branding store |
| `globals.css` | 🔄 EXTEND | Density CSS classes |

**Total: 4 new settings pages, 1 new store, 5 file modifications. ~8 focused sessions.**
