import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, Plus, Search, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import logoWhite from "@/assets/logo-white.jpg";

type RepairStatus = "intake" | "in_progress" | "complete" | "ready_pickup" | "picked_up";
type CustomStatus = "consultation" | "quote_sent" | "quote_approved" | "in_design" | "design_approved" | "in_production" | "complete" | "ready_pickup" | "picked_up";

interface RepairOrder {
  id: string;
  orderNumber: string;
  clientName: string;
  phone: string;
  item: string;
  status: RepairStatus;
  date: string;
}

interface CustomOrder {
  id: string;
  orderNumber: string;
  clientName: string;
  phone: string;
  item: string;
  status: CustomStatus;
  date: string;
}

const repairStatusLabels: Record<RepairStatus, string> = {
  intake: "Intake",
  in_progress: "In Progress",
  complete: "Complete",
  ready_pickup: "Ready for Pickup",
  picked_up: "Picked Up",
};

const customStatusLabels: Record<CustomStatus, string> = {
  consultation: "Consultation",
  quote_sent: "Quote Sent",
  quote_approved: "Quote Approved",
  in_design: "In Design",
  design_approved: "Design Approved",
  in_production: "In Production",
  complete: "Complete",
  ready_pickup: "Ready for Pickup",
  picked_up: "Picked Up",
};

const repairStatusFlow: RepairStatus[] = ["intake", "in_progress", "complete", "ready_pickup", "picked_up"];
const customStatusFlow: CustomStatus[] = ["consultation", "quote_sent", "quote_approved", "in_design", "design_approved", "in_production", "complete", "ready_pickup", "picked_up"];

const mockRepairs: RepairOrder[] = [
  { id: "1", orderNumber: "HRL-R-0001", clientName: "Sarah Mitchell", phone: "(555) 123-4567", item: "Gold Ring Resize", status: "in_progress", date: "2026-02-20" },
  { id: "2", orderNumber: "HRL-R-0002", clientName: "James Chen", phone: "(555) 987-6543", item: "Pearl Necklace Restring", status: "intake", date: "2026-02-25" },
  { id: "3", orderNumber: "HRL-R-0003", clientName: "Maria Garcia", phone: "(555) 456-7890", item: "Diamond Bracelet Clasp", status: "complete", date: "2026-02-18" },
];

const mockCustom: CustomOrder[] = [
  { id: "1", orderNumber: "HRL-C-0001", clientName: "Emily Watson", phone: "(555) 222-3333", item: "Custom Engagement Ring", status: "in_design", date: "2026-02-15" },
  { id: "2", orderNumber: "HRL-C-0002", clientName: "David Park", phone: "(555) 444-5555", item: "Bespoke Wedding Band Set", status: "quote_sent", date: "2026-02-22" },
];

const statusColor = (status: string) => {
  if (["intake", "consultation"].includes(status)) return "bg-secondary text-secondary-foreground";
  if (["in_progress", "in_design", "in_production"].includes(status)) return "bg-accent/20 text-accent";
  if (["complete", "ready_pickup"].includes(status)) return "bg-green-100 text-green-800";
  if (status === "picked_up") return "bg-muted text-muted-foreground";
  return "bg-secondary text-secondary-foreground";
};

