import { DEFAULT_MODULE_FLAGS } from "@/store/appearance.store";
import { getApiAuthContext } from "@/lib/api-auth";

jest.mock("@/lib/api-auth", () => ({
  ...jest.requireActual("@/lib/api-auth"),
  getApiAuthContext: jest.fn(),
}));

describe("GET /api/settings/appearance", () => {
  it("returns 401 when unauthenticated", async () => {
    (getApiAuthContext as jest.Mock).mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/settings/appearance/route");
    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("returns normalized module flags when authenticated", async () => {
    const adminDb = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { module_flags: { jobs: true, docs201: true } },
              error: null,
            }),
          }),
        }),
      }),
    };

    (getApiAuthContext as jest.Mock).mockResolvedValueOnce({
      userId: "user-1",
      role: "employee",
      supabase: {},
      adminDb,
      demoMode: false,
    });

    const { GET } = await import("@/app/api/settings/appearance/route");
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.modules.jobs).toBe(true);
    expect(body.modules.docs201).toBe(true);
    expect(body.modules.leave).toBe(DEFAULT_MODULE_FLAGS.leave);
  });
});

describe("PATCH /api/settings/appearance", () => {
  it("returns 401 for non-admin users", async () => {
    (getApiAuthContext as jest.Mock).mockResolvedValueOnce(null);

    const { PATCH } = await import("@/app/api/settings/appearance/route");
    const req = new Request("http://localhost/api/settings/appearance", {
      method: "PATCH",
      body: JSON.stringify({ modules: { jobs: true } }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("persists module flags for admin users", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const adminDb = {
      from: jest.fn(() => ({ upsert })),
    };

    (getApiAuthContext as jest.Mock).mockResolvedValueOnce({
      userId: "admin-1",
      role: "admin",
      supabase: {},
      adminDb,
      demoMode: false,
    });

    const { PATCH } = await import("@/app/api/settings/appearance/route");
    const req = new Request("http://localhost/api/settings/appearance", {
      method: "PATCH",
      body: JSON.stringify({ modules: { jobs: true, docs201: false } }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "default",
        company_name: "Premium Outlets",
        module_flags: expect.objectContaining({ jobs: true, docs201: false }),
      }),
      { onConflict: "id" }
    );
  });
});
