import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, LogOut, ChevronRight } from "lucide-react";
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
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [search, setSearch] = useState("");

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
                    onClick={() => navigate(`/admin/clients/${c.id}`)}
                    className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
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
      </div>
    </div>
  );
};

export default Clients;
