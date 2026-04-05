# NutriBot Simulation Guide

## Webhook
POST https://nutri-bot-smoky.vercel.app/api/webhook
Content-Type: application/json

## Supabase Verification
URL: https://zfihygjekrheimvrpdtp.supabase.co
Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmaWh5Z2pla3JoZWltdnJwZHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDI1NTUsImV4cCI6MjA4ODkxODU1NX0.YKjiLRjC2fleApuarnl1JjoPXBRwH5BIBcr5UiyOs98

## Event Templates

### 1. bot_started (triggers /start + onboarding)
```json
{"updates":[{"update_type":"bot_started","timestamp":TIMESTAMP,"user":{"user_id":USER_ID,"name":"NAME","first_name":"FIRST"},"chat_id":USER_ID}]}
```

### 2. message_created — text
```json
{"updates":[{"update_type":"message_created","timestamp":TIMESTAMP,"message":{"sender":{"user_id":USER_ID,"name":"NAME"},"recipient":{"chat_id":USER_ID},"timestamp":TIMESTAMP,"body":{"mid":"MID","seq":SEQ,"text":"TEXT"}}}]}
```

### 3. message_created — contact (phone sharing)
```json
{"updates":[{"update_type":"message_created","timestamp":TIMESTAMP,"message":{"sender":{"user_id":USER_ID,"name":"NAME"},"recipient":{"chat_id":USER_ID},"timestamp":TIMESTAMP,"body":{"mid":"MID","seq":SEQ,"attachments":[{"type":"contact","payload":{"vcfPhone":"+7PHONE"}}]}}}]}
```

### 4. message_created — image (food photo)
```json
{"updates":[{"update_type":"message_created","timestamp":TIMESTAMP,"message":{"sender":{"user_id":USER_ID,"name":"NAME"},"recipient":{"chat_id":USER_ID},"timestamp":TIMESTAMP,"body":{"mid":"MID","seq":SEQ,"attachments":[{"type":"image","payload":{"url":"IMAGE_URL"}}]}}}]}
```

### 5. message_callback (inline button press)
```json
{"updates":[{"update_type":"message_callback","timestamp":TIMESTAMP,"callback":{"timestamp":TIMESTAMP,"callback_id":"CB_ID","payload":"PAYLOAD","user":{"user_id":USER_ID,"name":"NAME"}},"chat_id":USER_ID}]}
```

### 6. message_created — audio (voice message)
```json
{"updates":[{"update_type":"message_created","timestamp":TIMESTAMP,"message":{"sender":{"user_id":USER_ID,"name":"NAME"},"recipient":{"chat_id":USER_ID},"timestamp":TIMESTAMP,"body":{"mid":"MID","seq":SEQ,"attachments":[{"type":"audio","payload":{"url":"AUDIO_URL"}}]}}}]}
```

### 7. message_created — sticker
```json
{"updates":[{"update_type":"message_created","timestamp":TIMESTAMP,"message":{"sender":{"user_id":USER_ID,"name":"NAME"},"recipient":{"chat_id":USER_ID},"timestamp":TIMESTAMP,"body":{"mid":"MID","seq":SEQ,"attachments":[{"type":"sticker","payload":{}}]}}}]}
```

### 8. message_created — video
```json
{"updates":[{"update_type":"message_created","timestamp":TIMESTAMP,"message":{"sender":{"user_id":USER_ID,"name":"NAME"},"recipient":{"chat_id":USER_ID},"timestamp":TIMESTAMP,"body":{"mid":"MID","seq":SEQ,"attachments":[{"type":"video","payload":{"url":"https://example.com/video.mp4"}}]}}}]}
```

## Callback Payloads (inline buttons)
- Onboarding: `profile_full`, `profile_short`, `profile_skip`, `name_confirm`, `name_change`
- Sex: `sex_male`, `sex_female`
- Goals: `goal_lose`, `goal_maintain`, `goal_gain`, `goal_healthy`, `goal_sport`, `goal_custom`
- Actions: `action_food`, `action_deep`, `action_lab`, `action_water`, `action_today`, `action_week`, `action_profile`, `action_editprofile`, `action_vitamins`, `action_more`, `action_subscribe`, `action_recipes`, `action_mealplan`, `action_addfood`, `action_delfood`, `action_qr`, `action_restaurant`, `action_help`, `action_stats`, `action_allergy`, `action_invite`, `action_reminders`, `action_promo`
- Food: `confirm_food`, `edit_weight_food`, `cancel_food`
- Deepcheck: `deep_diet`, `deep_vitamins`, `deep_lab`, `deep_progress`, `deep_full`, `deep_custom`
- Recipes: `recipe_breakfast`, `recipe_lunch`, `recipe_dinner`, `recipe_snack`, `recipe_any`, `recipe_photo`, `recipe_custom`
- Meal plan: `mealplan_today`, `mealplan_week`, `mealplan_month`, `mealplan_custom`
- Edit profile: `edit_name`, `edit_sex`, `edit_birth`, `edit_height`, `edit_weight`, `edit_goal`, `edit_goal_text`
- Reminders: `toggle_morning`, `toggle_evening`, `reminders_off`, `reminders_on`
- Delete: `confirm_delete`, `cancel_delete`

