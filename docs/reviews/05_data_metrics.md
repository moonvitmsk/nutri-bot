# NutriBot MAX — Система метрик

**Версия:** 1.0
**Дата:** 2026-04-02
**Автор:** Data Analytics Layer

---

## 1. North Star Metric

**Weekly Active Engaged Users (WAEU)**

Определение: количество уникальных пользователей, которые за последние 7 дней совершили не менее 3 значимых действий (лог питания, фото еды, deepcheck, просмотр рекомендации по витаминам).

Почему это NSM:
- Отражает реальную ценность — пользователь использует бот регулярно, а не разово
- Напрямую коррелирует с удержанием и конверсией в premium
- Объединяет активность бесплатных, trial и premium пользователей в одну метрику

**Целевой benchmark:** 35% от MAU через 6 месяцев после запуска.

```sql
-- WAEU: пользователи с 3+ значимыми действиями за 7 дней
WITH user_actions AS (
    SELECT user_id, COUNT(*) AS action_count
    FROM (
        SELECT user_id, created_at FROM nutri_food_logs
        WHERE created_at >= NOW() - INTERVAL '7 days'
        UNION ALL
        SELECT user_id, created_at FROM nutri_lab_results
        WHERE created_at >= NOW() - INTERVAL '7 days'
        UNION ALL
        SELECT user_id, created_at FROM nutri_deep_consults
        WHERE created_at >= NOW() - INTERVAL '7 days'
    ) all_actions
    GROUP BY user_id
)
SELECT COUNT(*) AS waeu
FROM user_actions
WHERE action_count >= 3;
```

---

## 2. Метрики приобретения (Acquisition)

### 2.1 DAU / MAU

| Метрика | Формула | Benchmark |
|---------|---------|-----------|
| DAU | Уник. пользователи с >= 1 сообщением за день | - |
| MAU | Уник. пользователи с >= 1 сообщением за 30 дней | - |
| DAU/MAU ratio | DAU / MAU * 100 | >= 20% — здоровый мессенджер-бот |

```sql
-- DAU за последние 30 дней (тренд)
SELECT
    DATE(created_at) AS day,
    COUNT(DISTINCT user_id) AS dau
FROM nutri_messages
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND role = 'user'
GROUP BY DATE(created_at)
ORDER BY day;

-- MAU текущего месяца
SELECT COUNT(DISTINCT user_id) AS mau
FROM nutri_messages
WHERE created_at >= DATE_TRUNC('month', NOW())
  AND role = 'user';
```

### 2.2 Источники трафика (новые пользователи)

Источники для NutriBot MAX через QR-коды Moonvit отслеживаются через таблицу `nutri_qr_codes`.

```sql
-- Новые пользователи по источнику QR-кода (продукт Moonvit)
SELECT
    qr.product_id,
    mp.name AS product_name,
    COUNT(DISTINCT nu.id) AS new_users,
    DATE_TRUNC('week', nu.created_at) AS week
FROM nutri_users nu
JOIN nutri_qr_codes qr ON nu.referral_qr_id = qr.id
JOIN nutri_moonvit_products mp ON qr.product_id = mp.id
WHERE nu.created_at >= NOW() - INTERVAL '90 days'
GROUP BY qr.product_id, mp.name, week
ORDER BY week DESC, new_users DESC;

-- Общий прирост новых пользователей по неделям
SELECT
    DATE_TRUNC('week', created_at) AS week,
    COUNT(*) AS new_users,
    COUNT(*) FILTER (WHERE referral_qr_id IS NOT NULL) AS from_qr,
    COUNT(*) FILTER (WHERE referral_qr_id IS NULL) AS organic
FROM nutri_users
GROUP BY week
ORDER BY week DESC;
```

---

## 3. Метрики активации (Activation)

### 3.1 Онбординг completion rate

Онбординг считается завершённым, когда пользователь:
1. Заполнил профиль (возраст, вес, цель)
2. Отправил первое сообщение с вопросом
3. Залогировал первый приём пищи

| Метрика | Benchmark |
|---------|-----------|
| Step 1 completion | >= 85% |
| Step 2 completion | >= 70% |
| Step 3 completion | >= 50% |
| Full onboarding (все 3 шага) | >= 45% |

