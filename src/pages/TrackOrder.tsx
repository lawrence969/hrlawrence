import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Search, Package, Clock, MapPin, CheckCircle2, Circle, Gem, User, Sparkles, Mail, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const statusLabels: Record<string, string> = {
  intake: "Intake", quote_sent: "Quote Sent", quote_approved: "Quote Approved",
  in_design: "In Design", design_approved: "Design Approved",
  in_production: "In Production", in_progress: "In Progress",
  complete: "Work Complete", ready_pickup: "Ready for Pickup", picked_up: "Picked Up",
  waiting_for_client: "Waiting For Client", larry_follow_up: "Larry Follow Up",
  on_hold: "On Hold",
};

const departmentLabels: Record<string, string> = {
  front_of_store: "Front of Store", workshop: "Workshop", design: "Design Studio",
  quality_control: "Quality Control", setting: "Setting", polishing: "Polishing", engraving: "Engraving",
};

const repairSteps = ["intake", "in_progress", "on_hold", "complete", "ready_pickup", "picked_up"];
const customSteps = ["intake", "in_design", "in_production", "on_hold", "complete", "ready_pickup", "picked_up"];

const statusToClientStep: Record<string, Record<string, string>> = {
  repair: {
    intake: "intake",
    in_progress: "in_progress",
    waiting_for_client: "on_hold",
    larry_follow_up: "on_hold",
    complete: "complete",
    ready_pickup: "ready_pickup",
    picked_up: "picked_up",
  },
  custom: {
    intake: "intake",
    quote_sent: "intake",
    quote_approved: "intake",
    in_design: "in_design",
    design_approved: "in_design",
    ordered_stones: "in_production",
    in_production: "in_production",
    waiting_for_client: "on_hold",
    larry_follow_up: "on_hold",
    complete: "complete",
    ready_pickup: "ready_pickup",
    picked_up: "picked_up",
  },
};

interface FoundOrder {
  order_number: string;
  order_type: string;
  status: string;
  item_description: string;
  current_department: string;
  order_date: string | null;
  delivery_date: string | null;
  metal: string | null;
  metal_type: string | null;
  colour: string | null;
  stone_type: string | null;
  stone_size: string | null;
  ring_size: string | null;
  first_name: string | null;
  last_name: string | null;
  rhodium_polish: boolean | null;
  deposit: number | null;
  budget: number | null;
}

