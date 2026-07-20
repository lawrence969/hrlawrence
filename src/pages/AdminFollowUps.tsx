import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LogOut, Phone, MessageSquare, Mail, Voicemail, StickyNote, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import logoNavy from "@/assets/logo-navy.jpg";
import {
  statusLabels, statusColor, priorityLabels, priorityColor,
  FOLLOW_UP_REASONS, followUpReasonLabels, CONTACT_METHODS, contactMethodLabels,
  INTERACTION_TYPES, interactionTypeLabels, COMPLETE_STATUSES, formatPhone,
} from "@/lib/order-status";

type FollowUpOrder = {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  item_description: string | null;
  first_name: string | null;
  last_name: string | null;
  customer_email: string | null;
  phone1: string | null;
  
  next_follow_up_date: string | null;
  last_contacted_at: string | null;
  preferred_contact_method: string | null;
  follow_up_reason: string | null;
  internal_priority: string | null;
  blocked_reason: string | null;
  private_follow_up_notes: string | null;
  customer_profile_id: string | null;
};

const TABS = [
  { key: "due_today", label: "Due Today" },
  { key: "overdue", label: "Overdue" },
  { key: "waiting", label: "Waiting Client" },
  { key: "ready", label: "Ready for Pickup" },
  { key: "on_hold", label: "On Hold" },
  { key: "high_priority", label: "High Priority" },
  { key: "stale", label: "Production Needs Update" },
];

