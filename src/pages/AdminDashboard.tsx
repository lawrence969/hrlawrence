import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, Plus, Search, LogOut, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import logoWhite from "@/assets/logo-white.jpg";

const repairStatusFlow = ["intake", "in_progress", "complete", "ready_pickup", "picked_up"];
const customStatusFlow = ["intake", "quote_sent", "quote_approved", "in_design", "design_approved", "in_production", "complete", "ready_pickup", "picked_up"];

const statusLabels: Record<string, string> = {
  intake: "Intake", in_progress: "In Progress", complete: "Complete",
  ready_pickup: "Ready for Pickup", picked_up: "Picked Up",
  quote_sent: "Quote Sent", quote_approved: "Quote Approved",
  in_design: "In Design", design_approved: "Design Approved",
  in_production: "In Production",
};

const statusColor = (status: string) => {
  if (["intake"].includes(status)) return "bg-secondary text-secondary-foreground";
  if (["in_progress", "in_design", "in_production"].includes(status)) return "bg-accent/20 text-accent";
  if (["complete", "ready_pickup"].includes(status)) return "bg-green-100 text-green-800";
  if (["picked_up"].includes(status)) return "bg-muted text-muted-foreground";
  return "bg-secondary text-secondary-foreground";
};

interface Order {
  id: string;
  order_number: string;
  customer_email: string;
  order_type: string;
  status: string;
  item_description: string;
  notes: string | null;
  created_at: string;
}

