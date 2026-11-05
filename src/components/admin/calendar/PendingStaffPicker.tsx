import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, UserPlus, Mail, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface PendingStaff {
  user_id: string;
  user_email: string;
  user_name: string;
  user_phone: string | null;
  role_tag: string;
}

interface DirUser {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
}

interface Props {
  pending: PendingStaff[];
  onChange: (next: PendingStaff[]) => void;
}

const PendingStaffPicker = ({ pending, onChange }: Props) => {
  const [users, setUsers] = useState<DirUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("admin_users_directory")
        .select("user_id, email, full_name, phone")
        .eq("active", true)
        .order("full_name", { ascending: true });
      if (error) console.error("PendingStaffPicker load error:", error);
      setUsers(data || []);
      setLoading(false);
    })();
  }, []);

  const handleSelect = (userId: string) => {
    if (!userId) return;
    if (pending.some((p) => p.user_id === userId)) {
      toast({ title: "Already added", description: "That user is already tagged." });
      return;
    }
    const user = users.find((u) => u.user_id === userId);
    if (!user) return;
    const name = (user.full_name && user.full_name.trim()) || user.email;
    onChange([
      ...pending,
      { user_id: user.user_id, user_email: user.email, user_name: name, user_phone: user.phone, role_tag: "staff" },
    ]);
  };

  const handleRemove = (idx: number) => onChange(pending.filter((_, i) => i !== idx));

  const handleTagMe = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const authUser = auth?.user;
    const uid = authUser?.id;
    if (!uid) {
      toast({ title: "Not signed in", description: "Couldn't detect your account.", variant: "destructive" });
      return;
    }
    if (pending.some((p) => p.user_id === uid)) {
      toast({ title: "Already tagged", description: "You're already on this event." });
      return;
    }
    // Prefer directory record; fall back to auth user metadata
    const me = users.find((u) => u.user_id === uid);
    const email = me?.email || authUser.email || "";
    const phone = me?.phone || (authUser.user_metadata as any)?.phone || authUser.phone || null;
    const fullName =
      (me?.full_name && me.full_name.trim()) ||
      (authUser.user_metadata as any)?.full_name ||
      (authUser.user_metadata as any)?.name ||
      email;
    if (!email) {
      toast({ title: "Missing email", description: "Couldn't detect your email address.", variant: "destructive" });
      return;
    }
    onChange([
      ...pending,
      { user_id: uid, user_email: email, user_name: fullName, user_phone: phone, role_tag: "staff" },
    ]);
    toast({ title: "Tagged", description: `${fullName} added to this event.` });
  };

  const availableUsers = users.filter((u) => !pending.some((p) => p.user_id === u.user_id));

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <h5 className="text-xs font-semibold flex items-center gap-1"><UserPlus className="h-3 w-3" />Tag Staff</h5>
      <p className="text-[11px] text-muted-foreground">
        Select staff to tag — they'll get an email + SMS when the event is created, plus reminders before it starts.
      </p>

      <Select value="" onValueChange={handleSelect}>
        <SelectTrigger className="text-xs h-8">
          <SelectValue placeholder={loading ? "Loading…" : "Select staff to tag"} />
        </SelectTrigger>
        <SelectContent className="bg-popover z-[200]">
          {availableUsers.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">No more users to tag</div>
          ) : (
            availableUsers.map((u) => {
              const name = (u.full_name && u.full_name.trim()) || u.email;
              return <SelectItem key={u.user_id} value={u.user_id}>{name}</SelectItem>;
            })
          )}
        </SelectContent>
      </Select>

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="fortiOutline" size="sm" className="h-7 text-[11px]" onClick={handleTagMe}>
          <UserPlus className="h-3 w-3 mr-1" /> Tag me
        </Button>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />Email</span>
          <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />SMS</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : pending.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-2">No staff tagged yet.</p>
      ) : (
        <div className="space-y-1.5">
          {pending.map((p, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded border border-border bg-muted/30">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{p.user_name}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {p.user_email}{p.user_phone ? ` • ${p.user_phone}` : ""}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemove(idx)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingStaffPicker;
