# Premium Outlets HRIS — Branding Guide

**Powered by Nexvision Innovations Inc.**

The Premium Outlets HRIS visual identity is intentionally minimal: **pure white**, **deep black**, and a single **champagne-gold** accent for highlights, focus states, and primary data emphasis.

---

## 1. Palette

| Role         | Light value          | Dark value           | CSS variable        | Notes                              |
| ------------ | -------------------- | -------------------- | ------------------- | ---------------------------------- |
| Background   | `#FFFFFF` (white)    | `#0A0A0A` (near-black) | `--background`     | Surface                            |
| Foreground   | `#0A0A0A`            | `#FAFAFA`            | `--foreground`      | Body text                          |
| Primary      | `#0A0A0A`            | `#FAFAFA`            | `--primary`         | Buttons, sidebar, titles           |
| Accent       | `#C9A24A` (gold)     | `#D4AE53` (gold)     | `--accent`          | Highlights, focus rings, charts    |
| Muted        | `#F4F4F5`            | `#262626`            | `--muted`           | Subtle backgrounds                 |
| Border       | `#E4E4E7`            | `rgba(255,255,255,.1)` | `--border`        | Dividers                           |
| Destructive  | crimson              | red                  | `--destructive`     | Errors, danger zones               |

All tokens are defined in [`src/app/globals.css`](src/app/globals.css) using **OKLCH** color space for perceptual uniformity across light and dark themes.

---

## 2. Usage Rules

1. **Use gold sparingly.** Only for: focus rings, active sidebar item, primary chart bar, and key data emphasis. Avoid gold for large surfaces.
2. **Black is dominant.** Buttons, sidebar, headings, and call-to-action surfaces should be black-on-white (light) or white-on-black (dark).
3. **No gradients.** Premium Outlets is a flat, premium aesthetic.
4. **One accent only.** Do not introduce additional brand colors without consulting Nexvision Innovations Inc.

---

## 3. Typography

- **Sans**: Geist Sans (`--font-geist-sans`)
- **Mono**: Geist Mono (`--font-geist-mono`)
- Inherited from the NexHRIS base. No changes recommended.

---

## 4. Logos & Imagery

Replace these placeholders in `public/` with Premium Outlets branding assets:

| File                              | Size       | Purpose                              |
| --------------------------------- | ---------- | ------------------------------------ |
| `public/favicon.ico`              | multi-size | Browser favicon                      |
| `public/android-chrome-192x192.png` | 192×192  | PWA icon                             |
| `public/android-chrome-512x512.png` | 512×512  | PWA icon                             |
| `public/web-app-manifest-192x192.png` | 192×192 | Maskable PWA icon                  |
| `public/web-app-manifest-512x512.png` | 512×512 | Maskable PWA icon                  |
| `public/apple-touch-icon.png`     | 180×180   | iOS home screen                      |

The in-app logo (sidebar header, login screen) is fetched from the database (`appearance_settings.logo_url`). To replace:

1. Upload the new logo to the Supabase `avatars` or `documents` bucket.
2. Update `appearance_settings.logo_url` via the in-app **Settings → Appearance** page (admin only), or via SQL:
   ```sql
   update public.appearance_settings
     set logo_url = 'https://your-cdn-url/premium-outlets-logo.svg';
   ```

---

## 5. Re-skinning (if a future palette change is needed)

1. Edit **only** the `:root` and `.dark` blocks in `src/app/globals.css`.
2. Every component reads from these CSS variables — there are no hardcoded brand colors in the codebase.
3. Update `themeColor` in `src/app/layout.tsx` and `theme_color` in `src/app/manifest.ts` if you change the dominant brand color.
4. Run `npm run dev` and walk these screens to verify visual coherence:
   - `/login`
   - `/admin/dashboard`
   - `/admin/payroll`
   - `/admin/attendance`
   - `/kiosk/face`
   - Dark mode toggle (top-right user menu)

---

## 6. Footer Attribution

Every public-facing surface includes the line **"Powered by Nexvision Innovations Inc."** Do not remove this attribution without written agreement.

---

© Nexvision Innovations Inc.
