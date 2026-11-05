import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, ClipboardList, BookOpen, Image, LayoutDashboard, ArrowLeft, Users, Lock, Search, Headset, ShieldCheck, Code, Megaphone, Settings2, DollarSign, GraduationCap, CheckSquare, KeyRound, FileSignature, PhoneCall } from "lucide-react";
import DashboardTutorial from "@/components/admin/DashboardTutorial";
import MyTasksPanel from "@/components/admin/MyTasksPanel";
import MyTasksPopover from "@/components/admin/MyTasksPopover";
import LoginSummaryModal from "@/components/admin/LoginSummaryModal";
import MasterChatBar from "@/components/admin/MasterChatBar";
import BookingApprovalsBell from "@/components/admin/BookingApprovalsBell";
import fortiLogo from "@/assets/forti-logo.png";
import { adminApi } from "@/lib/adminApi";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { BackNavProvider } from "@/contexts/BackNavContext";

// Lazy load all admin modules
const AdminWaitlist = lazy(() => import("@/components/admin/AdminWaitlist"));
const AdminTickets = lazy(() => import("@/components/admin/AdminTickets"));
const AdminUsers = lazy(() => import("@/components/admin/AdminUsers"));
const AdminContent = lazy(() => import("@/components/admin/AdminContent"));
const AdminKnowledge = lazy(() => import("@/components/admin/AdminKnowledge"));

const DepartmentModule = lazy(() => import("@/components/admin/content/DepartmentModule"));
const AdminAccountLedger = lazy(() => import("@/components/admin/AdminAccountLedger"));
const AdminContractZone = lazy(() => import("@/components/admin/AdminContractZone"));
const AdminDownloadTracker = lazy(() => import("@/components/admin/AdminDownloadTracker"));
const AdminOutboundCallTracker = lazy(() => import("@/components/admin/AdminOutboundCallTracker"));
const AmbassadorLearningCenter = lazy(() => import("@/components/admin/content/AmbassadorLearningCenter"));

type Module = "dept-support" | "dept-admin" | "dept-development" | "dept-marketing" | "dept-ops" | "dept-sales" | "res-account-ledger" | "res-contract-zone" | "amb-learning" | "amb-downloads" | "amb-outbound";

const ADMIN_RESOURCES = [
  { id: "res-account-ledger" as const, label: "Account Ledger", icon: KeyRound, description: "Shared platform credentials for the admin team." },
  { id: "res-contract-zone" as const, label: "Contract Zone", icon: FileSignature, description: "Upload, send, and track contracts for e-signature." },
];

const DEPT_ICON_STYLE = "bg-white text-black border-white/20";
const DEPARTMENTS = [
  { id: "dept-support" as const, deptKey: "support", label: "Support", icon: Headset, color: DEPT_ICON_STYLE, description: "Customer support operations, training, and resources." },
  { id: "dept-sales" as const, deptKey: "sales", label: "Sales", icon: DollarSign, color: DEPT_ICON_STYLE, description: "Sales pipeline, outreach strategy, and revenue tools." },
  { id: "dept-ops" as const, deptKey: "ops", label: "Ops", icon: Settings2, color: DEPT_ICON_STYLE, description: "Operations, logistics, fleet management, and processes." },
  { id: "dept-marketing" as const, deptKey: "marketing", label: "Marketing", icon: Megaphone, color: DEPT_ICON_STYLE, description: "Content strategy, social media, branding, and campaigns." },
  { id: "dept-development" as const, deptKey: "development", label: "Development", icon: Code, color: DEPT_ICON_STYLE, description: "Product development, engineering docs, and technical resources." },
  { id: "dept-admin" as const, deptKey: "admin", label: "Admin", icon: ShieldCheck, color: DEPT_ICON_STYLE, description: "Administrative operations, policies, and internal tools." },
];

const allModules: { id: Module; label: string; description: string; icon: React.ReactNode }[] = [];

interface ModulePerm {
  module_name: string;
  access_level: string;
}

const ModuleLoadingFallback = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground" />
  </div>
);

