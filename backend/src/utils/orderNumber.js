const ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY34789';

const randomCode = (length) =>
  Array.from({ length }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

const datePart = () => {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}${month}${day}`;
};

export const buildUniqueOrderNumber = async (Order, transaction) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const orderNumber = `SS-${datePart()}-${randomCode(4)}`;
    const existing = await Order.findOne({ where: { orderNumber }, attributes: ['id'], transaction });

    if (!existing) return orderNumber;
  }

  throw new Error('Could not generate a unique order number');
};
