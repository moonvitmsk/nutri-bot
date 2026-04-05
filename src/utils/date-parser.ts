// Parse birth date from various Russian formats
// Returns { date: 'YYYY-MM-DD', age: number } or null

interface ParsedDate {
  date: string;
  age: number;
}

export function parseBirthDate(text: string): ParsedDate | null {
  const cleaned = text.trim().replace(/\s+/g, ' ');

  // Try DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
  const dotMatch = cleaned.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dotMatch) {
    const day = parseInt(dotMatch[1]);
    const month = parseInt(dotMatch[2]);
    const year = parseInt(dotMatch[3]);
    return buildResult(year, month, day);
  }

  // Try YYYY-MM-DD (ISO)
  const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1]);
    const month = parseInt(isoMatch[2]);
    const day = parseInt(isoMatch[3]);
    return buildResult(year, month, day);
  }

  // Try DD month YYYY (Russian month names)
  const monthNames: Record<string, number> = {
    'января': 1, 'январь': 1, 'янв': 1,
    'февраля': 2, 'февраль': 2, 'фев': 2,
    'марта': 3, 'март': 3, 'мар': 3,
    'апреля': 4, 'апрель': 4, 'апр': 4,
    'мая': 5, 'май': 5,
    'июня': 6, 'июнь': 6, 'июн': 6,
    'июля': 7, 'июль': 7, 'июл': 7,
    'августа': 8, 'август': 8, 'авг': 8,
    'сентября': 9, 'сентябрь': 9, 'сен': 9,
    'октября': 10, 'октябрь': 10, 'окт': 10,
    'ноября': 11, 'ноябрь': 11, 'ноя': 11,
    'декабря': 12, 'декабрь': 12, 'дек': 12,
  };

  const textMatch = cleaned.toLowerCase().match(/^(\d{1,2})\s+([а-яё]+)\s+(\d{4})$/);
  if (textMatch) {
    const day = parseInt(textMatch[1]);
    const monthStr = textMatch[2];
    const year = parseInt(textMatch[3]);
    const month = monthNames[monthStr];
    if (month) return buildResult(year, month, day);
  }

  return null;
}

function buildResult(year: number, month: number, day: number): ParsedDate | null {
  if (year < 1920 || year > 2015) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const birthDate = new Date(year, month - 1, day);
  const now = new Date();

  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 5 || age > 120) return null;

  return { date: dateStr, age };
}
