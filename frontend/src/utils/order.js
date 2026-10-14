export const ORDER_STATUS_LABELS = {
  pending: 'Awaiting payment',
  paid: 'Paid',
  shipped: 'On its way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const formatOrderDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
