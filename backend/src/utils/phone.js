export const PHONE_PATTERN = /^\+2507[2389]\d{7}$/;

export const normalizePhone = (value) => {
  if (value === null || value === undefined || value === '') return value;

  const local = String(value).replace(/\D/g, '').replace(/^(?:250)?0?/, '');

  return local ? `+250${local}` : String(value);
};