const AdminDashboard = () => {
  const { user, isStaff, loading, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newOrder, setNewOrder] = useState({
    customerEmail: "", firstName: "", lastName: "", phone: "",
    orderType: "repair" as "repair" | "custom",
    itemDescription: "", notes: "",
  });

  const fetchOrders = async () => {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders(data || []);
  };

  useEffect(() => {
    if (!user || !isStaff) return;
    fetchOrders();
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, isStaff]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-body">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isStaff) return <Navigate to="/my-orders" replace />;

  const advanceOrder = async (order: Order) => {
    const flow = order.order_type === "repair" ? repairStatusFlow : customStatusFlow;
    const idx = flow.indexOf(order.status);
    if (idx < flow.length - 1) {
      const { error } = await supabase.from("orders").update({ status: flow[idx + 1] }).eq("id", order.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const createOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("orders").insert({
      customer_email: newOrder.customerEmail,
      order_type: newOrder.orderType,
      item_description: newOrder.itemDescription,
      notes: newOrder.notes || null,
      created_by: user.id,
      order_number: "",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Order Created" });
      setShowNewOrder(false);
      setNewOrder({ customerEmail: "", firstName: "", lastName: "", phone: "", orderType: "repair", itemDescription: "", notes: "" });
    }
  };

  const repairs = orders.filter((o) => o.order_type === "repair");
  const customs = orders.filter((o) => o.order_type === "custom");
  const filteredRepairs = repairs.filter((r) => r.customer_email.toLowerCase().includes(search.toLowerCase()) || r.order_number.toLowerCase().includes(search.toLowerCase()));
  const filteredCustoms = customs.filter((c) => c.customer_email.toLowerCase().includes(search.toLowerCase()) || c.order_number.toLowerCase().includes(search.toLowerCase()));

  const OrderTable = ({ items, flow }: { items: Order[]; flow: string[] }) => (
    <div className="bg-background border border-border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left px-4 py-3 font-body text-xs text-muted-foreground uppercase tracking-wider">Order</th>
            <th className="text-left px-4 py-3 font-body text-xs text-muted-foreground uppercase tracking-wider">Client</th>
            <th className="text-left px-4 py-3 font-body text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Item</th>
            <th className="text-left px-4 py-3 font-body text-xs text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="text-right px-4 py-3 font-body text-xs text-muted-foreground uppercase tracking-wider">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((order) => (
            <motion.tr key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-border last:border-0 hover:bg-muted/30">
              <td className="px-4 py-3 font-body text-sm font-medium text-foreground">{order.order_number}</td>
              <td className="px-4 py-3 font-body text-sm text-foreground">{order.customer_email}</td>
              <td className="px-4 py-3 font-body text-sm text-muted-foreground hidden md:table-cell">{order.item_description}</td>
              <td className="px-4 py-3">
                <Badge variant="secondary" className={`font-body text-xs ${statusColor(order.status)}`}>{statusLabels[order.status] || order.status}</Badge>
              </td>
              <td className="px-4 py-3 text-right">
                {order.status !== "picked_up" && (
                  <Button size="sm" variant="ghost" onClick={() => advanceOrder(order)} className="font-body text-xs text-accent hover:text-accent">
                    Advance <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </td>
            </motion.tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-8 text-center font-body text-sm text-muted-foreground">No orders found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted">
      <div className="fixed left-0 top-0 bottom-0 w-64 bg-primary text-primary-foreground p-6 hidden lg:flex flex-col">
        <Link to="/"><img src={logoWhite} alt="HR Lawrence" className="h-10 mb-10" /></Link>
        <nav className="space-y-2 flex-1">
          <div className="px-4 py-2 bg-sidebar-accent rounded text-sm font-body font-medium">Dashboard</div>
        </nav>
        <button onClick={signOut} className="flex items-center gap-2 text-sm font-body text-primary-foreground/60 cursor-pointer hover:text-primary-foreground">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      <div className="lg:ml-64 p-6 lg:p-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display text-foreground">Dashboard</h1>
            <p className="font-body text-sm text-muted-foreground">Manage all client orders</p>
          </div>
          <Button onClick={() => setShowNewOrder(true)} className="bg-primary text-primary-foreground font-body text-sm">
            <Plus className="w-4 h-4 mr-2" /> New Order
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Repairs", value: repairs.filter((r) => r.status !== "picked_up").length },
            { label: "Active Custom", value: customs.filter((c) => c.status !== "picked_up").length },
            { label: "Ready for Pickup", value: orders.filter((o) => o.status === "ready_pickup").length },
            { label: "Total Orders", value: orders.length },
          ].map((stat) => (
            <div key={stat.label} className="bg-background border border-border p-5">
              <p className="font-body text-sm text-muted-foreground">{stat.label}</p>
              <p className="font-display text-2xl text-foreground mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* New Order Modal */}
        {showNewOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-border p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display text-foreground">New Order</h2>
                <button onClick={() => setShowNewOrder(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <form onSubmit={createOrder} className="space-y-4">
                <div>
                  <Label className="font-body text-sm">Order Type</Label>
                  <div className="flex gap-3 mt-1">
                    {(["repair", "custom"] as const).map((t) => (
                      <button key={t} type="button" onClick={() => setNewOrder({ ...newOrder, orderType: t })}
                        className={`px-4 py-2 font-body text-sm border transition-colors capitalize ${
                          newOrder.orderType === t ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground"
                        }`}>{t === "custom" ? "Custom Piece" : "Repair"}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="ce" className="font-body text-sm">Client Email</Label>
                  <Input id="ce" type="email" required value={newOrder.customerEmail} onChange={(e) => setNewOrder({ ...newOrder, customerEmail: e.target.value })} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="font-body text-sm">First Name</Label>
                    <Input required value={newOrder.firstName} onChange={(e) => setNewOrder({ ...newOrder, firstName: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="font-body text-sm">Last Name</Label>
                    <Input required value={newOrder.lastName} onChange={(e) => setNewOrder({ ...newOrder, lastName: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="font-body text-sm">Phone</Label>
                  <Input type="tel" value={newOrder.phone} onChange={(e) => setNewOrder({ ...newOrder, phone: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="font-body text-sm">Item Description</Label>
                  <Input required value={newOrder.itemDescription} onChange={(e) => setNewOrder({ ...newOrder, itemDescription: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="font-body text-sm">Notes</Label>
                  <Textarea value={newOrder.notes} onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })} className="mt-1" />
                </div>
                <Button type="submit" className="w-full bg-primary text-primary-foreground font-body text-sm tracking-widest uppercase">Create Order</Button>
              </form>
            </div>
          </motion.div>
        )}

        {/* Search */}
        <div className="relative max-w-sm mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 font-body" />
        </div>

        <Tabs defaultValue="repairs">
          <TabsList className="bg-background border border-border mb-6">
            <TabsTrigger value="repairs" className="font-body text-sm">Repairs ({repairs.length})</TabsTrigger>
            <TabsTrigger value="custom" className="font-body text-sm">Custom Orders ({customs.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="repairs"><OrderTable items={filteredRepairs} flow={repairStatusFlow} /></TabsContent>
          <TabsContent value="custom"><OrderTable items={filteredCustoms} flow={customStatusFlow} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
