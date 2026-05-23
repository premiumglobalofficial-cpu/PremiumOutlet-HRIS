# Premium Outlets HRIS — Environment Variables

**Powered by Nexvision Innovations Inc.**

All secrets live in `.env.local` (local dev) or in **Vercel → Settings → Environment Variables** (production).
**Never commit `.env.local` or any file containing real keys.** A template is provided at `.env.example`.

---

## 1. Required Variables

### Supabase (mandatory)

| Variable                          | Where to find                                              | Used by             |
| --------------------------------- | ---------------------------------------------------------- | ------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase → Project Settings → API → Project URL            | Browser & server    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase → Project Settings → API → `anon` `public` key    | Browser & server    |
| `SUPABASE_SERVICE_ROLE_KEY`       | Supabase → Project Settings → API → `service_role` key     | **Server only**     |

> The service-role key bypasses RLS. It must **never** be exposed to the browser. Only `src/lib/supabase/admin.ts` reads it.

### Application Security (mandatory in production)

| Variable             | Description                                                          |
| -------------------- | -------------------------------------------------------------------- |
| `QR_HMAC_SECRET`     | 32+ char random string used to sign kiosk QR / face tokens.          |
| `NEXTAUTH_URL`       | Full public URL of the deployment, e.g. `https://hris.premiumoutlets.ph` |

Generate `QR_HMAC_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Push Notifications (optional but recommended)

| Variable                   | Description                                                  |
| -------------------------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_VAPID_PUBLIC` | Web Push public key.                                         |
| `VAPID_PRIVATE_KEY`        | Web Push private key.                                        |
| `VAPID_SUBJECT`            | `mailto:ops@premiumoutlets.ph` or your contact email.        |

Generate VAPID keys with:

```bash
npx web-push generate-vapid-keys
```

### Storage (optional — Supabase bucket names)

| Variable                          | Default value         | Purpose                       |
| --------------------------------- | --------------------- | ----------------------------- |
| `NEXT_PUBLIC_AVATAR_BUCKET`       | `avatars`             | Employee profile photos       |
| `NEXT_PUBLIC_DOCUMENTS_BUCKET`    | `documents`           | Document Center uploads       |
| `NEXT_PUBLIC_PAYSLIPS_BUCKET`     | `payslips`            | Generated payslip PDFs        |

---

## 2. Optional / Feature Flags

| Variable                       | Values         | Effect                                                                |
| ------------------------------ | -------------- | --------------------------------------------------------------------- |
| `NEXT_PUBLIC_DEMO_MODE`        | `true`/`false` | Bypasses Supabase for deductions; injects seed data. Use for demos.   |
| `NEXT_PUBLIC_DEFAULT_TENANT`   | tenant slug    | Pre-selects a tenant on the login page.                               |
| `NEXT_PUBLIC_DISABLE_KIOSK`    | `true`/`false` | Hides kiosk routes — useful for non-physical deployments.             |
| `NEXT_PUBLIC_MAP_TILE_URL`     | tile URL       | Override OpenStreetMap tile server (e.g. for self-hosted tiles).      |
| `BIOMETRIC_BRIDGE_URL`         | `ws://…`       | If using Fingerkey bridge for hardware biometric devices.             |

---

## 3. Example `.env.local`

```env
# ─── Supabase ────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# ─── Security ────────────────────────────────────────────────────────────────
QR_HMAC_SECRET=replace-with-32-byte-hex
NEXTAUTH_URL=http://localhost:3000

# ─── Push (optional) ─────────────────────────────────────────────────────────
NEXT_PUBLIC_VAPID_PUBLIC=BL...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:ops@premiumoutlets.ph

# ─── Storage (optional overrides) ────────────────────────────────────────────
# NEXT_PUBLIC_AVATAR_BUCKET=avatars
# NEXT_PUBLIC_DOCUMENTS_BUCKET=documents
# NEXT_PUBLIC_PAYSLIPS_BUCKET=payslips

# ─── Feature flags ───────────────────────────────────────────────────────────
NEXT_PUBLIC_DEMO_MODE=false
```

---

## 4. Vercel Setup Checklist

1. Connect this repo (`premiumglobalofficial-cpu/PremiumOutlet-HRIS`) to a Vercel project.
2. Add **every** variable from §1 to all three environments (Development, Preview, Production).
3. Set the **Production Domain** to your tenant URL.
4. In **Project Settings → Functions**, region should be `sin1` (already set via `vercel.json`).
5. Trigger a deploy on `main` and verify the build logs show no missing-env warnings.

---

## 5. Secret Rotation

| Secret                       | Rotation cadence | Procedure                                                    |
| ---------------------------- | ---------------- | ------------------------------------------------------------ |
| `SUPABASE_SERVICE_ROLE_KEY`  | On suspicion     | Supabase Dashboard → API → Reset → update Vercel env → redeploy. |
| `QR_HMAC_SECRET`             | Yearly           | Regenerate, update Vercel env → redeploy. Old QR codes will invalidate. |
| `VAPID_PRIVATE_KEY`          | Never            | Rotating invalidates ALL existing push subscriptions.        |

---

© Nexvision Innovations Inc.
