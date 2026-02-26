import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

type OrderStatus = "intake" | "quote_sent" | "quote_approved" | "in_design" | "design_approved" | "in_production" | "complete" | "ready_pickup" | "picked_up";

interface MockOrder {
  orderNumber: string;
  type: "repair" | "custom";
  status: OrderStatus;
  item: string;
  date: string;
}

const statusLabels: Record<OrderStatus, string> = {
  intake: "Intake",
  quote_sent: "Quote Sent",
  quote_approved: "Quote Approved",
  in_design: "In Design",
  design_approved: "Design Approved",
  in_production: "In Production",
  complete: "Work Complete",
  ready_pickup: "Ready for Pickup",
  picked_up: "Picked Up",
};

const repairSteps: OrderStatus[] = ["intake", "in_production", "complete", "ready_pickup", "picked_up"];
const customSteps: OrderStatus[] = ["intake", "quote_sent", "quote_approved", "in_design", "design_approved", "in_production", "complete", "ready_pickup", "picked_up"];

const mockOrders: MockOrder[] = [
  { orderNumber: "HRL-2026-0001", type: "repair", status: "in_production", item: "Gold Ring Resize", date: "2026-02-20" },
  { orderNumber: "HRL-2026-0002", type: "custom", status: "in_design", item: "Custom Engagement Ring", date: "2026-02-15" },
];

const TrackOrder = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [foundOrder, setFoundOrder] = useState<MockOrder | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const order = mockOrders.find((o) => o.orderNumber.toLowerCase() === searchQuery.toLowerCase());
    setFoundOrder(order || null);
    setSearched(true);
  };

  const getSteps = (order: MockOrder) => (order.type === "repair" ? repairSteps : customSteps);
  const getCurrentIndex = (order: MockOrder) => getSteps(order).indexOf(order.status);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-32 pb-24 bg-cream min-h-[80vh]">
        <div className="container mx-auto px-6 max-w-2xl">
          <div className="text-center mb-12">
            <p className="text-sm font-body tracking-[0.3em] uppercase text-accent mb-4">Order Status</p>
            <h1 className="text-3xl md:text-5xl font-display text-foreground mb-4">Track Your Order</h1>
            <p className="font-body text-muted-foreground">
              Enter your order number to see the current status of your piece.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-3 mb-12">
            <Input
              placeholder="e.g. HRL-2026-0001"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="font-body text-base"
            />
            <Button type="submit" className="bg-primary text-primary-foreground px-6">
              <Search className="w-4 h-4" />
            </Button>
          </form>

          {searched && !foundOrder && (
            <div className="text-center py-12">
              <p className="font-body text-muted-foreground">No order found. Please check your order number and try again.</p>
            </div>
          )}

          {foundOrder && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background border border-border p-8"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="font-body text-sm text-muted-foreground">Order</p>
                  <p className="font-display text-xl text-foreground">{foundOrder.orderNumber}</p>
                </div>
                <div className="text-right">
                  <p className="font-body text-sm text-muted-foreground">Type</p>
                  <p className="font-body font-semibold text-foreground capitalize">{foundOrder.type === "custom" ? "Custom Piece" : "Repair"}</p>
                </div>
              </div>

              <p className="font-body text-sm text-muted-foreground mb-1">Item</p>
              <p className="font-body text-foreground mb-6">{foundOrder.item}</p>

              <p className="font-body text-sm text-muted-foreground mb-4">Progress</p>
              <div className="space-y-3">
                {getSteps(foundOrder).map((step, index) => {
                  const currentIdx = getCurrentIndex(foundOrder);
                  const isComplete = index <= currentIdx;
                  const isCurrent = index === currentIdx;
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        isCurrent ? "bg-accent ring-4 ring-accent/20" : isComplete ? "bg-primary" : "bg-border"
                      }`} />
                      <span className={`font-body text-sm ${
                        isCurrent ? "text-foreground font-semibold" : isComplete ? "text-foreground" : "text-muted-foreground"
                      }`}>
                        {statusLabels[step]}
                      </span>
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
