/**
 * Helper to parse real customer name and phone number from order notes.
 * Fallbacks to profile details if note format doesn't contain them.
 */
export function parseCustomerInfo(
  note: string | null,
  profileName: string | null,
  profilePhone: string | null
) {
  let name = profileName || '';
  let phone = profilePhone || '';

  if (note) {
    // Regex for "Tên: [value]" or "Ten: [value]"
    const nameMatch = note.match(/(?:Tên|Ten):\s*([^\n\r]+)/i);
    if (nameMatch && nameMatch[1]) {
      const parsedName = nameMatch[1].trim();
      if (parsedName) name = parsedName;
    }

    // Regex for "SĐT: [value]" or "SDT: [value]"
    const phoneMatch = note.match(/(?:SĐT|SDT|Sdt|Sđt|Điện thoại|Dien thoai):\s*([^\n\r]+)/i);
    if (phoneMatch && phoneMatch[1]) {
      const parsedPhone = phoneMatch[1].trim();
      if (parsedPhone) phone = parsedPhone;
    }
  }

  // Fallbacks
  if (!name.trim()) name = 'Khách vãng lai';
  if (!phone.trim()) phone = '—';

  return { name, phone };
}
