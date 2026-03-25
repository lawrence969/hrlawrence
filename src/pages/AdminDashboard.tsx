import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, Plus, Search, LogOut, X, DollarSign, Calendar, MapPin, Send, MessageSquare, Mail, Trash2, Printer, Clock, PlusCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import logoWhite from "@/assets/logo-white.jpg";

const repairStatusFlow = ["intake", "in_progress", "complete", "ready_pickup", "picked_up"];
const customStatusFlow = ["intake", "quote_sent", "quote_approved", "ordered_stones", "in_design", "design_approved", "in_production", "complete", "ready_pickup", "picked_up"];

const departments = ["front_of_store", "repair", "design", "setting"] as const;
const departmentLabels: Record<string, string> = {
  front_of_store: "Front of Store",
  repair: "Repair",
  design: "Design",
  setting: "Setting",
};

const statusLabels: Record<string, string> = {
  intake: "Intake", in_progress: "In Progress", complete: "Complete",
  ready_pickup: "Ready for Pickup", picked_up: "Picked Up",
  quote_sent: "Quote Sent", quote_approved: "Quote Approved",
  ordered_stones: "Ordered Stones",
  in_design: "In Design", design_approved: "Design Approved",
  in_production: "In Production",
};

const statusColor = (status: string) => {
  if (["intake"].includes(status)) return "bg-secondary text-secondary-foreground";
  if (["in_progress", "in_design", "in_production", "ordered_stones"].includes(status)) return "bg-accent/20 text-accent";
  if (["complete", "ready_pickup"].includes(status)) return "bg-green-100 text-green-800";
  if (["picked_up"].includes(status)) return "bg-muted text-muted-foreground";
  return "bg-secondary text-secondary-foreground";
};

const deptColor = (dept: string) => {
  if (dept === "front_of_store") return "bg-primary/10 text-primary";
  if (dept === "repair") return "bg-orange-100 text-orange-800";
  if (dept === "design") return "bg-purple-100 text-purple-800";
  if (dept === "setting") return "bg-blue-100 text-blue-800";
  return "bg-muted text-muted-foreground";
};

interface Order {
  id: string;
  order_number: string;
  customer_email: string;
  first_name: string | null;
  last_name: string | null;
  order_type: string;
  status: string;
  current_department: string;
  item_description: string;
  notes: string | null;
  created_at: string;
  customer_profile_id: string | null;
}

interface Quote {
  id: string;
  order_id: string;
  amount: number;
  description: string | null;
  status: string;
  sent_at: string;
}