const Admin = () => {
  const { user, loading, isAdmin, isAmbassador, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [myTasksDueToday, setMyTasksDueToday] = useState(0);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [isPrimaryAdmin, setIsPrimaryAdmin] = useState(false);
  const [userModulePerms, setUserModulePerms] = useState<ModulePerm[]>([]);
  const [permsLoaded, setPermsLoaded] = useState(false);

  const hasAccess = isAdmin || isAmbassador;

  useEffect(() => {
    if (!loading && (!user || !hasAccess)) {
      // Preserve query params (e.g. ?dept=ops&module=calendar&event=...) through login
      navigate(`/admin/login${window.location.search}`);
    }
  }, [user, loading, hasAccess, navigate]);

  // Deep-link: on first load, read ?dept=<key> to auto-open a department module
  useEffect(() => {
    if (!user || !hasAccess || activeModule) return;
    const params = new URLSearchParams(window.location.search);
    const dept = params.get("dept");
    if (dept) {
      const match = DEPARTMENTS.find((d) => d.deptKey === dept);
      if (match) setActiveModule(match.id);
    }
  }, [user, hasAccess, activeModule]);

  // Force-change-password applies to ALL users (admin, ambassador, plain user)
  // regardless of role, as long as they still have the temp-password flag set.
  useEffect(() => {
    if (!user) return;
    const mustChange = user.user_metadata?.must_change_password === true;
    setMustChangePassword(mustChange);
  }, [user]);

  // Check permissions for admins
  useEffect(() => {
    if (user && isAdmin && !permsLoaded) {

      const prefetchTimers: ReturnType<typeof setTimeout>[] = [];

      adminApi.getMyPermissions().then(({ data, is_primary_admin }) => {
        const modulePerms = data || [];
        setIsPrimaryAdmin(is_primary_admin);
        setUserModulePerms(modulePerms);
        setPermsLoaded(true);

        const modulesToPrefetch = is_primary_admin
          ? allModules
          : allModules.filter((m) => modulePerms.some((p) => p.module_name === m.id));

        modulesToPrefetch.forEach((mod, index) => {
          const timer = setTimeout(() => {
            adminApi.prefetchModuleData(mod.id).catch(() => undefined);
          }, index * 120);
          prefetchTimers.push(timer);
        });
      }).catch(() => setPermsLoaded(true));

      return () => {
        prefetchTimers.forEach((timer) => clearTimeout(timer));
      };
    }
  }, [user, isAdmin, permsLoaded]);

  // Ambassadors don't load admin perms; mark loaded immediately
  useEffect(() => {
    if (user && isAmbassador && !isAdmin && !permsLoaded) {
      setPermsLoaded(true);
    }
  }, [user, isAmbassador, isAdmin, permsLoaded]);

  // Load my-tasks count for the badge
  useEffect(() => {
    if (!user || !isAdmin) return;
    let mounted = true;
    const loadCount = () => {
      adminApi.getMyTasks().then(({ data }) => {
        if (!mounted) return;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const count = (data || []).filter((t: any) => {
          if (!t.due_date) return false;
          const d = new Date(t.due_date + "T00:00:00");
          const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
          return diff <= 0; // overdue + due today
        }).length;
        setMyTasksDueToday(count);
      }).catch(() => undefined);
    };
    loadCount();
    const interval = setInterval(loadCount, 60_000);
    return () => { mounted = false; clearInterval(interval); };
  }, [user, isAdmin, showMyTasks]);

  if (loading || !permsLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }

  if (!user || !hasAccess) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      await adminApi.changePassword(newPassword);
      setMustChangePassword(false);
      toast({ title: "Password updated", description: "You can now access the admin panel." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setChangingPassword(false);
  };

  // Determine accessible modules
  const accessibleModules = isPrimaryAdmin
    ? allModules
    : allModules.filter(m => userModulePerms.some(p => p.module_name === m.id));

  const getAccessLevel = (moduleId: string): string => {
    if (isPrimaryAdmin) return "edit";
    return userModulePerms.find(p => p.module_name === moduleId)?.access_level || "view";
  };

  const currentModule = allModules.find((m) => m.id === activeModule);
  const activeDept = DEPARTMENTS.find((d) => d.id === activeModule);

  const renderActiveModule = () => {
    if (activeDept) {
      return <DepartmentModule department={activeDept.deptKey} departmentLabel={activeDept.label} onBackToDashboard={() => setActiveModule(null)} />;
    }
    switch (activeModule) {
      case "res-account-ledger":
        return <AdminAccountLedger onBack={() => setActiveModule(null)} />;
      case "res-contract-zone":
        return <AdminContractZone onBack={() => setActiveModule(null)} />;
      case "amb-learning":
        return (
          <div>
            <Button variant="fortiGhost" size="sm" onClick={() => setActiveModule(null)} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <AmbassadorLearningCenter />
          </div>
        );
      case "amb-downloads":
        return (
          <div>
            <Button variant="fortiGhost" size="sm" onClick={() => setActiveModule(null)} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <AdminDownloadTracker />
          </div>
        );
      case "amb-outbound":
        return (
          <div>
            <Button variant="fortiGhost" size="sm" onClick={() => setActiveModule(null)} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <AdminOutboundCallTracker />
          </div>
        );
      default: return null;
    }
  };

  // Ambassador-only restricted dashboard
  const isAmbassadorOnly = isAmbassador && !isAdmin;

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={fortiLogo} alt="Forti" className="h-6" />
              <span className="text-sm font-medium text-muted-foreground">Admin Panel</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Booking approvals bell moved into individual list view */}
              {user && (
                <MyTasksPopover userId={user.id} userEmail={user.email || ""} />
              )}
              <span className="text-sm text-muted-foreground hidden sm:block">{user.email}</span>
              <Button variant="fortiGhost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackNavProvider>
        {mustChangePassword ? (
          <div className="max-w-sm mx-auto space-y-6">
            <div className="text-center">
              <Lock className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <h1 className="text-2xl font-bold mb-2">Set Your Password</h1>
              <p className="text-sm text-muted-foreground">You're using a temporary password. Please create a new one to continue.</p>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <Input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
              <Input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
              <Button type="submit" variant="forti" className="w-full" disabled={changingPassword}>
                {changingPassword ? "Updating..." : "Set Password"}
              </Button>
            </form>
          </div>
        ) : showMyTasks ? (
          <MyTasksPanel
            onBack={() => setShowMyTasks(false)}
            onOpenTask={(_boardId, _taskId) => {
              setShowMyTasks(false);
              setActiveModule("dept-ops");
            }}
          />
        ) : activeModule === null && isAmbassadorOnly ? (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Welcome, {(() => { const raw = (user?.user_metadata?.full_name?.split(" ")[0]) || (user?.email?.split("@")[0]) || "Ambassador"; return raw.charAt(0).toUpperCase() + raw.slice(1); })()}</h1>
              <p className="text-muted-foreground text-sm">Your Brand Ambassador workspace.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <button
                onClick={() => setActiveModule("amb-learning")}
                className="rounded-lg border border-border bg-card p-5 text-left hover:border-white hover:shadow-lg hover:shadow-white/10 transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${DEPT_ICON_STYLE} group-hover:scale-105 transition-transform`}>
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">Learning Zone</h3>
                </div>
                <p className="text-xs text-muted-foreground">Brand Ambassador training, certification &amp; Forti Score.</p>
              </button>
              <button
                onClick={() => setActiveModule("amb-downloads")}
                className="rounded-lg border border-border bg-card p-5 text-left hover:border-white hover:shadow-lg hover:shadow-white/10 transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${DEPT_ICON_STYLE} group-hover:scale-105 transition-transform`}>
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">Download Tracker</h3>
                </div>
                <p className="text-xs text-muted-foreground">Track your referral downloads and performance.</p>
              </button>
              <button
                onClick={() => setActiveModule("amb-outbound")}
                className="rounded-lg border border-border bg-card p-5 text-left hover:border-white hover:shadow-lg hover:shadow-white/10 transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${DEPT_ICON_STYLE} group-hover:scale-105 transition-transform`}>
                    <PhoneCall className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">Outbound Call Tracker</h3>
                </div>
                <p className="text-xs text-muted-foreground">Log calls, leads, and bookings you've submitted.</p>
              </button>
            </div>
          </div>
        ) : activeModule === null ? (
          <div>
            <MasterChatBar
              userName={user?.user_metadata?.full_name || user?.email?.split("@")[0]}
              isAdmin={isAdmin}
              isPrimaryAdmin={isPrimaryAdmin}
              modulePerms={userModulePerms}
            />
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold">Welcome, {(() => { const raw = (user?.user_metadata?.full_name?.split(" ")[0]) || (user?.email?.split("@")[0]) || "Admin"; return raw.charAt(0).toUpperCase() + raw.slice(1); })()}</h1>
                <p className="text-muted-foreground text-sm">Select a module to get started.</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button size="sm" onClick={() => setTutorialOpen(true)} className="shrink-0 bg-gradient-to-b from-[hsl(0,0%,85%)] via-[hsl(0,0%,70%)] to-[hsl(0,0%,80%)] text-black font-bold border border-white/20 hover:btn-shimmer active:btn-shimmer">
                  <GraduationCap className="h-4 w-4 mr-1.5" />
                  How it Works
                </Button>
                <div className="relative flex-1 sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search modules..."
                    value={dashboardSearch}
                    onChange={(e) => setDashboardSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            {accessibleModules.length === 0 ? (
              <>
                {/* Department Operations Center */}
                {(() => {
                  const q = dashboardSearch.toLowerCase();
                  const allowedDepts = isPrimaryAdmin
                    ? DEPARTMENTS
                    : DEPARTMENTS.filter((d) => userModulePerms.some((p) => p.module_name === `dept-${d.deptKey}`));
                  const filteredDepts = allowedDepts.filter(
                    (d) =>
                      d.label.toLowerCase().includes(q) ||
                      d.description.toLowerCase().includes(q) ||
                      d.deptKey.toLowerCase().includes(q)
                  );
                  return filteredDepts.length > 0 ? (
                    <div>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDepts.map((d) => {
                          const Icon = d.icon;
                          return (
                            <button
                              key={d.id}
                              data-tutorial={d.id}
                              onClick={() => setActiveModule(d.id)}
                              className="rounded-lg border border-border bg-card p-5 text-left hover:border-white hover:shadow-lg hover:shadow-white/10 transition-all group"
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${d.color} group-hover:scale-105 transition-transform`}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold">{d.label}</h3>
                              </div>
                              <p className="text-xs text-muted-foreground">{d.description}</p>
                              <div className="flex gap-1.5 mt-3">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Resources</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">GPT</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : <p className="text-muted-foreground text-center py-12">No modules match "{dashboardSearch}"</p>;
                })()}
              </>
            ) : (
              <>
                {accessibleModules.length > 0 && (() => {
                  const q = dashboardSearch.toLowerCase();
                  const filtered = accessibleModules.filter(
                    (mod) =>
                      mod.label.toLowerCase().includes(q) ||
                      mod.description.toLowerCase().includes(q) ||
                      mod.id.toLowerCase().includes(q)
                  );
                  return filtered.length > 0 ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                      {filtered.map((mod) => {
                        const level = getAccessLevel(mod.id);
                        return (
                          <button
                            key={mod.id}
                            onMouseEnter={() => adminApi.prefetchModuleData(mod.id).catch(() => undefined)}
                            onFocus={() => adminApi.prefetchModuleData(mod.id).catch(() => undefined)}
                            onClick={() => {
                              adminApi.prefetchModuleData(mod.id).catch(() => undefined);
                              setActiveModule(mod.id);
                            }}
                            className="rounded-lg border border-border bg-card p-6 text-left hover:border-white hover:bg-card/80 transition-all group"
                          >
                            <div className="flex items-start gap-4">
                              <div className="text-muted-foreground group-hover:text-foreground transition-colors mt-0.5">
                                {mod.icon}
                              </div>
                              <div>
                                <h3 className="font-semibold group-hover:text-foreground transition-colors">{mod.label}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{mod.description}</p>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded mt-2 inline-block ${
                                  level === "admin"
                                    ? "bg-primary/20 text-primary"
                                    : level === "edit"
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-muted text-muted-foreground"
                                }`}>
                                  {level}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : null;
                })()}

                {/* Department Operations Center */}
                {(() => {
                  const q = dashboardSearch.toLowerCase();
                  const allowedDepts = isPrimaryAdmin
                    ? DEPARTMENTS
                    : DEPARTMENTS.filter((d) => userModulePerms.some((p) => p.module_name === `dept-${d.deptKey}`));
                  const filteredDepts = allowedDepts.filter(
                    (d) =>
                      d.label.toLowerCase().includes(q) ||
                      d.description.toLowerCase().includes(q) ||
                      d.deptKey.toLowerCase().includes(q)
                  );
                  return filteredDepts.length > 0 ? (
                    <div>
                      <h2 className="text-lg font-semibold mb-1">Operations Center</h2>
                      <p className="text-sm text-muted-foreground mb-4">Department learning, resources, and GPT tools.</p>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDepts.map((d) => {
                          const Icon = d.icon;
                          return (
                            <button
                              key={d.id}
                              data-tutorial={d.id}
                              onClick={() => setActiveModule(d.id)}
                              className="rounded-lg border border-border bg-card p-5 text-left hover:border-white hover:shadow-lg hover:shadow-white/10 transition-all group"
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${d.color} group-hover:scale-105 transition-transform`}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold">{d.label}</h3>
                              </div>
                              <p className="text-xs text-muted-foreground">{d.description}</p>
                              <div className="flex gap-1.5 mt-3">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Resources</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">GPT</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Admin Resources */}
                {isPrimaryAdmin && (() => {
                  const q = dashboardSearch.toLowerCase();
                  const filteredRes = ADMIN_RESOURCES.filter(
                    (r) =>
                      r.label.toLowerCase().includes(q) ||
                      r.description.toLowerCase().includes(q) ||
                      r.id.toLowerCase().includes(q)
                  );
                  return filteredRes.length > 0 ? (
                    <div className="mt-8">
                      <h2 className="text-lg font-semibold mb-1">Admin Resources</h2>
                      <p className="text-sm text-muted-foreground mb-4">Shared internal tools available to admins.</p>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredRes.map((r) => {
                          const Icon = r.icon;
                          return (
                            <button
                              key={r.id}
                              onClick={() => setActiveModule(r.id)}
                              className="rounded-lg border border-border bg-card p-5 text-left hover:border-white hover:shadow-lg hover:shadow-white/10 transition-all group"
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${DEPT_ICON_STYLE} group-hover:scale-105 transition-transform`}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold">{r.label}</h3>
                              </div>
                              <p className="text-xs text-muted-foreground">{r.description}</p>
                              <div className="flex gap-1.5 mt-3">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Shared</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null;
                })()}
              </>
            )}
          </div>
        ) : (
          <div>
            <Suspense fallback={<ModuleLoadingFallback />}>
              {renderActiveModule()}
            </Suspense>
          </div>
        )}
        </BackNavProvider>
      </main>

      {tutorialOpen && activeModule === null && !mustChangePassword && (
        <DashboardTutorial
          onClose={() => setTutorialOpen(false)}
          steps={[
            { selector: '[data-tutorial="dept-support"]', title: "Support", body: "Customer support operations: review and respond to support tickets, manage chat sessions, and access support training resources." },
            { selector: '[data-tutorial="dept-sales"]', title: "Sales", body: "Sales pipeline tools: track leads, manage CRM data, monitor outreach performance, and run task boards for the sales team." },
            { selector: '[data-tutorial="dept-ops"]', title: "Ops", body: "Operations command center: event calendar, OKR tracker, task boards, training center for guards/drivers/brand ambassadors, and HR & compliance." },
            { selector: '[data-tutorial="dept-marketing"]', title: "Marketing", body: "Content & growth: manage waitlist signups, edit site content, schedule social media via Metricool, and run marketing task boards." },
            { selector: '[data-tutorial="dept-development"]', title: "Development", body: "Engineering hub: development task boards, technical documentation, OKR tracking, and access to product specs." },
            { selector: '[data-tutorial="dept-admin"]', title: "Admin", body: "Internal administration: manage users and permissions, the Knowledge Center (AI source of truth), and platform-wide policies." },
          ]}
        />
      )}

      {user && !mustChangePassword && (
        <LoginSummaryModal
          userId={user.id}
          userName={user.user_metadata?.full_name || user.user_metadata?.first_name || user.email?.split("@")[0] || ""}
          loginStamp={user.last_sign_in_at || undefined}
        />
      )}
    </div>
  );
};

export default Admin;
