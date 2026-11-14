import { describe, expect, it } from 'vitest';
import { paymentDisplayStatus, refundedAmountText, ticketStatusLabel } from '../ticketResolution';

// 2026-11-14 (user): Transaction History shows a cancelled trip's refund, not only "Paid".
describe('paymentDisplayStatus', () => {
  it('shows the payment status when no refund was asked', () => {
    expect(paymentDisplayStatus({ status: 'paid', refund_status: null })).toBe('paid');
    expect(paymentDisplayStatus({ status: 'paid', refund_status: 'paid' })).toBe('paid');
    expect(paymentDisplayStatus({})).toBe('-');
  });

  it('shows the refund state once a refund was asked', () => {
    expect(paymentDisplayStatus({ status: 'paid', refund_status: 'refund_pending' })).toBe('refund_pending');
    expect(paymentDisplayStatus({ status: 'paid', refund_status: 'refunded' })).toBe('refunded');
    expect(paymentDisplayStatus({ status: 'paid', refund_status: 'partially_refunded' })).toBe('partially_refunded');
  });

  it('says how much came back, only once money was returned', () => {
    expect(refundedAmountText({ refunded_amount: 134 })).toBe('PHP 134.00 returned');
    expect(refundedAmountText({ refunded_amount: 0 })).toBe('');
    expect(refundedAmountText({})).toBe('');
  });

  it('words a partial refund in plain language', () => {
    expect(ticketStatusLabel('partially_refunded')).toBe('Partly refunded');
  });
});
