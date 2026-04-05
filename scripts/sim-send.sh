#!/bin/bash
# sim-send.sh — Helper functions for NutriBot simulation
# Usage: source sim-send.sh; then call functions

WEBHOOK="https://nutri-bot-smoky.vercel.app/api/webhook"
SUPA_URL="https://zfihygjekrheimvrpdtp.supabase.co"
SUPA_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmaWh5Z2pla3JoZWltdnJwZHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDI1NTUsImV4cCI6MjA4ODkxODU1NX0.YKjiLRjC2fleApuarnl1JjoPXBRwH5BIBcr5UiyOs98"

TS=$(date +%s)
SEQ=0

send() {
  local payload="$1"
  SEQ=$((SEQ + 1))
  local result=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "$payload" 2>&1)
  local code=$(echo "$result" | tail -1)
  local body=$(echo "$result" | sed '$d')
  echo "[HTTP $code] $body"
  sleep 2
}

# Send bot_started
bot_started() {
  local uid=$1 name=$2
  send "{\"updates\":[{\"update_type\":\"bot_started\",\"timestamp\":$(date +%s),\"user\":{\"user_id\":$uid,\"name\":\"$name\"},\"chat_id\":$uid}]}"
}

# Send text message
send_text() {
  local uid=$1 name=$2 text=$3
  send "{\"updates\":[{\"update_type\":\"message_created\",\"timestamp\":$(date +%s),\"message\":{\"sender\":{\"user_id\":$uid,\"name\":\"$name\"},\"recipient\":{\"chat_id\":$uid},\"timestamp\":$(date +%s),\"body\":{\"mid\":\"sim_${uid}_${SEQ}\",\"seq\":$SEQ,\"text\":\"$text\"}}}]}"
}

# Send contact (phone)
send_contact() {
  local uid=$1 name=$2 phone=$3
  send "{\"updates\":[{\"update_type\":\"message_created\",\"timestamp\":$(date +%s),\"message\":{\"sender\":{\"user_id\":$uid,\"name\":\"$name\"},\"recipient\":{\"chat_id\":$uid},\"timestamp\":$(date +%s),\"body\":{\"mid\":\"sim_${uid}_${SEQ}\",\"seq\":$SEQ,\"attachments\":[{\"type\":\"contact\",\"payload\":{\"vcfPhone\":\"$phone\"}}]}}}]}"
}

# Send callback (button press)
send_callback() {
  local uid=$1 name=$2 payload=$3
  send "{\"updates\":[{\"update_type\":\"message_callback\",\"timestamp\":$(date +%s),\"callback\":{\"timestamp\":$(date +%s),\"callback_id\":\"sim_cb_${uid}_${SEQ}\",\"payload\":\"$payload\",\"user\":{\"user_id\":$uid,\"name\":\"$name\"}},\"chat_id\":$uid}]}"
}

# Send image
send_image() {
  local uid=$1 name=$2 url=$3
  send "{\"updates\":[{\"update_type\":\"message_created\",\"timestamp\":$(date +%s),\"message\":{\"sender\":{\"user_id\":$uid,\"name\":\"$name\"},\"recipient\":{\"chat_id\":$uid},\"timestamp\":$(date +%s),\"body\":{\"mid\":\"sim_${uid}_${SEQ}\",\"seq\":$SEQ,\"attachments\":[{\"type\":\"image\",\"payload\":{\"url\":\"$url\"}}]}}}]}"
}

# Send sticker
send_sticker() {
  local uid=$1 name=$2
  send "{\"updates\":[{\"update_type\":\"message_created\",\"timestamp\":$(date +%s),\"message\":{\"sender\":{\"user_id\":$uid,\"name\":\"$name\"},\"recipient\":{\"chat_id\":$uid},\"timestamp\":$(date +%s),\"body\":{\"mid\":\"sim_${uid}_${SEQ}\",\"seq\":$SEQ,\"attachments\":[{\"type\":\"sticker\",\"payload\":{}}]}}}]}"
}

# Send video
send_video() {
  local uid=$1 name=$2
  send "{\"updates\":[{\"update_type\":\"message_created\",\"timestamp\":$(date +%s),\"message\":{\"sender\":{\"user_id\":$uid,\"name\":\"$name\"},\"recipient\":{\"chat_id\":$uid},\"timestamp\":$(date +%s),\"body\":{\"mid\":\"sim_${uid}_${SEQ}\",\"seq\":$SEQ,\"attachments\":[{\"type\":\"video\",\"payload\":{\"url\":\"https://example.com/video.mp4\"}}]}}}]}"
}

# Check user in Supabase
check_user() {
  local uid=$1
  curl -s "$SUPA_URL/rest/v1/nutri_users?max_user_id=eq.$uid&select=id,max_user_id,name,sex,age,height_cm,weight_kg,goal,onboarding_step,onboarding_completed,context_state,water_glasses,streak_days,subscription_type,daily_calories" \
    -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $SUPA_KEY"
}

# Check food logs
check_food() {
  local db_id=$1
  curl -s "$SUPA_URL/rest/v1/nutri_food_logs?user_id=eq.$db_id&select=id,description,calories,protein,fat,carbs,confirmed,created_at&order=created_at.desc&limit=5" \
    -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $SUPA_KEY"
}

# Check errors
check_errors() {
  curl -s "$SUPA_URL/rest/v1/nutri_error_logs?select=*&order=created_at.desc&limit=20" \
    -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $SUPA_KEY"
}

# Check messages
check_messages() {
  local db_id=$1
  curl -s "$SUPA_URL/rest/v1/nutri_messages?user_id=eq.$db_id&select=role,content,created_at&order=created_at.desc&limit=10" \
    -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $SUPA_KEY"
}
