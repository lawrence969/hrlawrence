import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!['GET','POST'].includes(req.method)) return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  const token = new URL(req.url).searchParams.get('token');
  if (!token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return new Response('Invalid unsubscribe link', { status: 400, headers: corsHeaders });
  const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return new Response('Service unavailable', { status: 503, headers: corsHeaders });
  const db = createClient(url,key);
  const { data: pref, error } = await db.from('client_email_preferences').select('email').eq('token', token).maybeSingle();
  if (error || !pref) return new Response('Link unavailable', { status: 404, headers: corsHeaders });
  if (req.method === 'GET') return new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HR Lawrence — Unsubscribe</title><body><h1>HR Lawrence Fine Jewelry</h1><p>Stop promotional emails / Ne plus recevoir de courriels promotionnels</p><form method="POST"><button type="submit">Unsubscribe / Se désabonner</button></form></body></html>', { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } });
  const { error: updateError } = await db.from('client_email_preferences').update({ unsubscribed_at: new Date().toISOString() }).eq('token', token);
  return new Response(updateError ? 'Please try again / Veuillez réessayer' : 'You have been unsubscribed from promotional emails. / Vous ne recevrez plus de courriels promotionnels.', { status: updateError ? 500 : 200, headers: corsHeaders });
});