const AdminDashboard = () => {
  const [repairs, setRepairs] = useState(mockRepairs);
  const [customs, setCustoms] = useState(mockCustom);
  const [searchRepair, setSearchRepair] = useState("");
  const [searchCustom, setSearchCustom] = useState("");

  const advanceRepair = (id: string) => {
    setRepairs((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const idx = repairStatusFlow.indexOf(r.status);
        if (idx < repairStatusFlow.length - 1) return { ...r, status: repairStatusFlow[idx + 1] };
        return r;
      })
    );
  };

  const advanceCustom = (id: string) => {
    setCustoms((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const idx = customStatusFlow.indexOf(c.status);
        if (idx < customStatusFlow.length - 1) return { ...c, status: customStatusFlow[idx + 1] };
        return c;
      })
    );
  };

  const filteredRepairs = repairs.filter((r) =>
    r.clientName.toLowerCase().includes(searchRepair.toLowerCase()) ||
    r.orderNumber.toLowerCase().includes(searchRepair.toLowerCase())
  );

  const filteredCustom = customs.filter((c) =>
    c.clientName.toLowerCase().includes(searchCustom.toLowerCase()) ||
    c.orderNumber.toLowerCase().includes(searchCustom.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-muted">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-64 bg-primary text-primary-foreground p-6 hidden lg:flex flex-col">
        <Link to="/">
          <img src={logoWhite} alt="HR Lawrence" className="h-10 mb-10" />
        </Link>
        <nav className="space-y-2 flex-1">
          <div className="px-4 py-2 bg-sidebar-accent rounded text-sm font-body font-medium">Dashboard</div>
          <div className="px-4 py-2 text-sm font-body text-primary-foreground/60 hover:text-primary-foreground cursor-pointer">Appointments</div>
          <div className="px-4 py-2 text-sm font-body text-primary-foreground/60 hover:text-primary-foreground cursor-pointer">Clients</div>
        </nav>
        <div className="flex items-center gap-2 text-sm font-body text-primary-foreground/60 cursor-pointer hover:text-primary-foreground">
          <LogOut className="w-4 h-4" /> Sign Out
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64 p-6 lg:p-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display text-foreground">Dashboard</h1>
            <p className="font-body text-sm text-muted-foreground">Manage all client orders</p>
          </div>
          <Button className="bg-primary text-primary-foreground font-body text-sm">
            <Plus className="w-4 h-4 mr-2" /> New Order
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Repairs", value: repairs.filter((r) => r.status !== "picked_up").length },
            { label: "Active Custom", value: customs.filter((c) => c.status !== "picked_up").length },
            { label: "Ready for Pickup", value: repairs.filter((r) => r.status === "ready_pickup").length + customs.filter((c) => c.status === "ready_pickup").length },
            { label: "Completed Today", value: 1 },
          ].map((stat) => (
            <div key={stat.label} className="bg-background border border-border p-5">
              <p className="font-body text-sm text-muted-foreground">{stat.label}</p>
              <p className="font-display text-2xl text-foreground mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="repairs">
          <TabsList className="bg-background border border-border mb-6">
            <TabsTrigger value="repairs" className="font-body text-sm">Repairs</TabsTrigger>
            <TabsTrigger value="custom" className="font-body text-sm">Custom Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="repairs">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search repairs..."
                  value={searchRepair}
                  onChange={(e) => setSearchRepair(e.target.value)}
                  className="pl-10 font-body"
                />
              </div>
            </div>
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
                  {filteredRepairs.map((repair) => (
                    <motion.tr
                      key={repair.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-body text-sm font-medium text-foreground">{repair.orderNumber}</td>
                      <td className="px-4 py-3 font-body text-sm text-foreground">{repair.clientName}</td>
                      <td className="px-4 py-3 font-body text-sm text-muted-foreground hidden md:table-cell">{repair.item}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={`font-body text-xs ${statusColor(repair.status)}`}>
                          {repairStatusLabels[repair.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {repair.status !== "picked_up" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => advanceRepair(repair.id)}
                            className="font-body text-xs text-accent hover:text-accent"
                          >
                            Advance <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="custom">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search custom orders..."
                  value={searchCustom}
                  onChange={(e) => setSearchCustom(e.target.value)}
                  className="pl-10 font-body"
                />
              </div>
            </div>
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
                  {filteredCustom.map((order) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-body text-sm font-medium text-foreground">{order.orderNumber}</td>
                      <td className="px-4 py-3 font-body text-sm text-foreground">{order.clientName}</td>
                      <td className="px-4 py-3 font-body text-sm text-muted-foreground hidden md:table-cell">{order.item}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={`font-body text-xs ${statusColor(order.status)}`}>
                          {customStatusLabels[order.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {order.status !== "picked_up" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => advanceCustom(order.id)}
                            className="font-body text-xs text-accent hover:text-accent"
                          >
                            Advance <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
