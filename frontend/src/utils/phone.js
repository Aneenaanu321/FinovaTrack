/** Strip to digits; default India country code if 10-digit local number. */
export function normalizePhoneDigits(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function telHref(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  return `tel:+${digits}`;
}

export function whatsappHref(phone, text = '') {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return null;
  const params = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${digits}${params}`;
}

export function canUsePhone(phone) {
  return String(phone || '').replace(/\D/g, '').length >= 8;
}
