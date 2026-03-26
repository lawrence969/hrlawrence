import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const statusLabels: Record<string, string> = {
  intake: "Intake", quote_sent: "Quote Sent", quote_approved: "Quote Approved",
  in_design: "In Design", design_approved: "Design Approved",
  in_production: "In Production", in_progress: "In Progress",
  complete: "Work Complete", ready_pickup: "Ready for Pickup", picked_up: "Picked Up",
  waiting_for_client: "Waiting For Client", larry_follow_up: "Larry Follow Up",
};

const repairSteps = ["intake", "in_progress", "waiting_for_client", "larry_follow_up", "complete", "ready_pickup", "picked_up"];
const customSteps = ["intake", "quote_sent", "quote_approved", "in_design", "design_approved", "in_production", "waiting_for_client", "larry_follow_up", "complete", "ready_pickup", "picked_up"];

interface FoundOrder {
  order_number: string;
  order_type: string;
  status: string;
  item_description: string;
}

const TrackOrder = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [foundOrder, setFoundOrder] = useState<FoundOrder | null>(null);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    // Public lookup by order number — RLS allows customer to see own orders, but for unauthenticated 
    // users we use a simple select. If not found (RLS blocks or doesn't exist), show not found.
    const { data } = await supabase
      .from("orders")
      .select("order_number, order_type, status, item_description")
      .eq("order_number", searchQuery.toUpperCase().trim())
      .maybeSingle();
    setFoundOrder(data);
    setSearched(true);
    setSearching(false);
  };

  const getSteps = (type: string) => type === "repair" ? repairSteps : customSteps;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-32 pb-24 bg-cream min-h-[80vh]">
        <div className="container mx-auto px-6 max-w-2xl">
          <div className="text-center mb-12">
            <p className="text-sm font-body tracking-[0.3em] uppercase text-accent mb-4">Order Status</p>
            <h1 className="text-3xl md:text-5xl font-display text-foreground mb-4">Track Your Order</h1>
            <p className="font-body text-muted-foreground">
              Enter your order number to see the current status. <Link to="/auth" className="text-accent hover:underline">Sign in</Link> for full access to messaging and updates.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-3 mb-12">
            <Input placeholder="e.g. HRL-2026-0001" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="font-body text-base" />
            <Button type="submit" disabled={searching} className="bg-primary text-primary-foreground px-6">
              <Search className="w-4 h-4" />
            </Button>
          </form>

          {searched && !foundOrder && (
            <div className="text-center py-12">
              <p className="font-body text-muted-foreground">No order found. Please check your order number and try again.</p>
            </div>
          )}

          {foundOrder && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-background border border-border p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="font-body text-sm text-muted-foreground">Order</p>
                  <p className="font-display text-xl text-foreground">{foundOrder.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="font-body text-sm text-muted-foreground">Type</p>
                  <p className="font-body font-semibold text-foreground capitalize">{foundOrder.order_type === "custom" ? "Custom Piece" : "Repair"}</p>
                </div>
              </div>
              <p className="font-body text-sm text-muted-foreground mb-1">Item</p>
              <p className="font-body text-foreground mb-6">{foundOrder.item_description}</p>
              <p className="font-body text-sm text-muted-foreground mb-4">Progress</p>
              <div className="space-y-3">
                {getSteps(foundOrder.order_type).map((step, index) => {
                  const steps = getSteps(foundOrder.order_type);
                  const currentIdx = steps.indexOf(foundOrder.status);
                  const isComplete = index <= currentIdx;
                  const isCurrent = index === currentIdx;
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        isCurrent ? "bg-accent ring-4 ring-accent/20" : isComplete ? "bg-primary" : "bg-border"
                      }`} />
                      <span className={`font-body text-sm ${
                        isCurrent ? "text-foreground font-semibold" : isComplete ? "text-foreground" : "text-muted-foreground"
                      }`}>{statusLabels[step]}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TrackOrder;