const AdminFollowUps = () => {
  const { user, isStaff, loading, signOut } = useAuth();
  const [orders, setOrders] = useState<FollowUpOrder[]>([]);
  const [search, setSearch] = useState("");
  const [params, setParams] = useSearchParams();
  const activeTab = params.get("tab") || "due_today";

  const load = async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, order_type, status, item_description, first_name, last_name, customer_email, phone1, next_follow_up_date, last_contacted_at, preferred_contact_method, follow_up_reason, internal_priority, blocked_reason, private_follow_up_notes, customer_profile_id")
      .order("next_follow_up_date", { ascending: true, nullsFirst: false });
    setOrders((data as any) || []);
  };

  useEffect(() => { if (isStaff) load(); }, [isStaff]);

  const filtered = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 864e5);
    const active = orders.filter((o) => !COMPLETE_STATUSES.has(o.status));
    let list: FollowUpOrder[] = [];
    switch (activeTab) {
      case "due_today":
        list = active.filter((o) => o.next_follow_up_date && new Date(o.next_follow_up_date).setHours(0,0,0,0) === today.getTime());
        break;
      case "overdue":
        list = active.filter((o) => o.next_follow_up_date && new Date(o.next_follow_up_date) < today);
        break;
      case "waiting":
        list = active.filter((o) => o.status === "waiting_for_client");
        break;
      case "ready":
        list = active.filter((o) => o.status === "ready_for_pickup");
        break;
      case "on_hold":
        list = active.filter((o) => o.status === "on_hold");
        break;
      case "high_priority":
        list = active.filter((o) => o.internal_priority === "high" || o.internal_priority === "urgent");
        break;
      case "stale":
        list = active.filter((o) => ["in_design","in_production","work_complete"].includes(o.status) && (!o.last_contacted_at || new Date(o.last_contacted_at) < sevenDaysAgo));
        break;
      default:
        list = active;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        o.order_number.toLowerCase().includes(q) ||
        (o.first_name || "").toLowerCase().includes(q) ||
        (o.last_name || "").toLowerCase().includes(q) ||
        (o.customer_email || "").toLowerCase().includes(q) ||
        (o.item_description || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, activeTab, search]);

  const counts = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 864e5);
    const active = orders.filter((o) => !COMPLETE_STATUSES.has(o.status));
    return {
      due_today: active.filter((o) => o.next_follow_up_date && new Date(o.next_follow_up_date).setHours(0,0,0,0) === today.getTime()).length,
      overdue: active.filter((o) => o.next_follow_up_date && new Date(o.next_follow_up_date) < today).length,
      waiting: active.filter((o) => o.status === "waiting_for_client").length,
      ready: active.filter((o) => o.status === "ready_for_pickup").length,
      on_hold: active.filter((o) => o.status === "on_hold").length,
      high_priority: active.filter((o) => o.internal_priority === "high" || o.internal_priority === "urgent").length,
      stale: active.filter((o) => ["in_design","in_production","work_complete"].includes(o.status) && (!o.last_contacted_at || new Date(o.last_contacted_at) < sevenDaysAgo)).length,
    } as Record<string, number>;
  }, [orders]);

  const logInteraction = async (order: FollowUpOrder, type: string, summary: string, nextDate?: string | null, resolved?: boolean) => {
    if (!order.customer_profile_id) {
      toast({ title: "Client not linked", description: "This order is not linked to a client profile.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("client_interactions").insert({
      profile_id: order.customer_profile_id,
      interaction_type: type,
      summary,
      order_id: order.id,
      resolved_follow_up: !!resolved,
      created_by: user?.id,
    } as any);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    const updates: any = { last_contacted_at: new Date().toISOString() };
    if (nextDate !== undefined) updates.next_follow_up_date = nextDate;
    if (resolved) updates.next_follow_up_date = null;
    await supabase.from("orders").update(updates).eq("id", order.id);

    // Mirror to order timeline (order_notes) so the follow-up log is preserved
    const today = new Date().toISOString().split("T")[0];
    const typeLabel = interactionTypeLabels[type] || type;
    const interactionNote = `${typeLabel}${summary ? `: ${summary}` : ""}`;
    await supabase.from("order_notes").insert({
      order_id: order.id,
      note: interactionNote,
      note_date: today,
      created_by: user?.id,
    });
    if (nextDate) {
      await supabase.from("order_notes").insert({
        order_id: order.id,
        note: "Follow-up scheduled",
        note_date: nextDate,
        created_by: user?.id,
      });
    }
    if (resolved) {
      await supabase.from("order_notes").insert({
        order_id: order.id,
        note: "Follow-up resolved",
        note_date: today,
        created_by: user?.id,
      });
    }

    toast({ title: "Logged", description: `${interactionTypeLabels[type] || type} recorded` });
    load();
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isStaff) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-muted">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex-shrink-0"><img src={logoNavy} alt="HR Lawrence" className="h-10" /></Link>
          <div className="flex items-center gap-8">
            <Link to="/admin" className="text-sm font-body font-medium tracking-widest uppercase text-foreground hover:text-accent">Orders</Link>
            <span className="text-sm font-body font-medium tracking-widest uppercase text-accent">Follow-Ups</span>
            <Link to="/admin/clients" className="text-sm font-body font-medium tracking-widest uppercase text-foreground hover:text-accent">Clients</Link>
            <button onClick={signOut} className="flex items-center gap-2 text-sm font-body font-medium tracking-widest uppercase text-muted-foreground hover:text-foreground"><LogOut className="w-4 h-4" /> Sign Out</button>
          </div>
        </div>
      </nav>

      <div className="pt-20 p-6 lg:p-10 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display text-foreground">Follow-Ups</h1>
            <p className="font-body text-sm text-muted-foreground">Daily action queue</p>
          </div>
          <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setParams({ tab: t.key })}
              className={`px-3 py-2 border font-body text-xs uppercase tracking-widest transition-colors ${activeTab === t.key ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary"}`}>
              {t.label} <span className="ml-1 opacity-70">({counts[t.key] ?? 0})</span>
            </button>
          ))}
        </div>

        <Input placeholder="Search by name, order #, email, or item…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 max-w-md font-body" />

        <div className="bg-background border border-border overflow-auto max-h-[calc(100vh-260px)]">
          <table className="min-w-full w-auto">
            <thead className="bg-muted border-b border-border sticky top-0 z-10">
              <tr className="text-left text-xs uppercase tracking-widest font-body text-muted-foreground">
                <th className="px-3 py-3">Order</th>
                <th className="px-3 py-3">Client</th>
                <th className="px-3 py-3">Contact</th>
                <th className="px-3 py-3">Item</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Reason</th>
                <th className="px-3 py-3">Next</th>
                <th className="px-3 py-3">Last</th>
                <th className="px-3 py-3">Priority</th>
                <th className="px-3 py-3 sticky right-0 bg-muted shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center font-body text-sm text-muted-foreground">Nothing here — you're caught up.</td></tr>
              ) : filtered.map((o) => (
                <FollowUpRow key={o.id} order={o} onLog={logInteraction} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const FollowUpRow = ({ order, onLog }: { order: FollowUpOrder; onLog: (o: FollowUpOrder, type: string, summary: string, nextDate?: string | null, resolved?: boolean) => void }) => {
  const [note, setNote] = useState("");
  const [nextDate, setNextDate] = useState(order.next_follow_up_date || "");
  const [type, setType] = useState<string>("call");

  const quick = (t: string, label: string) => {
    onLog(order, t, `${label} — quick action`, undefined);
  };

  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString() : "—";

  return (
    <tr className="border-b border-border font-body text-sm align-top">
      <td className="px-3 py-3 font-medium text-primary whitespace-nowrap"><Link to={`/admin?open=${order.id}`} className="hover:underline">{order.order_number}</Link></td>
      <td className="px-3 py-3 whitespace-nowrap">{order.first_name} {order.last_name}</td>
      <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">
        {order.phone1 && <div>{formatPhone(order.phone1)}</div>}
        {order.customer_email && <div className="truncate max-w-[180px]">{order.customer_email}</div>}
        <div className="mt-1"><Badge variant="outline" className="text-[10px]">{contactMethodLabels[order.preferred_contact_method || "any"]}</Badge></div>
      </td>
      <td className="px-3 py-3 max-w-[200px] truncate">{order.item_description || "—"}</td>
      <td className="px-3 py-3"><Badge className={statusColor(order.status)}>{statusLabels[order.status] || order.status}</Badge></td>
      <td className="px-3 py-3 text-xs">{followUpReasonLabels[order.follow_up_reason || ""] || "—"}</td>
      <td className="px-3 py-3 whitespace-nowrap">{fmtDate(order.next_follow_up_date)}</td>
      <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{fmtDate(order.last_contacted_at)}</td>
      <td className="px-3 py-3"><Badge variant="outline" className={priorityColor(order.internal_priority || "normal")}>{priorityLabels[order.internal_priority || "normal"]}</Badge></td>
      <td className="px-3 py-3 sticky right-0 bg-background shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)]">
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" onClick={() => quick("call", "Called")} title="Called"><Phone className="w-3 h-3" /></Button>
          <Button size="sm" variant="outline" onClick={() => quick("text", "Texted")} title="Texted"><MessageSquare className="w-3 h-3" /></Button>
          <Button size="sm" variant="outline" onClick={() => quick("email", "Emailed")} title="Emailed"><Mail className="w-3 h-3" /></Button>
          <Button size="sm" variant="outline" onClick={() => quick("voicemail", "Left voicemail")} title="Voicemail"><Voicemail className="w-3 h-3" /></Button>
          <Popover>
            <PopoverTrigger asChild><Button size="sm" variant="outline" title="Log with note"><StickyNote className="w-3 h-3" /></Button></PopoverTrigger>
            <PopoverContent className="w-80 p-3">
              <div className="space-y-2">
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-8 text-xs font-body"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INTERACTION_TYPES.map((t) => <SelectItem key={t} value={t}>{interactionTypeLabels[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened?" className="min-h-[70px] text-xs font-body" />
                <div className="flex gap-2 items-center">
                  <label className="text-xs font-body text-muted-foreground">Next:</label>
                  <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => { if (!note.trim()) return; onLog(order, type, note.trim(), nextDate || null, false); setNote(""); }}>Log</Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { if (!note.trim()) return; onLog(order, type, note.trim(), null, true); setNote(""); }}>Log &amp; Resolve</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </td>
    </tr>
  );
};

export default AdminFollowUps;
