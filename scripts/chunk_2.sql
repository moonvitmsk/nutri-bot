INSERT INTO nutri_settings (key, value, description) VALUES
('msg_onboarding_name', 'Как тебя зовут?', 'Онбординг: запрос имени'),
('msg_onboarding_phone', 'Поделись номером телефона — так мы сможем связаться при необходимости. Или напиши «пропустить».', 'Онбординг: запрос телефона'),
('msg_onboarding_sex', 'Укажи свой пол:', 'Онбординг: запрос пола'),
('msg_onboarding_age', 'Сколько тебе лет?', 'Онбординг: запрос возраста'),
('msg_onboarding_height', 'Какой у тебя рост в см?', 'Онбординг: запрос роста')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;