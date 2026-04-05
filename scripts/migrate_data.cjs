// Migrate data from old Supabase to new via MCP-compatible SQL output
const fs = require('fs');

const settings = JSON.parse(fs.readFileSync('D:/DX/nutri-bot/scripts/dump_settings.json', 'utf8'));
console.log('Settings count:', settings.length);

// Escape for SQL
function esc(s) {
  if (s === null || s === undefined) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

// Generate one big INSERT
const vals = settings.map(r =>
  `(${esc(r.key)}, ${esc(r.value)}, ${esc(r.description)})`
);

// Split into chunks of 5 (to stay under SQL size limits)
const chunks = [];
for (let i = 0; i < vals.length; i += 5) {
  const chunk = vals.slice(i, i + 5);
  const sql = `INSERT INTO nutri_settings (key, value, description) VALUES\n${chunk.join(',\n')}\nON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;`;
  chunks.push(sql);
  fs.writeFileSync(`D:/DX/nutri-bot/scripts/chunk_${Math.floor(i / 5)}.sql`, sql);
}

console.log('Chunks:', chunks.length);
