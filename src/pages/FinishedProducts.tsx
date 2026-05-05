import { useState, useEffect, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { LogOut, Trash2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import logoNavy from "@/assets/logo-navy.jpg";

const productTypes = [
  { v: "engagement_ring", l: "Engagement Ring" },
  { v: "wedding_ring", l: "Wedding Ring" },
  { v: "earrings", l: "Earrings" },
  { v: "bracelet", l: "Bracelet" },
  { v: "necklace", l: "Necklace" },
  { v: "pendant", l: "Pendant" },
  { v: "other", l: "Other" },
];
const metalTypes = ["10k", "14k", "18k", "22k", "Silver", "Platinum"];
const metalColors = ["White", "Yellow", "Rose", "Other"];
const NONE = "__none__";

const labelOf = (v: string) => productTypes.find((p) => p.v === v)?.l || v;

const schema = z.object({
  product_type: z.string().min(1, "Product type required"),
  metal_type: z.string().min(1, "Metal type required"),
  metal_color: z.string().min(1, "Metal color required"),
});

interface Profile { id: string; first_name: string; last_name: string; email: string }
interface Order { id: string; order_number: string; customer_profile_id: string | null; item_description: string; first_name: string | null; last_name: string | null }
interface FinishedProduct {
  id: string; created_at: string; product_type: string; product_type_other: string | null;
  metal_type: string; metal_color: string; metal_color_other: string | null;
  weight: string | null; stone_type: string | null; gem_sku: string | null;
  cost: number | null; client_cost: number | null; notes: string | null;
  customer_profile_id: string | null; order_id: string | null;
}

const empty = {
  product_type: "", product_type_other: "",
  metal_type: "", metal_color: "", metal_color_other: "",
  weight: "", stone_type: "", gem_sku: "",
  cost: "", client_cost: "", notes: "",
  customer_profile_id: "", order_id: "",
};

const FinishedProducts = () => {
  const { user, isStaff, loading, signOut } = useAuth();
  const [form, setForm] = useState(empty);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<FinishedProduct[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async () => {
    const { data } = await supabase.from("finished_products").select("*").order("created_at", { ascending: false }).limit(100);
    setProducts((data as any) || []);
  };

  useEffect(() => {
    if (!user || !isStaff) return;
    supabase.from("profiles").select("id, first_name, last_name, email").order("last_name").then(({ data }) => setProfiles(data || []));
    supabase.from("orders").select("id, order_number, customer_profile_id, item_description, first_name, last_name").order("order_number", { ascending: false }).then(({ data }) => setOrders((data as any) || []));
    fetchProducts();
  }, [user, isStaff]);

  const filteredProfiles = useMemo(() => {
    const q = clientSearch.toLowerCase().trim();
    const list = q
      ? profiles.filter((p) => `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(q))
      : profiles;
    return list.slice(0, 100);
  }, [clientSearch, profiles]);

  const clientOrders = useMemo(() => {
    if (!form.customer_profile_id) return [];
    return orders.filter((o) => o.customer_profile_id === form.customer_profile_id);
  }, [orders, form.customer_profile_id]);

  const profileLabel = (id: string | null) => {
    if (!id) return "—";
    const p = profiles.find((x) => x.id === id);
    return p ? `${p.first_name} ${p.last_name}` : "—";
  };
  const orderLabel = (id: string | null) => {
    if (!id) return "—";
    return orders.find((o) => o.id === id)?.order_number || "—";
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-body">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isStaff) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Invalid", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    if (form.product_type === "other" && !form.product_type_other.trim()) {
      toast({ title: "Specify product type", variant: "destructive" }); return;
    }
    if (form.metal_color === "Other" && !form.metal_color_other.trim()) {
      toast({ title: "Specify metal color", variant: "destructive" }); return;
    }
    setSubmitting(true);
    const payload = {
      created_by: user.id,
      customer_profile_id: form.customer_profile_id || null,
      order_id: form.order_id || null,
      product_type: form.product_type,
      product_type_other: form.product_type === "other" ? form.product_type_other.trim() : null,
      metal_type: form.metal_type,
      metal_color: form.metal_color,
      metal_color_other: form.metal_color === "Other" ? form.metal_color_other.trim() : null,
      weight: form.weight.trim() || null,
      stone_type: form.stone_type.trim() || null,
      gem_sku: form.gem_sku.trim() || null,
      cost: form.cost ? Number(form.cost) : null,
      client_cost: form.client_cost ? Number(form.client_cost) : null,
      notes: form.notes.trim() || null,
    };
    const { error } = await supabase.from("finished_products").insert(payload);
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Finished product saved" });
      setForm(empty);
      setClientSearch("");
      fetchProducts();
    }
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("finished_products").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); fetchProducts(); }
  };

  return (
    <div className="min-h-screen bg-muted">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex-shrink-0"><img src={logoNavy} alt="HR Lawrence" className="h-10" /></Link>
          <div className="flex items-center gap-6">
            <Link to="/admin" className="text-sm font-body font-medium tracking-widest uppercase text-foreground hover:text-accent transition-colors">Dashboard</Link>
            <Link to="/gold-calculator" className="text-sm font-body font-medium tracking-widest uppercase text-foreground hover:text-accent transition-colors">Gold Calculator</Link>
            <span className="text-sm font-body font-medium tracking-widest uppercase text-accent">Finished Products</span>
            <button onClick={signOut} className="flex items-center gap-2 text-sm font-body font-medium tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-24 p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display text-foreground">Finished Products</h1>
          <p className="font-body text-sm text-muted-foreground">Record a completed piece. Linking to a client and order is optional.</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="font-display">Order (optional)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Order Number</Label>
              <Select
                value={form.order_id || NONE}
                onValueChange={(v) => {
                  if (v === NONE) {
                    setForm({ ...form, order_id: "", customer_profile_id: "" });
                  } else {
                    const o = orders.find((x) => x.id === v);
                    setForm({ ...form, order_id: v, customer_profile_id: o?.customer_profile_id || "" });
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select an order number" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— No order —</SelectItem>
                  {orders.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.order_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.order_id && (() => {
              const o = orders.find((x) => x.id === form.order_id);
              const p = profiles.find((x) => x.id === (o?.customer_profile_id || ""));
              const first = p?.first_name || o?.first_name || "";
              const last = p?.last_name || o?.last_name || "";
              const hasName = (first || last).trim().length > 0;
              return (
                <div className="rounded-md border border-border bg-muted/40 p-3">
                  <h3 className="font-display text-base mb-2">Profile</h3>
                  {hasName ? (
                    <div className="grid grid-cols-2 gap-3 text-sm font-body">
                      <div><span className="text-muted-foreground">First Name:</span> <span className="font-medium">{first || "—"}</span></div>
                      <div><span className="text-muted-foreground">Last Name:</span> <span className="font-medium">{last || "—"}</span></div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No client linked to this order.</p>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display">New Finished Product</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Custom Product *</Label>
                <Select value={form.product_type} onValueChange={(v) => setForm({ ...form, product_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{productTypes.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
                </Select>
                {form.product_type === "other" && (
                  <Input placeholder="Specify product" value={form.product_type_other} onChange={(e) => setForm({ ...form, product_type_other: e.target.value })} />
                )}
              </div>

              <div className="space-y-2">
                <Label>Metal Type *</Label>
                <Select value={form.metal_type} onValueChange={(v) => setForm({ ...form, metal_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select metal" /></SelectTrigger>
                  <SelectContent>{metalTypes.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Metal Color *</Label>
                <Select value={form.metal_color} onValueChange={(v) => setForm({ ...form, metal_color: v })}>
                  <SelectTrigger><SelectValue placeholder="Select color" /></SelectTrigger>
                  <SelectContent>{metalColors.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                {form.metal_color === "Other" && (
                  <Input placeholder="Specify color" value={form.metal_color_other} onChange={(e) => setForm({ ...form, metal_color_other: e.target.value })} />
                )}
              </div>

              <div className="space-y-2">
                <Label>Weight</Label>
                <Input value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>Stone Type</Label>
                <Input value={form.stone_type} onChange={(e) => setForm({ ...form, stone_type: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>GEM-SKU</Label>
                <Input value={form.gem_sku} onChange={(e) => setForm({ ...form, gem_sku: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>Cost</Label>
                <Input type="number" step="0.01" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>Client Cost</Label>
                <Input type="number" step="0.01" min="0" value={form.client_cost} onChange={(e) => setForm({ ...form, client_cost: e.target.value })} />
              </div>

              <div className="md:col-span-2 border-t border-border pt-4 mt-2">
                <h3 className="font-display text-lg mb-3">Attach to Order (optional)</h3>
                <div className="space-y-2">
                  <Label>Order Number</Label>
                  <Input
                    placeholder="e.g. HRL-2025-0012"
                    value={clientSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setClientSearch(val);
                      const match = orders.find((o) => o.order_number.toLowerCase() === val.trim().toLowerCase());
                      if (match) {
                        setForm({ ...form, order_id: match.id, customer_profile_id: match.customer_profile_id || "" });
                      } else {
                        setForm({ ...form, order_id: "", customer_profile_id: "" });
                      }
                    }}
                    autoComplete="off"
                  />
                  {form.order_id ? (
                    <p className="text-sm text-foreground">
                      Client: <span className="font-medium">{profileLabel(form.customer_profile_id) !== "—" ? profileLabel(form.customer_profile_id) : "No client linked to this order"}</span>
                    </p>
                  ) : clientSearch.trim() ? (
                    <p className="text-xs text-muted-foreground">No order found with that number.</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Enter the order number to auto-link the client.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>

              <div className="md:col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setForm(empty); setClientSearch(""); }}>Reset</Button>
                <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save Product"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display">Recent Finished Products</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Product</th>
                    <th className="py-2 pr-4">Metal</th>
                    <th className="py-2 pr-4">Client</th>
                    <th className="py-2 pr-4">Order</th>
                    <th className="py-2 pr-4">Cost</th>
                    <th className="py-2 pr-4">Client Cost</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="py-2 pr-4">{p.product_type === "other" ? p.product_type_other : labelOf(p.product_type)}</td>
                      <td className="py-2 pr-4">{p.metal_type} / {p.metal_color === "Other" ? p.metal_color_other : p.metal_color}</td>
                      <td className="py-2 pr-4">{profileLabel(p.customer_profile_id)}</td>
                      <td className="py-2 pr-4">{orderLabel(p.order_id)}</td>
                      <td className="py-2 pr-4">{p.cost != null ? `$${Number(p.cost).toFixed(2)}` : "—"}</td>
                      <td className="py-2 pr-4">{p.client_cost != null ? `$${Number(p.client_cost).toFixed(2)}` : "—"}</td>
                      <td className="py-2 text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this finished product?</AlertDialogTitle>
                              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteProduct(p.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No finished products yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinishedProducts;
