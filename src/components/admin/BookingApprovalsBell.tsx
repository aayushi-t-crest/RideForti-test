import { useEffect, useState, useCallback } from "react";
import { Bell, Check, X, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type PendingBooking = {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  incentive_amount: number | null;
  submitted_at: string | null;
  submitted_by: string | null;
  list_id: string;
  submitter_name?: string | null;
  list_name?: string | null;
};

const BookingApprovalsBell = ({ listId }: { listId?: string }) => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [pending, setPending] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("outbound_call_contacts")
      .select("id,name,first_name,last_name,phone,email,incentive_amount,submitted_at,submitted_by,list_id")
      .eq("ride_booked", true)
      .eq("incentive_status", "pending")
      .order("submitted_at", { ascending: false })
      .limit(50);
    if (listId) q = q.eq("list_id", listId);
    const { data, error } = await q;
    if (error) {
      setLoading(false);
      return;
    }
    const rows = (data || []) as PendingBooking[];
    const submitterIds = Array.from(new Set(rows.map((r) => r.submitted_by).filter(Boolean) as string[]));
    const listIds = Array.from(new Set(rows.map((r) => r.list_id).filter(Boolean)));
    const [usersRes, listsRes] = await Promise.all([
      submitterIds.length
        ? supabase.from("admin_users_directory").select("user_id,full_name,email").in("user_id", submitterIds)
        : Promise.resolve({ data: [] as any[] }),
      listIds.length
        ? supabase.from("outbound_call_lists").select("id,name").in("id", listIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const userMap = new Map<string, string>();
    (usersRes.data || []).forEach((u: any) => userMap.set(u.user_id, u.full_name || u.email));
    const listMap = new Map<string, string>();
    (listsRes.data || []).forEach((l: any) => listMap.set(l.id, l.name));
    setPending(
      rows.map((r) => ({
        ...r,
        submitter_name: r.submitted_by ? userMap.get(r.submitted_by) || null : null,
        list_name: listMap.get(r.list_id) || null,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    load();
    const channel = supabase
      .channel("booking-approvals-bell")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "outbound_call_contacts" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, load, listId]);

  const review = async (row: PendingBooking, status: "approved" | "denied") => {
    setActingId(row.id);
    const updates: Record<string, any> = {
      incentive_status: status,
      incentive_reviewed_by: user?.id ?? null,
      incentive_reviewed_at: new Date().toISOString(),
    };
    // Denying a booking returns the contact to "unbooked" so it can be re-submitted.
    if (status === "denied") {
      updates.ride_booked = false;
      updates.submitted_at = null;
    }
    const { error } = await supabase
      .from("outbound_call_contacts")
      .update(updates)
      .eq("id", row.id);
    setActingId(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: status === "approved" ? "Booking confirmed" : "Booking denied",
      description: status === "approved" ? "Payout moved to confirmed." : "Contact reset to unbooked.",
    });
    setPending((prev) => prev.filter((p) => p.id !== row.id));
  };

  if (!isAdmin) return null;

  const count = pending.length;
  const displayName = (r: PendingBooking) => {
    const fn = (r.first_name || "").trim();
    const ln = (r.last_name || "").trim();
    const combined = `${fn} ${ln}`.trim();
    return combined || r.name || r.email || r.phone || "Unknown lead";
  };

  return (
    <div className="inline-flex items-center gap-1">
      <Button
        variant="fortiGhost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          load();
          toast({ title: "Refreshed", description: "Approvals updated." });
        }}
        title="Force refresh approvals"
        disabled={loading}
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="fortiGhost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            {count > 0 && (
              <Badge
                variant="default"
                className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-emerald-500 text-black hover:bg-emerald-500"
              >
                {count > 99 ? "99+" : count}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 bg-popover z-[9999]">
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Booking Approvals</div>
              <div className="text-xs text-muted-foreground">
                {count === 0 ? "All caught up" : `${count} awaiting your review`}
              </div>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {pending.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              No pending bookings to confirm.
            </div>
          ) : (
            pending.map((row) => (
              <div key={row.id} className="px-4 py-3 border-b border-border last:border-b-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{displayName(row)}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {row.list_name ? `${row.list_name} · ` : ""}
                      {row.submitter_name ? `by ${row.submitter_name}` : "by —"}
                      {row.submitted_at ? ` · ${new Date(row.submitted_at).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                  {typeof row.incentive_amount === "number" && (
                    <div className="text-sm font-semibold text-emerald-500 whitespace-nowrap">
                      ${row.incentive_amount}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-emerald-500 text-black hover:bg-emerald-400 flex-1"
                    onClick={() => review(row, "approved")}
                    disabled={actingId === row.id}
                  >
                    <Check className="h-3 w-3 mr-1" /> Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs flex-1"
                    onClick={() => review(row, "denied")}
                    disabled={actingId === row.id}
                  >
                    <X className="h-3 w-3 mr-1" /> Deny
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
    </div>
  );
};

export default BookingApprovalsBell;
