import { DEFAULT_MODULE_FLAGS } from "@/store/appearance.store";

describe("GET /api/settings/appearance", () => {
  let createServerSupabaseClient: jest.Mock;
  let createAdminSupabaseClient: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    const serverMod = jest.requireMock("@/services/supabase-server");
    createServerSupabaseClient = serverMod.createServerSupabaseClient;
    createAdminSupabaseClient = serverMod.createAdminSupabaseClient;
  });

  it("returns 401 when unauthenticated", async () => {
    createServerSupabaseClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: { message: "No session" } }) },
      from: jest.fn(),
    });

    const { GET } = await import("@/app/api/settings/appearance/route");
    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("returns normalized module flags when authenticated", async () => {
    createServerSupabaseClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
      from: jest.fn(),
    });

    createAdminSupabaseClient.mockResolvedValue({
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
  let createServerSupabaseClient: jest.Mock;
  let createAdminSupabaseClient: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    const serverMod = jest.requireMock("@/services/supabase-server");
    createServerSupabaseClient = serverMod.createServerSupabaseClient;
    createAdminSupabaseClient = serverMod.createAdminSupabaseClient;
  });

  it("returns 403 for non-admin users", async () => {
    createServerSupabaseClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
      from: jest.fn(),
    });

    createAdminSupabaseClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { role: "hr" }, error: null }),
              }),
            }),
          };
        }
        return { upsert: jest.fn() };
      }),
    });

    const { PATCH } = await import("@/app/api/settings/appearance/route");
    const req = new Request("http://localhost/api/settings/appearance", {
      method: "PATCH",
      body: JSON.stringify({ modules: { jobs: true } }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(403);
  });

  it("persists module flags for admin users", async () => {
    createServerSupabaseClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }) },
      from: jest.fn(),
    });

    const upsert = jest.fn().mockResolvedValue({ error: null });
    createAdminSupabaseClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
              }),
            }),
          };
        }
        return { upsert };
      }),
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
        company_name: "NexHRMS",
        module_flags: expect.objectContaining({ jobs: true, docs201: false }),
      }),
      { onConflict: "id" }
    );
  });
});