type DeepLinkRoute = {
  page: string;
  subpage?: string;
  params?: Record<string, string>;
};

export function parseDeepLink(url: string): DeepLinkRoute | null {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\//, '');
    const params: Record<string, string> = {};
    parsed.searchParams.forEach((v, k) => params[k] = v);

    // moonvit://food -> tab today, open add food
    // moonvit://chat -> AI tab, chat subpage
    // moonvit://recipes -> AI tab, recipes subpage
    // moonvit://profile -> profile tab
    // moonvit://diary -> diary tab

    const routes: Record<string, DeepLinkRoute> = {
      'food': { page: 'today', params: { action: 'addFood' } },
      'chat': { page: 'ai', subpage: 'chat' },
      'recipes': { page: 'ai', subpage: 'recipes' },
      'mealplan': { page: 'ai', subpage: 'mealplan' },
      'profile': { page: 'profile' },
      'diary': { page: 'diary' },
      'vitamins': { page: 'vitamins' },
      'deepconsult': { page: 'ai', subpage: 'deepconsult' },
    };

    return routes[path] || null;
  } catch {
    return null;
  }
}

export function handleStartParam(startParam: string): DeepLinkRoute | null {
  // Handle MAX bot startapp parameter: ?startapp=ref_12345 or ?startapp=food
  if (startParam.startsWith('ref_')) {
    return { page: 'today', params: { referrer: startParam.replace('ref_', '') } };
  }
  return parseDeepLink(`moonvit://${startParam}`);
}
