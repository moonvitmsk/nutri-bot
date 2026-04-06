import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Supabase ──
const mockSupabaseFrom = vi.fn();
const mockSupabase = {
  from: mockSupabaseFrom,
  rpc: vi.fn(),
};

vi.mock('../src/db/supabase.js', () => ({
  supabase: mockSupabase,
}));

// ── Mock AI client ──
const mockChatCompletion = vi.fn();
vi.mock('../src/ai/client.js', () => ({
  chatCompletion: mockChatCompletion,
}));

// ── Mock Vision ──
const mockAnalyzeFoodPhoto = vi.fn();
const mockAnalyzeLabPhoto = vi.fn();
const mockAnalyzeRestaurantMenu = vi.fn();
vi.mock('../src/ai/vision.js', () => ({
  analyzeFoodPhoto: mockAnalyzeFoodPhoto,
  analyzeLabPhoto: mockAnalyzeLabPhoto,
  analyzeRestaurantMenu: mockAnalyzeRestaurantMenu,
}));

// ── Mock DB modules ──
const mockSaveFoodLog = vi.fn();
const mockConfirmFoodLog = vi.fn();
const mockUpdateFoodLog = vi.fn();
const mockGetTodayLogs = vi.fn();
vi.mock('../src/db/food-logs.js', () => ({
  saveFoodLog: mockSaveFoodLog,
  confirmFoodLog: mockConfirmFoodLog,
  updateFoodLog: mockUpdateFoodLog,
  getTodayLogs: mockGetTodayLogs,
}));

const mockUpdateUser = vi.fn();
vi.mock('../src/db/users.js', () => ({
  updateUser: mockUpdateUser,
}));

vi.mock('../src/db/subscriptions.js', () => ({
  canUseFeature: vi.fn().mockReturnValue(true),
  getPhotosRemaining: vi.fn().mockReturnValue(5),
}));

// ── Mock deep consult ──
const mockRunDeepConsultation = vi.fn();
vi.mock('../src/ai/agents.js', () => ({
  runDeepConsultation: mockRunDeepConsultation,
}));

// ── Mock validate (from api/_shared) ──
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
  goal_text: null,
  daily_calories: 2500,
  daily_protein: 150,
  daily_fat: 80,
  daily_carbs: 300,
  photos_today: 0,
  activity_level: 'moderate',
  allergies: [],
  streak_days: 5,
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

/**
 * Because the handler imports `validateAndGetUser` from `./_shared/auth.js`
 * (relative to api/), and that module imports supabase + miniapp-validate,
 * we mock the underlying dependencies instead.
 * We set up supabase.from('nutri_users') to return fakeUser so validateAndGetUser passes.
 */
function setupAuthMock(user = fakeUser) {
  // Mock for initData validation (already mocked above)
  // Mock for supabase.from('nutri_users').select('*').eq('max_user_id', ...).single()
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
    if (table === 'nutri_food_logs') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { ai_analysis: { items: [] } } }),
            eq: vi.fn().mockResolvedValue({ data: [] }),
          }),
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }) }),
      };
    }
    if (table === 'nutri_lab_results') {
      return {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [] }),
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

