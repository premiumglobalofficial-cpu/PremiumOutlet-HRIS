import { useAuthStore } from "@/store/auth.store";
import type { Role } from "@/types";

/**
 * Generate a role-prefixed href from a base path.
 * e.g. roleHref("admin", "/dashboard") → "/admin/dashboard"
 */
export function roleHref(role: Role, basePath: string): string {
    return `/${role}${basePath}`;
}

/**
 * Hook that returns a function to prefix any base path with the current user's role.
 * Usage: const rh = useRoleHref(); <Link href={rh("/dashboard")}>
 */
export function useRoleHref() {
    const role = useAuthStore((s) => s.currentUser.role);
    return (basePath: string) => `/${role}${basePath}`;
}
