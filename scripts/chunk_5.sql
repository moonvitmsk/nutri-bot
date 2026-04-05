INSERT INTO nutri_settings (key, value, description) VALUES
('ai_model_transcription', 'whisper-1', 'Модель для транскрипции голосовых сообщений'),
('config_ai_temperature', '0.7', 'Temperature для AI ответов (0.0-2.0)'),
('config_ai_max_tokens', '2048', 'Максимум токенов в ответе AI'),
('config_context_messages', '15', 'Глубина контекста (кол-во сообщений в AI запрос)'),
('config_context_summary_every', '50', 'Суммаризация каждые N сообщений')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;