```sql
-- Воронка онбординга
SELECT
    COUNT(*) AS total_users,
    COUNT(*) FILTER (WHERE profile_complete = true) AS completed_profile,
    COUNT(*) FILTER (WHERE first_message_at IS NOT NULL) AS sent_first_message,
    COUNT(*) FILTER (WHERE first_food_log_at IS NOT NULL) AS logged_first_meal,
    ROUND(
        COUNT(*) FILTER (WHERE first_food_log_at IS NOT NULL)::numeric
        / NULLIF(COUNT(*), 0) * 100, 1
    ) AS full_onboarding_rate
FROM (
    SELECT
        nu.id,
        (nu.age IS NOT NULL AND nu.weight IS NOT NULL AND nu.goal IS NOT NULL) AS profile_complete,
        MIN(nm.created_at) FILTER (WHERE nm.role = 'user') AS first_message_at,
        MIN(nfl.created_at) AS first_food_log_at
    FROM nutri_users nu
    LEFT JOIN nutri_messages nm ON nm.user_id = nu.id
    LEFT JOIN nutri_food_logs nfl ON nfl.user_id = nu.id
    WHERE nu.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY nu.id, nu.age, nu.weight, nu.goal
) onboarding;
```

### 3.2 Time to first photo

```sql
-- Медианное время от регистрации до первого фото с едой
SELECT
    PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (nfl.created_at - nu.created_at)) / 3600
    ) AS median_hours_to_first_photo,
    AVG(
        EXTRACT(EPOCH FROM (nfl.created_at - nu.created_at)) / 3600
    ) AS avg_hours_to_first_photo
FROM nutri_users nu
JOIN (
    SELECT DISTINCT ON (user_id)
        user_id, created_at
    FROM nutri_food_logs
    WHERE photo_url IS NOT NULL
    ORDER BY user_id, created_at
) nfl ON nfl.user_id = nu.id
WHERE nu.created_at >= NOW() - INTERVAL '90 days';
```

**Benchmark:** медиана <= 48 часов для trial-пользователей.

---

## 4. Метрики удержания (Retention)

### 4.1 N-day Retention

| Метрика | Формула | Benchmark |
|---------|---------|-----------|
| Day 1 retention | % вернувшихся на следующий день | >= 40% |
| Day 7 retention | % активных через 7 дней | >= 25% |
| Day 30 retention | % активных через 30 дней | >= 15% |
| Trial end retention | % перешедших в free после trial | >= 60% |

```sql
-- 7-day и 30-day retention по когортам регистрации
WITH cohorts AS (
    SELECT
        id AS user_id,
        DATE_TRUNC('week', created_at) AS cohort_week
    FROM nutri_users
),
activity AS (
    SELECT DISTINCT
        user_id,
        DATE_TRUNC('week', created_at) AS active_week
    FROM nutri_messages
    WHERE role = 'user'
)
SELECT
    c.cohort_week,
    COUNT(DISTINCT c.user_id) AS cohort_size,
    COUNT(DISTINCT a7.user_id) AS retained_day7,
    COUNT(DISTINCT a30.user_id) AS retained_day30,
    ROUND(COUNT(DISTINCT a7.user_id)::numeric / NULLIF(COUNT(DISTINCT c.user_id), 0) * 100, 1) AS retention_7d_pct,
    ROUND(COUNT(DISTINCT a30.user_id)::numeric / NULLIF(COUNT(DISTINCT c.user_id), 0) * 100, 1) AS retention_30d_pct
FROM cohorts c
LEFT JOIN activity a7 ON a7.user_id = c.user_id
    AND a7.active_week = c.cohort_week + INTERVAL '1 week'
LEFT JOIN activity a30 ON a30.user_id = c.user_id
    AND a30.active_week = c.cohort_week + INTERVAL '4 weeks'
GROUP BY c.cohort_week
ORDER BY c.cohort_week DESC;
```

### 4.2 Churn Rate

```sql
-- Ежемесячный churn rate (пользователи, не вернувшиеся 30+ дней)
WITH last_activity AS (
    SELECT
        user_id,
        MAX(created_at) AS last_seen
    FROM nutri_messages
    WHERE role = 'user'
    GROUP BY user_id
)
SELECT
    COUNT(*) AS churned_users,
    COUNT(*) FILTER (WHERE plan = 'premium') AS churned_premium,
    COUNT(*) FILTER (WHERE plan = 'trial') AS churned_trial,
    COUNT(*) FILTER (WHERE plan = 'free') AS churned_free
FROM last_activity la
JOIN nutri_users nu ON nu.id = la.user_id
JOIN nutri_settings ns ON ns.user_id = la.user_id
WHERE la.last_seen < NOW() - INTERVAL '30 days'
  AND nu.created_at > NOW() - INTERVAL '60 days'; -- только недавние когорты
```

---

## 5. Метрики монетизации

### 5.1 QR Activation Rate

**Определение:** % QR-кодов, которые были отсканированы хотя бы раз из числа выпущенных.

