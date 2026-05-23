# Biometric Integration — Code & Plan Review

> Reviewed against: `SorenHRMS - Copy` codebase, `BIOMETRIC_IMPLEMENTATION_PLAN.md`, and the FaceBS100 SDK protocol document.

---

## Summary

The architecture is sound and the plan is the right approach for this hardware. The Render bridge → Vercel HRMS separation is correct. Most of the implementation plan is solid, but there are **2 critical bugs**, **3 moderate issues**, and **1 missing piece** that would prevent end-to-end operation if shipped as-is.

---

## ✅ What's Good

- **Architecture is correct.** Device → Bridge (Render) → HRMS (Vercel) → Supabase is the right layering. The bridge absorbs the binary FKWebTrans protocol so HRMS stays clean.
- **`receive_cmd` / heartbeat loop is well thought out.** The device-initiated poll pattern (rather than server-push) is exactly what the SDK spec requires and the plan implements it correctly in spirit.
- **The `t800/route.ts` is solid.** Time zone handling (Manila UTC offset), duplicate-scan deduplication, `inferEventType` logic, block reassembly — all correct.
- **Migration 056 is well-structured.** Idempotent, pre/post-flight checks, correct RLS policies, correct trigger reference.
- **The `parseFKBinaryBuffer` function is correct.** 4-byte LE length prefix + JSON block + binary blocks matches the SDK protocol exactly.
- **`kiosk-auth.ts` uses timing-safe comparison.** Good security practice carried through to new routes.
- **`nanoid` is already in `package.json`.** No new dependency needed.

---

## 🔴 Critical Issues

### 1. Wrong command body format for `SET_USER_INFO`

**File:** `scripts/fk-bridge.js` → `handleReceiveCmd`

The bridge builds this JSON block for the device:
```json
{"user_id":"1","backup_number":0,"enroll_data":"BIN_1","queue_id":"SYNC-abc123"}
```

But the SDK spec (section 3.16) requires `SET_USER_INFO` to use this format:
```json
{
  "user_id": "1",
  "user_name": "John Doe",
  "user_privilege": "USER",
  "user_photo": "BIN_1",
  "enroll_data_array": [
    {"backup_number": 0, "enroll_data": "BIN_2"}
  ]
}
```

The format in the plan looks like `SET_ENROLL_DATA` (section 3.2), not `SET_USER_INFO`. The device will receive a `cmd_code: SET_USER_INFO` header but a body it can't parse for that command, and the sync will silently fail.

**Fix option A — Use `SET_ENROLL_DATA` instead (simpler):** Each queue row is already one template. `SET_ENROLL_DATA` accepts exactly one `backup_number + enroll_data` pair. Change `cmd_code` to `SET_ENROLL_DATA` everywhere (migration default, sync route response, bridge dispatch).

**Fix option B — Build proper `SET_USER_INFO` (complete):** Fetch `user_name` (from `employees` table) and bundle *all* templates for that `biometric_id` into a single `enroll_data_array`. This requires the sync route to join `employees` and fetch all templates for the user, not just one. Change the queue model to queue per-user rather than per-template.

**Recommendation:** Use Fix A (`SET_ENROLL_DATA`) unless you need to push name/privilege. It matches the one-row-per-template queue model already built and avoids the complexity of bundling. The `biometric_sync_queue.cmd_code` default can stay `SET_USER_INFO` or change to `SET_ENROLL_DATA` — just make it consistent.

Also: **Remove `queue_id` from the JSON sent to the device.** The device doesn't use it; extra fields may cause parsing errors in strict firmware. The `queue_id` is already returned from the sync route and can be used by the bridge to route the ack without embedding it in the device payload.

---

### 2. PATCH handler missing in `employees/[id]/route.ts`

**File:** `src/app/api/employees/[id]/route.ts`

Phase 5-B instructs adding `biometric_id` to the PATCH handler, but the file only contains a `DELETE` handler — there is **no PATCH handler at all**. The admin UI form in Phase 5-A will have nowhere to POST to.

**Fix:** Add a `PATCH` handler. Minimum viable version:

