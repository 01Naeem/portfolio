export const formatDate = (d, opts = { month: 'short', year: 'numeric' }) =>
  d ? new Intl.DateTimeFormat('en', opts).format(new Date(d)) : '';
export const formatNumber = (n) => new Intl.NumberFormat('en').format(n ?? 0);
