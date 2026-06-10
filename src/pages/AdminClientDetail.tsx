import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Mail, Phone, Plus, X, MessageSquare, PhoneCall, StickyNote, UserCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import logoNavy from "@/assets/logo-navy.jpg";

interface Profile { id: string; client_number: string | null; first_name: string; last_name: string; email: string; phone: string | null; sms_consent: boolean; created_at: string; }
interface Tag { id: string; label: string; color: string; }
interface Order { id: string; order_number: string; order_type: string; status: string; item_description: string; budget: number | null; deposit: number | null; created_at: string; }
interface Appointment { id: string; appointment_type: string; start_time: string; status: string; }
interface Quote { id: string; amount: number; status: string; sent_at: string; description: string | null; order_id: string; }
interface Interaction { id: string; interaction_type: string; summary: string; occurred_at: string; }

const interactionIcons: Record<string, any> = {
  call: PhoneCall, walk_in: UserCheck, email: Mail, sms: MessageSquare, note: StickyNote, other: StickyNote,
};
const interactionLabels: Record<string, string> = {
  call: "Call", walk_in: "Walk-in", email: "Email", sms: "SMS", note: "Note", other: "Other",
};

const AdminClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isStaff, loading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [clientTags, setClientTags] = useState<Tag[]>([]);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [newInteraction, setNewInteraction] = useState({ type: "call", summary: "" });

  const load = async () => {
    if (!id) return;
    const [{ data: p }, { data: o }, { data: a }, { data: t }, { data: assigns }, { data: ints }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("orders").select("id, order_number, order_type, status, item_description, budget, deposit, created_at").eq("customer_profile_id", id).order("created_at", { ascending: false }),
      supabase.from("appointments").select("id, appointment_type, start_time, status").eq("customer_profile_id", id).order("start_time", { ascending: false }),
      supabase.from("client_tags").select("*").order("label"),
      supabase.from("client_tag_assignments").select("tag_id").eq("profile_id", id),
      supabase.from("client_interactions").select("*").eq("profile_id", id).order("occurred_at", { ascending: false }),
    ]);
    setProfile(p as Profile | null);
    setOrders((o as Order[]) ?? []);
    setAppointments((a as Appointment[]) ?? []);
    setAllTags((t as Tag[]) ?? []);
    setInteractions((ints as Interaction[]) ?? []);
    const tagIds = new Set((assigns ?? []).map((x: any) => x.tag_id));
    setClientTags(((t as Tag[]) ?? []).filter((tg) => tagIds.has(tg.id)));

    const orderIds = ((o as Order[]) ?? []).map((x) => x.id);
    if (orderIds.length) {
      const { data: q } = await supabase.from("quotes").select("*").in("order_id", orderIds).order("sent_at", { ascending: false });
      setQuotes((q as Quote[]) ?? []);
    } else setQuotes([]);
  };

  useEffect(() => { if (isStaff && id) load(); }, [isStaff, id]);

  const addTag = async (tagId: string) => {
    if (!id || clientTags.some((t) => t.id === tagId)) return;
    const { error } = await supabase.from("client_tag_assignments").insert({ profile_id: id, tag_id: tagId });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    load();
  };
  const removeTag = async (tagId: string) => {
    if (!id) return;
    await supabase.from("client_tag_assignments").delete().eq("profile_id", id).eq("tag_id", tagId);
    load();
  };
  const createAndAddTag = async () => {
    if (!newTagLabel.trim()) return;
    const { data, error } = await supabase.from("client_tags").insert({ label: newTagLabel.trim() }).select().single();
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setNewTagLabel("");
    await addTag(data.id);
  };
  const addInteraction = async () => {
    if (!id || !newInteraction.summary.trim()) return;
    const { error } = await supabase.from("client_interactions").insert({
      profile_id: id,
      interaction_type: newInteraction.type,
      summary: newInteraction.summary.trim(),
      created_by: user?.id,
    });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setNewInteraction({ type: "call", summary: "" });
    toast({ title: "Interaction logged" });
    load();
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isStaff) return <Navigate to="/" replace />;
  if (!profile) return <div className="p-10 font-body text-muted-foreground">Loading client…</div>;

  const totalSpend = orders.reduce((s, o) => s + Number(o.budget ?? 0), 0);
  const totalDeposits = orders.reduce((s, o) => s + Number(o.deposit ?? 0), 0);

  return (
    <div className="min-h-screen bg-muted">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex-shrink-0"><img src={logoNavy} alt="HR Lawrence" className="h-10" /></Link>
          <div className="flex items-center gap-8">
            <Link to="/admin" className="text-sm font-body font-medium tracking-widest uppercase text-foreground hover:text-accent transition-colors">Orders</Link>
            <Link to="/admin/clients" className="text-sm font-body font-medium tracking-widest uppercase text-accent">Clients</Link>
            <button onClick={signOut} className="text-sm font-body font-medium tracking-widest uppercase text-muted-foreground hover:text-foreground">Sign Out</button>
          </div>
        </div>
      </nav>

      <div className="pt-20 p-6 lg:p-10 max-w-6xl mx-auto">
        <Link to="/admin/clients" className="inline-flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </Link>

        <div className="bg-background border border-border p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="font-body text-xs uppercase tracking-widest text-accent mb-1">{profile.client_number ?? "—"}</p>
              <h1 className="text-3xl font-display text-foreground">{profile.first_name} {profile.last_name}</h1>
              <div className="flex flex-wrap gap-4 mt-3 font-body text-sm text-muted-foreground">
                <a href={`mailto:${profile.email}`} className="flex items-center gap-1.5 hover:text-foreground"><Mail className="w-4 h-4" />{profile.email}</a>
                {profile.phone && <a href={`tel:${profile.phone}`} className="flex items-center gap-1.5 hover:text-foreground"><Phone className="w-4 h-4" />{profile.phone}</a>}
                {profile.sms_consent && <Badge variant="outline" className="text-xs">SMS OK</Badge>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 text-right">
              <div><p className="font-body text-xs uppercase tracking-widest text-muted-foreground">Orders</p><p className="font-display text-xl">{orders.length}</p></div>
              <div><p className="font-body text-xs uppercase tracking-widest text-muted-foreground">Lifetime $</p><p className="font-display text-xl">${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
              <div><p className="font-body text-xs uppercase tracking-widest text-muted-foreground">Deposits</p><p className="font-display text-xl">${totalDeposits.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-border">
            <p className="font-body text-xs uppercase tracking-widest text-muted-foreground mb-2">Tags</p>
            <div className="flex flex-wrap gap-2 items-center">
              {clientTags.map((t) => (
                <Badge key={t.id} variant="outline" style={{ borderColor: t.color, color: t.color }} className="text-xs gap-1">
                  {t.label}
                  <button onClick={() => removeTag(t.id)} className="ml-1 hover:opacity-70"><X className="w-3 h-3" /></button>
                </Badge>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs font-body"><Plus className="w-3 h-3 mr-1" /> Add Tag</Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3">
                  <div className="space-y-2">
                    <p className="font-body text-xs uppercase tracking-widest text-muted-foreground">Existing Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {allTags.filter((t) => !clientTags.some((c) => c.id === t.id)).map((t) => (
                        <button key={t.id} onClick={() => addTag(t.id)} className="text-xs px-2 py-1 border rounded hover:bg-muted font-body" style={{ borderColor: t.color, color: t.color }}>{t.label}</button>
                      ))}
                      {allTags.filter((t) => !clientTags.some((c) => c.id === t.id)).length === 0 && <p className="text-xs text-muted-foreground font-body">No more tags</p>}
                    </div>
                    <div className="pt-2 border-t border-border flex gap-2">
                      <Input value={newTagLabel} onChange={(e) => setNewTagLabel(e.target.value)} placeholder="New tag…" className="h-8 text-xs font-body" />
                      <Button onClick={createAndAddTag} size="sm" className="h-8 text-xs">Add</Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <Tabs defaultValue="timeline">
          <TabsList className="bg-background border border-border">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
            <TabsTrigger value="appointments">Appointments ({appointments.length})</TabsTrigger>
            <TabsTrigger value="quotes">Quotes ({quotes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4">
            <div className="bg-background border border-border p-5 mb-4">
              <p className="font-body text-sm font-medium mb-3">Log Interaction</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={newInteraction.type} onValueChange={(v) => setNewInteraction({ ...newInteraction, type: v })}>
                  <SelectTrigger className="sm:w-[150px] font-body"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(interactionLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Textarea value={newInteraction.summary} onChange={(e) => setNewInteraction({ ...newInteraction, summary: e.target.value })} placeholder="What happened? e.g. Called about ring resize, will come in Friday." className="font-body text-sm min-h-[60px] flex-1" />
                <Button onClick={addInteraction} className="sm:self-start"><Plus className="w-4 h-4 mr-1" />Log</Button>
              </div>
            </div>
            <div className="space-y-2">
              {interactions.length === 0 ? (
                <p className="font-body text-sm text-muted-foreground text-center py-8 bg-background border border-border">No interactions logged yet</p>
              ) : interactions.map((i) => {
                const Icon = interactionIcons[i.interaction_type] ?? StickyNote;
                return (
                  <div key={i.id} className="bg-background border border-border p-4 flex gap-3">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent"><Icon className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="font-body text-sm font-medium">{interactionLabels[i.interaction_type] ?? i.interaction_type}</span>
                        <span className="font-body text-xs text-muted-foreground">{new Date(i.occurred_at).toLocaleString()}</span>
                      </div>
                      <p className="font-body text-sm text-foreground whitespace-pre-wrap">{i.summary}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="mt-4 bg-background border border-border overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-muted border-b border-border">
                <tr className="text-left text-xs uppercase tracking-widest font-body text-muted-foreground">
                  <th className="px-4 py-3">Order #</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Item</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Budget</th><th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center font-body text-sm text-muted-foreground">No orders</td></tr> :
                  orders.map((o) => (
                    <tr key={o.id} className="border-b border-border font-body text-sm">
                      <td className="px-4 py-3 font-medium text-primary">{o.order_number}</td>
                      <td className="px-4 py-3">{o.order_type}</td>
                      <td className="px-4 py-3 max-w-xs truncate">{o.item_description}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{o.status}</Badge></td>
                      <td className="px-4 py-3">{o.budget ? `$${Number(o.budget).toLocaleString()}` : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </TabsContent>

          <TabsContent value="appointments" className="mt-4 bg-background border border-border overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead className="bg-muted border-b border-border">
                <tr className="text-left text-xs uppercase tracking-widest font-body text-muted-foreground">
                  <th className="px-4 py-3">Type</th><th className="px-4 py-3">When</th><th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? <tr><td colSpan={3} className="px-4 py-8 text-center font-body text-sm text-muted-foreground">No appointments</td></tr> :
                  appointments.map((a) => (
                    <tr key={a.id} className="border-b border-border font-body text-sm">
                      <td className="px-4 py-3">{a.appointment_type}</td>
                      <td className="px-4 py-3">{new Date(a.start_time).toLocaleString()}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{a.status}</Badge></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </TabsContent>

          <TabsContent value="quotes" className="mt-4 bg-background border border-border overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-muted border-b border-border">
                <tr className="text-left text-xs uppercase tracking-widest font-body text-muted-foreground">
                  <th className="px-4 py-3">Sent</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {quotes.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center font-body text-sm text-muted-foreground">No quotes</td></tr> :
                  quotes.map((q) => (
                    <tr key={q.id} className="border-b border-border font-body text-sm">
                      <td className="px-4 py-3 text-muted-foreground">{new Date(q.sent_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium">${Number(q.amount).toLocaleString()}</td>
                      <td className="px-4 py-3 max-w-xs truncate">{q.description ?? "—"}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{q.status}</Badge></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminClientDetail;
