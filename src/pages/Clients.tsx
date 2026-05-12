import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, LogOut, ChevronRight, X } from "lucide-react";
import { motion } from "framer-motion";
import logoNavy from "@/assets/logo-navy.jpg";
import { format } from "date-fns";

interface ClientRow {
  id: string;
  client_number: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

interface OrderRow {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  created_at: string;
  customer_profile_id: string | null;
  item_description: string;
}

const Clients = () => {
  const { user, isStaff, loading, signOut } = useAuth();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ClientRow | null>(null);

  useEffect(() => {
    if (!user || !isStaff) return;
    (async () => {
      const [{ data: c }, { data: o }] = await Promise.all([
        supabase.from("profiles").select("id, client_number, first_name, last_name, email, phone, created_at").order("client_number", { ascending: true }),
        supabase.from("orders").select("id, order_number, order_type, status, created_at, customer_profile_id, item_description").order("created_at", { ascending: false }),
      ]);
      setClients((c as ClientRow[]) || []);
      setOrders((o as OrderRow[]) || []);
    })();
  }, [user, isStaff]);

  const ordersByClient = useMemo(() => {
    const map = new Map<string, OrderRow[]>();
    for (const o of orders) {
      if (!o.customer_profile_id) continue;
      const arr = map.get(o.customer_profile_id) || [];
      arr.push(o);
      map.set(o.customer_profile_id, arr);
    }
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = clients.slice().sort((a, b) => {
      const na = parseInt((a.client_number || "").replace(/\D/g, ""), 10) || 0;
      const nb = parseInt((b.client_number || "").replace(/\D/g, ""), 10) || 0;
      return na - nb;
    });
    if (!q) return list;
    return list.filter((c) =>
      [c.client_number, c.first_name, c.last_name, c.email, c.phone].some((v) =>
        (v || "").toString().toLowerCase().includes(q)
      )
    );
  }, [clients, search]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user || !isStaff) return <Navigate to="/" replace />;

  const selectedOrders = selected ? (ordersByClient.get(selected.id) || []) : [];

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex-shrink-0">
            <img src={logoNavy} alt="HR Lawrence" className="h-10" />
          </Link>
          <div className="flex items-center gap-8">
            <Link to="/admin" className="text-sm font-body font-medium tracking-widest uppercase text-foreground hover:text-accent transition-colors">Orders</Link>
            <Link to="/admin/clients" className="text-sm font-body font-medium tracking-widest uppercase text-accent">Clients</Link>
            <Link to="/gold-calculator" className="text-sm font-body font-medium tracking-widest uppercase text-foreground hover:text-accent transition-colors">Gold Calculator</Link>
            <button onClick={signOut} className="flex items-center gap-2 text-sm font-body font-medium tracking-widest uppercase text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-20 px-4 sm:px-6 pb-10 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl text-foreground">Clients</h1>
            <p className="font-body text-sm text-muted-foreground mt-1">{filtered.length} of {clients.length} clients</p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by # / name / email / phone"
              className="pl-9 font-body"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-body text-xs text-muted-foreground uppercase tracking-wider">Client #</th>
                  <th className="px-4 py-3 text-left font-body text-xs text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left font-body text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Email</th>
                  <th className="px-4 py-3 text-left font-body text-xs text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Phone</th>
                  <th className="px-4 py-3 text-left font-body text-xs text-muted-foreground uppercase tracking-wider">Orders</th>
                  <th className="px-4 py-3 text-left font-body text-xs text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Last Order</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const cOrders = ordersByClient.get(c.id) || [];
                  const last = cOrders[0];
                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => setSelected(c)}
                      className={`border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer ${selected?.id === c.id ? "bg-muted/40" : ""}`}
                    >
                      <td className="px-4 py-3 font-body text-sm font-medium text-accent">{c.client_number || "—"}</td>
                      <td className="px-4 py-3 font-body text-sm text-foreground">
                        {`${c.first_name || ""} ${c.last_name || ""}`.trim() || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-muted-foreground hidden md:table-cell truncate max-w-[220px]">{c.email}</td>
                      <td className="px-4 py-3 font-body text-sm text-muted-foreground hidden lg:table-cell">{c.phone || "—"}</td>
                      <td className="px-4 py-3 font-body text-sm text-foreground">{cOrders.length}</td>
                      <td className="px-4 py-3 font-body text-sm text-muted-foreground hidden lg:table-cell">
                        {last ? format(new Date(last.created_at), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                    </motion.tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center font-body text-sm text-muted-foreground">No clients found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {selected && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card border border-border rounded-lg p-6 h-fit lg:sticky lg:top-24"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-body text-sm text-accent font-medium">{selected.client_number}</div>
                  <h2 className="font-display text-2xl text-foreground mt-1">
                    {`${selected.first_name || ""} ${selected.last_name || ""}`.trim() || "Unnamed Client"}
                  </h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2 mb-6 font-body text-sm">
                <div><span className="text-muted-foreground">Email:</span> {selected.email}</div>
                <div><span className="text-muted-foreground">Phone:</span> {selected.phone || "—"}</div>
                <div><span className="text-muted-foreground">Since:</span> {format(new Date(selected.created_at), "MMM d, yyyy")}</div>
              </div>

              <h3 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Orders ({selectedOrders.length})
              </h3>
              <div className="space-y-2 max-h-[480px] overflow-y-auto">
                {selectedOrders.map((o) => (
                  <Link
                    key={o.id}
                    to={`/admin?order=${o.id}`}
                    className="block border border-border rounded-md p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-body text-sm font-medium">{o.order_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-body ${o.order_type === "repair" ? "bg-orange-100 text-orange-800" : "bg-purple-100 text-purple-800"}`}>
                        {o.order_type}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">{o.item_description}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(o.created_at), "MMM d, yyyy")} · {o.status.replace(/_/g, " ")}
                    </div>
                  </Link>
                ))}
                {selectedOrders.length === 0 && (
                  <div className="text-sm text-muted-foreground font-body">No orders yet.</div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Clients;