| Метрика | Benchmark |
|---------|-----------|
| QR scan rate | >= 5% от тиража |
| QR → registration | >= 60% от сканов |
| QR → trial activation | >= 80% зарегистрированных через QR |

```sql
-- QR activation funnel по продукту
SELECT
    mp.name AS product,
    COUNT(qr.id) AS total_qr_codes,
    COUNT(qr.id) FILTER (WHERE qr.scan_count > 0) AS scanned,
    COUNT(DISTINCT nu.id) AS registered_users,
    COUNT(DISTINCT nu.id) FILTER (WHERE ns.plan IN ('trial', 'premium')) AS activated_users,
    ROUND(COUNT(qr.id) FILTER (WHERE qr.scan_count > 0)::numeric / NULLIF(COUNT(qr.id), 0) * 100, 1) AS scan_rate_pct
FROM nutri_qr_codes qr
JOIN nutri_moonvit_products mp ON mp.id = qr.product_id
LEFT JOIN nutri_users nu ON nu.referral_qr_id = qr.id
LEFT JOIN nutri_settings ns ON ns.user_id = nu.id
GROUP BY mp.name
ORDER BY scan_rate_pct DESC;
```

### 5.2 Premium Conversion Rate

| Метрика | Benchmark |
|---------|-----------|
| Trial → Premium (QR повторный) | >= 15% за 30 дней trial |
| Free → Premium (органика) | >= 3% в месяц |

```sql
-- Конверсия trial -> premium по неделям
SELECT
    DATE_TRUNC('week', trial_start) AS cohort_week,
    COUNT(*) AS trial_users,
    COUNT(*) FILTER (WHERE converted_to_premium = true) AS converted,
    ROUND(
        COUNT(*) FILTER (WHERE converted_to_premium = true)::numeric
        / NULLIF(COUNT(*), 0) * 100, 1
    ) AS conversion_rate_pct
FROM (
    SELECT
        nu.id,
        ns.trial_start_at AS trial_start,
        EXISTS(
            SELECT 1 FROM nutri_settings ns2
            WHERE ns2.user_id = nu.id AND ns2.plan = 'premium'
        ) AS converted_to_premium
    FROM nutri_users nu
    JOIN nutri_settings ns ON ns.user_id = nu.id
    WHERE ns.trial_start_at IS NOT NULL
      AND ns.trial_start_at < NOW() - INTERVAL '30 days'
) trial_cohorts
GROUP BY cohort_week
ORDER BY cohort_week DESC;
```

### 5.3 LTV (Lifetime Value)

Для NutriBot MAX монетизация непрямая — через продажи витаминов Moonvit. LTV считается как:
- Прямой LTV: стоимость продукта с QR * вероятность повторной покупки
- Косвенный LTV: увеличение retention бренда Moonvit

```sql
-- Прокси LTV: среднее количество продуктов Moonvit, рекомендованных и кликнутых premium пользователем
SELECT
    ns.plan,
    AVG(product_interactions) AS avg_product_interactions,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY product_interactions) AS median_interactions
FROM (
    SELECT
        nm.user_id,
        COUNT(*) FILTER (WHERE nm.content ILIKE '%moonvit%' OR nm.content ILIKE '%витамин%') AS product_interactions
    FROM nutri_messages nm
    WHERE nm.role = 'assistant'
      AND nm.created_at >= NOW() - INTERVAL '90 days'
    GROUP BY nm.user_id
) user_interactions
JOIN nutri_settings ns ON ns.user_id = user_interactions.user_id
GROUP BY ns.plan;
```

---

## 6. Метрики качества AI

### 6.1 User Satisfaction Rate

**Прокси-метрики** (явного rating нет — нужно добавить в схему):
- Доля диалогов с >= 3 сообщениями подряд (engagement)
- Доля сессий с повторным визитом на следующий день
- Correction rate (пользователь исправляет распознанное фото)

| Метрика | Benchmark |
|---------|-----------|
| Session depth (avg messages) | >= 4 |
| Multi-turn conversation rate | >= 60% сессий |
| Photo correction rate | <= 15% |

```sql
-- Средняя глубина сессии (сообщений на диалог в день)
SELECT
    DATE(created_at) AS day,
    COUNT(*) / NULLIF(COUNT(DISTINCT user_id), 0) AS avg_messages_per_user,
    COUNT(*) FILTER (WHERE role = 'user') / NULLIF(COUNT(DISTINCT user_id), 0) AS avg_user_msgs
FROM nutri_messages
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY day;
```

### 6.2 Photo Food Recognition Correction Rate

