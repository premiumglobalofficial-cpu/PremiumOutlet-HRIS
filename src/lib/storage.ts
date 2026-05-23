/**
 * Safe localStorage adapter for Zustand `persist` middleware.
 *
 * Problem: 19 Zustand stores persist to localStorage (~5 MB limit).
 * When DB-backed stores grow, setItem throws QuotaExceededError and
 * crashes the app on hydration (sync.service.ts setState triggers persist).
 *
 * Solution:
 *   1. Wrap every setItem in a try/catch.
 *   2. On quota error, evict lowest-priority cached stores and retry once.
 *   3. If still fails, skip silently — data is in-memory and will be
 *      re-hydrated from Supabase on next login via sync.service.ts.
 *
 * Usage: import { safeStorage } from "@/lib/storage";
 *        then pass `storage: safePersistStorage` in persist options.
 */

import type { StateStorage } from "zustand/middleware";
import { createJSONStorage } from "zustand/middleware";

// Priority order for eviction (lowest first — evict these first).
// These are large, fully DB-backed, and will be re-hydrated on next sync.
const EVICTION_ORDER: string[] = [
  "po-hris-audit",         // audit logs — read-only, always re-fetched
  "po-hris-location",      // pings/photos — large, transient
  "po-hris-timesheet",     // fully DB-backed
  "po-hris-messaging",     // channels/messages — DB-backed
  "po-hris-attendance",    // events/logs — large, DB-backed
  "po-hris-notifications", // logs — DB-backed, capped at 500
  "po-hris-payroll",       // payslips/runs — DB-backed
  "po-hris-tasks",         // groups/tasks/reports — DB-backed
  "po-hris-employees",     // fully DB-backed
  "po-hris-deductions",    // deduction templates — DB-backed
  "po-hris-departments",   // departments — DB-backed
  "po-hris-job-titles",    // job titles — DB-backed
];

/**
 * Try to free localStorage space by evicting lower-priority stores.
 * Returns true if at least one key was removed.
 */
function evictToFreeSpace(): boolean {
  let evicted = false;
  for (const key of EVICTION_ORDER) {
    try {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        evicted = true;
        // After evicting one key, let the caller retry.
        // If still not enough, we'll be called again on the next failure.
        break;
      }
    } catch {
      // getItem/removeItem shouldn't throw, but be safe
    }
  }
  return evicted;
}

export const safeStorage: StateStorage = {
  getItem(name: string): string | null {
    try {
      return localStorage.getItem(name);
    } catch {
      // Private browsing, storage disabled, etc.
      return null;
    }
  },

  setItem(name: string, value: string): void {
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      if (
        e instanceof DOMException &&
        (e.name === "QuotaExceededError" || e.code === 22)
      ) {
        // Attempt 1: evict one low-priority store and retry
        if (evictToFreeSpace()) {
          try {
            localStorage.setItem(name, value);
            return; // success after eviction
          } catch {
            // still not enough — attempt 2: evict more
          }
        }

        // Attempt 2: evict all evictable stores and retry once more
        let moreEvicted = true;
        while (moreEvicted) {
          moreEvicted = evictToFreeSpace();
        }
        try {
          localStorage.setItem(name, value);
        } catch {
          // Still fails — silently skip.
          // Data is in-memory (Zustand), and will re-hydrate from DB
          // on next login via sync.service.ts.
          console.warn(
            `[safeStorage] localStorage quota exceeded for "${name}". ` +
            `Skipping persist — data is in-memory and will re-sync from DB.`
          );
        }
      }
      // Other errors (SecurityError in iframe, etc.) — silently skip
    }
  },

  removeItem(name: string): void {
    try {
      localStorage.removeItem(name);
    } catch {
      // Silently skip — nothing critical depends on removal
    }
  },
};

/**
 * Ready-to-use persist storage for Zustand `persist({ storage: safePersistStorage })`.
 * Wraps safeStorage with JSON serialization via `createJSONStorage`.
 */
export const safePersistStorage = createJSONStorage(() => safeStorage);
