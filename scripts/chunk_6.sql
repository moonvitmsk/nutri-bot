INSERT INTO nutri_settings (key, value, description) VALUES
('config_ai_top_p', '1.0', 'Top P параметр'),
('config_ai_frequency_penalty', '0.0', 'Frequency penalty'),
('config_ai_presence_penalty', '0.0', 'Presence penalty'),
('config_moonvit_mention_every', '5', 'Упоминание Moonvit каждые N сообщений'),
('prompt_greeting', '', 'Кастомное приветствие бота (если пусто — генерируется AI)')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;