import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const statusLabels: Record<string, string> = {
  intake: "Intake",
  quote_sent: "Quote Sent",
  quote_approved: "Quote Approved",
  in_design: "In Design",
  design_approved: "Design Approved",
  in_production: "In Production",
  complete: "Work Complete",
  ready_pickup: "Ready for Pickup",
  picked_up: "Picked Up",
  in_progress: "In Progress",
};

const repairSteps = ["intake", "in_progress", "complete", "ready_pickup", "picked_up"];
const customSteps = ["intake", "quote_sent", "quote_approved", "in_design", "design_approved", "in_production", "complete", "ready_pickup", "picked_up"];

const messagingStages = ["quote_sent", "quote_approved", "in_design", "design_approved"];

interface Order {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  item_description: string;
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      setOrders(data || []);
    };
    fetchOrders();

    const channel = supabase
      .channel("my-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (!selectedOrder) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("order_messages")
        .select("*")
        .eq("order_id", selectedOrder.id)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    };
    fetchMessages();

    const channel = supabase
      .channel(`messages-${selectedOrder.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_messages", filter: `order_id=eq.${selectedOrder.id}` }, () => fetchMessages())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedOrder]);

  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (loading) return <div className="min-h-screen flex items-center justify-center font-body text-muted-foreground">Loading...</div>;

  const getSteps = (order: Order) => order.order_type === "repair" ? repairSteps : customSteps;
  const canMessage = selectedOrder && messagingStages.includes(selectedOrder.status);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedOrder || !user) return;
    setSendingMessage(true);
    const { error } = await supabase.from("order_messages").insert({
      order_id: selectedOrder.id,
      sender_id: user.id,
      message: newMessage.trim(),
    });
    if (error) {
      toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
    } else {
      setNewMessage("");
    }
    setSendingMessage(false);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-32 pb-24 bg-cream min-h-[80vh]">
        <div className="container mx-auto px-6 max-w-4xl">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Order List */}
              <div className="space-y-3">
                {orders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`w-full text-left bg-background border p-5 transition-colors ${
                      selectedOrder?.id === order.id ? "border-accent" : "border-border hover:border-accent/50"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-display text-base text-foreground">{order.order_number}</p>
                        <p className="font-body text-sm text-muted-foreground mt-1">{order.item_description}</p>
                      </div>
                      <Badge variant="secondary" className="font-body text-xs capitalize">
                        {order.order_type}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                      <span className="font-body text-xs text-accent font-medium">{statusLabels[order.status] || order.status}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Order Detail */}
              {selectedOrder && (
                <motion.div
                  key={selectedOrder.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-background border border-border p-6 self-start"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="font-body text-xs text-muted-foreground">Order</p>
                      <p className="font-display text-xl text-foreground">{selectedOrder.order_number}</p>
                    </div>
                    <Badge variant="secondary" className="font-body text-xs capitalize">{selectedOrder.order_type}</Badge>
                  </div>

                  <p className="font-body text-xs text-muted-foreground mb-1">Item</p>
                  <p className="font-body text-sm text-foreground mb-6">{selectedOrder.item_description}</p>

                  <p className="font-body text-xs text-muted-foreground mb-3">Progress</p>
                  <div className="space-y-2 mb-6">
                    {getSteps(selectedOrder).map((step, index) => {
                      const steps = getSteps(selectedOrder);
                      const currentIdx = steps.indexOf(selectedOrder.status);
                      const isComplete = index <= currentIdx;
                      const isCurrent = index === currentIdx;
                      return (
                        <div key={step} className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            isCurrent ? "bg-accent ring-3 ring-accent/20" : isComplete ? "bg-primary" : "bg-border"
                          }`} />
                          <span className={`font-body text-xs ${
                            isCurrent ? "text-foreground font-semibold" : isComplete ? "text-foreground" : "text-muted-foreground"
                          }`}>
                            {statusLabels[step] || step}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Messaging */}
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <p className="font-body text-xs text-muted-foreground font-medium">Messages</p>
                    </div>

                    {messages.length === 0 && !canMessage && (
                      <p className="font-body text-xs text-muted-foreground italic">No messages yet.</p>
                    )}

                    {messages.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                        {messages.map((msg) => (
                          <div key={msg.id} className={`p-2 text-xs font-body ${
                            msg.sender_id === user?.id ? "bg-accent/10 ml-4" : "bg-muted mr-4"
                          }`}>
                            <p className="text-foreground">{msg.message}</p>
                            <p className="text-muted-foreground mt-1 text-[10px]">
                              {new Date(msg.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {canMessage ? (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ask a question or leave a comment..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                          className="font-body text-xs"
                        />
                        <Button size="sm" onClick={handleSendMessage} disabled={sendingMessage} className="bg-primary text-primary-foreground">
                          <Send className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <p className="font-body text-xs text-muted-foreground italic">
                        Messaging is available during quote and design approval stages.
                      </p>
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
