import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, ArrowLeft, Users } from "lucide-react";
import logoNavy from "@/assets/logo-navy.jpg";
import ClientQuickView from "@/components/ClientQuickView";

interface ClientRow {
  id: string;
  client_number: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  order_count: number;
  last_activity: string | null;
  total_spend: number;
  tags: { id: string; label: string; color: string }[];
}

const AdminClients = () => {
  const { user, isStaff, loading, signOut } = useAuth();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [tags, setTags] = useState<{ id: string; label: string; color: string }[]>([]);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [fetching, setFetching] = useState(true);
  const [quickViewId, setQuickViewId] = useState<string | null>(null);

  const load = async () => {
    setFetching(true);
    const [{ data: profiles }, { data: orders }, { data: tagRows }, { data: assignments }] = await Promise.all([
      supabase.from("profiles").select("id, client_number, first_name, last_name, email, phone, created_at").order("created_at", { ascending: false }),
      supabase.from("orders").select("customer_profile_id, budget, deposit, created_at, updated_at"),
      supabase.from("client_tags").select("id, label, color").order("label"),
      supabase.from("client_tag_assignments").select("profile_id, tag_id"),
    ]);

    const tagMap = new Map((tagRows ?? []).map((t) => [t.id, t]));
    const tagsByProfile = new Map<string, { id: string; label: string; color: string }[]>();
    (assignments ?? []).forEach((a) => {
      const t = tagMap.get(a.tag_id);
      if (!t) return;
      const arr = tagsByProfile.get(a.profile_id) ?? [];
      arr.push(t);
      tagsByProfile.set(a.profile_id, arr);
    });

    const statsByProfile = new Map<string, { count: number; spend: number; last: string }>();
    (orders ?? []).forEach((o) => {
      if (!o.customer_profile_id) return;
      const s = statsByProfile.get(o.customer_profile_id) ?? { count: 0, spend: 0, last: "" };
      s.count += 1;
      s.spend += Number(o.budget ?? 0);
      const last = o.updated_at || o.created_at;
      if (!s.last || last > s.last) s.last = last;
      statsByProfile.set(o.customer_profile_id, s);
    });

    const rows: ClientRow[] = (profiles ?? []).map((p) => {
      const stats = statsByProfile.get(p.id);
      return {
        id: p.id,
        client_number: p.client_number,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        phone: p.phone,
        created_at: p.created_at,
        order_count: stats?.count ?? 0,
        last_activity: stats?.last ?? null,
        total_spend: stats?.spend ?? 0,
        tags: tagsByProfile.get(p.id) ?? [],
      };
    });

    setClients(rows);
    setTags(tagRows ?? []);
    setFetching(false);
  };

  useEffect(() => { if (isStaff) load(); }, [isStaff]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    return clients.filter((c) => {
      if (q) {
        const hay = `${c.first_name} ${c.last_name} ${c.email} ${c.phone ?? ""} ${c.client_number ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (tagFilter !== "all" && !c.tags.some((t) => t.id === tagFilter)) return false;
      if (activityFilter === "active") {
        if (!c.last_activity || now - new Date(c.last_activity).getTime() > 1000 * 60 * 60 * 24 * 90) return false;
      }
      if (activityFilter === "dormant") {
        if (c.last_activity && now - new Date(c.last_activity).getTime() < 1000 * 60 * 60 * 24 * 180) return false;
      }
      if (activityFilter === "no_orders" && c.order_count > 0) return false;
      return true;
    });
  }, [clients, search, tagFilter, activityFilter]);

  const exportCsv = () => {
    const header = ["Client #", "First Name", "Last Name", "Email", "Phone", "Orders", "Last Activity", "Tags"];
    const rows = filtered.map((c) => [
      c.client_number ?? "",
      c.first_name,
      c.last_name,
      c.email,
      c.phone ?? "",
      String(c.order_count),
      c.last_activity ? new Date(c.last_activity).toISOString().slice(0, 10) : "",
      c.tags.map((t) => t.label).join("; "),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isStaff) return <Navigate to="/" replace />;

  const withOrders = filtered.filter((c) => c.order_count > 0).length;

  return (
    <div className="min-h-screen bg-muted">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex-shrink-0"><img src={logoNavy} alt="HR Lawrence" className="h-10" /></Link>
          <div className="flex items-center gap-8">
            <Link to="/admin" className="text-sm font-body font-medium tracking-widest uppercase text-foreground hover:text-accent transition-colors">Orders</Link>
            <span className="text-sm font-body font-medium tracking-widest uppercase text-accent">Clients</span>
            <Link to="/admin/reports" className="text-sm font-body font-medium tracking-widest uppercase text-foreground hover:text-accent transition-colors">Reports</Link>
            <button onClick={signOut} className="text-sm font-body font-medium tracking-widest uppercase text-muted-foreground hover:text-foreground">Sign Out</button>
          </div>
        </div>
      </nav>

      <div className="p-6 lg:p-10 pt-28 lg:pt-28">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
            <div>
              <h1 className="text-2xl font-display text-foreground">Clients</h1>
              <p className="font-body text-sm text-muted-foreground">Manage your client relationships</p>
            </div>
          </div>
          <Button onClick={exportCsv} variant="outline" className="font-body text-sm">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Clients", value: clients.length },
            { label: "Filtered", value: filtered.length },
            { label: "With Orders", value: withOrders },
            { label: "No Orders Yet", value: filtered.length - withOrders },
          ].map((s) => (
            <div key={s.label} className="bg-background border border-border p-5">
              <p className="font-body text-xs uppercase tracking-widest text-muted-foreground mb-2">{s.label}</p>
              <p className="font-display text-2xl text-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-background border border-border p-4 mb-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone, CL-#…" className="pl-9 font-body" />
          </div>
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[180px] font-body"><SelectValue placeholder="All tags" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {tags.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={activityFilter} onValueChange={setActivityFilter}>
            <SelectTrigger className="w-[200px] font-body"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              <SelectItem value="active">Active (90 days)</SelectItem>
              <SelectItem value="dormant">Dormant (6+ months)</SelectItem>
              <SelectItem value="no_orders">No orders</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-background border border-border overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-muted border-b border-border">
              <tr className="text-left text-xs uppercase tracking-widest font-body text-muted-foreground">
                <th className="px-4 py-3">Client #</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Orders</th>
                
                <th className="px-4 py-3">Last Activity</th>
                <th className="px-4 py-3">Tags</th>
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center font-body text-sm text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center font-body text-sm text-muted-foreground"><Users className="w-8 h-8 mx-auto mb-2 opacity-50" />No clients match your filters</td></tr>
              ) : filtered.map((c) => (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-border hover:bg-muted/50 cursor-pointer font-body text-sm">
                  <td className="px-4 py-3"><button type="button" onClick={() => setQuickViewId(c.id)} className="text-primary hover:underline font-medium">{c.client_number ?? "—"}</button></td>
                  <td className="px-4 py-3"><button type="button" onClick={() => setQuickViewId(c.id)} className="text-foreground hover:text-primary text-left">{c.first_name} {c.last_name}</button></td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3">{c.order_count}</td>
                  
                  <td className="px-4 py-3 text-muted-foreground">{c.last_activity ? new Date(c.last_activity).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <Badge key={t.id} variant="outline" style={{ borderColor: t.color, color: t.color }} className="text-xs">{t.label}</Badge>
                      ))}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ClientQuickView
        clientId={quickViewId}
        open={!!quickViewId}
        onOpenChange={(v) => { if (!v) setQuickViewId(null); }}
        onSaved={load}
      />
    </div>
  );
};

export default AdminClients;