```typescript
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });

  const serverSupabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await serverSupabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const admin = await createAdminSupabaseClient();

  // Check actor is admin or hr
  const { data: actor } = await admin
    .from('employees').select('id, role')
    .or(`profile_id.eq.${user.id},email.eq.${user.email ?? ''}`)
    .limit(1).maybeSingle();

  const role = String(actor?.role || '').toLowerCase();
  if (!['admin', 'hr'].includes(role)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }); }

  const updates: Record<string, unknown> = {};
  if (body.biometricId !== undefined) updates.biometric_id = body.biometricId || null;
  // Add other safe-to-update fields here as needed

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: 'No valid fields to update' }, { status: 400 });
  }

  const { error } = await admin.from('employees').update(updates).eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
```

---

## 🟡 Moderate Issues

### 3. Race condition in `/api/biometric/sync`

**File:** `src/app/api/biometric/sync/route.ts`

The route fetches a `pending` queue entry, then separately updates its `trans_id`:
```typescript
const { data: queueEntry } = await supabase
  .from('biometric_sync_queue')
  .select(...)
  .eq('status', 'pending')
  ...
  .maybeSingle();

// <-- another request can fetch the same row here -->

await supabase
  .from('biometric_sync_queue')
  .update({ trans_id: transId })
  .eq('id', queueEntry.id);
```

Two simultaneous `receive_cmd` heartbeats from the same device (possible if the device retries before the first response arrives) can both fetch the same row and receive duplicate `SET_USER_INFO` commands. The device will install the template twice, which is harmless but generates duplicate log noise and wasted bandwidth.

**Fix:** Use a Supabase RPC or PostgreSQL `UPDATE ... RETURNING` to atomically claim the row. Add a Supabase function:

```sql
CREATE OR REPLACE FUNCTION claim_sync_queue_entry(p_device_sn text, p_trans_id text)
RETURNS SETOF biometric_sync_queue AS $$
  UPDATE biometric_sync_queue
  SET trans_id = p_trans_id, status = 'pending'
  WHERE id = (
    SELECT id FROM biometric_sync_queue
    WHERE target_device = p_device_sn AND status = 'pending'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$ LANGUAGE sql;
```

Then call `supabase.rpc('claim_sync_queue_entry', { p_device_sn: deviceSn, p_trans_id: transId })`.

---

### 4. `GET /api/biometric/devices` has no authentication

**File:** `src/app/api/biometric/devices/route.ts`

The `GET` handler returns all registered device serial numbers with zero auth:
```typescript
export async function GET() {
  const supabase = await createAdminSupabaseClient();
  const { data } = await supabase.from('biometric_device_registry').select('*')...
  return NextResponse.json({ ok: true, devices: data });
}
```

Anyone who discovers the URL can enumerate your device SNs. Add the same session check used in DELETE:

```typescript
export async function GET(req: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user }, error } = await serverSupabase.auth.getUser();
  if (error || !user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  // ... rest of handler
}
```

Note: `GET` receives a `NextRequest` argument — add it to the function signature.

---

### 5. `enrolled_at` is overwritten on every re-enrollment

**File:** `src/app/api/biometric/enroll/route.ts`

The upsert payload always includes `enrolled_at: new Date().toISOString()`:
```typescript
.upsert({
  biometric_id: biometricId,
  enrolled_at: new Date().toISOString(),   // ← resets on every re-enroll
  updated_at: new Date().toISOString(),
  ...
}, { onConflict: 'biometric_id,backup_number' })
```

On a conflict (re-enrollment), this overwrites the *original* enrollment date. `enrolled_at` should only be set on insert. Remove `enrolled_at` from the upsert payload — it will use the column's `DEFAULT now()` on first insert and remain unchanged on updates. Keep `updated_at` as-is.

---

## 🔵 Minor Issues

### 6. Bridge `receive_cmd` GET branch is dead code

**File:** `scripts/fk-bridge.js`

The bridge has a special case for `receive_cmd` via GET:
```javascript
if (req.method === 'GET' && headerCode === 'receive_cmd' && headerDevId) {
  await handleReceiveCmd(headerDevId, headerTransId, res);
  return;
}
```

Per the SDK spec, `receive_cmd` is always HTTP POST. The existing GET health check at `/health` is already handled before this. This code path will never be reached in normal operation. Remove it to keep the routing logic clean.

### 7. `queue_id` leaks into device binary payload

**File:** `scripts/fk-bridge.js` → `handleReceiveCmd`

