export function bookingReceiptPath(
  bookingId: string,
  receiptToken?: string | null
) {
  if (!receiptToken) return `/booking/${bookingId}/receipt`;
  return `/booking/${bookingId}/receipt?token=${encodeURIComponent(receiptToken)}`;
}