const AdminDashboard = () => {
  const { user, isStaff, loading, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activePanel, setActivePanel] = useState<"detail" | "quote" | "invite" | null>(null);
  const [messages, setMessages] = useState<{ id: string; message: string; sender_id: string; created_at: string }[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);

  // Quote form
  const [orderNotes, setOrderNotes] = useState<{ id: string; note: string; note_date: string; created_at: string }[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newNoteDate, setNewNoteDate] = useState(new Date().toISOString().split("T")[0]);

  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteDesc, setQuoteDesc] = useState("");
  const [quotePhone, setQuotePhone] = useState("");
  const [sendingQuote, setSendingQuote] = useState(false);

  // Invite form
  const [inviteType, setInviteType] = useState<"review" | "pickup">("review");
  const [inviteMsg, setInviteMsg] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [sendingEmailInvite, setSendingEmailInvite] = useState(false);
  const [showConfirmCreate, setShowConfirmCreate] = useState(false);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const [createdOrderData, setCreatedOrderData] = useState<typeof newOrder | null>(null);
  const [newOrder, setNewOrder] = useState({
    customerEmail: "", firstName: "", lastName: "", address: "",
    phone1: "", phone2: "",
    orderType: "" as "" | "repair" | "custom",
    itemDescription: "", notes: "",
    orderDate: new Date().toISOString().split("T")[0],
    rhodiumPolish: false,
    stoneType: "", stoneOrigin: "" as "" | "lab" | "natural", stoneSize: "", ringSize: "",
    metal: "", metalType: "", colour: "",
    budget: "", deposit: "",
    deliveryDate: "",
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

  // Fetch messages and quotes when order selected
  useEffect(() => {
    if (!selectedOrder) return;
    const fetchMessages = async () => {
      const { data } = await supabase.from("order_messages").select("*").eq("order_id", selectedOrder.id).order("created_at", { ascending: true });
      setMessages(data || []);
    };
    const fetchQuotes = async () => {
      const { data } = await supabase.from("quotes").select("*").eq("order_id", selectedOrder.id).order("created_at", { ascending: false });
      setQuotes(data || []);
    };
    const fetchNotes = async () => {
      const { data } = await supabase.from("order_notes").select("*").eq("order_id", selectedOrder.id).order("note_date", { ascending: false });
      setOrderNotes(data || []);
    };
    fetchMessages();
    fetchQuotes();
    fetchNotes();

    // Try to get customer phone
    if (selectedOrder.customer_profile_id) {
      supabase.from("profiles").select("phone").eq("id", selectedOrder.customer_profile_id).single().then(({ data }) => {
        if (data?.phone) {
          setQuotePhone(data.phone);
          setInvitePhone(data.phone);
        }
      });
    }

    const msgChannel = supabase
      .channel(`admin-msgs-${selectedOrder.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_messages", filter: `order_id=eq.${selectedOrder.id}` }, () => fetchMessages())
      .subscribe();
    const quoteChannel = supabase
      .channel(`admin-quotes-${selectedOrder.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes", filter: `order_id=eq.${selectedOrder.id}` }, () => fetchQuotes())
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(quoteChannel);
    };
  }, [selectedOrder]);

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

  const changeDepartment = async (orderId: string, dept: string) => {
    const { error } = await supabase.from("orders").update({ current_department: dept }).eq("id", orderId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Department Updated" });
  };

  const handleCreateOrderClick = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmCreate(true);
  };

  const printOrderForm = (orderData: typeof newOrder) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Order Form</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        h2 { font-size: 14px; color: #888; margin-bottom: 24px; font-weight: normal; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 32px; margin-bottom: 20px; }
        .field { margin-bottom: 4px; }
        .label { font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 1px; }
        .value { font-size: 14px; min-height: 20px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
        .full { grid-column: 1 / -1; }
        hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>Order Form</h1>
      <h2>${orderData.orderType === "custom" ? "Custom Piece" : "Repair"} — ${new Date().toLocaleDateString()}</h2>
      <div class="grid">
        <div class="field"><div class="label">First Name</div><div class="value">${orderData.firstName || "—"}</div></div>
        <div class="field"><div class="label">Last Name</div><div class="value">${orderData.lastName || "—"}</div></div>
        <div class="field"><div class="label">Email</div><div class="value">${orderData.customerEmail || "—"}</div></div>
        <div class="field"><div class="label">Phone 1</div><div class="value">${orderData.phone1 || "—"}</div></div>
        <div class="field"><div class="label">Phone 2</div><div class="value">${orderData.phone2 || "—"}</div></div>
        <div class="field"><div class="label">Address</div><div class="value">${orderData.address || "—"}</div></div>
      </div>
      <hr/>
      <div class="grid">
        <div class="field"><div class="label">Order Type</div><div class="value">${orderData.orderType === "custom" ? "Custom Piece" : "Repair"}</div></div>
        <div class="field"><div class="label">Order Date</div><div class="value">${orderData.orderDate || "—"}</div></div>
        <div class="field full"><div class="label">Item Description</div><div class="value">${orderData.itemDescription || "—"}</div></div>
        <div class="field"><div class="label">Metal</div><div class="value">${orderData.metal || "—"}</div></div>
        <div class="field"><div class="label">Metal Type</div><div class="value">${orderData.metalType || "—"}</div></div>
        <div class="field"><div class="label">Colour</div><div class="value">${orderData.colour || "—"}</div></div>
        <div class="field"><div class="label">Ring Size</div><div class="value">${orderData.ringSize || "—"}</div></div>
        <div class="field"><div class="label">Stone Type</div><div class="value">${orderData.stoneType || "—"}</div></div>
        <div class="field"><div class="label">Stone Origin</div><div class="value">${orderData.stoneOrigin ? (orderData.stoneOrigin === "lab" ? "Lab" : "Natural") : "—"}</div></div>
        <div class="field"><div class="label">Stone Size</div><div class="value">${orderData.stoneSize || "—"}</div></div>
        <div class="field"><div class="label">Rhodium/Polish</div><div class="value">${orderData.rhodiumPolish ? "Yes" : "No"}</div></div>
        <div class="field"><div class="label">Budget</div><div class="value">${orderData.budget ? "$" + orderData.budget : "—"}</div></div>
        <div class="field"><div class="label">Deposit</div><div class="value">${orderData.deposit ? "$" + orderData.deposit : "—"}</div></div>
        <div class="field"><div class="label">Delivery Date</div><div class="value">${orderData.deliveryDate || "—"}</div></div>
      </div>
      ${orderData.notes ? `<hr/><div class="field"><div class="label">Notes</div><div class="value">${orderData.notes}</div></div>` : ""}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const confirmCreateOrder = async () => {
    setShowConfirmCreate(false);
    const { error } = await supabase.from("orders").insert({
      customer_email: newOrder.customerEmail,
      order_type: newOrder.orderType,
      item_description: newOrder.itemDescription,
      notes: newOrder.notes || null,
      created_by: user.id,
      order_number: "",
      first_name: newOrder.firstName || null,
      last_name: newOrder.lastName || null,
      address: newOrder.address || null,
      phone1: newOrder.phone1 || null,
      phone2: newOrder.phone2 || null,
      order_date: newOrder.orderDate || null,
      rhodium_polish: newOrder.rhodiumPolish,
      stone_type: newOrder.stoneType || null,
      stone_size: newOrder.stoneSize || null,
      ring_size: newOrder.ringSize || null,
      metal: newOrder.metal || null,
      metal_type: newOrder.metalType || null,
      colour: newOrder.colour || null,
      budget: newOrder.budget ? parseFloat(newOrder.budget) : null,
      deposit: newOrder.deposit ? parseFloat(newOrder.deposit) : null,
      delivery_date: newOrder.deliveryDate || null,
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Order Created" });
      setCreatedOrderData({ ...newOrder });
      setShowPrintPrompt(true);
      setShowNewOrder(false);
      setNewOrder({
        customerEmail: "", firstName: "", lastName: "", address: "",
        phone1: "", phone2: "", orderType: "" as "" | "repair" | "custom",
        itemDescription: "", notes: "",
        orderDate: new Date().toISOString().split("T")[0],
        rhodiumPolish: false, stoneType: "", stoneOrigin: "" as "" | "lab" | "natural", stoneSize: "", ringSize: "",
        metal: "", metalType: "", colour: "", budget: "", deposit: "", deliveryDate: "",
      });
    }
  };

  const sendQuote = async () => {
    if (!selectedOrder || !quoteAmount) return;
    setSendingQuote(true);
    // Create quote record
    const { data: quoteData, error: qErr } = await supabase.from("quotes").insert({
      order_id: selectedOrder.id,
      amount: parseFloat(quoteAmount),
      description: quoteDesc || null,
    }).select().single();

    if (qErr) {
      toast({ title: "Error", description: qErr.message, variant: "destructive" });
      setSendingQuote(false);
      return;
    }

    // Update order status to quote_sent if applicable
    if (selectedOrder.order_type === "custom" && selectedOrder.status === "intake") {
      await supabase.from("orders").update({ status: "quote_sent" }).eq("id", selectedOrder.id);
    }

    // Send SMS if phone provided
    if (quotePhone) {
      const { error: smsErr } = await supabase.functions.invoke("send-sms", {
        body: {
          action: "quote",
          to: quotePhone,
          orderId: selectedOrder.id,
          orderNumber: selectedOrder.order_number,
          amount: quoteAmount,
          message: quoteDesc,
          quoteId: quoteData.id,
          portalUrl: window.location.origin,
        },
      });
      if (smsErr) {
        toast({ title: "Quote saved but SMS failed", description: smsErr.message, variant: "destructive" });
      } else {
        toast({ title: "Quote sent via SMS" });
      }
    } else {
      toast({ title: "Quote saved (no phone for SMS)" });
    }

    setQuoteAmount("");
    setQuoteDesc("");
    setSendingQuote(false);
    setActivePanel("detail");
  };

  const sendInvite = async () => {
    if (!selectedOrder) return;
    setSendingInvite(true);

    const { data: inviteData, error: iErr } = await supabase.from("appointment_invitations").insert({
      order_id: selectedOrder.id,
      invitation_type: inviteType,
      message: inviteMsg || null,
    }).select().single();

    if (iErr) {
      toast({ title: "Error", description: iErr.message, variant: "destructive" });
      setSendingInvite(false);
      return;
    }

    if (invitePhone) {
      const { error: smsErr } = await supabase.functions.invoke("send-sms", {
        body: {
          action: "appointment_invitation",
          to: invitePhone,
          orderId: selectedOrder.id,
          orderNumber: selectedOrder.order_number,
          message: inviteType,
          invitationId: inviteData.id,
          portalUrl: window.location.origin,
        },
      });
      if (smsErr) {
        toast({ title: "Invitation saved but SMS failed", description: smsErr.message, variant: "destructive" });
      } else {
        toast({ title: "Appointment invitation sent via SMS" });
      }
    } else {
      toast({ title: "Invitation saved (no phone for SMS)" });
    }

    setInviteMsg("");
    setSendingInvite(false);
    setActivePanel("detail");
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedOrder || !user) return;
    const { error } = await supabase.from("order_messages").insert({
      order_id: selectedOrder.id,
      sender_id: user.id,
      message: newMessage.trim(),
    });
    if (!error) setNewMessage("");
  };

  const sendEmailInvitation = async (email: string, orderNumber: string) => {
    setSendingEmailInvite(true);
    const { data, error } = await supabase.functions.invoke("send-invitation", {
      body: { email, orderNumber, portalUrl: `https://id-preview--${import.meta.env.VITE_SUPABASE_PROJECT_ID || "3cd18dce-b474-4b6c-a592-a850ccbde0c2"}.lovable.app` },
    });
    if (error) {
      toast({ title: "Failed to send invitation", description: error.message, variant: "destructive" });
    } else if (data?.error) {
      toast({ title: data.alreadyExists ? "Already has an account" : "Error", description: data.error, variant: "destructive" });
    } else {
      toast({ title: "Invitation sent!", description: `Email invitation sent to ${email}` });
    }
    setSendingEmailInvite(false);
  };

  const filteredOrders = orders.filter((o) => o.customer_email.toLowerCase().includes(search.toLowerCase()) || o.order_number.toLowerCase().includes(search.toLowerCase()) || `${o.first_name || ''} ${o.last_name || ''}`.toLowerCase().includes(search.toLowerCase()));

  const changeOrderType = async (orderId: string, newType: string) => {
    const newFlow = newType === "repair" ? repairStatusFlow : customStatusFlow;
    // Reset status to intake if current status isn't in the new flow
    const order = orders.find((o) => o.id === orderId);
    const updates: Record<string, string> = { order_type: newType };
    if (order && !newFlow.includes(order.status)) {
      updates.status = "intake";
    }
    const { error } = await supabase.from("orders").update(updates).eq("id", orderId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Order Type Updated" });
  };

  const OrderTable = ({ items }: { items: Order[] }) => (
    <div className="bg-background border border-border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left px-4 py-3 font-body text-xs text-muted-foreground uppercase tracking-wider">Order</th>
            <th className="text-left px-4 py-3 font-body text-xs text-muted-foreground uppercase tracking-wider">Client</th>
            <th className="text-left px-4 py-3 font-body text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Item</th>
            <th className="text-left px-4 py-3 font-body text-xs text-muted-foreground uppercase tracking-wider">Type</th>
            <th className="text-left px-4 py-3 font-body text-xs text-muted-foreground uppercase tracking-wider">Dept</th>
            <th className="text-left px-4 py-3 font-body text-xs text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 font-body text-xs text-muted-foreground uppercase tracking-wider w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((order) => {
            const flow = order.order_type === "repair" ? repairStatusFlow : customStatusFlow;
            return (
            <motion.tr key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => { setSelectedOrder(order); setActivePanel("detail"); }}>
              <td className="px-4 py-3 font-body text-sm font-medium text-foreground">{order.order_number}</td>
              <td className="px-4 py-3 font-body text-sm text-foreground">
                {order.first_name || order.last_name
                  ? `${order.first_name || ''} ${order.last_name || ''}`.trim()
                  : <span className="text-muted-foreground">{order.customer_email}</span>}
              </td>
              <td className="px-4 py-3 font-body text-sm text-muted-foreground hidden md:table-cell truncate max-w-[150px]">{order.item_description}</td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <Select value={order.order_type} onValueChange={(val) => changeOrderType(order.id, val)}>
                  <SelectTrigger className={`h-7 w-[110px] text-xs font-body border-0 ${order.order_type === "repair" ? "bg-orange-100 text-orange-800" : "bg-purple-100 text-purple-800"}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom" className="text-xs font-body">Custom</SelectItem>
                    <SelectItem value="repair" className="text-xs font-body">Repair</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <Select value={order.current_department} onValueChange={(val) => changeDepartment(order.id, val)}>
                  <SelectTrigger className={`h-7 w-[140px] text-xs font-body border-0 ${deptColor(order.current_department)}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...departments].sort((a, b) => departmentLabels[a].localeCompare(departmentLabels[b])).map((d) => (
                      <SelectItem key={d} value={d} className="text-xs font-body">{departmentLabels[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <Select value={order.status} onValueChange={async (val) => {
                  const { error } = await supabase.from("orders").update({ status: val }).eq("id", order.id);
                  if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
                  else toast({ title: "Status Updated" });
                }}>
                  <SelectTrigger className={`h-7 w-[150px] text-xs font-body border-0 ${statusColor(order.status)}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...flow].sort((a, b) => (statusLabels[a] || a).localeCompare(statusLabels[b] || b)).map((s) => (
                      <SelectItem key={s} value={s} className="text-xs font-body">{statusLabels[s] || s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Order</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete order {order.order_number}? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={async () => {
                          const { error } = await supabase.from("orders").delete().eq("id", order.id);
                          if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
                          else {
                            toast({ title: "Order Deleted" });
                            if (selectedOrder?.id === order.id) { setSelectedOrder(null); setActivePanel(null); }
                          }
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </td>
            </motion.tr>
            );
          })}
          {items.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-8 text-center font-body text-sm text-muted-foreground">No orders found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted">
      <div className="fixed top-0 left-0 right-0 z-40 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <Link to="/"><img src={logoWhite} alt="HR Lawrence" className="h-8" /></Link>
            <span className="text-sm font-body font-medium tracking-widest uppercase">Staff Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm font-body text-primary-foreground/70 hover:text-primary-foreground transition-colors">Home</Link>
            <button onClick={signOut} className="flex items-center gap-2 text-sm font-body text-primary-foreground/70 cursor-pointer hover:text-primary-foreground transition-colors">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="pt-16 p-6 lg:p-10 lg:pt-20">
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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Active Orders", value: orders.filter((o) => o.status !== "picked_up").length },
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
              <form onSubmit={handleCreateOrderClick} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-body text-sm">Order Type</Label>
                  <Select value={newOrder.orderType || undefined} onValueChange={(val: "repair" | "custom") => setNewOrder({ ...newOrder, orderType: val })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom" className="font-body text-sm">Custom Piece</SelectItem>
                      <SelectItem value="repair" className="font-body text-sm">Repair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                  <div>
                    <Label className="font-body text-sm">Order Date</Label>
                    <Input type="date" value={newOrder.orderDate} onChange={(e) => setNewOrder({ ...newOrder, orderDate: e.target.value })} className="mt-1" />
                  </div>
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
                  <Label className="font-body text-sm">Address</Label>
                  <Input value={newOrder.address} onChange={(e) => setNewOrder({ ...newOrder, address: e.target.value })} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="font-body text-sm">Telephone 1</Label>
                    <Input type="tel" value={newOrder.phone1} onChange={(e) => setNewOrder({ ...newOrder, phone1: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="font-body text-sm">Telephone 2</Label>
                    <Input type="tel" value={newOrder.phone2} onChange={(e) => setNewOrder({ ...newOrder, phone2: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="ce" className="font-body text-sm">Email</Label>
                  <Input id="ce" type="email" required value={newOrder.customerEmail} onChange={(e) => setNewOrder({ ...newOrder, customerEmail: e.target.value })} className="mt-1" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Checkbox id="rhodium" checked={newOrder.rhodiumPolish} onCheckedChange={(checked) => setNewOrder({ ...newOrder, rhodiumPolish: !!checked })} />
                  <Label htmlFor="rhodium" className="font-body text-sm cursor-pointer">Rhodium / Polish</Label>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className="font-body text-sm">Stone Type</Label>
                    <Input value={newOrder.stoneType} onChange={(e) => setNewOrder({ ...newOrder, stoneType: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="font-body text-sm">Lab / Natural</Label>
                    <Select value={newOrder.stoneOrigin} onValueChange={(val: "lab" | "natural") => setNewOrder({ ...newOrder, stoneOrigin: val })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lab">Lab</SelectItem>
                        <SelectItem value="natural">Natural</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="font-body text-sm">Stone Size</Label>
                    <Input value={newOrder.stoneSize} onChange={(e) => setNewOrder({ ...newOrder, stoneSize: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="font-body text-sm">Ring Size</Label>
                    <Input value={newOrder.ringSize} onChange={(e) => setNewOrder({ ...newOrder, ringSize: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="font-body text-sm">Metal</Label>
                    <Select value={newOrder.metal} onValueChange={(v) => setNewOrder({ ...newOrder, metal: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {["10k", "14k", "18k", "22k"].map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="font-body text-sm">Metal Type</Label>
                    <Select value={newOrder.metalType} onValueChange={(v) => setNewOrder({ ...newOrder, metalType: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {["Platinum", "Gold", "Silver", "Other"].map((m) => (
                          <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="font-body text-sm">Colour</Label>
                    <Select value={newOrder.colour} onValueChange={(v) => setNewOrder({ ...newOrder, colour: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {["White", "Yellow", "Rose"].map((c) => (
                          <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="font-body text-sm">Budget</Label>
                  <Input type="number" step="0.01" value={newOrder.budget} onChange={(e) => setNewOrder({ ...newOrder, budget: e.target.value })} className="mt-1" placeholder="$" />
                </div>
                <div className="border border-accent/30 bg-accent/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-accent" />
                    <Label className="font-body text-sm font-medium">Quote</Label>
                  </div>
                  <p className="font-body text-xs text-muted-foreground mb-2">Quote can be sent after the order is created.</p>
                </div>
                <div>
                  <Label className="font-body text-sm">Deposit</Label>
                  <Input type="number" step="0.01" value={newOrder.deposit} onChange={(e) => setNewOrder({ ...newOrder, deposit: e.target.value })} className="mt-1" placeholder="$" />
                </div>
                <div>
                  <Label className="font-body text-sm">Delivery Date</Label>
                  <Input type="date" value={newOrder.deliveryDate} onChange={(e) => setNewOrder({ ...newOrder, deliveryDate: e.target.value })} className="mt-1" />
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

        {/* Order Detail Slide-out */}
        {selectedOrder && activePanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => { setSelectedOrder(null); setActivePanel(null); }}>
            <motion.div initial={{ x: 400 }} animate={{ x: 0 }} className="bg-background w-full max-w-md h-full overflow-y-auto border-l border-border p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-lg text-foreground">{selectedOrder.order_number}</h2>
                <button onClick={() => { setSelectedOrder(null); setActivePanel(null); }}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mb-6">
                <Button size="sm" variant={activePanel === "detail" ? "default" : "outline"} onClick={() => setActivePanel("detail")} className="font-body text-xs">
                  Details
                </Button>
                <Button size="sm" variant={activePanel === "quote" ? "default" : "outline"} onClick={() => setActivePanel("quote")} className="font-body text-xs">
                  <DollarSign className="w-3 h-3 mr-1" /> Quote
                </Button>
                <Button size="sm" variant={activePanel === "invite" ? "default" : "outline"} onClick={() => setActivePanel("invite")} className="font-body text-xs">
                  <Calendar className="w-3 h-3 mr-1" /> Invite
                </Button>
              </div>

              {activePanel === "detail" && (
                <div className="space-y-6">
                  <div>
                    <p className="font-body text-xs text-muted-foreground mb-1">Client</p>
                    <p className="font-body text-sm text-foreground">{selectedOrder.customer_email}</p>
                  </div>
                  <div>
                    <p className="font-body text-xs text-muted-foreground mb-1">Item</p>
                    <p className="font-body text-sm text-foreground">{selectedOrder.item_description}</p>
                  </div>
                  <div>
                    <p className="font-body text-xs text-muted-foreground mb-1">Type</p>
                    <p className="font-body text-sm text-foreground capitalize">{selectedOrder.order_type}</p>
                  </div>

                  {/* Department */}
                  <div>
                    <p className="font-body text-xs text-muted-foreground mb-2">Department Location</p>
                    <Select value={selectedOrder.current_department} onValueChange={(val) => changeDepartment(selectedOrder.id, val)}>
                      <SelectTrigger className="w-full font-body text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d} value={d} className="font-body text-sm">{departmentLabels[d]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div>
                    <p className="font-body text-xs text-muted-foreground mb-2">Status</p>
                    <Badge variant="secondary" className={`font-body text-xs ${statusColor(selectedOrder.status)}`}>{statusLabels[selectedOrder.status] || selectedOrder.status}</Badge>
                    {selectedOrder.status !== "picked_up" && (
                      <Button size="sm" variant="outline" onClick={() => advanceOrder(selectedOrder)} className="ml-3 font-body text-xs">
                        Advance <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                   </div>

                   {/* Invite to Sign Up */}
                   {!selectedOrder.customer_profile_id && (
                     <div className="bg-accent/10 border border-accent/20 p-4">
                       <p className="font-body text-xs text-muted-foreground mb-2">No account linked</p>
                       <Button size="sm" disabled={sendingEmailInvite} onClick={() => sendEmailInvitation(selectedOrder.customer_email, selectedOrder.order_number)} className="font-body text-xs bg-primary text-primary-foreground w-full">
                         <Mail className="w-3 h-3 mr-2" />
                         {sendingEmailInvite ? "Sending..." : `Invite ${selectedOrder.customer_email} to sign up`}
                       </Button>
                     </div>
                   )}

                  {quotes.length > 0 && (
                    <div>
                      <p className="font-body text-xs text-muted-foreground mb-2">Quotes</p>
                      <div className="space-y-2">
                        {quotes.map((q) => (
                          <div key={q.id} className="bg-muted/50 p-3 border border-border">
                            <div className="flex justify-between items-center">
                              <span className="font-body text-sm font-medium text-foreground">${q.amount}</span>
                              <Badge variant="secondary" className={`font-body text-xs ${q.status === "approved" ? "bg-green-100 text-green-800" : q.status === "declined" ? "bg-red-100 text-red-800" : "bg-accent/20 text-accent"}`}>{q.status}</Badge>
                            </div>
                            {q.description && <p className="font-body text-xs text-muted-foreground mt-1">{q.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up Timeline */}
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <p className="font-body text-xs text-muted-foreground font-medium">Follow-up Timeline</p>
                    </div>
                    {orderNotes.length > 0 && (
                      <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                        {orderNotes.map((n, idx) => (
                          <div key={n.id} className="relative pl-4 border-l-2 border-accent/30">
                            <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-accent" />
                            <p className="font-body text-[10px] text-muted-foreground font-medium">{new Date(n.note_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            <p className="font-body text-xs text-foreground mt-0.5">{n.note}</p>
                            <button
                              className="font-body text-[10px] text-destructive hover:underline mt-1"
                              onClick={async () => {
                                await supabase.from("order_notes").delete().eq("id", n.id);
                                setOrderNotes(orderNotes.filter(on => on.id !== n.id));
                              }}
                            >Delete</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Input
                          placeholder="Add a follow-up note..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          className="font-body text-xs"
                        />
                      </div>
                      <Input
                        type="date"
                        value={newNoteDate}
                        onChange={(e) => setNewNoteDate(e.target.value)}
                        className="font-body text-xs w-[130px]"
                      />
                      <Button size="sm" className="bg-primary text-primary-foreground" onClick={async () => {
                        if (!newNote.trim() || !selectedOrder || !user) return;
                        const { data, error } = await supabase.from("order_notes").insert({
                          order_id: selectedOrder.id,
                          note: newNote.trim(),
                          note_date: newNoteDate,
                          created_by: user.id,
                        }).select().single();
                        if (!error && data) {
                          setOrderNotes([data, ...orderNotes]);
                          setNewNote("");
                          setNewNoteDate(new Date().toISOString().split("T")[0]);
                        }
                      }}>
                        <PlusCircle className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <p className="font-body text-xs text-muted-foreground font-medium">Messages</p>
                    </div>
                    {messages.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                        {messages.map((msg) => (
                          <div key={msg.id} className={`p-2 text-xs font-body ${msg.sender_id === user?.id ? "bg-accent/10 ml-4" : "bg-muted mr-4"}`}>
                            <p className="text-foreground">{msg.message}</p>
                            <p className="text-muted-foreground mt-1 text-[10px]">{new Date(msg.created_at).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input placeholder="Send a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} className="font-body text-xs" />
                      <Button size="sm" onClick={sendMessage} className="bg-primary text-primary-foreground"><Send className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </div>
              )}

              {activePanel === "quote" && (
                <div className="space-y-4">
                  <p className="font-body text-sm text-foreground font-medium">Send Quote for Approval</p>
                  <div>
                    <Label className="font-body text-xs">Amount ($)</Label>
                    <Input type="number" step="0.01" required value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} className="mt-1 font-body" placeholder="0.00" />
                  </div>
                  <div>
                    <Label className="font-body text-xs">Description</Label>
                    <Textarea value={quoteDesc} onChange={(e) => setQuoteDesc(e.target.value)} className="mt-1 font-body text-sm" placeholder="Describe the work and costs..." />
                  </div>
                  <div>
                    <Label className="font-body text-xs">Customer Phone (for SMS)</Label>
                    <Input type="tel" value={quotePhone} onChange={(e) => setQuotePhone(e.target.value)} className="mt-1 font-body" placeholder="+1234567890" />
                  </div>
                  <Button onClick={sendQuote} disabled={sendingQuote || !quoteAmount} className="w-full bg-primary text-primary-foreground font-body text-sm">
                    {sendingQuote ? "Sending..." : "Send Quote via SMS"}
                  </Button>
                </div>
              )}

              {activePanel === "invite" && (
                <div className="space-y-4">
                  <p className="font-body text-sm text-foreground font-medium">Send Appointment Invitation</p>
                  <div>
                    <Label className="font-body text-xs">Appointment Type</Label>
                    <div className="flex gap-2 mt-1">
                      {(["review", "pickup"] as const).map((t) => (
                        <button key={t} type="button" onClick={() => setInviteType(t)}
                          className={`px-4 py-2 font-body text-xs border capitalize transition-colors ${
                            inviteType === t ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground"
                          }`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="font-body text-xs">Message (optional)</Label>
                    <Textarea value={inviteMsg} onChange={(e) => setInviteMsg(e.target.value)} className="mt-1 font-body text-sm" placeholder="Add a note about the appointment..." />
                  </div>
                  <div>
                    <Label className="font-body text-xs">Customer Phone (for SMS)</Label>
                    <Input type="tel" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} className="mt-1 font-body" placeholder="+1234567890" />
                  </div>
                  <Button onClick={sendInvite} disabled={sendingInvite} className="w-full bg-primary text-primary-foreground font-body text-sm">
                    {sendingInvite ? "Sending..." : "Send Invitation via SMS"}
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Search */}
        <div className="relative max-w-sm mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 font-body" />
        </div>

        <OrderTable items={filteredOrders} />
      </div>

      {/* Confirm Create Order Dialog */}
      <AlertDialog open={showConfirmCreate} onOpenChange={setShowConfirmCreate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body">Confirm Order Creation</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              Are you sure you want to create this {newOrder.orderType === "custom" ? "Custom Piece" : "Repair"} order for {newOrder.firstName || newOrder.customerEmail}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body">Cancel</AlertDialogCancel>
            <AlertDialogAction className="font-body" onClick={confirmCreateOrder}>Create Order</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Prompt Dialog */}
      <AlertDialog open={showPrintPrompt} onOpenChange={setShowPrintPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body flex items-center gap-2">
              <Printer className="w-5 h-5" /> Print Order Form
            </AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              Order created successfully! Would you like to print the order form?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body">No, Skip</AlertDialogCancel>
            <AlertDialogAction className="font-body" onClick={() => {
              if (createdOrderData) printOrderForm(createdOrderData);
              setCreatedOrderData(null);
            }}>
              Print Form
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