```sql
-- Correction rate: логи с исправлением названия/калорий после первоначального распознавания
SELECT
    DATE_TRUNC('week', created_at) AS week,
    COUNT(*) AS total_photo_logs,
    COUNT(*) FILTER (WHERE was_corrected = true) AS corrected_logs,
    ROUND(
        COUNT(*) FILTER (WHERE was_corrected = true)::numeric
        / NULLIF(COUNT(*), 0) * 100, 1
    ) AS correction_rate_pct
FROM nutri_food_logs
WHERE photo_url IS NOT NULL
  AND created_at >= NOW() - INTERVAL '90 days'
GROUP BY week
ORDER BY week DESC;
```

> Примечание: поле `was_corrected` необходимо добавить в `nutri_food_logs` если его нет — фиксируется через UPDATE-событие в течение 10 минут после создания записи.

---

## 7. Метрики бизнеса Moonvit

### 7.1 Product Mention Rate

```sql
-- Упоминания продуктов Moonvit в ответах бота
SELECT
    mp.name AS product,
    mp.sku,
    COUNT(*) AS total_mentions,
    COUNT(DISTINCT nm.user_id) AS unique_users_reached,
    COUNT(*) FILTER (WHERE ns.plan = 'premium') AS premium_mentions,
    COUNT(*) FILTER (WHERE ns.plan = 'trial') AS trial_mentions
FROM nutri_messages nm
JOIN nutri_moonvit_products mp ON nm.content ILIKE '%' || mp.name || '%'
JOIN nutri_settings ns ON ns.user_id = nm.user_id
WHERE nm.role = 'assistant'
  AND nm.created_at >= NOW() - INTERVAL '30 days'
GROUP BY mp.name, mp.sku
ORDER BY total_mentions DESC;
```

### 7.2 Deficiency → Product Funnel

Ключевая метрика для кросс-продаж: пользователь получил анализ дефицита → бот упомянул продукт → пользователь активировал QR нового продукта.

```sql
-- Дефициты, наиболее часто приводящие к упоминанию продуктов
SELECT
    dm.deficiency_type,
    COUNT(DISTINCT dm.user_id) AS users_with_deficiency,
    COUNT(DISTINCT nm.user_id) AS users_received_recommendation,
    ROUND(
        COUNT(DISTINCT nm.user_id)::numeric
        / NULLIF(COUNT(DISTINCT dm.user_id), 0) * 100, 1
    ) AS recommendation_rate_pct
FROM nutri_deficiency_map dm
LEFT JOIN nutri_messages nm ON nm.user_id = dm.user_id
    AND nm.role = 'assistant'
    AND nm.created_at > dm.detected_at
    AND nm.content ILIKE '%moonvit%'
WHERE dm.detected_at >= NOW() - INTERVAL '90 days'
GROUP BY dm.deficiency_type
ORDER BY users_with_deficiency DESC;
```

### 7.3 QR Cross-sell Rate

```sql
-- Пользователи, активировавшие QR второго продукта (кросс-продажа)
SELECT
    COUNT(DISTINCT user_id) AS users_with_multiple_products,
    ROUND(
        COUNT(DISTINCT user_id)::numeric / NULLIF(
            (SELECT COUNT(*) FROM nutri_users WHERE referral_qr_id IS NOT NULL), 0
        ) * 100, 1
    ) AS crosssell_rate_pct
FROM (
    SELECT nu.id AS user_id
    FROM nutri_users nu
    JOIN nutri_qr_codes qr1 ON nu.referral_qr_id = qr1.id
    WHERE EXISTS (
        SELECT 1 FROM nutri_qr_codes qr2
        WHERE qr2.activated_by_user_id = nu.id
          AND qr2.id != nu.referral_qr_id
    )
) crosssell_users;
```

---

## 8. Дашборд для админки

### Структура дашборда (4 секции)

#### Секция 1: Обзор (Overview) — главный экран
- Карточки: DAU, MAU, DAU/MAU ratio, новые пользователи за день
- Линейный график: DAU за 30 дней (с разбивкой по тарифам)
- Воронка: registered → profile complete → first log → 7-day active
- Топ-метрика: WAEU с трендом vs прошлая неделя

#### Секция 2: Монетизация
- Bar chart: QR scan rate по продуктам Moonvit
- Воронка конверсии: free → trial → premium
- Таблица: retention по когортам (heatmap-style)
- KPI-карточки: Trial conversion rate, Churn rate, LTV proxy

