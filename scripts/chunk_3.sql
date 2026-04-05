INSERT INTO nutri_settings (key, value, description) VALUES
('msg_onboarding_weight', 'Какой у тебя вес в кг?', 'Онбординг: запрос веса'),
('msg_onboarding_goal', 'Какая у тебя цель?', 'Онбординг: запрос цели'),
('msg_onboarding_activity', 'Уровень физической активности:', 'Онбординг: запрос активности'),
('msg_onboarding_allergies', 'Аллергии на продукты? (перечисли или «нет»)', 'Онбординг: запрос аллергий'),
('msg_onboarding_chronic', 'Хронические заболевания? (перечисли или «нет»)', 'Онбординг: запрос хронических')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;