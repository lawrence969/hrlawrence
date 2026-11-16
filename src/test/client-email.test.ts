import { describe, it, expect } from 'vitest';
import { uniqueRecipients, staffMaySend } from '../../supabase/functions/_shared/christmas-email';
describe('manual promotional email rules', () => {
  it('allows staff and admins but denies clients', () => {
    expect(staffMaySend(['staff'])).toBe(true);
    expect(staffMaySend(['admin'])).toBe(true);
    expect(staffMaySend(['user'])).toBe(false);
    expect(staffMaySend([])).toBe(false);
  });
  it('sends once per email even when clients share an address', () => {
    expect(uniqueRecipients([{ email: 'Client@example.com' }, { email: ' client@example.com ' }])).toHaveLength(1);
  });
  it('excludes missing and placeholder email addresses', () => {
    expect(uniqueRecipients([{ email: '' }, { email: 'no@email.com' }, { email: 'client@example.com' }])).toEqual([{ email: 'client@example.com' }]);
  });
});