```javascript
const cmdJson = JSON.stringify({
  user_id:       data.biometric_id,
  backup_number: data.backup_number,
  enroll_data:   data.template_b64 ? 'BIN_1' : null,
  queue_id:      data.queue_id,   // ← the device doesn't use this
});
```

`queue_id` is returned from the sync API for ack routing. Use it internally in the bridge (e.g., log it, or store in memory to match acks) but **do not include it in the binary payload sent to the device**. Firmware that validates JSON keys strictly may reject the command.

### 8. `biometric_device_registry` auto-registers unknown devices

**Files:** `enroll/route.ts` and `sync/route.ts` both call:
```typescript
await supabase
  .from('biometric_device_registry')
  .upsert({ sn: deviceSn, last_seen_at: ... }, { onConflict: 'sn' });
```

This means any device that can reach your Render endpoint gets auto-registered with no label/model. This is convenient for the first device but means an unknown device hitting your bridge can insert itself. For now it's acceptable, but consider adding a Phase 6 note to audit the registry and remove any unexpected SNs after the floor devices are confirmed.

### 9. `SET_USER_INFO` / `SET_ENROLL_DATA` naming inconsistency

The `biometric_sync_queue.cmd_code` column defaults to `'SET_USER_INFO'` (migration 056), but if you implement Fix A above (switching to `SET_ENROLL_DATA`), you'll need to update the migration default and all usages. Do this as one change rather than scattered patches.

---

## 📋 File-by-File Change Summary

| File | Status | Action Needed |
|------|--------|---------------|
| `supabase/migrations/056_biometric_sync.sql` | ✅ Ready | None |
| `src/types/index.ts` | ✅ Ready | None |
| `src/app/api/biometric/enroll/route.ts` | 🟡 Minor fix | Remove `enrolled_at` from upsert payload |
| `src/app/api/biometric/sync/route.ts` | 🟡 Moderate fix | Atomic row claim (or accept duplicate-delivery risk) |
| `src/app/api/biometric/ack/route.ts` | ✅ Ready | None |
| `src/app/api/biometric/devices/route.ts` | 🟡 Moderate fix | Add auth to GET handler |
| `scripts/fk-bridge.js` | 🔴 Critical fix | Fix `SET_USER_INFO` body format; remove `queue_id` from payload; remove dead GET branch |
| `src/app/api/employees/[id]/route.ts` | 🔴 Critical fix | Add PATCH handler (entire handler is missing) |
| `src/app/[role]/employees/[id]/_views/admin-view.tsx` | ✅ Ready | Add field per plan (no blockers) |

---

## Implementation Order Recommendation

Run the phases in order but apply the fixes before committing each phase:

1. **Phase 1** (migration) — no changes needed, run as-is.
2. **Phase 2** (types) — no changes needed.
3. **Phase 3** (API routes) — apply fixes to `enroll/route.ts` (issue 5) and `devices/route.ts` (issue 4) before committing. Optionally apply sync atomicity fix (issue 3).
4. **Phase 4** (bridge) — this is the highest-risk phase. Fix the `SET_USER_INFO`/`SET_ENROLL_DATA` body format (issue 1) and remove `queue_id` from payload (issue 7) before deploying. Test with the simulation curl commands from the plan.
5. **Phase 5** (admin UI + employees PATCH) — write the PATCH handler first (issue 2), then wire the form. The UI changes won't work without it.
6. **Phase 6–7** (testing) — no code changes, follow plan as-is.

---

## Quick Reference: SDK Command Formats

| Command | Body format | Use case |
|---------|-------------|----------|
| `SET_ENROLL_DATA` | `{"user_id":"1","backup_number":0,"enroll_data":"BIN_1"}` | Push one biometric template to a device |
| `SET_USER_INFO` | `{"user_id":"1","user_name":"John","user_privilege":"USER","user_photo":"BIN_1","enroll_data_array":[{"backup_number":0,"enroll_data":"BIN_2"}]}` | Push full user profile + all templates |
| `GET_USER_INFO` | `{"user_id":"1"}` | Pull user + all templates from device |
| `SET_WEB_SERVER_INFO` | `{"server_ip":"1.2.3.4","server_port":443}` | Redirect device to a different server |
| `DELETE_USER` | `{"user_id":"1"}` | Remove user from device |

The plan's queue uses one row per template. `SET_ENROLL_DATA` is the natural fit for that schema.