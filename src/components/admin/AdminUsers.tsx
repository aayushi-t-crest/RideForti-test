import { useState, useEffect } from "react";
import { adminApi } from "@/lib/adminApi";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, UserPlus, Trash2, Shield, ShieldOff, Settings, Copy, Check, Send, Mail, Archive, RotateCcw, AlertTriangle, Pencil, Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ModulePermission {
  module_name: string;
  access_level: string;
}

interface UserEntry {
  id: string;
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  roles: string[];
  must_change_password?: boolean;
  module_permissions?: ModulePermission[];
  is_supervisor?: boolean;
}

// Format US phone numbers as +1 (XXX) XXX-XXXX while typing.
// Accepts any input, strips non-digits, preserves leading "1" country code.
function formatPhone(input: string): string {
  if (!input) return "";
  const digits = input.replace(/\D/g, "");
  // Drop leading "1" for grouping; we'll re-add the +1 prefix
  const d = digits.startsWith("1") ? digits.slice(1) : digits;
  const a = d.slice(0, 3);
  const b = d.slice(3, 6);
  const c = d.slice(6, 10);
  if (d.length === 0) return digits.startsWith("1") ? "+1 " : "";
  if (d.length <= 3) return `+1 (${a}`;
  if (d.length <= 6) return `+1 (${a}) ${b}`;
  return `+1 (${a}) ${b}-${c}`;
}

interface ArchivedUser {
  id: string;
  original_user_id: string;
  email: string;
  roles: string[];
  module_permissions: ModulePermission[];
  archived_at: string;
  expires_at: string;
  created_at: string;
}

