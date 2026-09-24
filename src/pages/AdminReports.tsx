import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Printer, ArrowLeft, Users, Package } from "lucide-react";
import { statusLabels, normalizeStatus } from "@/lib/order-status";
import logoNavy from "@/assets/logo-navy.jpg";

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
  total_deposit: number;
  tags: { id: string; label: string; color: string }[];
}

interface OrderRow {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  item_description: string;
  first_name: string | null;
  last_name: string | null;
  customer_email: string;
  phone1: string | null;
  order_date: string | null;
  created_at: string;
  delivery_date: string | null;
  deposit: number | null;
  budget: number | null;
  client_number: string | null;
}

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// HRL-2026-0018 → 2026 * 1e6 + 18 so sequences sort numerically
const orderNumKey = (n: string) => {
  const m = n.match(/(\d{4})\D+(\d+)/);
  return m ? Number(m[1]) * 1e6 + Number(m[2]) : 0;
};

const typeLabels: Record<string, string> = {
  repair: "Repair",
  custom: "Custom Piece",
  showroom: "Showroom Purchase",
  gold_purchase: "Gold Purchase",
  inquiry: "Inquiry",
};

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "—");

const AdminReports = () => {
  const { user, isStaff, loading, signOut } = useAuth();
  const [reportType, setReportType] = useState<"clients" | "orders">("clients");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [tags, setTags] = useState<{ id: string; label: string; color: string }[]>([]);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [fetching, setFetching] = useState(true);

  // Orders report controls
  const [orderSearch, setOrderSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateField, setDateField] = useState<"order_date" | "delivery_date">("order_date");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [orderSort, setOrderSort] = useState("date_desc");

  const load = async () => {
    setFetching(true);
    const [{ data: profiles }, { data: orderRows }, { data: tagRows }, { data: assignments }] = await Promise.all([
      supabase.from("profiles").select("id, client_number, first_name, last_name, email, phone, created_at"),
      supabase
        .from("orders")
        .select(
          "id, order_number, order_type, status, item_description, first_name, last_name, customer_email, phone1, order_date, created_at, updated_at, delivery_date, deposit, budget, customer_profile_id, profiles:customer_profile_id(client_number)"
        ),
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

    const stats = new Map<string, { count: number; spend: number; deposit: number; last: string }>();
    (orderRows ?? []).forEach((o: any) => {
      if (!o.customer_profile_id) return;
      const s = stats.get(o.customer_profile_id) ?? { count: 0, spend: 0, deposit: 0, last: "" };
      s.count += 1;
      s.spend += Number(o.budget ?? 0);
      s.deposit += Number(o.deposit ?? 0);
      const last = o.updated_at || o.created_at;
      if (!s.last || last > s.last) s.last = last;
      stats.set(o.customer_profile_id, s);
    });

    setClients(
      (profiles ?? []).map((p) => {
        const s = stats.get(p.id);
        return {
          id: p.id,
          client_number: p.client_number,
          first_name: p.first_name,
          last_name: p.last_name,
          email: p.email,
          phone: p.phone,
          created_at: p.created_at,
          order_count: s?.count ?? 0,
          last_activity: s?.last ?? null,
          total_spend: s?.spend ?? 0,
          total_deposit: s?.deposit ?? 0,
          tags: tagsByProfile.get(p.id) ?? [],
        };
      })
    );

    setOrders(
      (orderRows ?? []).map((o: any) => ({
        id: o.id,
        order_number: o.order_number,
        order_type: o.order_type,
        status: normalizeStatus(o.status),
        item_description: o.item_description,
        first_name: o.first_name,
        last_name: o.last_name,
        customer_email: o.customer_email,
        phone1: o.phone1,
        order_date: o.order_date,
        created_at: o.created_at,
        delivery_date: o.delivery_date,
        deposit: o.deposit,
        budget: o.budget,
        client_number: o.profiles?.client_number ?? null,
      }))
    );

    setTags(tagRows ?? []);
    setFetching(false);
  };

  useEffect(() => { if (isStaff) load(); }, [isStaff]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    const rows = clients.filter((c) => {
      if (q) {
        const hay = `${c.first_name} ${c.last_name} ${c.email} ${c.phone ?? ""} ${c.client_number ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (tagFilter !== "all" && !c.tags.some((t) => t.id === tagFilter)) return false;
      if (activityFilter === "active" && (!c.last_activity || now - new Date(c.last_activity).getTime() > 90 * 864e5)) return false;
      if (activityFilter === "dormant" && c.last_activity && now - new Date(c.last_activity).getTime() < 180 * 864e5) return false;
      if (activityFilter === "no_orders" && c.order_count > 0) return false;
      if (activityFilter === "with_orders" && c.order_count === 0) return false;
      return true;
    });

    return rows.sort((a, b) => {
      switch (sortBy) {
        case "spend": return b.total_spend - a.total_spend;
        case "orders": return b.order_count - a.order_count;
        case "recent": return (b.last_activity ?? "").localeCompare(a.last_activity ?? "");
        case "newest": return b.created_at.localeCompare(a.created_at);
        case "client_number": return (a.client_number ?? "").localeCompare(b.client_number ?? "");
        default: return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
      }
    });
  }, [clients, search, tagFilter, activityFilter, sortBy]);

  const orderDateOf = (o: OrderRow) =>
    (dateField === "delivery_date" ? o.delivery_date : o.order_date || o.created_at) ?? "";

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    const rows = orders.filter((o) => {
      if (q) {
        const hay = `${o.order_number} ${o.first_name ?? ""} ${o.last_name ?? ""} ${o.customer_email} ${o.item_description} ${o.client_number ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (typeFilter !== "all" && o.order_type !== typeFilter) return false;
      const d = (orderDateOf(o) || "").slice(0, 10);
      if (fromDate && (!d || d < fromDate)) return false;
      if (toDate && (!d || d > toDate)) return false;
      return true;
    });

    return rows.sort((a, b) => {
      switch (orderSort) {
        case "number_asc": return orderNumKey(a.order_number) - orderNumKey(b.order_number);
        case "number_desc": return orderNumKey(b.order_number) - orderNumKey(a.order_number);
        case "date_asc": return (orderDateOf(a) || "").localeCompare(orderDateOf(b) || "");
        default: return (orderDateOf(b) || "").localeCompare(orderDateOf(a) || "");
      }
    });
  }, [orders, orderSearch, statusFilter, typeFilter, fromDate, toDate, orderSort, dateField]);

  const withOrders = filtered.filter((c) => c.order_count > 0).length;

  const activityLabel: Record<string, string> = {
    all: "All clients",
    active: "Active (last 90 days)",
    dormant: "Dormant (6+ months)",
    no_orders: "No orders",
    with_orders: "With orders",
  };

  const printStyles = `
    @page { size: portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 0; }
    h1 { font-size: 20px; margin: 0 0 4px; letter-spacing: .04em; }
    .meta { font-size: 10px; color: #555; margin-bottom: 12px; }
    .summary { display: flex; gap: 18px; font-size: 10px; border-top: 1px solid #999; border-bottom: 1px solid #999; padding: 6px 0; margin-bottom: 12px; }
    .summary b { display: block; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
    th { text-align: left; text-transform: uppercase; letter-spacing: .06em; font-size: 8px; border-bottom: 1px solid #333; padding: 4px 3px; }
    td { padding: 4px 3px; border-bottom: 1px solid #e2e2e2; vertical-align: top; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
    .num { text-align: right; }
  `;

  const openPrint = (html: string) => {
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const printReport = () => {
    const tagLabel = tagFilter === "all" ? "All tags" : tags.find((t) => t.id === tagFilter)?.label ?? "";
    const html = `<html><head><title>Client List Report</title><style>${printStyles}</style></head><body>
      <h1>Client List Report</h1>
      <div class="meta">HR Lawrence Fine Jewelry &middot; Generated ${new Date().toLocaleString()}<br/>
      Filter: ${esc(activityLabel[activityFilter])} &middot; Tag: ${esc(tagLabel)}${search.trim() ? ` &middot; Search: "${esc(search.trim())}"` : ""}</div>
      <div class="summary">
        <div>Clients<b>${filtered.length}</b></div>
        <div>With Orders<b>${withOrders}</b></div>
      </div>
      <table><thead><tr>
        <th>Client #</th><th>Name</th><th>Email</th><th>Phone</th>
        <th class="num">Orders</th><th>Last Activity</th><th>Tags</th>
      </tr></thead><tbody>
      ${filtered.map((c) => `<tr>
        <td>${esc(c.client_number ?? "—")}</td>
        <td>${esc(`${c.first_name} ${c.last_name}`)}</td>
        <td>${esc(c.email)}</td>
        <td>${esc(c.phone ?? "—")}</td>
        <td class="num">${c.order_count}</td>
        <td>${c.last_activity ? new Date(c.last_activity).toLocaleDateString() : "—"}</td>
        <td>${esc(c.tags.map((t) => t.label).join(", "))}</td>
      </tr>`).join("")}
      </tbody></table>
    </body></html>`;
    openPrint(html);
  };

  const printOrdersReport = () => {
    const sortLabel: Record<string, string> = {
      number_asc: "Order # (ascending)",
      number_desc: "Order # (descending)",
      date_asc: "Date (oldest first)",
      date_desc: "Date (newest first)",
    };
    const dateLabel = dateField === "delivery_date" ? "Delivery date" : "Order date";
    const range = fromDate || toDate ? `${fromDate || "start"} → ${toDate || "today"}` : "All dates";
    const html = `<html><head><title>Order Report</title><style>${printStyles}</style></head><body>
      <h1>Order Report</h1>
      <div class="meta">HR Lawrence Fine Jewelry &middot; Generated ${new Date().toLocaleString()}<br/>
      ${esc(dateLabel)}: ${esc(range)} &middot; Status: ${esc(statusFilter === "all" ? "All statuses" : statusLabels[statusFilter] ?? statusFilter)} &middot; Type: ${esc(typeFilter === "all" ? "All types" : typeLabels[typeFilter] ?? typeFilter)}<br/>
      Sorted by: ${esc(sortLabel[orderSort])}${orderSearch.trim() ? ` &middot; Search: "${esc(orderSearch.trim())}"` : ""}</div>
      <div class="summary">
        <div>Orders<b>${filteredOrders.length}</b></div>
      </div>
      <table><thead><tr>
        <th>Order #</th><th>Client #</th><th>Client</th><th>Item</th><th>Type</th><th>Status</th><th>Order Date</th><th>Delivery</th><th class="num">Deposit</th>
      </tr></thead><tbody>
      ${filteredOrders.map((o) => `<tr>
        <td>${esc(o.order_number)}</td>
        <td>${esc(o.client_number ?? "—")}</td>
        <td>${esc(`${o.first_name ?? ""} ${o.last_name ?? ""}`.trim() || o.customer_email)}</td>
        <td>${esc(o.item_description)}</td>
        <td>${esc(typeLabels[o.order_type] ?? o.order_type)}</td>
        <td>${esc(statusLabels[o.status] ?? o.status)}</td>
        <td>${esc(fmtDate(o.order_date || o.created_at))}</td>
        <td>${esc(fmtDate(o.delivery_date))}</td>
        <td class="num">${o.deposit ? `$${Number(o.deposit).toLocaleString()}` : "—"}</td>
      </tr>`).join("")}
      </tbody></table>
    </body></html>`;
    openPrint(html);
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isStaff) return <Navigate to="/" replace />;

  const isOrders = reportType === "orders";

  return (
    <div className="min-h-screen bg-muted">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex-shrink-0"><img src={logoNavy} alt="HR Lawrence" className="h-10" /></Link>
          <div className="flex items-center gap-8">
            <Link to="/admin" className="text-sm font-body font-medium tracking-widest uppercase text-foreground hover:text-accent transition-colors">Orders</Link>
            <Link to="/admin/clients" className="text-sm font-body font-medium tracking-widest uppercase text-foreground hover:text-accent transition-colors">Clients</Link>
            <span className="text-sm font-body font-medium tracking-widest uppercase text-accent">Reports</span>
            <button onClick={signOut} className="text-sm font-body font-medium tracking-widest uppercase text-muted-foreground hover:text-foreground">Sign Out</button>
          </div>
        </div>
      </nav>

      <div className="p-6 lg:p-10 pt-28 lg:pt-28">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
            <div>
              <h1 className="text-2xl font-display text-foreground">Reports &amp; Lists</h1>
              <p className="font-body text-sm text-muted-foreground">
                {isOrders ? "Order report — filter by date or order number and print" : "Client list report — filter, review, and print"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex border border-border bg-background">
              <button
                onClick={() => setReportType("clients")}
                className={`px-4 py-2 font-body text-xs uppercase tracking-widest ${!isOrders ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Users className="w-3.5 h-3.5 inline mr-2" />Clients
              </button>
              <button
                onClick={() => setReportType("orders")}
                className={`px-4 py-2 font-body text-xs uppercase tracking-widest ${isOrders ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Package className="w-3.5 h-3.5 inline mr-2" />Orders
              </button>
            </div>
            <Button onClick={isOrders ? printOrdersReport : printReport} variant="outline" className="font-body text-sm">
              <Printer className="w-4 h-4 mr-2" /> Print Report
            </Button>
          </div>
        </div>

        {isOrders ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Orders In Report", value: filteredOrders.length },
                { label: "Repairs", value: filteredOrders.filter((o) => o.order_type === "repair").length },
                { label: "Custom Pieces", value: filteredOrders.filter((o) => o.order_type === "custom").length },
              ].map((s) => (
                <div key={s.label} className="bg-background border border-border p-5">
                  <p className="font-body text-xs uppercase tracking-widest text-muted-foreground mb-2">{s.label}</p>
                  <p className="font-display text-2xl text-foreground">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-background border border-border p-4 mb-4 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Search order #, client, item…" className="pl-9 font-body" />
              </div>
              <Select value={dateField} onValueChange={(v) => setDateField(v as typeof dateField)}>
                <SelectTrigger className="w-[170px] font-body"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="order_date">Date: Order date</SelectItem>
                  <SelectItem value="delivery_date">Date: Delivery date</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-[150px] font-body" />
                <span className="font-body text-sm text-muted-foreground">to</span>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-[150px] font-body" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] font-body"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px] font-body"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={orderSort} onValueChange={setOrderSort}>
                <SelectTrigger className="w-[210px] font-body"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Sort: Date (newest first)</SelectItem>
                  <SelectItem value="date_asc">Sort: Date (oldest first)</SelectItem>
                  <SelectItem value="number_asc">Sort: Order # (ascending)</SelectItem>
                  <SelectItem value="number_desc">Sort: Order # (descending)</SelectItem>
                </SelectContent>
              </Select>
              {(fromDate || toDate || statusFilter !== "all" || typeFilter !== "all" || orderSearch) && (
                <Button
                  variant="ghost"
                  className="font-body text-sm"
                  onClick={() => { setFromDate(""); setToDate(""); setStatusFilter("all"); setTypeFilter("all"); setOrderSearch(""); }}
                >
                  Clear filters
                </Button>
              )}
            </div>

            <div className="bg-background border border-border overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-muted border-b border-border">
                  <tr className="text-left text-xs uppercase tracking-widest font-body text-muted-foreground">
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Client #</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Order Date</th>
                    <th className="px-4 py-3">Delivery</th>
                    <th className="px-4 py-3 text-right">Deposit</th>
                  </tr>
                </thead>
                <tbody>
                  {fetching ? (
                    <tr><td colSpan={9} className="px-4 py-10 text-center font-body text-sm text-muted-foreground">Loading…</td></tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-10 text-center font-body text-sm text-muted-foreground"><Package className="w-8 h-8 mx-auto mb-2 opacity-50" />No orders match your filters</td></tr>
                  ) : filteredOrders.map((o) => (
                    <tr key={o.id} className="border-b border-border hover:bg-muted/50 font-body text-sm">
                      <td className="px-4 py-3"><Link to={`/admin?open=${o.id}`} className="text-primary hover:underline font-medium">{o.order_number}</Link></td>
                      <td className="px-4 py-3 text-muted-foreground">{o.client_number ?? "—"}</td>
                      <td className="px-4 py-3">{`${o.first_name ?? ""} ${o.last_name ?? ""}`.trim() || o.customer_email}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[260px] truncate" title={o.item_description}>{o.item_description}</td>
                      <td className="px-4 py-3 text-muted-foreground">{typeLabels[o.order_type] ?? o.order_type}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{statusLabels[o.status] ?? o.status}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(o.order_date || o.created_at)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(o.delivery_date)}</td>
                      <td className="px-4 py-3 text-right">{o.deposit ? `$${Number(o.deposit).toLocaleString()}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Clients In Report", value: filtered.length },
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
                  <SelectItem value="with_orders">With orders</SelectItem>
                  <SelectItem value="active">Active (90 days)</SelectItem>
                  <SelectItem value="dormant">Dormant (6+ months)</SelectItem>
                  <SelectItem value="no_orders">No orders</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[200px] font-body"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort: Name (A–Z)</SelectItem>
                  <SelectItem value="client_number">Sort: Client #</SelectItem>
                  <SelectItem value="orders">Sort: Order count</SelectItem>
                  <SelectItem value="recent">Sort: Last activity</SelectItem>
                  <SelectItem value="newest">Sort: Newest client</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-background border border-border overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="bg-muted border-b border-border">
                  <tr className="text-left text-xs uppercase tracking-widest font-body text-muted-foreground">
                    <th className="px-4 py-3">Client #</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3 text-right">Orders</th>
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
                    <tr key={c.id} className="border-b border-border hover:bg-muted/50 font-body text-sm">
                      <td className="px-4 py-3"><Link to={`/admin/clients/${c.id}`} className="text-primary hover:underline font-medium">{c.client_number ?? "—"}</Link></td>
                      <td className="px-4 py-3"><Link to={`/admin/clients/${c.id}`} className="text-foreground hover:text-primary">{c.first_name} {c.last_name}</Link></td>
                      <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-right">{c.order_count}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.last_activity ? new Date(c.last_activity).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {c.tags.map((t) => (
                            <Badge key={t.id} variant="outline" style={{ borderColor: t.color, color: t.color }} className="text-xs">{t.label}</Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminReports;
