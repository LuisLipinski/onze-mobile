export function sanitizePaymentAmountInput(value: string) {
  const sanitized = value.replace(/[^0-9,.]/g, '').replace('.', ',');
  const [whole = '', ...decimalParts] = sanitized.split(',');
  const decimal = decimalParts.join('').slice(0, 2);
  return decimalParts.length ? `${whole.slice(0, 8)},${decimal}` : whole.slice(0, 8);
}

export function parsePaymentAmount(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0.01 ? amount : null;
}

export function paymentAmountInputValue(amount: number | null | undefined) {
  if (amount == null) return '';
  return amount.toFixed(2).replace('.', ',');
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}