const TrackOrder = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [foundOrder, setFoundOrder] = useState<FoundOrder | null>(null);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from("orders")
      .select("order_number, order_type, status, item_description, current_department, order_date, delivery_date, metal, metal_type, colour, stone_type, stone_size, ring_size, first_name, last_name, rhodium_polish, deposit, budget")
      .eq("order_number", searchQuery.toUpperCase().trim())
      .maybeSingle();
    setFoundOrder(data);
    setSearched(true);
    setSearching(false);
  };

  const getSteps = (type: string) => type === "repair" ? repairSteps : customSteps;

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-32 pb-24 bg-cream min-h-[80vh]">
        <div className="container mx-auto px-6 max-w-3xl">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="h-px w-8 bg-accent" />
              <p className="text-xs font-body tracking-[0.35em] uppercase text-accent font-semibold">Order Status</p>
              <div className="h-px w-8 bg-accent" />
            </div>
            <h1 className="text-3xl md:text-5xl font-display text-foreground mb-4">Track Your Order</h1>
            <p className="font-body text-muted-foreground max-w-md mx-auto">
              Enter your order number to view its current progress.{" "}
              <Link to="/auth" className="text-accent hover:underline font-medium">Sign in</Link> for full access.
            </p>
          </motion.div>

          {/* Search */}
          <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} onSubmit={handleSearch} className="flex gap-3 mb-14">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="e.g. HRL-2026-0001" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="font-body text-base pl-10 h-12 border-border focus:border-accent" />
            </div>
            <Button type="submit" disabled={searching || !searchQuery.trim()} className="bg-primary text-primary-foreground px-8 h-12 font-body tracking-wide">
              {searching ? "Searching…" : "Track"}
            </Button>
          </motion.form>

          <AnimatePresence mode="wait">
            {searched && !foundOrder && (
              <motion.div key="not-found" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                  <Package className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="font-body text-muted-foreground">No order found. Please check your order number and try again.</p>
              </motion.div>
            )}

            {foundOrder && (
              <motion.div key="found" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                {/* Order header card */}
                <div className="bg-background border border-border p-6 md:p-8">
                  <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                    <div>
                      <p className="text-xs font-body tracking-[0.2em] uppercase text-muted-foreground mb-1">Order Number</p>
                      <p className="font-display text-2xl text-foreground">{foundOrder.order_number}</p>
                      {(foundOrder.first_name || foundOrder.last_name) && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <User className="w-3.5 h-3.5 text-accent" />
                          <p className="font-body text-sm text-foreground font-medium">
                            {[foundOrder.first_name, foundOrder.last_name].filter(Boolean).join(" ")}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="sm:text-right">
                      <span className={`inline-block px-3 py-1 text-xs font-body font-semibold tracking-wider uppercase ${
                        foundOrder.order_type === "custom" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                      }`}>
                        {foundOrder.order_type === "custom" ? "Custom Piece" : "Repair"}
                      </span>
                    </div>
                  </div>

                  {/* Item description */}
                  <div className="mb-6 pb-6 border-b border-border">
                    <div className="flex items-start gap-3">
                      <Gem className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-body tracking-[0.2em] uppercase text-muted-foreground mb-1">Item Description</p>
                        <p className="font-body text-foreground">{foundOrder.item_description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                    {foundOrder.order_date && (
                      <div className="flex items-start gap-2">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-body tracking-[0.2em] uppercase text-muted-foreground">Order Date</p>
                          <p className="font-body text-sm text-foreground">{formatDate(foundOrder.order_date)}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-body tracking-[0.2em] uppercase text-muted-foreground">Department</p>
                        <p className="font-body text-sm text-foreground">{departmentLabels[foundOrder.current_department] || foundOrder.current_department}</p>
                      </div>
                    </div>
                    {(foundOrder.metal || foundOrder.metal_type || foundOrder.colour) && (
                      <div>
                        <p className="text-[10px] font-body tracking-[0.2em] uppercase text-muted-foreground">Metal</p>
                        <p className="font-body text-sm text-foreground">
                          {[foundOrder.metal, foundOrder.colour, foundOrder.metal_type].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    )}
                    {foundOrder.stone_type && (
                      <div>
                        <p className="text-[10px] font-body tracking-[0.2em] uppercase text-muted-foreground">Stone</p>
                        <p className="font-body text-sm text-foreground">
                          {[foundOrder.stone_type, foundOrder.stone_size].filter(Boolean).join(" — ")}
                        </p>
                      </div>
                    )}
                    {foundOrder.ring_size && (
                      <div>
                        <p className="text-[10px] font-body tracking-[0.2em] uppercase text-muted-foreground">Ring Size</p>
                        <p className="font-body text-sm text-foreground">{foundOrder.ring_size}</p>
                      </div>
                    )}
                    {foundOrder.rhodium_polish && (
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-body tracking-[0.2em] uppercase text-muted-foreground">Finish</p>
                          <p className="font-body text-sm text-foreground">Rhodium & Polish</p>
                        </div>
                      </div>
                    )}
                    {foundOrder.deposit != null && (
                      <div>
                        <p className="text-[10px] font-body tracking-[0.2em] uppercase text-muted-foreground">Deposit</p>
                        <p className="font-body text-sm text-foreground">${Number(foundOrder.deposit).toLocaleString()}</p>
                      </div>
                    )}
                    {foundOrder.budget != null && (
                      <div>
                        <p className="text-[10px] font-body tracking-[0.2em] uppercase text-muted-foreground">Budget</p>
                        <p className="font-body text-sm text-foreground">${Number(foundOrder.budget).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress tracker */}
                <div className="bg-background border border-border p-6 md:p-8">
                  <p className="text-xs font-body tracking-[0.2em] uppercase text-muted-foreground mb-6">Progress</p>
                  <div className="relative">
                    {getSteps(foundOrder.order_type).map((step, index) => {
                      const steps = getSteps(foundOrder.order_type);
                      const mappedStatus = statusToClientStep[foundOrder.order_type]?.[foundOrder.status] || foundOrder.status;
                      const currentIdx = steps.indexOf(mappedStatus);
                      const isComplete = index < currentIdx;
                      const isCurrent = index === currentIdx;
                      const isPast = index <= currentIdx;
                      const isLast = index === steps.length - 1;

                      return (
                        <div key={step} className="flex items-start gap-4 relative">
                          {!isLast && (
                            <div className="absolute left-[11px] top-6 bottom-0 w-px">
                              <div className={`h-full ${isPast ? "bg-accent" : "bg-border"}`} />
                            </div>
                          )}
                          <div className="relative z-10 flex-shrink-0">
                            {isComplete ? (
                              <CheckCircle2 className="w-6 h-6 text-accent" />
                            ) : isCurrent ? (
                              <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center ring-4 ring-accent/15">
                                <div className="w-2 h-2 rounded-full bg-accent-foreground" />
                              </div>
                            ) : (
                              <Circle className="w-6 h-6 text-border" />
                            )}
                          </div>
                          <div className={`pb-5`}>
                            <span className={`font-body text-sm ${
                              isCurrent ? "text-foreground font-semibold" : isComplete ? "text-foreground" : "text-muted-foreground"
                            }`}>
                              {statusLabels[step]}
                            </span>
                            {isCurrent && (
                              <span className="ml-2 inline-block px-2 py-0.5 text-[10px] font-body font-semibold tracking-wider uppercase bg-accent/10 text-accent rounded-sm">
                                Current
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TrackOrder;
