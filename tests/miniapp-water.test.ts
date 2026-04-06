import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Supabase ──
const mockSupabaseFrom = vi.fn();
vi.mock('../src/db/supabase.js', () => ({
  supabase: { from: mockSupabaseFrom },
}));

// ── Mock subscriptions ──
const mockActivatePromoCode = vi.fn();
vi.mock('../src/db/subscriptions.js', () => ({
  activatePromoCode: mockActivatePromoCode,
}));

// ── Mock referrals ──
const mockGetReferralStats = vi.fn();
vi.mock('../src/db/referrals.js', () => ({
  getReferralStats: mockGetReferralStats,
}));

// ── Mock nutrition ──
vi.mock('../src/utils/nutrition.js', () => ({
  calculateMacros: vi.fn().mockReturnValue({ calories: 2500, protein: 150, fat: 80, carbs: 300 }),
}));

// ── Mock validate (underlying dependency of auth.ts) ──
vi.mock('../src/utils/miniapp-validate.js', () => ({
  validateInitData: vi.fn().mockReturnValue({ valid: true, user: { id: 12345 } }),
}));

// ── Mock config ──
vi.mock('../src/config.js', () => ({
  config: { max: { token: 'test-token' } },
}));

// ── Helpers ──

const fakeUser = {
  id: 'user-uuid-1',
  max_user_id: 12345,
  name: 'Тест',
  sex: 'male',
  age: 30,
  weight_kg: 80,
  height_cm: 180,
  goal: 'maintain',
  daily_calories: 2500,
  daily_protein: 150,
  daily_fat: 80,
  daily_carbs: 300,
  water_glasses: 3,
  water_norm: 10,
  activity_level: 'moderate',
  streak_freeze_available: 2,
  allergies: ['лактоза'],
};

function makeReq(body: Record<string, any>) {
  return { method: 'POST', body } as any;
}

function makeRes() {
  const res: any = {
    _status: 200,
    _json: null,
    _headers: {} as Record<string, string>,
    setHeader: vi.fn((k: string, v: string) => { res._headers[k] = v; }),
    status: vi.fn((code: number) => { res._status = code; return res; }),
    json: vi.fn((data: any) => { res._json = data; return res; }),
    end: vi.fn(() => res),
  };
  return res;
}

function setupAuthMock(user = fakeUser) {
  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === 'nutri_users') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: user }),
          }),
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
      };
    }
    if (table === 'nutri_weight_logs') {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'w-1', weight_kg: 75, note: null, created_at: new Date().toISOString() },
              error: null,
            }),
          }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          }),
        }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    };
  });
}

// ── Tests ──