#### Секция 3: Продукт и AI
- Pie chart: распределение по тарифам (free/trial/premium)
- Линия: photo correction rate по неделям
- Bar chart: среднее кол-во сообщений на пользователя в день
- Таблица: deepcheck usage — как часто используется, в какой день trial

#### Секция 4: Moonvit Business
- Таблица: упоминания продуктов (impressions, уник. пользователи)
- Funnel: дефицит detected → рекомендован → QR второго продукта
- Cross-sell rate gauge
- Heatmap дефицитов по пользовательской базе (из nutri_deficiency_map)

---

## 9. Алерты — критические аномалии

### Немедленная реакция (< 1 часа)

| Алерт | Условие | Действие |
|-------|---------|---------|
| DAU drop | DAU упал > 30% vs 7-day average | Проверить доступность бота в MAX |
| Photo recognition outage | correction_rate > 50% за последний час | Проверить AI-модель распознавания |
| Zero QR activations | 0 новых QR-активаций за 24ч при обычном трафике | Проверить flow регистрации через QR |
| Message delivery fail | nutri_messages.error_rate > 5% | Проверить интеграцию с MAX API |

### Реакция в течение дня (< 8 часов)

| Алерт | Условие | Действие |
|-------|---------|---------|
| Trial conversion drop | Trial→Premium rate упал < 5% за неделю | A/B тест оффера, проверить UX |
| Onboarding funnel break | Completion rate шага упал > 20% | Проверить конкретный шаг онбординга |
| Churn spike | Недельный churn вырос > 25% | Анализ когорты, exit-опрос |
| Deepcheck underuse | < 10% trial-пользователей использовали deepcheck к дню 7 | Пуш-уведомление с напоминанием |

### SQL-запросы для алертов

```sql
-- DAU anomaly detection
WITH recent_dau AS (
    SELECT
        DATE(created_at) AS day,
        COUNT(DISTINCT user_id) AS dau
    FROM nutri_messages
    WHERE created_at >= NOW() - INTERVAL '8 days'
      AND role = 'user'
    GROUP BY DATE(created_at)
),
baseline AS (
    SELECT AVG(dau) AS avg_dau
    FROM recent_dau
    WHERE day < CURRENT_DATE
)
SELECT
    r.day,
    r.dau,
    b.avg_dau,
    ROUND((r.dau - b.avg_dau) / NULLIF(b.avg_dau, 0) * 100, 1) AS pct_change
FROM recent_dau r, baseline b
WHERE r.day = CURRENT_DATE
  AND r.dau < b.avg_dau * 0.7; -- алерт при падении > 30%

-- Photo correction rate spike
SELECT
    ROUND(
        COUNT(*) FILTER (WHERE was_corrected = true)::numeric
        / NULLIF(COUNT(*), 0) * 100, 1
    ) AS correction_rate_last_hour
FROM nutri_food_logs
WHERE photo_url IS NOT NULL
  AND created_at >= NOW() - INTERVAL '1 hour'
HAVING ROUND(
    COUNT(*) FILTER (WHERE was_corrected = true)::numeric
    / NULLIF(COUNT(*), 0) * 100, 1
) > 50;
```

---

## 10. Сводная таблица KPI и benchmarks

| Категория | Метрика | Target (6 мес) | Critical threshold |
|-----------|---------|---------------|-------------------|
| NSM | WAEU / MAU | 35% | < 20% |
| Acquisition | DAU/MAU | 22% | < 12% |
| Activation | Onboarding completion | 45% | < 25% |
| Activation | Time to first photo | <= 48h (median) | > 96h |
| Retention | Day 7 retention | 25% | < 12% |
| Retention | Day 30 retention | 15% | < 7% |
| Retention | Monthly churn | < 8% | > 20% |
| Monetization | QR scan rate | 5% of print run | < 1% |
| Monetization | Trial → Premium | 15% | < 5% |
| Moonvit | Cross-sell QR rate | 10% | < 3% |
| AI Quality | Photo correction rate | < 15% | > 30% |
| AI Quality | Avg session depth | 4+ msgs | < 2 |

---

## 11. Приоритизация внедрения метрик

**Фаза 1 (запуск, первые 2 недели):**
- DAU/MAU, onboarding funnel, QR activation rate
- Алерты на DAU drop и photo correction spike

**Фаза 2 (первый месяц):**
- Retention когорты (7-day, 30-day)
- Trial conversion funnel
- Deepcheck usage rate

**Фаза 3 (после первого месяца):**
- Deficiency → product funnel
- Cross-sell QR rate
- LTV proxy по продуктам Moonvit
- WAEU как основная NSM-метрика для отчётности

---

*Файл: `docs/reviews/05_data_metrics.md`*
