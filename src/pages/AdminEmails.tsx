import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';
import { Mail, Save, Send, Search, FlaskConical, ArrowLeft, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import logoNavy from '@/assets/logo-navy.jpg';
import { defaultChristmasEmail, uniqueRecipients, type ChristmasEmail } from '../../supabase/functions/_shared/christmas-email';

type Client = { id: string; client_number: string | null; first_name: string; last_name: string; email: string };
type Delivery = { email: string; status: string; error?: string | null };
const draftSchema = z.object({ subject: z.string().trim().min(1).max(500), preview: z.string().max(500), english: z.string().min(1).max(15000), french: z.string().min(1).max(15000), catalogUrl: z.string().url().refine(v => v.startsWith('https://'), 'Catalog link must use HTTPS'), from: z.string().email(), replyTo: z.string().email() });

export default function AdminEmails() {
  const { user, isStaff, loading } = useAuth();
  const [draft, setDraft] = useState<ChristmasEmail>(defaultChristmasEmail);
  const [saved, setSaved] = useState(JSON.stringify(defaultChristmasEmail));
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [domains, setDomains] = useState<{ name: string; status: string }[]>([]);
  const [setupError, setSetupError] = useState('');
  const [checkingSender, setCheckingSender] = useState(false);
  const [senderChecked, setSenderChecked] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [consent, setConsent] = useState(false);
  const [results, setResults] = useState<Delivery[]>([]);
  const [progress, setProgress] = useState('');
  const dirty = JSON.stringify(draft) !== saved;
  const recipients = useMemo(() => uniqueRecipients(clients.filter(c => selected.has(c.id))), [clients, selected]);
  const filtered = useMemo(() => clients.filter(c => `${c.client_number} ${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(search.toLowerCase())), [clients, search]);
  const fromDomain = draft.from.split('@')[1]?.toLowerCase();
  const verified = domains.some(d => d.status === 'verified' && d.name.toLowerCase() === fromDomain);

  async function invoke(body: object) {
    const { data, error } = await supabase.functions.invoke('send-client-email', { body });
    if (error) {
      const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
      try { const parsed = JSON.parse(details); throw new Error(parsed.details || parsed.error || details); } catch (e) { if (e instanceof SyntaxError) throw new Error(details); throw e; }
    }
    return data;
  }
  async function checkSender() {
    setSetupError('');
    setCheckingSender(true);
    setSenderChecked(false);
    try {
      const data = await invoke({ action: 'setup' });
      setDomains(data.domains);
      setSenderChecked(true);
    } catch (error) { setSetupError(error instanceof Error ? error.message : 'Could not check Resend'); }
    finally { setCheckingSender(false); }
  }
  useEffect(() => {
    if (!isStaff) return;
    const load = async () => {
      try {
        const [clientData, draftData, history] = await Promise.all([
          supabase.from('profiles').select('id,client_number,first_name,last_name,email').order('client_number'),
          supabase.from('client_email_drafts').select('content').eq('id', 'christmas-2026').maybeSingle(),
          supabase.from('client_email_deliveries').select('email,status,error').order('created_at', { ascending: false }).limit(50)
        ]);
        if (clientData.error) throw clientData.error;
        if (draftData.error) throw draftData.error;
        if (history.error) throw history.error;
        setClients(clientData.data ?? []);
        if (draftData.data) {
          const content = draftData.data.content as unknown as ChristmasEmail;
          const next = { ...defaultChristmasEmail, ...content };
          setDraft(next); setSaved(JSON.stringify(next));
        }
        setResults(history.data ?? []);
        setTestEmail(user?.email ?? '');
        setReady(true);
        await checkSender();
      } catch (error) { toast({ title: 'Could not load email page', description: error instanceof Error ? error.message : 'Try again', variant: 'destructive' }); }
    };
    void load();
  }, [isStaff]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, busy]);
  const update = (key: keyof ChristmasEmail, value: string) => setDraft(d => ({ ...d, [key]: value }));
  async function save() {
    setBusy(true);
    const { error } = await supabase.from('client_email_drafts').upsert({ id: 'christmas-2026', content: draft, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) toast({ title: 'Could not save draft', description: error.message, variant: 'destructive' });
    else { setSaved(JSON.stringify(draft)); toast({ title: 'Email draft saved' }); }
  }
  function validate() {
    const parsed = draftSchema.safeParse(draft);
    if (!parsed.success) {
      const labels: Record<string, string> = { subject: 'Subject', preview: 'Inbox preview', english: 'English text', french: 'French text', catalogUrl: 'Catalog link', from: 'Sending email', replyTo: 'Reply email' };
      const missing = [...new Set(parsed.error.issues.map(i => labels[String(i.path[0])] ?? 'Email'))];
      toast({ title: 'Check your email', description: `Please enter valid details for: ${missing.join(', ')}.`, variant: 'destructive' });
      return false;
    }
    return true;
  }
  async function test() {
    if (!validate()) return;
    if (!z.string().email().safeParse(testEmail).success) { toast({ title: 'Enter a valid test email', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const data = await invoke({ action: 'test', draft, testEmail, runId: crypto.randomUUID() });
      setResults(data.results);
      const sent = data.results.some((r: Delivery) => r.status === 'sent');
      toast({ title: sent ? 'Test accepted by Resend' : 'Test was not sent', description: data.results[0]?.error, variant: sent ? 'default' : 'destructive' });
    } catch (error) { toast({ title: 'Test was not sent', description: error instanceof Error ? error.message : 'Try again', variant: 'destructive' }); }
    finally { setBusy(false); }
  }
  async function send() {
    if (!validate() || !consent || !recipients.length) return;
    setConfirm(false); setBusy(true); setResults([]);
    const runId = crypto.randomUUID();
    const outcome: Delivery[] = [];
    try {
      for (let i = 0; i < recipients.length; i++) {
        setProgress(`${i + 1} of ${recipients.length}`);
        const data = await invoke({ action: 'send', draft, profileIds: [recipients[i].id], consentConfirmed: true, runId });
        outcome.push(...data.results); setResults([...outcome]);
        if (data.results.some((r: Delivery) => r.status === 'failed')) break;
      }
      const sent = outcome.filter(r => r.status === 'sent').length;
      setSelected(previous => new Set([...previous].filter(id => !recipients.some(r => r.id === id && outcome.some(o => o.email.toLowerCase() === r.email.trim().toLowerCase() && o.status === 'sent')))));
      toast({ title: `${sent} email${sent === 1 ? '' : 's'} accepted by Resend`, description: outcome.some(r => r.status === 'failed') ? 'Sending stopped after an error. Check the results below.' : undefined });
    } catch (error) { toast({ title: 'Sending stopped', description: error instanceof Error ? error.message : 'Try again', variant: 'destructive' }); }
    finally { setBusy(false); setProgress(''); setConsent(false); }
  }
  if (loading) return <div className="p-10">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isStaff) return <Navigate to="/" replace />;
  const emailPreview = <div className="border border-border p-6 sm:p-10 max-w-[680px] mx-auto bg-background text-foreground">
    <img src={logoNavy} alt="HR Lawrence Fine Jewelry" className="h-12 mx-auto mb-8" />
    {[{ text: draft.english, lang: 'en', label: 'Browse the sale collection' }, { text: draft.french, lang: 'fr', label: 'Découvrir la collection en solde' }].map((section, index) => <article key={section.lang} lang={section.lang} className={index ? 'mt-8 pt-8 border-t border-accent' : ''}>
      {section.text.split('\n\n').map((p, i) => <p key={i} className={i === 0 ? 'font-display text-xl mb-6 break-words' : 'text-sm leading-7 mb-4 whitespace-pre-line break-words'}>{p}</p>)}
      {draft.catalogUrl.startsWith('https://') ? <Button asChild className="whitespace-normal h-auto text-center py-3"><a href={draft.catalogUrl} target="_blank" rel="noreferrer">{section.label}</a></Button> : <span className="text-accent text-sm">{section.label}: [catalog link]</span>}
    </article>)}
    <p className="text-xs text-muted-foreground mt-8 border-t border-border pt-4">Unsubscribe / Se désabonner</p>
  </div>;
  return <div className="min-h-screen bg-background font-body">
    <header className="border-b border-border px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
      <Link to="/admin"><img src={logoNavy} alt="HR Lawrence Fine Jewelry" className="h-10" /></Link>
      <nav className="flex gap-5 text-sm"><Link to="/admin">Orders</Link><Link to="/admin/clients">Clients</Link><Link to="/admin/reports">Reports</Link><span className="text-accent">Emails</span></nav>
    </header>
    <main className="mx-auto max-w-[1800px] px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3"><Link to="/admin/clients" aria-label="Back to clients"><ArrowLeft className="w-5 h-5" /></Link><div><h1 className="font-display text-3xl">Christmas client email</h1><p className="text-sm text-muted-foreground mt-1">{dirty ? 'Unsaved changes' : 'Saved draft'} · English / Français</p></div></div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setPreviewOpen(true)} disabled={!ready}><Eye className="w-4 h-4 mr-2" />Preview email</Button>
          <Button onClick={save} disabled={busy || !ready}><Save className="w-4 h-4 mr-2" />Save draft</Button>
        </div>
      </div>
      {!ready ? <p>Loading email draft…</p> : <>
        <section className="mb-8 border-t border-border pt-5">
          <h2 className="font-display text-2xl mb-4">Send a test to myself</h2>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 max-w-md min-w-[200px]"><Label htmlFor="test">My email address</Label><Input id="test" type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} disabled={busy} /></div>
            <Button onClick={test} variant="outline" disabled={busy}><FlaskConical className="w-4 h-4 mr-2" />Send test to myself</Button>
          </div>
        </section>
        <section className="mb-8 border-y border-border py-5">
          <h2 className="font-display text-xl mb-3">Resend sender</h2>
          {setupError ? <p role="alert" className="text-destructive mb-3">{setupError}</p> : <p className="text-sm text-muted-foreground mb-3">{domains.length ? domains.map(d => `${d.name} — ${d.status}`).join(' · ') : 'No verified sending domain in Resend. Add a domain in Resend → Domains. Do not use notify.hrlawrence.com; it is already used for your existing emails.'}</p>}
          <div className="grid md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
            <div><Label htmlFor="from">Sending email</Label><Input id="from" type="email" value={draft.from} onChange={e => update('from', e.target.value)} disabled={busy} placeholder="Email on your verified Resend domain" /></div>
            <div><Label htmlFor="replyTo">Replies go to</Label><Input id="replyTo" type="email" value={draft.replyTo} onChange={e => update('replyTo', e.target.value)} disabled={busy} /></div>
            <Button variant="outline" onClick={checkSender} disabled={busy || checkingSender}>{checkingSender ? 'Checking sender…' : 'Check sender'}</Button>
          </div>
          {senderChecked && !checkingSender && !setupError && <p role={verified ? 'status' : 'alert'} className={`mt-4 text-sm break-words ${verified ? 'text-foreground' : 'text-destructive'}`}>
            {verified
              ? `Sender verified: ${draft.from}. No email has been sent. Click Save draft to keep these addresses.`
              : !z.string().email().safeParse(draft.from).success
                ? 'Enter a valid sending email address on your verified Resend domain.'
                : `The sending address uses ${fromDomain}, which is not verified in Resend.${domains.some(d => d.status === 'verified') ? ` Use an address on ${domains.filter(d => d.status === 'verified').map(d => d.name).join(' or ')} instead. Your usual inbox can remain under Replies go to.` : ' Verify its domain in Resend before sending.'}`}
          </p>}
        </section>
        <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10">
          <section className="min-w-0 space-y-5">
            <h2 className="font-display text-2xl">Email draft</h2>
            <div><Label htmlFor="subject">Subject</Label><Input id="subject" value={draft.subject} onChange={e => update('subject', e.target.value)} disabled={busy} maxLength={500} /></div>
            <div><Label htmlFor="preview">Inbox preview</Label><Textarea id="preview" value={draft.preview} onChange={e => update('preview', e.target.value)} disabled={busy} rows={2} maxLength={500} /></div>
            <div><Label htmlFor="catalog">Catalog link</Label><Input id="catalog" type="url" value={draft.catalogUrl} onChange={e => update('catalogUrl', e.target.value)} placeholder="https://…" disabled={busy} /></div>
            <div><Label htmlFor="english">English</Label><Textarea id="english" value={draft.english} onChange={e => update('english', e.target.value)} disabled={busy} rows={17} maxLength={15000} className="leading-relaxed" /></div>
            <div><Label htmlFor="french">Français</Label><Textarea id="french" value={draft.french} onChange={e => update('french', e.target.value)} disabled={busy} rows={17} maxLength={15000} className="leading-relaxed" /></div>
          </section>
          <section className="min-w-0">
            <h2 className="font-display text-2xl mb-5">Preview</h2>
            {emailPreview}
          </section>
        </div>
        <section className="mt-10 border-t border-border pt-8">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-5"><h2 className="font-display text-2xl">Recipients · {recipients.length} unique emails</h2><Button disabled={busy || !verified || !recipients.length} onClick={() => { if (validate()) setConfirm(true); }}><Send className="w-4 h-4 mr-2" />Review & send</Button></div>
          <div className="flex gap-3 flex-wrap mb-4"><div className="relative flex-1 min-w-0"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search clients" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients, CL number, email" /></div><Button variant="outline" disabled={busy} onClick={() => setSelected(new Set(uniqueRecipients(filtered).map(c => c.id)))}>Select visible</Button><Button variant="ghost" disabled={busy} onClick={() => setSelected(new Set())}>Clear</Button></div>
          <div className="overflow-x-auto max-h-[420px] border-y border-border force-scrollbar">
            <table className="w-full min-w-[620px] text-sm"><thead className="sticky top-0 bg-muted"><tr><th className="p-3 text-left">Select</th><th className="p-3 text-left">Client</th><th className="p-3 text-left">Email</th></tr></thead><tbody>{filtered.map(c => <tr key={c.id} className="border-t border-border"><td className="p-3"><Checkbox aria-label={`Select ${c.client_number}`} checked={selected.has(c.id)} disabled={busy || !uniqueRecipients([c]).length} onCheckedChange={v => setSelected(previous => { const next = new Set(previous); if (v) next.add(c.id); else next.delete(c.id); return next; })} /></td><td className="p-3">{c.client_number} · {c.first_name} {c.last_name}</td><td className="p-3 break-all">{c.email || 'No email'}</td></tr>)}</tbody></table>
          </div>
          {progress && <p role="status" className="mt-4">Sending {progress}…</p>}
        </section>
        {results.length > 0 && <section className="mt-8"><h2 className="font-display text-xl mb-3">Delivery results</h2><div className="overflow-x-auto"><table className="w-full min-w-[500px] text-sm"><thead><tr><th className="p-3 text-left">Email</th><th className="p-3 text-left">Result</th><th className="p-3 text-left">Details</th></tr></thead><tbody>{results.map((r,i) => <tr key={i} className="border-t border-border"><td className="p-3">{r.email}</td><td className="p-3">{r.status === 'sent' ? 'Accepted by Resend' : r.status}</td><td className="p-3 break-words max-w-xl">{r.error ?? '—'}</td></tr>)}</tbody></table></div></section>}
      </>}
    </main>
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent className="max-w-3xl max-h-[85dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Email preview</DialogTitle></DialogHeader>
        <div className="min-w-0 mb-4 border-b border-border pb-4">
          <p className="font-semibold break-words">{draft.subject}</p>
          <p className="text-sm text-muted-foreground mt-2 break-words">{draft.preview}</p>
        </div>
        {emailPreview}
      </DialogContent>
    </Dialog>
    <Dialog open={confirm} onOpenChange={setConfirm}><DialogContent><DialogHeader><DialogTitle>Send Christmas email?</DialogTitle></DialogHeader><p className="text-sm">Send to {recipients.length} unique client email addresses, individually, from {draft.from}. This cannot be undone.</p><p className="text-sm break-words">{draft.subject}</p><Label className="flex items-start gap-3 leading-6"><Checkbox checked={consent} onCheckedChange={v => setConsent(v === true)} /><span>I confirm these are existing clients with permission to receive promotional emails.</span></Label><DialogFooter><Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button><Button onClick={send} disabled={!consent || busy}><Mail className="w-4 h-4 mr-2" />Send to {recipients.length} clients</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
