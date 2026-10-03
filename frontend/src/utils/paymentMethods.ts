const STORAGE_KEY = 'fintrack_custom_payment_methods';

export const DEFAULT_PAYMENT_METHODS = ['Bank Transfer', 'Credit Card', 'Cash', 'UPI'];

export const paymentMethodLabel = (value: string) =>
  value.trim().toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export const paymentMethodValue = (label: string) =>
  label.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

export const getCustomPaymentMethods = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string' && Boolean(value.trim())) : [];
  } catch {
    return [];
  }
};

export const saveCustomPaymentMethods = (methods: string[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set(methods.map(paymentMethodValue).filter(Boolean)))));
  window.dispatchEvent(new Event('fintrack-payment-methods-changed'));
};