describe('miniapp-water handler', () => {
  let handler: (req: any, res: any) => Promise<any>;

  beforeEach(async () => {
    vi.clearAllMocks();
    setupAuthMock();
    const mod = await import('../api/miniapp-water.js');
    handler = mod.default;
  });

  // ── Water delta ──

  describe('water delta mode', () => {
    it('should increment water glasses by +1', async () => {
      const req = makeReq({ initData: 'valid', delta: 1 });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(true);
      expect(res._json.water_glasses).toBe(4); // 3 + 1
    });

    it('should decrement water glasses by -1', async () => {
      const req = makeReq({ initData: 'valid', delta: -1 });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(true);
      expect(res._json.water_glasses).toBe(2); // 3 - 1
    });

    it('should not go below 0', async () => {
      setupAuthMock({ ...fakeUser, water_glasses: 0 });

      const req = makeReq({ initData: 'valid', delta: -1 });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.water_glasses).toBe(0);
    });

    it('should not exceed 30', async () => {
      setupAuthMock({ ...fakeUser, water_glasses: 30 });

      const req = makeReq({ initData: 'valid', delta: 1 });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.water_glasses).toBe(30);
    });

    it('should reject delta other than 1 or -1', async () => {
      const req = makeReq({ initData: 'valid', delta: 5 });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(400);
      expect(res._json.error).toContain('delta must be');
    });

    it('should calculate water norm based on weight', async () => {
      const req = makeReq({ initData: 'valid', delta: 1 });
      const res = makeRes();
      await handler(req, res);

      // 80kg * 30ml = 2400ml / 250ml = 10 glasses (ceil)
      expect(res._json.water_norm).toBe(10);
    });
  });

  // ── Weight logging ──

  describe('weight logging mode', () => {
    it('should log weight and return history', async () => {
      const req = makeReq({ initData: 'valid', weight_kg: 75.5 });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(true);
      expect(res._json.weight_entry).toBeDefined();
    });

    it('should reject weight below 20', async () => {
      const req = makeReq({ initData: 'valid', weight_kg: 10 });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(400);
      expect(res._json.error).toContain('weight_kg');
    });

    it('should reject weight above 400', async () => {
      const req = makeReq({ initData: 'valid', weight_kg: 500 });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(400);
    });

    it('should reject NaN weight', async () => {
      const req = makeReq({ initData: 'valid', weight_kg: 'abc' });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(400);
    });
  });

  // ── Streak freeze ──

  describe('streak freeze mode', () => {
    it('should use streak freeze when available', async () => {
      const req = makeReq({ initData: 'valid', streakFreeze: true });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(true);
      expect(res._json.streak_freeze_available).toBe(1); // 2 - 1
    });

    it('should reject when no freezes available', async () => {
      setupAuthMock({ ...fakeUser, streak_freeze_available: 0 });

      const req = makeReq({ initData: 'valid', streakFreeze: true });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(400);
      expect(res._json.error).toBe('no_freeze');
    });
  });

  // ── Promo code ──

  describe('promo code mode', () => {
    it('should activate valid promo code', async () => {
      mockActivatePromoCode.mockResolvedValue({ success: true, message: 'Premium активирован!' });

      const req = makeReq({ initData: 'valid', promo: 'TEST30' });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(true);
      expect(res._json.message).toContain('Premium');
    });

    it('should reject too-short promo code', async () => {
      const req = makeReq({ initData: 'valid', promo: 'AB' });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(400);
      expect(res._json.error).toContain('формат');
    });
  });

  // ── Allergies ──

  describe('allergies update mode', () => {
    it('should update allergies list', async () => {
      const req = makeReq({ initData: 'valid', allergies: ['глютен', 'лактоза'] });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(true);
      expect(res._json.allergies).toEqual(['глютен', 'лактоза']);
    });

    it('should handle empty allergies (clear)', async () => {
      const req = makeReq({ initData: 'valid', allergies: [] });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.allergies).toEqual([]);
    });
  });

  // ── Profile edit ──

  describe('profile edit mode', () => {
    it('should update profile fields and recalculate macros', async () => {
      const req = makeReq({ initData: 'valid', editProfile: { weight_kg: 75, height_cm: 175 } });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(true);
      expect(res._json.updates).toHaveProperty('weight_kg', 75);
      expect(res._json.updates).toHaveProperty('daily_calories');
    });

    it('should reject empty profile update', async () => {
      const req = makeReq({ initData: 'valid', editProfile: {} });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(400);
      expect(res._json.error).toContain('No valid fields');
    });

    it('should reject invalid age (under 10)', async () => {
      const req = makeReq({ initData: 'valid', editProfile: { age: 5 } });
      const res = makeRes();
      await handler(req, res);

      // age < 10 is filtered out, so empty update
      expect(res._status).toBe(400);
    });
  });

  // ── Referral stats ──

  describe('referral stats mode', () => {
    it('should return referral link and stats', async () => {
      mockGetReferralStats.mockResolvedValue({ total: 3, activated: 1 });

      const req = makeReq({ initData: 'valid', referralStats: true });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(true);
      expect(res._json.total).toBe(3);
      expect(res._json.link).toContain('ref_12345');
    });
  });

  // ── Auth and method ──

  describe('method validation', () => {
    it('should return 200 for OPTIONS', async () => {
      const req = { method: 'OPTIONS', body: {} } as any;
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
    });

    it('should reject GET', async () => {
      const req = { method: 'GET', body: {} } as any;
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(405);
    });
  });

  describe('authentication', () => {
    it('should return 400 when initData is missing', async () => {
      const req = makeReq({});
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(400);
      expect(mockGetReferralStats).not.toHaveBeenCalled();
    });
  });
});
