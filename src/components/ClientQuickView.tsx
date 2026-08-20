import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { ExternalLink, Save } from "lucide-react";

interface Tag { id: string; label: string; color: string }
interface OrderRow { id: string; order_number: string; status: string; item_description: string; created_at: string }

interface Props {
  clientId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}

const emptyForm = { first_name: "", last_name: "", email: "", phone: "", sms_consent: false };

const ClientQuickView = ({ clientId, open, onOpenChange, onSaved }: Props) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientNumber, setClientNumber] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [initial, setInitial] = useState(emptyForm);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagIds, setTagIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !clientId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: o }, { data: t }, { data: assigns }] = await Promise.all([
        supabase.from("profiles").select("id, client_number, first_name, last_name, email, phone, sms_consent").eq("id", clientId).maybeSingle(),
        supabase.from("orders").select("id, order_number, status, item_description, created_at").eq("customer_profile_id", clientId).order("created_at", { ascending: false }),
        supabase.from("client_tags").select("id, label, color").order("label"),
        supabase.from("client_tag_assignments").select("tag_id").eq("profile_id", clientId),
      ]);
      if (cancelled) return;
      const next = {
        first_name: p?.first_name ?? "",
        last_name: p?.last_name ?? "",
        email: p?.email ?? "",
        phone: p?.phone ?? "",
        sms_consent: !!p?.sms_consent,
      };
      setClientNumber(p?.client_number ?? null);
      setForm(next);
      setInitial(next);
      setOrders((o as OrderRow[]) ?? []);
      setAllTags((t as Tag[]) ?? []);
      setTagIds(new Set((assigns ?? []).map((a: any) => a.tag_id)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, clientId]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const toggleTag = async (tag: Tag) => {
    if (!clientId) return;
    const has = tagIds.has(tag.id);
    const next = new Set(tagIds);
    has ? next.delete(tag.id) : next.add(tag.id);
    setTagIds(next);
    const { error } = has
      ? await supabase.from("client_tag_assignments").delete().eq("profile_id", clientId).eq("tag_id", tag.id)
      : await supabase.from("client_tag_assignments").insert({ profile_id: clientId, tag_id: tag.id });
    if (error) {
      setTagIds(tagIds);
      toast({ title: "Tag update failed", description: error.message, variant: "destructive" });
    }
  };

  const save = async () => {
    if (!clientId) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      sms_consent: form.sms_consent,
    }).eq("id", clientId);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setInitial(form);
    toast({ title: "Client updated" });
    onSaved?.();
  };

  const handleOpenChange = (v: boolean) => {
    if (!v && dirty && !window.confirm("You have unsaved changes. Close without saving?")) return;
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-3">
            {clientNumber ?? "Client"}
            <span className="text-base font-body text-muted-foreground">{form.first_name} {form.last_name}</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="font-body text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : (
          <div className="space-y-6 font-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First name</Label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Last name</Label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={form.sms_consent} onCheckedChange={(v) => setForm({ ...form, sms_consent: !!v })} />
              Client consents to text messages
            </label>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {allTags.length === 0 && <span className="text-sm text-muted-foreground">No tags created yet</span>}
                {allTags.map((t) => {
                  const active = tagIds.has(t.id);
                  return (
                    <button key={t.id} type="button" onClick={() => toggleTag(t)}>
                      <Badge
                        variant={active ? "default" : "outline"}
                        style={active ? { backgroundColor: t.color, borderColor: t.color } : { borderColor: t.color, color: t.color }}
                        className="text-xs cursor-pointer"
                      >
                        {t.label}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Orders ({orders.length})</Label>
              <div className="border border-border divide-y divide-border max-h-48 overflow-y-auto">
                {orders.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">No orders yet</p>
                ) : orders.map((o) => (
                  <Link key={o.id} to={`/admin?order=${o.id}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted/50">
                    <span className="font-medium text-primary">{o.order_number}</span>
                    <span className="flex-1 truncate text-muted-foreground">{o.item_description}</span>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">{o.status.replace(/_/g, " ")}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
              <Link to={`/admin/clients/${clientId}`} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                <ExternalLink className="w-4 h-4" /> Open full client file
              </Link>
              <div className="flex items-center gap-2">
                {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
                <Button onClick={save} disabled={!dirty || saving} className="gap-2">
                  <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClientQuickView;
