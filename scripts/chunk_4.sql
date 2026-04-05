INSERT INTO nutri_settings (key, value, description) VALUES
('msg_onboarding_diet', 'Предпочтения в питании? (веган, без глютена и т.д. или «нет»)', 'Онбординг: запрос диеты'),
('msg_food_analyzing', 'Анализирую фото... Сейчас посчитаю, что тут есть.', 'Текст при анализе фото еды'),
('msg_lab_analyzing', 'Секунду, разбираю документ...', 'Текст при анализе документов'),
('msg_deepcheck_start', 'Запускаю глубокую консультацию (4 AI-агента)... Подожди 20-30 секунд.', 'Текст при запуске deepcheck'),
('msg_consent_accept', 'Отлично! Давай познакомимся. Как тебя зовут?', 'Текст после согласия на ПДн')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;