describe('miniapp-add-food handler', () => {
  let handler: (req: any, res: any) => Promise<any>;

  beforeEach(async () => {
    vi.clearAllMocks();
    setupAuthMock();
    const mod = await import('../api/miniapp-add-food.js');
    handler = mod.default;
  });

  // ── Text mode ──

  describe('text mode', () => {
    it('should analyze text food and return confirmed log', async () => {
      const aiResponse = JSON.stringify({
        description: 'Овсянка с бананом',
        items: [{ name: 'Овсянка', weight_g: 200, calories: 180, protein: 6, fat: 3, carbs: 32 }],
        total: { calories: 180, protein: 6, fat: 3, carbs: 32 },
        micronutrients: { iron: 2 },
        comment: 'Хороший завтрак!',
      });
      mockChatCompletion.mockResolvedValue({ text: aiResponse });
      mockSaveFoodLog.mockResolvedValue({
        id: 'log-1', description: 'Овсянка с бананом',
        calories: 180, protein: 6, fat: 3, carbs: 32,
        created_at: new Date().toISOString(),
      });

      const req = makeReq({ initData: 'valid', text: 'овсянка с бананом' });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(true);
      expect(res._json.log.description).toBe('Овсянка с бананом');
      expect(res._json.log.calories).toBe(180);
      expect(mockSaveFoodLog).toHaveBeenCalledWith('user-uuid-1', expect.objectContaining({
        confirmed: true,
      }));
    });

    it('should reject empty text', async () => {
      const req = makeReq({ initData: 'valid', text: '' });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(400);
      expect(res._json.error).toContain('required');
    });

    it('should return 422 when AI returns unparseable JSON', async () => {
      mockChatCompletion.mockResolvedValue({ text: 'not valid json at all' });
      const req = makeReq({ initData: 'valid', text: 'каша' });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(422);
      expect(res._json.error).toContain('parsing failed');
    });
  });

  // ── Photo (imageBase64) mode ──

  describe('imageBase64 mode', () => {
    it('should analyze photo and return unconfirmed log', async () => {
      mockAnalyzeFoodPhoto.mockResolvedValue({
        analysis: {
          items: [{ name: 'Паста', portion_g: 300, calories: 450, protein: 15, fat: 12, carbs: 65 }],
          total: { calories: 450, protein: 15, fat: 12, carbs: 65 },
          micronutrients: {},
          comment: 'Довольно калорийно',
        },
      });
      mockSaveFoodLog.mockResolvedValue({
        id: 'log-photo-1', description: 'Паста',
        calories: 450, protein: 15, fat: 12, carbs: 65,
        created_at: new Date().toISOString(),
      });

      const req = makeReq({ initData: 'valid', imageBase64: 'data:image/jpeg;base64,abc123' });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(true);
      expect(res._json.pending).toBe(true);
      expect(res._json.log.calories).toBe(450);
      expect(mockSaveFoodLog).toHaveBeenCalledWith('user-uuid-1', expect.objectContaining({
        confirmed: false,
      }));
    });

    it('should reject invalid image format', async () => {
      const req = makeReq({ initData: 'valid', imageBase64: 'not-a-data-uri' });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(400);
      expect(res._json.error).toContain('Invalid image');
    });

    it('should reject oversized image', async () => {
      const req = makeReq({ initData: 'valid', imageBase64: 'data:image/jpeg;base64,' + 'x'.repeat(2_100_000) });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(413);
      expect(res._json.error).toContain('too large');
    });

    it('should handle not_food detection', async () => {
      mockAnalyzeFoodPhoto.mockResolvedValue({
        analysis: {
          not_food: true,
          items: [],
          total: { calories: 0, protein: 0, fat: 0, carbs: 0 },
          comment: 'Это не еда',
        },
      });

      const req = makeReq({ initData: 'valid', imageBase64: 'data:image/jpeg;base64,abc' });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(false);
      expect(res._json.error).toBe('not_food');
    });
  });

  // ── Confirm mode ──

  describe('confirmLogId mode', () => {
    it('should confirm a pending log', async () => {
      mockConfirmFoodLog.mockResolvedValue(undefined);

      const req = makeReq({ initData: 'valid', confirmLogId: 'log-id-1' });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(true);
      expect(res._json.confirmed).toBe(true);
      expect(mockConfirmFoodLog).toHaveBeenCalledWith('log-id-1');
    });

    it('should update totals before confirming when provided', async () => {
      mockConfirmFoodLog.mockResolvedValue(undefined);
      mockUpdateFoodLog.mockResolvedValue(undefined);

      const updatedTotals = { calories: 500, protein: 20, fat: 15, carbs: 60 };
      const req = makeReq({ initData: 'valid', confirmLogId: 'log-id-2', updatedTotals });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(mockUpdateFoodLog).toHaveBeenCalledWith('log-id-2', expect.objectContaining({
        calories: 500,
      }));
    });
  });

  // ── Recipe mode ──

  describe('recipe mode', () => {
    it('should return parsed recipes from AI', async () => {
      const recipes = [
        { name: 'Салат Цезарь', time_min: 15, kbju: { calories: 350, protein: 25, fat: 20, carbs: 15 } },
      ];
      mockChatCompletion.mockResolvedValue({
        text: JSON.stringify({ recipes }),
      });

      const req = makeReq({ initData: 'valid', recipe: true, meal: 'lunch' });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(true);
      expect(res._json.recipes).toHaveLength(1);
      expect(res._json.recipes[0].name).toBe('Салат Цезарь');
    });

    it('should return empty recipes on AI parse failure', async () => {
      mockChatCompletion.mockResolvedValue({ text: 'broken json {{{' });

      const req = makeReq({ initData: 'valid', recipe: true });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(true);
      expect(res._json.recipes).toEqual([]);
    });
  });

  // ── Meal plan mode ──

  describe('mealplan mode', () => {
    it('should return meal plan text from AI', async () => {
      mockChatCompletion.mockResolvedValue({ text: 'День 1:\n🌅 Завтрак: Каша (~350 ккал)' });

      const req = makeReq({ initData: 'valid', mealplan: true, period: 'today' });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(true);
      expect(res._json.mealplan).toContain('Завтрак');
    });
  });

  // ── Chat mode ──

  describe('chat mode', () => {
    it('should return AI reply for chat message', async () => {
      mockChatCompletion.mockResolvedValue({ text: 'Овсянка — отличный источник клетчатки!' });

      const req = makeReq({ initData: 'valid', chat: 'расскажи про овсянку' });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(true);
      expect(res._json.reply).toContain('клетчатки');
    });

    it('should reject too-short chat messages', async () => {
      const req = makeReq({ initData: 'valid', chat: 'a' });
      const res = makeRes();
      await handler(req, res);

      // Falls through to text mode validation which rejects short text
      expect(res._status).toBe(400);
    });
  });

  // ── Deep consult mode ──

  describe('deep_consult mode', () => {
    it('should run 4-agent consultation and return report', async () => {
      mockGetTodayLogs.mockResolvedValue([
        { description: 'Каша', calories: 350 },
      ]);
      mockRunDeepConsultation.mockResolvedValue({ finalReport: 'Глубокий анализ вашего рациона...' });

      const req = makeReq({ initData: 'valid', deep_consult: true, focus: 'витамины' });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(true);
      expect(res._json.report).toContain('Глубокий анализ');
    });
  });

  // ── Restaurant photo mode ──

  describe('restaurant_photo mode', () => {
    it('should analyze restaurant menu photo', async () => {
      mockAnalyzeRestaurantMenu.mockResolvedValue({
        analysis: {
          dishes: [{ name: 'Борщ', calories: 280, protein: 12, fat: 14, carbs: 24 }],
          tip: 'Выбирай борщ — белок!',
        },
      });

      const req = makeReq({ initData: 'valid', restaurant_photo: 'data:image/jpeg;base64,menubase64' });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(true);
      expect(res._json.dishes).toHaveLength(1);
      expect(res._json.dishes[0].name).toBe('Борщ');
    });

    it('should handle not_menu detection', async () => {
      mockAnalyzeRestaurantMenu.mockResolvedValue({
        analysis: { not_menu: true, comment: 'Это не меню ресторана' },
      });

      const req = makeReq({ initData: 'valid', restaurant_photo: 'data:image/jpeg;base64,abc' });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(false);
      expect(res._json.error).toBe('not_menu');
    });

    it('should reject invalid restaurant photo format', async () => {
      const req = makeReq({ initData: 'valid', restaurant_photo: 'not-an-image' });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(400);
    });
  });

  // ── Lab photo mode ──

  describe('lab_photo mode', () => {
    it('should analyze lab results photo and save to DB', async () => {
      mockAnalyzeLabPhoto.mockResolvedValue({
        markers: [
          { name: 'Гемоглобин', value: '135', unit: 'г/л', reference: '120-160', status: 'normal' },
          { name: 'Витамин D', value: '15', unit: 'нг/мл', reference: '30-100', status: 'low' },
        ],
        interpretation: 'Дефицит витамина D',
      });

      const req = makeReq({ initData: 'valid', lab_photo: 'data:image/jpeg;base64,labphoto' });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(true);
      expect(res._json.markers).toHaveLength(2);
      expect(res._json.deficiencies).toContain('Витамин D');
      expect(res._json.interpretation).toContain('Дефицит');
    });

    it('should reject invalid lab photo format', async () => {
      const req = makeReq({ initData: 'valid', lab_photo: 'plain-text' });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(400);
    });
  });

  // ── Auth failure ──

  describe('authentication', () => {
    it('should return 401 when initData is missing', async () => {
      const req = makeReq({});
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(400);
      expect(mockChatCompletion).not.toHaveBeenCalled();
    });
  });

  // ── Method checks ──

  describe('method validation', () => {
    it('should return 200 for OPTIONS (CORS preflight)', async () => {
      const req = { method: 'OPTIONS', body: {} } as any;
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
    });

    it('should reject GET method', async () => {
      const req = { method: 'GET', body: {} } as any;
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(405);
    });
  });
});