## Commands (send as text starting with /)
/start, /profile, /today, /week, /water, /vitamins, /mealplan, /recipes, /deepcheck, /lab, /addfood, /delfood, /subscribe, /promo, /allergy, /stats, /invite, /reminders, /reset, /deletedata, /help, /editprofile

## Food Image URLs (publicly accessible)
- https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/800px-Good_Food_Display_-_NCI_Visuals_Online.jpg
- https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Pasta_with_Pesto_%2814873735527%29.jpg/800px-Pasta_with_Pesto_%2814873735527%29.jpg
- https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Recipe_stridge.jpg/800px-Recipe_stridge.jpg
- https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Fried_egg%2C_sunny_side_up.jpg/800px-Fried_egg%2C_sunny_side_up.jpg
- https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Big_Mac_hamburger.jpg/800px-Big_Mac_hamburger.jpg
- https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Sashimi_combo.jpg/800px-Sashimi_combo.jpg

## Supabase Verification Queries

### Check user state
```bash
curl -s "https://zfihygjekrheimvrpdtp.supabase.co/rest/v1/nutri_users?max_user_id=eq.USER_ID&select=*" \
  -H "apikey: SUPABASE_KEY" -H "Authorization: Bearer SUPABASE_KEY"
```

### Check food logs
```bash
curl -s "https://zfihygjekrheimvrpdtp.supabase.co/rest/v1/nutri_food_logs?user_id=eq.DB_USER_ID&select=*&order=created_at.desc&limit=5" \
  -H "apikey: SUPABASE_KEY" -H "Authorization: Bearer SUPABASE_KEY"
```

### Check messages
```bash
curl -s "https://zfihygjekrheimvrpdtp.supabase.co/rest/v1/nutri_messages?user_id=eq.DB_USER_ID&select=*&order=created_at.desc&limit=10" \
  -H "apikey: SUPABASE_KEY" -H "Authorization: Bearer SUPABASE_KEY"
```

### Check error logs
```bash
curl -s "https://zfihygjekrheimvrpdtp.supabase.co/rest/v1/nutri_error_logs?select=*&order=created_at.desc&limit=20" \
  -H "apikey: SUPABASE_KEY" -H "Authorization: Bearer SUPABASE_KEY"
```

## Onboarding Flow (Day 1)
1. Send `bot_started` → user created at step 0
2. Send contact with phone → step becomes 1
3. Send callback `name_confirm` (if bot had name) OR send text with name → step 2
4. Send callback `sex_male`/`sex_female` → step 3
5. Send text with age (e.g. "28") → step 4
6. Send text with height (e.g. "165") → step 5
7. Send text with weight (e.g. "58") → step 6
8. Send callback `goal_lose`/`goal_maintain`/`goal_gain`/`goal_healthy`/`goal_sport` → onboarding complete

Alternative fast onboarding:
- After step 2 contact, send callback `profile_short` → goes to sex → age → goal (skips height/weight)
- Or send callback `profile_skip` → instant complete with defaults

## Daily Usage Pattern (Days 2-7)
Each day should include some of:
- 2-4 food entries (mix /addfood text and image attachments)
- Send callback `confirm_food` after each food entry
- 1-3 /water commands
- Check /today
- Occasionally: /week, /vitamins, /profile, /stats
- 1-2 times per week: /deepcheck, /recipes, /mealplan
- Edge cases: sticker, video, free text chat, /editprofile

## Edge Cases to Test
- Send text at step 0 (should ask for phone)
- Send image at step 0 (should ask for phone)
- Very long food description (2000+ chars)
- Special characters in name: emoji, HTML tags, quotes
- Invalid age/height/weight (0, -1, 999)
- Empty text message
- Double callback (same button pressed twice)
- /delfood with no food logged
- /addfood with empty text
- Free text like "привет", "спасибо", "покажи дневник"
- AI memory: "зови меня Саша", "я вешу 80"

## Report Format
Write to D:\DX\nutri-bot\scripts\reports\persona_NN.md:
```markdown
# Persona NN: Name
## Profile
- Age/Sex/Height/Weight/Goal
- User ID: 99000NNNN

## Simulation Summary
- Days simulated: 7
- Total events sent: N
- Errors encountered: N

## Bugs Found
1. [SEVERITY] Description — what happened vs what was expected
2. ...

## Engagement Notes
- Which features used most
- What felt natural/unnatural
- UX friction points

## Raw Errors (from Supabase error logs or curl responses)
```
