import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { renderClientEmail } from './render-email.ts';
import { normalizedEmail, uniqueRecipients, staffMaySend } from '../_shared/christmas-email.ts';
const gateway = 'https://connector-gateway.lovable.dev/resend';
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const emailSchema = z.object({ subject: z.string().trim().min(1).max(500), preview: z.string().max(500), english: z.string().min(1).max(15000), french: z.string().min(1).max(15000), catalogUrl: z.string().url().refine(v => v.startsWith('https://'), 'Catalog link must use HTTPS'), from: z.string().email(), replyTo: z.string().email() });
const schema = z.object({ action: z.enum(['setup','send','test']), draft: emailSchema.optional(), profileIds: z.array(z.string().uuid()).max(500).optional(), testEmail: z.string().email().optional(), runId: z.string().uuid().optional(), consentConfirmed: z.boolean().optional() });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return response({ error: 'Email service configuration missing' }, 503);
    const db = createClient(url, key);
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return response({ error: 'Sign in required' }, 401);
    const { data: { user }, error: authError } = await db.auth.getUser(auth.slice(7));
    if (authError || !user) return response({ error: 'Sign in required' }, 401);
    const { data: roles, error: roleError } = await db.from('user_roles').select('role').eq('user_id', user.id);
    if (roleError || !staffMaySend((roles ?? []).map(r => r.role))) return response({ error: 'Staff access required' }, 403);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return response({ error: parsed.error.message }, 400);
    const input = parsed.data;
    const apiKey = Deno.env.get('LOVABLE_API_KEY'); const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey || !resendKey) return response({ error: 'Resend connection is not configured' }, 503);
    const headers = { Authorization: `Bearer ${apiKey}`, 'X-Connection-Api-Key': resendKey, 'Content-Type': 'application/json' };
    const domainsResponse = await fetch(`${gateway}/domains`, { headers });
    if (!domainsResponse.ok) { const details = await domainsResponse.text(); console.error('Resend domains', domainsResponse.status, details); return response({ error: 'Resend request failed', status: domainsResponse.status, details }, domainsResponse.status); }
    const domains = await domainsResponse.json();
    if (input.action === 'setup') return response({ domains: domains.data ?? [] });
    const draft = input.draft;
    if (!draft || !input.runId) return response({ error: 'Email draft and send identifier required' }, 400);
    if (!(domains.data ?? []).some((d: { name: string; status: string }) => d.status === 'verified' && d.name.toLowerCase() === draft.from.split('@')[1].toLowerCase())) return response({ error: 'Verify this sending domain in Resend before sending.' }, 400);
    let recipients: { id: string | null; email: string }[] = [];
    if (input.action === 'test') {
      if (!input.testEmail) return response({ error: 'Test email required' }, 400);
      recipients = [{ id: null, email: normalizedEmail(input.testEmail) }];
    } else {
      if (!input.consentConfirmed || !input.profileIds?.length) return response({ error: 'Select clients and confirm permission to email them.' }, 400);
      const { data, error } = await db.from('profiles').select('id,email').in('id', input.profileIds);
      if (error) throw error;
      recipients = uniqueRecipients(data ?? []);
      for (const r of recipients) { const { data: placeholder, error } = await db.rpc('is_placeholder_email', { _e: r.email }); if (error) throw error; if (placeholder) return response({ error: 'Remove clients with placeholder emails.' }, 400); }
    }
    const results = [];
    for (const recipient of recipients) {
      const email = normalizedEmail(recipient.email);
      const { data: suppression, error: supError } = await db.from('suppressed_emails').select('id').ilike('email', email).limit(1);
      if (supError) throw supError;
      const { data: pref, error: prefError } = await db.from('client_email_preferences').upsert({ email }, { onConflict: 'email', ignoreDuplicates: true });
      if (prefError) throw prefError;
      const { data: preference, error: readError } = await db.from('client_email_preferences').select('token,unsubscribed_at').eq('email', email).single();
      if (readError) throw readError;
      if (suppression?.length || preference.unsubscribed_at) { results.push({ email, status: 'skipped', error: 'Unsubscribed or suppressed' }); continue; }
      const { data: existing, error: existingError } = await db.from('client_email_deliveries').select('status').eq('run_id', input.runId).eq('email', email).maybeSingle();
      if (existingError) throw existingError;
      if (existing) { results.push({ email, status: existing.status, error: 'Already processed in this send' }); continue; }
      const { error: claimError } = await db.from('client_email_deliveries').insert({ run_id: input.runId, email, profile_id: recipient.id, subject: draft.subject, status: 'sending' });
      if (claimError) { results.push({ email, status: 'skipped', error: 'Already processing' }); continue; }
      const unsubscribe = `${url}/functions/v1/client-email-unsubscribe?token=${preference.token}`;
      const html = renderClientEmail(draft, unsubscribe);
      let status = 'failed'; let providerId: string | null = null; let failure: string | null = null;
      try {
        const res = await fetch(`${gateway}/emails`, { method: 'POST', headers: { ...headers, 'Idempotency-Key': `${input.runId}-${email}` }, body: JSON.stringify({ from: `HR Lawrence Fine Jewelry <${draft.from}>`, reply_to: draft.replyTo, to: [email], subject: draft.subject, html, text: `${draft.english}\n\nBrowse the sale collection: ${draft.catalogUrl}\n\n${draft.french}\n\nDécouvrir la collection en solde : ${draft.catalogUrl}\n\nUnsubscribe / Se désabonner: ${unsubscribe}`, headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }) });
        if (!res.ok) { failure = `[${res.status}]: ${await res.text()}`; console.error('Resend send failed', failure); } else { const sent = await res.json(); providerId = sent.id; status = 'sent'; }
      } catch (error) { failure = error instanceof Error ? error.message : 'Send failed'; }
      const { error: logError } = await db.from('client_email_deliveries').update({ status, provider_id: providerId, error: failure }).eq('run_id', input.runId).eq('email', email);
      if (logError) throw logError;
      results.push({ email, status, error: failure });
    }
    return response({ results });
  } catch (error) { return response({ error: error instanceof Error ? error.message : 'Email operation failed' }, 500); }
});