const ALL_MODULES = [
  { id: "dept-support", label: "Support" },
  { id: "dept-sales", label: "Sales" },
  { id: "dept-ops", label: "Ops" },
  { id: "dept-marketing", label: "Marketing" },
  { id: "dept-development", label: "Development" },
  { id: "dept-admin", label: "Admin" },
];

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [archivedUsers, setArchivedUsers] = useState<ArchivedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permUserId, setPermUserId] = useState<string | null>(null);
  const [permUserEmail, setPermUserEmail] = useState("");
  const [editPerms, setEditPerms] = useState<Record<string, { enabled: boolean; level: string }>>({});
  const [savingPerms, setSavingPerms] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<UserEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit user state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserEntry | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("user");
  const [editModulePerms, setEditModulePerms] = useState<Record<string, { enabled: boolean; level: string }>>({});
  const [editSaving, setEditSaving] = useState(false);

  // Create user form
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<string>("user");
  const [newModulePerms, setNewModulePerms] = useState<Record<string, { enabled: boolean; level: string }>>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [newIsSupervisor, setNewIsSupervisor] = useState(false);
  const [editIsSupervisor, setEditIsSupervisor] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, archivedRes] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getArchivedUsers(),
      ]);
      setUsers(usersRes.data || []);
      setArchivedUsers(archivedRes.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetCreateForm = () => {
    setNewFirstName("");
    setNewLastName("");
    setNewEmail("");
    setNewPhone("");
    setNewRole("user");
    setNewModulePerms({});
    setNewIsSupervisor(false);
    setTempPassword(null);
    setCreatedEmail("");
    setError("");
    setCopied(false);
    setSending(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const modulePermissions = Object.entries(newModulePerms)
        .filter(([, v]) => v.enabled)
        .map(([mod, v]) => ({ module_name: mod, access_level: v.level }));

      const result = await adminApi.createUser(newEmail, "", newRole, modulePermissions, newFirstName, newLastName);
      setTempPassword(result.temp_password);
      setCreatedEmail(newEmail);

      // Apply supervisor flag if set
      const newUserId = result?.data?.user?.id;
      if (newIsSupervisor && newUserId) {
        try {
          await adminApi.setSupervisor(newUserId, true);
        } catch (supErr) {
          console.error("Failed to set supervisor:", supErr);
        }
      }

      toast({ title: "User created", description: "You can now send them their login credentials." });
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
    setCreating(false);
  };

  const handleCopyPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendCredentials = async (email: string, password: string, phone?: string) => {
    setSending(true);
    try {
      const loginUrl = `https://www.rideforti.com/admin/login`;
      const result = await adminApi.sendCredentials(email, password, loginUrl, phone || undefined);
      const r = result.results || {};
      const emailSent = r.email?.sent;
      const smsSent = r.sms?.sent;
      if (emailSent || smsSent) {
        const parts: string[] = [];
        if (emailSent) parts.push("Email sent");
        else if (r.email) parts.push(`Email: ${r.email.reason || "failed"}`);
        if (smsSent) parts.push("SMS sent");
        else if (r.sms) parts.push(`SMS: ${r.sms.reason || "failed"}`);
        toast({ title: "Credentials sent!", description: parts.join(" • ") });
      } else {
        const reasons: string[] = [];
        if (r.email) reasons.push(`Email: ${r.email.reason || r.email.error?.message || "failed"}`);
        if (r.sms) reasons.push(`SMS: ${r.sms.reason || r.sms.error?.message || "failed"}`);
        toast({
          title: "Credentials not sent",
          description: reasons.join(" • ") || "Delivery failed. Copy the password manually for now.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    }
    setSending(false);
  };

  const openEditUser = (u: UserEntry) => {
    setEditTarget(u);
    setEditFirstName(u.first_name || "");
    setEditLastName(u.last_name || "");
    setEditEmail(u.email);
    setEditPhone(formatPhone(u.phone || ""));
    setEditRole(u.roles.includes("admin") ? "admin" : u.roles.includes("ambassador") ? "ambassador" : "user");
    const permMap: Record<string, { enabled: boolean; level: string }> = {};
    ALL_MODULES.forEach(mod => {
      const existing = u.module_permissions?.find(p => p.module_name === mod.id);
      permMap[mod.id] = { enabled: !!existing, level: existing?.access_level || "view" };
    });
    setEditModulePerms(permMap);
    setEditIsSupervisor(!!u.is_supervisor);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      // Update name, email, phone
      await adminApi.updateUser(editTarget.id, {
        first_name: editFirstName,
        last_name: editLastName,
        phone: editPhone,
        ...(editEmail !== editTarget.email ? { email: editEmail } : {}),
      });

      // Update role if changed (handles user / ambassador / admin)
      const currentRole = editTarget.roles.includes("admin") ? "admin" : editTarget.roles.includes("ambassador") ? "ambassador" : "user";
      if (editRole !== currentRole) {
        // Remove old non-default role
        if (currentRole === "admin") await adminApi.updateUserRole(editTarget.id, "admin", true);
        if (currentRole === "ambassador") await adminApi.updateUserRole(editTarget.id, "ambassador", true);
        // Add new role
        if (editRole === "admin") await adminApi.updateUserRole(editTarget.id, "admin");
        if (editRole === "ambassador") await adminApi.updateUserRole(editTarget.id, "ambassador");
      }

      // Update module permissions
      const modulePermissions = Object.entries(editModulePerms)
        .filter(([, v]) => v.enabled)
        .map(([mod, v]) => ({ module_name: mod, access_level: v.level }));
      await adminApi.updateModulePermissions(editTarget.id, modulePermissions);

      // Update supervisor flag if changed
      if (!!editTarget.is_supervisor !== editIsSupervisor) {
        try {
          await adminApi.setSupervisor(editTarget.id, editIsSupervisor);
        } catch (supErr) {
          console.error("Failed to update supervisor:", supErr);
        }
      }

      toast({ title: "User updated", description: "Changes saved successfully." });
      setEditDialogOpen(false);
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setEditSaving(false);
  };

  const openDeleteConfirm = (u: UserEntry) => {
    setDeleteTarget(u);
    setDeleteConfirmStep(1);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteUser(deleteTarget.id);
      toast({ title: "User archived", description: `${deleteTarget.email} has been moved to the archive for 30 days.` });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setDeleting(false);
  };

  const handleRestore = async (archiveId: string, email: string) => {
    try {
      const result = await adminApi.restoreUser(archiveId);
      toast({ title: "User restored", description: `${email} has been restored. New temp password generated.` });
      await fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handlePermanentDelete = async (archiveId: string, email: string) => {
    if (!confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
    try {
      await adminApi.permanentlyDeleteArchived(archiveId);
      toast({ title: "Permanently deleted", description: `${email} has been permanently removed.` });
      await fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    try {
      await adminApi.updateUserRole(userId, "admin", currentlyAdmin);
      await fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleSupervisor = async (userId: string, currentlySupervisor: boolean) => {
    try {
      await adminApi.setSupervisor(userId, !currentlySupervisor);
      toast({
        title: !currentlySupervisor ? "Marked as supervisor" : "Removed supervisor flag",
        description: !currentlySupervisor
          ? "This user will appear in ticket assignment lists and receive daily 9am digests."
          : "User will no longer appear in supervisor assignment lists.",
      });
      await fetchData();
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message || String(e), variant: "destructive" });
    }
  };

  const openPermDialog = (u: UserEntry) => {
    setPermUserId(u.id);
    setPermUserEmail(u.email);
    const perms: Record<string, { enabled: boolean; level: string }> = {};
    ALL_MODULES.forEach(m => {
      const existing = u.module_permissions?.find(p => p.module_name === m.id);
      perms[m.id] = { enabled: !!existing, level: existing?.access_level || "view" };
    });
    setEditPerms(perms);
    setPermDialogOpen(true);
  };

  const handleSavePerms = async () => {
    if (!permUserId) return;
    setSavingPerms(true);
    try {
      const modulePermissions = Object.entries(editPerms)
        .filter(([, v]) => v.enabled)
        .map(([mod, v]) => ({ module_name: mod, access_level: v.level }));
      await adminApi.updateModulePermissions(permUserId, modulePermissions);
      toast({ title: "Permissions updated" });
      await fetchData();
      setPermDialogOpen(false);
    } catch (e: any) {
      alert(e.message);
    }
    setSavingPerms(false);
  };

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredArchived = archivedUsers.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const getDaysRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{users.length} active</span>
          {archivedUsers.length > 0 && (
            <span className="text-sm text-yellow-400">{archivedUsers.length} archived</span>
          )}
          <Button variant="fortiGhost" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetCreateForm(); }}>
            <DialogTrigger asChild>
              <Button variant="forti" size="sm">
                <UserPlus className="h-4 w-4 mr-1" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-md">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>

              {tempPassword ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">User created! Send them their login credentials via email/SMS, or copy the password manually.</p>
                  <div className="flex items-center gap-2 bg-muted p-3 rounded-lg">
                    <code className="flex-1 text-sm font-mono break-all">{tempPassword}</code>
                    <Button size="sm" variant="fortiGhost" onClick={handleCopyPassword}>
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    variant="forti"
                    className="w-full"
                    onClick={() => handleSendCredentials(createdEmail, tempPassword, newPhone)}
                    disabled={sending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sending ? "Sending..." : "Send Credentials to User"}
                  </Button>
                  <Button variant="fortiGhost" className="w-full" onClick={() => { setDialogOpen(false); resetCreateForm(); }}>
                    Done
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="First Name"
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      required
                    />
                    <Input
                      placeholder="Last Name"
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                      required
                    />
                  </div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                  <Input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={newPhone}
                    onChange={(e) => setNewPhone(formatPhone(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground -mt-2">Credentials will be sent via email and SMS. A temporary password will be auto-generated.</p>
                  <Select value={newRole} onValueChange={(val) => {
                    setNewRole(val);
                    if (val === "admin") {
                      const allAdmin: Record<string, { enabled: boolean; level: string }> = {};
                      ALL_MODULES.forEach(m => { allAdmin[m.id] = { enabled: true, level: "admin" }; });
                      setNewModulePerms(allAdmin);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="ambassador">Ambassador</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>

                  {newRole === "ambassador" ? (
                    <div className="rounded-md border border-border bg-muted/30 p-3">
                      <p className="text-sm font-medium mb-1">Ambassador Access</p>
                      <p className="text-xs text-muted-foreground">
                        Brand Ambassadors automatically get view-only access to two sections:
                      </p>
                      <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                        <li><span className="text-foreground">Download Tracker</span> — view only</li>
                        <li><span className="text-foreground">Learning Zone (Sales)</span> — view lessons & take certifications</li>
                      </ul>
                    </div>
                  ) : (
                    <>
                      {/* Supervisor flag */}
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-md border border-border bg-muted/30">
                        <Checkbox
                          checked={newIsSupervisor}
                          onCheckedChange={(checked) => setNewIsSupervisor(!!checked)}
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium">Mark as Supervisor</span>
                          <p className="text-xs text-muted-foreground">Supervisors can be assigned tickets and FAQ questions for review.</p>
                        </div>
                      </label>

                      {/* Module permissions */}
                      <div>
                        <p className="text-sm font-medium mb-2">Module Access</p>
                        <div className="space-y-2">
                          {ALL_MODULES.map(mod => (
                            <div key={mod.id} className="flex items-center justify-between gap-2 py-1">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={newModulePerms[mod.id]?.enabled || false}
                                  onCheckedChange={(checked) =>
                                    setNewModulePerms(prev => ({
                                      ...prev,
                                      [mod.id]: { enabled: !!checked, level: prev[mod.id]?.level || "view" },
                                    }))
                                  }
                                />
                                <span className="text-sm">{mod.label}</span>
                              </div>
                              {newModulePerms[mod.id]?.enabled && (
                                <Select
                                  value={newModulePerms[mod.id]?.level || "view"}
                                  onValueChange={(val) =>
                                    setNewModulePerms(prev => ({
                                      ...prev,
                                      [mod.id]: { ...prev[mod.id], level: val },
                                    }))
                                  }
                                >
                                  <SelectTrigger className="w-24 h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="view">View</SelectItem>
                                    <SelectItem value="edit">Edit</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" variant="forti" className="w-full" disabled={creating}>
                    {creating ? "Creating..." : "Create User"}
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Permissions dialog */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Module Permissions</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{permUserEmail}</p>
          <div className="space-y-2 mt-2">
            {ALL_MODULES.map(mod => (
              <div key={mod.id} className="flex items-center justify-between gap-2 py-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={editPerms[mod.id]?.enabled || false}
                    onCheckedChange={(checked) =>
                      setEditPerms(prev => ({
                        ...prev,
                        [mod.id]: { enabled: !!checked, level: prev[mod.id]?.level || "view" },
                      }))
                    }
                  />
                  <span className="text-sm">{mod.label}</span>
                </div>
                {editPerms[mod.id]?.enabled && (
                  <Select
                    value={editPerms[mod.id]?.level || "view"}
                    onValueChange={(val) =>
                      setEditPerms(prev => ({
                        ...prev,
                        [mod.id]: { ...prev[mod.id], level: val },
                      }))
                    }
                  >
                    <SelectTrigger className="w-24 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">View</SelectItem>
                      <SelectItem value="edit">Edit</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
          <Button variant="forti" className="w-full mt-4" onClick={handleSavePerms} disabled={savingPerms}>
            {savingPerms ? "Saving..." : "Save Permissions"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Double-confirm delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) { setDeleteTarget(null); setDeleteConfirmStep(1); } }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {deleteConfirmStep === 1 ? "Delete User?" : "Final Confirmation"}
            </DialogTitle>
            <DialogDescription>
              {deleteConfirmStep === 1
                ? `Are you sure you want to delete ${deleteTarget?.email}? They will be moved to an archive for 30 days before permanent deletion.`
                : `This will immediately revoke all access for ${deleteTarget?.email}. You can restore them from the archive within 30 days. Are you absolutely sure?`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="fortiGhost" onClick={() => { setDeleteDialogOpen(false); setDeleteTarget(null); setDeleteConfirmStep(1); }}>
              Cancel
            </Button>
            {deleteConfirmStep === 1 ? (
              <Button variant="destructive" onClick={() => setDeleteConfirmStep(2)}>
                Yes, Delete User
              </Button>
            ) : (
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "I'm Sure — Delete Now"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabs for Active / Archived */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="active">Active Users</TabsTrigger>
          <TabsTrigger value="archived" className="relative">
            Archive
            {archivedUsers.length > 0 && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                {archivedUsers.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {loading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Loading...</p>
          ) : (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Modules</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((u) => {
                      const isCurrentUser = u.id === currentUser?.id;
                      const isAdmin = u.roles.includes("admin");
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            {u.first_name || u.last_name
                              ? `${u.first_name || ""} ${u.last_name || ""}`.trim()
                              : <span className="text-muted-foreground text-xs">—</span>
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {u.email}
                              {isCurrentUser && (
                                <span className="text-xs text-muted-foreground">(you)</span>
                              )}
                              {u.must_change_password && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Temp Pass</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {u.roles.length > 0 ? (
                                u.roles.map((r) => (
                                  <span
                                    key={r}
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                      r === "admin"
                                        ? "bg-primary/20 text-primary"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {r}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">No role</span>
                              )}
                              {u.is_supervisor && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 inline-flex items-center gap-1">
                                  <Crown className="h-3 w-3" /> supervisor
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {u.module_permissions && u.module_permissions.length > 0 ? (
                                u.module_permissions.map((p) => (
                                  <span
                                    key={p.module_name}
                                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                                      p.access_level === "admin"
                                        ? "bg-primary/20 text-primary"
                                        : p.access_level === "edit"
                                        ? "bg-blue-500/20 text-blue-400"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {p.module_name} ({p.access_level})
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {!isCurrentUser && (
                              <div className="flex items-center justify-end gap-1">
                                {u.must_change_password && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="fortiGhost"
                                        size="sm"
                                        title="Resend credentials"
                                      >
                                        <Mail className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {(["email", "sms", "both"] as const).map((opt) => (
                                        <DropdownMenuItem
                                          key={opt}
                                          onClick={async () => {
                                            const channels = opt === "both" ? ["email", "sms"] as const : [opt] as const;
                                            toast({ title: "Resending credentials...", description: `Sending via ${opt}.` });
                                            try {
                                              const res: any = await adminApi.resendCredentials(
                                                u.id,
                                                channels as any,
                                                `https://www.rideforti.com/admin/login`
                                              );
                                              const r = res?.results || {};
                                              const parts: string[] = [];
                                              if (r.email) parts.push(`Email: ${r.email.sent ? "sent" : (r.email.reason || "failed")}`);
                                              if (r.sms) parts.push(`SMS: ${r.sms.sent ? "sent" : (r.sms.reason || "failed")}`);
                                              toast({ title: "Credentials resent", description: parts.join(" • ") || "Done" });
                                            } catch (e: any) {
                                              toast({ title: "Failed", description: e?.message || "Could not resend", variant: "destructive" });
                                            }
                                          }}
                                        >
                                          {opt === "email" ? "Email only" : opt === "sms" ? "SMS only" : "Email + SMS"}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                                <Button
                                  variant="fortiGhost"
                                  size="sm"
                                  onClick={() => openEditUser(u)}
                                  title="Edit user"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="fortiGhost"
                                  size="sm"
                                  onClick={() => openPermDialog(u)}
                                  title="Module permissions"
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="fortiGhost"
                                  size="sm"
                                  onClick={() => handleToggleSupervisor(u.id, !!u.is_supervisor)}
                                  title={u.is_supervisor ? "Remove supervisor flag" : "Mark as supervisor"}
                                  className={u.is_supervisor ? "text-amber-400" : ""}
                                >
                                  <Crown className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="fortiGhost"
                                  size="sm"
                                  onClick={() => handleToggleAdmin(u.id, isAdmin)}
                                  title={isAdmin ? "Remove admin" : "Make admin"}
                                >
                                  {isAdmin ? (
                                    <ShieldOff className="h-4 w-4" />
                                  ) : (
                                    <Shield className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="fortiGhost"
                                  size="sm"
                                  onClick={() => openDeleteConfirm(u)}
                                  className="text-destructive hover:text-destructive"
                                  title="Delete user (archive for 30 days)"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived">
          {loading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Loading...</p>
          ) : (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Archived</TableHead>
                    <TableHead>Expires In</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArchived.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No archived users.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredArchived.map((u) => {
                      const daysLeft = getDaysRemaining(u.expires_at);
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.email}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {u.roles && u.roles.length > 0 ? (
                                u.roles.map((r) => (
                                  <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                    {r}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(u.archived_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              daysLeft <= 7 ? "bg-destructive/20 text-destructive" : "bg-yellow-500/20 text-yellow-400"
                            }`}>
                              {daysLeft} days
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="fortiGhost"
                                size="sm"
                                onClick={() => handleRestore(u.id, u.email)}
                                title="Restore user"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="fortiGhost"
                                size="sm"
                                onClick={() => handlePermanentDelete(u.id, u.email)}
                                className="text-destructive hover:text-destructive"
                                title="Permanently delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">First Name</Label>
                <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Last Name</Label>
                <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input type="tel" placeholder="+1 (555) 123-4567" value={editPhone} onChange={(e) => setEditPhone(formatPhone(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="ambassador">Ambassador</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editRole === "ambassador" ? (
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-sm font-medium mb-1">Ambassador Access</p>
                <p className="text-xs text-muted-foreground">
                  Brand Ambassadors automatically get view-only access to two sections:
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li><span className="text-foreground">Download Tracker</span> — view only</li>
                  <li><span className="text-foreground">Learning Zone (Sales)</span> — view lessons & take certifications</li>
                </ul>
              </div>
            ) : (
              <>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-md border border-border bg-muted/30">
                  <Checkbox
                    checked={editIsSupervisor}
                    onCheckedChange={(checked) => setEditIsSupervisor(!!checked)}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium">Supervisor</span>
                    <p className="text-xs text-muted-foreground">Can be assigned tickets and FAQ questions for review.</p>
                  </div>
                </label>
                <div>
                  <Label className="text-xs">Module Access</Label>
                  <div className="space-y-2 mt-2">
                    {ALL_MODULES.map(mod => (
                      <div key={mod.id} className="flex items-center justify-between gap-2 py-1">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={editModulePerms[mod.id]?.enabled || false}
                            onCheckedChange={(checked) =>
                              setEditModulePerms(prev => ({
                                ...prev,
                                [mod.id]: { enabled: !!checked, level: prev[mod.id]?.level || "view" },
                              }))
                            }
                          />
                          <span className="text-sm">{mod.label}</span>
                        </div>
                        {editModulePerms[mod.id]?.enabled && (
                          <Select
                            value={editModulePerms[mod.id]?.level || "view"}
                            onValueChange={(val) =>
                              setEditModulePerms(prev => ({
                                ...prev,
                                [mod.id]: { ...prev[mod.id], level: val },
                              }))
                            }
                          >
                            <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view">View</SelectItem>
                              <SelectItem value="edit">Edit</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            <Button variant="forti" className="w-full" onClick={handleSaveEdit} disabled={editSaving}>
              {editSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
