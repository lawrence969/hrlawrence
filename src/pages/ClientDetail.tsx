import { useEffect, useState } from "react";
import { Link, Navigate, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, ExternalLink } from "lucide-react";
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
  item_description: string;
  current_department: string;
}

const statusLabel = (s: string) => s.replace(/_/g, " ");

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isStaff, loading, signOut } = useAuth();
  const [client, setClient] = useState<ClientRow | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user || !isStaff || !id) return;
    (async () => {
      setFetching(true);
      const [{ data: c }, { data: o }] = await Promise.all([
        supabase.from("profiles").select("id, client_number, first_name, last_name, email, phone, created_at").eq("id", id).maybeSingle(),
        supabase.from("orders").select("id, order_number, order_type, status, created_at, item_description, current_department").eq("customer_profile_id", id).order("created_at", { ascending: false }),
      ]);
      setClient((c as ClientRow) || null);
      setOrders((o as OrderRow[]) || []);
      setFetching(false);
    })();
  }, [user, isStaff, id]);

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

      <div className="pt-20 px-4 sm:px-6 pb-10 max-w-[1400px] mx-auto">
        <Link to="/admin/clients" className="inline-flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </Link>

        {fetching ? (
          <div className="text-muted-foreground font-body">Loading client…</div>
        ) : !client ? (
          <div className="text-muted-foreground font-body">Client not found.</div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-lg p-6 mb-6">
              <div className="font-body text-sm text-accent font-medium">{client.client_number}</div>
              <h1 className="font-display text-3xl text-foreground mt-1">
                {`${client.first_name || ""} ${client.last_name || ""}`.trim() || "Unnamed Client"}
              </h1>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 font-body text-sm">
                <div><div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</div>{client.email || "—"}</div>
                <div><div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Phone</div>{client.phone || "—"}</div>
                <div><div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Client Since</div>{format(new Date(client.created_at), "MMM d, yyyy")}</div>
              </div>
            </motion.div>

            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl text-foreground">Orders ({orders.length})</h2>
            </div>

            <div className="bg-card border border-border rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-body text-xs text-muted-foreground uppercase tracking-wider">Order #</th>
                    <th className="px-4 py-3 text-left font-body text-xs text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left font-body text-xs text-muted-foreground uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-left font-body text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left font-body text-xs text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => navigate(`/admin?order=${o.id}`)}
                      className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-body text-sm font-medium text-foreground">{o.order_number}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-body ${o.order_type === "repair" ? "bg-orange-100 text-orange-800" : "bg-purple-100 text-purple-800"}`}>
                          {o.order_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-muted-foreground truncate max-w-[280px]">{o.item_description}</td>
                      <td className="px-4 py-3 font-body text-sm text-foreground capitalize">{statusLabel(o.status)}</td>
                      <td className="px-4 py-3 font-body text-sm text-muted-foreground">{format(new Date(o.created_at), "MMM d, yyyy")}</td>
                      <td className="px-4 py-3"><ExternalLink className="w-4 h-4 text-muted-foreground" /></td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center font-body text-sm text-muted-foreground">No orders yet for this client.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClientDetail;
