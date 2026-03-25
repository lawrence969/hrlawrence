import { useState, useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare, LogOut, DollarSign, Calendar, Check, X as XIcon, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const statusLabels: Record<string, string> = {
  intake: "Intake", quote_sent: "Quote Sent", quote_approved: "Quote Approved",
  in_design: "In Design", design_approved: "Design Approved", in_production: "In Production",
  complete: "Work Complete", ready_pickup: "Ready for Pickup", picked_up: "Picked Up", in_progress: "In Progress",
};

const departmentLabels: Record<string, string> = {
  front_of_store: "Front of Store", repair: "Repair", design: "Design", setting: "Setting",
};

const repairSteps = ["intake", "in_progress", "complete", "ready_pickup", "picked_up"];
const customSteps = ["intake", "quote_sent", "quote_approved", "in_design", "design_approved", "in_production", "complete", "ready_pickup", "picked_up"];
const messagingStages = ["quote_sent", "quote_approved", "in_design", "design_approved"];

interface Order {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  current_department: string;
  item_description: string;
  created_at: string;
}

interface Quote {
  id: string;
  order_id: string;
  amount: number;
  description: string | null;
  status: string;
  sent_at: string;
}

interface Invitation {
  id: string;
  order_id: string;
  invitation_type: string;
  message: string | null;
  status: string;
  created_at: string;
}

interface Message {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
}

const MyOrders = () => {
  const { user, profile, loading, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      setOrders(data || []);
    };
    fetchOrders();
    const channel = supabase.channel("my-orders").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrders()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Fetch messages, quotes, invitations for selected order
  useEffect(() => {
    if (!selectedOrder) return;
    const fetchAll = async () => {
      const [msgRes, quoteRes, invRes] = await Promise.all([
        supabase.from("order_messages").select("*").eq("order_id", selectedOrder.id).order("created_at", { ascending: true }),
        supabase.from("quotes").select("*").eq("order_id", selectedOrder.id).order("created_at", { ascending: false }),
        supabase.from("appointment_invitations").select("*").eq("order_id", selectedOrder.id).order("created_at", { ascending: false }),
      ]);
      setMessages(msgRes.data || []);
      setQuotes(quoteRes.data || []);
      setInvitations(invRes.data || []);
    };
    fetchAll();

    const ch1 = supabase.channel(`my-msgs-${selectedOrder.id}`).on("postgres_changes", { event: "*", schema: "public", table: "order_messages", filter: `order_id=eq.${selectedOrder.id}` }, () => fetchAll()).subscribe();
    const ch2 = supabase.channel(`my-quotes-${selectedOrder.id}`).on("postgres_changes", { event: "*", schema: "public", table: "quotes", filter: `order_id=eq.${selectedOrder.id}` }, () => fetchAll()).subscribe();

    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [selectedOrder]);

  // Auto-select from URL params (deep link from SMS)
  useEffect(() => {
    if (orders.length === 0) return;
    const quoteId = searchParams.get("quote");
    const inviteId = searchParams.get("invite");
    if (quoteId || inviteId) {
      // Find the order associated with this quote/invite
      const findOrder = async () => {
        if (quoteId) {
          const { data } = await supabase.from("quotes").select("order_id").eq("id", quoteId).single();
          if (data) {
            const order = orders.find((o) => o.id === data.order_id);
            if (order) setSelectedOrder(order);
          }
        } else if (inviteId) {
          const { data } = await supabase.from("appointment_invitations").select("order_id").eq("id", inviteId).single();
          if (data) {
            const order = orders.find((o) => o.id === data.order_id);
            if (order) setSelectedOrder(order);
          }
        }
      };
      findOrder();
    }
  }, [orders, searchParams]);

  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (loading) return <div className="min-h-screen flex items-center justify-center font-body text-muted-foreground">Loading...</div>;

  const getSteps = (order: Order) => order.order_type === "repair" ? repairSteps : customSteps;
  const canMessage = selectedOrder && messagingStages.includes(selectedOrder.status);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedOrder || !user) return;
    setSendingMessage(true);
    const { error } = await supabase.from("order_messages").insert({ order_id: selectedOrder.id, sender_id: user.id, message: newMessage.trim() });
    if (error) toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
    else setNewMessage("");
    setSendingMessage(false);
  };

  const respondToQuote = async (quoteId: string, response: "approved" | "declined") => {
    const { error } = await supabase.from("quotes").update({ status: response, responded_at: new Date().toISOString() }).eq("id", quoteId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: response === "approved" ? "Quote Approved" : "Quote Declined" });
      // If approved and order is in quote_sent, advance to quote_approved
      if (response === "approved" && selectedOrder?.status === "quote_sent") {
        await supabase.from("orders").update({ status: "quote_approved" }).eq("id", selectedOrder.id);
      }
    }
  };

  const respondToInvitation = async (inviteId: string) => {
    await supabase.from("appointment_invitations").update({ status: "accepted" }).eq("id", inviteId);
    toast({ title: "Invitation Accepted", description: "Please contact us to finalize the appointment time." });
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-32 pb-24 bg-cream min-h-[80vh]">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display text-foreground">My Orders</h1>
              <p className="font-body text-sm text-muted-foreground">Welcome, {profile?.first_name || "there"}</p>
            </div>
            <Button variant="ghost" onClick={signOut} className="font-body text-sm text-muted-foreground">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-body text-muted-foreground">No orders found yet. Your orders will appear here once your piece is checked in.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Order Table */}
              <div className="lg:col-span-2 bg-background border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-body text-xs">Order #</TableHead>
                      <TableHead className="font-body text-xs">Item</TableHead>
                      <TableHead className="font-body text-xs">Type</TableHead>
                      <TableHead className="font-body text-xs">Status</TableHead>
                      <TableHead className="font-body text-xs">Dept</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...orders].sort((a, b) => a.order_number.localeCompare(b.order_number, undefined, { numeric: true })).map((order) => (
                      <TableRow
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`cursor-pointer font-body text-sm ${selectedOrder?.id === order.id ? "bg-accent/10" : ""}`}
                      >
                        <TableCell className="font-display text-sm whitespace-nowrap">{order.order_number}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">{order.item_description}</TableCell>
                        <TableCell><Badge className={`font-body text-xs capitalize ${order.order_type === "custom" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>{order.order_type}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                            <span className="text-xs text-accent font-medium whitespace-nowrap">{statusLabels[order.status] || order.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{departmentLabels[order.current_department] || order.current_department}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Order Detail */}
              {selectedOrder && (
                <motion.div key={selectedOrder.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 bg-background border border-border p-6 self-start space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-body text-xs text-muted-foreground">Order</p>
                      <p className="font-display text-xl text-foreground">{selectedOrder.order_number}</p>
                    </div>
                    <Badge variant="secondary" className="font-body text-xs capitalize">{selectedOrder.order_type}</Badge>
                  </div>

                  <div>
                    <p className="font-body text-xs text-muted-foreground mb-1">Item</p>
                    <p className="font-body text-sm text-foreground">{selectedOrder.item_description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="font-body text-sm text-foreground">{departmentLabels[selectedOrder.current_department]}</span>
                  </div>

                  {/* Progress */}
                  <div>
                    <p className="font-body text-xs text-muted-foreground mb-3">Progress</p>
                    <div className="space-y-2">
                      {getSteps(selectedOrder).map((step, index) => {
                        const steps = getSteps(selectedOrder);
                        const currentIdx = steps.indexOf(selectedOrder.status);
                        const isComplete = index <= currentIdx;
                        const isCurrent = index === currentIdx;
                        return (
                          <div key={step} className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isCurrent ? "bg-accent ring-3 ring-accent/20" : isComplete ? "bg-primary" : "bg-border"}`} />
                            <span className={`font-body text-xs ${isCurrent ? "text-foreground font-semibold" : isComplete ? "text-foreground" : "text-muted-foreground"}`}>{statusLabels[step] || step}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pending Quotes */}
                  {quotes.filter((q) => q.status === "pending").length > 0 && (
                    <div className="border-t border-border pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="w-4 h-4 text-accent" />
                        <p className="font-body text-xs text-foreground font-medium">Quote Awaiting Approval</p>
                      </div>
                      {quotes.filter((q) => q.status === "pending").map((q) => (
                        <div key={q.id} className="bg-accent/5 border border-accent/20 p-4 mb-2">
                          <p className="font-display text-lg text-foreground">${q.amount}</p>
                          {q.description && <p className="font-body text-sm text-muted-foreground mt-1">{q.description}</p>}
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" onClick={() => respondToQuote(q.id, "approved")} className="bg-green-600 hover:bg-green-700 text-white font-body text-xs">
                              <Check className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => respondToQuote(q.id, "declined")} className="font-body text-xs border-destructive text-destructive hover:bg-destructive/10">
                              <XIcon className="w-3 h-3 mr-1" /> Decline
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Past Quotes */}
                  {quotes.filter((q) => q.status !== "pending").length > 0 && (
                    <div>
                      <p className="font-body text-xs text-muted-foreground mb-2">Quote History</p>
                      {quotes.filter((q) => q.status !== "pending").map((q) => (
                        <div key={q.id} className="flex justify-between items-center bg-muted/50 p-3 mb-1">
                          <span className="font-body text-sm text-foreground">${q.amount}</span>
                          <Badge variant="secondary" className={`font-body text-xs ${q.status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{q.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pending Invitations */}
                  {invitations.filter((i) => i.status === "pending").length > 0 && (
                    <div className="border-t border-border pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-accent" />
                        <p className="font-body text-xs text-foreground font-medium">Appointment Invitation</p>
                      </div>
                      {invitations.filter((i) => i.status === "pending").map((inv) => (
                        <div key={inv.id} className="bg-accent/5 border border-accent/20 p-4 mb-2">
                          <p className="font-body text-sm text-foreground capitalize">You're invited to schedule a <strong>{inv.invitation_type}</strong> appointment.</p>
                          {inv.message && <p className="font-body text-xs text-muted-foreground mt-1">{inv.message}</p>}
                          <Button size="sm" onClick={() => respondToInvitation(inv.id)} className="mt-3 bg-primary text-primary-foreground font-body text-xs">
                            <Calendar className="w-3 h-3 mr-1" /> Accept & Schedule
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Messaging */}
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <p className="font-body text-xs text-muted-foreground font-medium">Messages</p>
                    </div>
                    {messages.length === 0 && !canMessage && <p className="font-body text-xs text-muted-foreground italic">No messages yet.</p>}
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
                    {canMessage ? (
                      <div className="flex gap-2">
                        <Input placeholder="Ask a question or leave a comment..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} className="font-body text-xs" />
                        <Button size="sm" onClick={handleSendMessage} disabled={sendingMessage} className="bg-primary text-primary-foreground"><Send className="w-3 h-3" /></Button>
                      </div>
                    ) : (
                      <p className="font-body text-xs text-muted-foreground italic">Messaging is available during quote and design approval stages.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MyOrders;
