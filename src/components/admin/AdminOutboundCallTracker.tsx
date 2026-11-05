import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Phone,
  Check,
  X,
  Trash2,
  ArrowLeft,
  ListChecks,
  Search,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  Pencil,
  History,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BookingApprovalsBell from "@/components/admin/BookingApprovalsBell";
import CallScriptDialog from "@/components/admin/CallScriptDialog";

type CallList = {
  id: string;
  name: string;
  created_by: string | null;
  contact_count: number;
  created_at: string;
};

type IncentiveStatus = "pending" | "approved" | "denied" | "paid";

type Contact = {
  id: string;
  list_id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  notes: string | null;
  extra_data: Record<string, string> | null;
  ride_booked: boolean | null;
  submitted_by: string | null;
  submitted_at: string | null;
  incentive_amount: number | null;
  incentive_status: IncentiveStatus;
  incentive_reviewed_by: string | null;
  incentive_reviewed_at: string | null;
  created_at: string;
};

type ExistingContact = Pick<Contact, "id" | "name" | "first_name" | "last_name" | "phone" | "email" | "company" | "notes" | "extra_data">;

type ContactRide = {
  id: string;
  contact_id: string;
  list_id: string;
  booked: boolean;
  submitted_by: string | null;
  submitted_at: string;
  incentive_amount: number | null;
  incentive_status: IncentiveStatus;
  incentive_reviewed_by: string | null;
  incentive_reviewed_at: string | null;
  created_at: string;
};

type ContactNote = {
  id: string;
  contact_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
};

type AdminUser = { user_id: string; full_name: string | null; email: string };

type PendingRow = {
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  notes: string | null;
  extra_data: Record<string, string>;
  instagram?: string | null;
  comp_card?: string | null;
};

function formatUSPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length < 10) return String(raw).trim() || null;
  const last10 = digits.slice(-10);
  return `+1 (${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`;
}

// Fields that map to dedicated columns — everything else goes into extra_data
const FIRST_NAME_KEYS = ["personal information", "first name", "first", "fname", "given name"];
const LAST_NAME_KEYS = ["given", "last name", "last", "lname", "surname", "family name"];
const PHONE_KEYS = ["phone", "phone number", "mobile", "cell", "tel", "telephone"];
const EMAIL_KEYS = ["email", "email address", "e-mail"];
const COMPANY_KEYS = ["company", "organization", "organisation", "business", "employer"];
const NAME_KEYS = ["name", "full name", "contact"];
const NOTES_KEYS = ["notes", "note", "comment", "comments"];
const INSTAGRAM_KEYS = ["instagram", "ig", "instagram handle", "insta"];
const COMP_CARD_KEYS = ["please upload your comp card", "comp card", "compcard", "comp-card"];
const RESERVED = new Set([
  ...FIRST_NAME_KEYS, ...LAST_NAME_KEYS, ...PHONE_KEYS, ...EMAIL_KEYS,
  ...COMPANY_KEYS, ...NAME_KEYS, ...NOTES_KEYS,
  ...INSTAGRAM_KEYS, ...COMP_CARD_KEYS,
]);

// ----------------- CSV parser (RFC4180-ish, handles quotes & commas) -----------------
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function normalizeCsvHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/[“”]/g, '"')
    .replace(/^['"]|['"]$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function pick(obj: Record<string, string>, keys: string[]): string | null {
  for (const k of keys) {
    const key = normalizeCsvHeader(k);
    if (obj[key] && obj[key].trim() !== "") return obj[key].trim();
  }
  return null;
}

function cleanNamePart(value: string | null, part: "first" | "last") {
  const raw = (value || "")
    .replace(/\b(first|last)\s*name\s*:?/gi, " ")
    .replace(/\b(personal\s*information)\s*:?/gi, " ")
    .replace(/[\r\n\t]+/g, " ")
    .trim();
  if (!raw) return null;
  const pieces = raw.split(/\s+/).filter(Boolean);
  return part === "first" ? pieces[0] || null : pieces[pieces.length - 1] || null;
}

function csvLeadName(obj: Record<string, string>) {
  const first = cleanNamePart(pick(obj, ["personal information", ...FIRST_NAME_KEYS]), "first");
  const last = cleanNamePart(pick(obj, ["last name", ...LAST_NAME_KEYS]), "last");
  const fullName = pick(obj, NAME_KEYS);
  const name = [first, last].filter(Boolean).join(" ").trim() || fullName;
  return { first_name: first, last_name: last, name: name || null };
}

function mergeText(existing: string | null, incoming: string | null) {
  const a = (existing || "").trim();
  const b = (incoming || "").trim();
  if (!a) return b || null;
  if (!b || a.includes(b)) return a;
  return `${a}\n${b}`;
}

function phoneKey(phone: string | null) {
  return (phone || "").replace(/\D/g, "");
}

function emailKey(email: string | null) {
  return (email || "").trim().toLowerCase();
}

// Call scripts keyed by normalized list name
import type { StructuredCallScript } from "@/components/admin/CallScriptDialog";

const CALL_SCRIPTS: Record<string, StructuredCallScript> = {
  "model casting list": {
    title: "Model Casting — Call Script",
    subtitle: "Vicarious Fashion & Lingerie Swim Week playbook",
    phases: [
      {
        type: "pitch",
        title: "Opening Pitch",
        icon: "phone",
        paragraphs: [
          "Hey Babesssss .... this is [Name] with Forti — the official luxury transportation partner for Vicarious Fashion & Lingerie Swim Week 🚘",
          "We're providing on-call luxury black truck and executive sedan transportation for models, talent, and VIP guests all throughout Swim Week for castings, fittings, dinners, events, and after-parties.",
          "This event will be extremely busy, the event locations will have very limited to almost no parking available, and traditional Uber/Lyft pickups will be a hassle with long wait times, traffic congestion, pickup confusion, and drop-off restrictions around the venues.",
          "With Forti, all rides include designated pickup and drop-off access directly at or near the venue entrance for a smoother VIP-style arrival and exit experience throughout the week.",
          "I'm about to send you the Forti download link so we can get your account set up and secure your first ride booking. We can book either one-way or roundtrip transportation depending on what you need for your schedule.",
          "We're also offering exclusive Swim Week pricing with discounts up to $200 OFF depending on the ride distance and trip type, but availability is limited because vehicles are being reserved throughout the week pretty quickly.",
          "Once you download the app, I'll help get your ride locked in and assigned with your driver directly over the phone.",
        ],
      },
      {
        type: "pricing",
        title: "Quote the Ride",
        icon: "dollar",
        groups: [
          {
            label: "Pickup point",
            rows: [
              { range: "Less than 15 miles", discount: "$200.00 OFF" },
              { range: "More than 15 (16+) miles", discount: "$180.00 OFF" },
            ],
            note: "Place in app on your end, state rate then discount.",
          },
          {
            label: "Drop-off point",
            rows: [
              { range: "Less than 20 miles", discount: "$200.00 OFF" },
              { range: "More than 15 (16+) miles", discount: "$180.00 OFF" },
            ],
            note: "Place in app on your end, state rate then discount.",
          },
        ],
      },
      {
        type: "checklist",
        title: "Confirm & Close",
        icon: "check",
        items: [
          {
            label: "Confirm rate with rider",
            sub: "Make sure they're ok. Discount is one-time use, valid today, with them only.",
          },
          {
            label: "Clarify the charge window",
            sub: "Not charged until 20 min before ride. Cancellations must be done 1 hour in advance.",
          },
          { label: "Send download link for the app" },
          {
            label: "Confirm download & walk through sign-up",
            sub: "Stay on while they download. If they're busy, call back.",
          },
          {
            label: "Confirm vehicle has been booked",
            sub: "Will be validated in the admin portal by us.",
          },
          { label: "Mark as ride booked" },
          { label: "Next lead 🚀" },
        ],
      },
    ],
  },
};

function getCallScript(listName: string | undefined | null) {
  if (!listName) return null;
  return CALL_SCRIPTS[listName.trim().toLowerCase()] || null;
}



export default function AdminOutboundCallTracker() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [lists, setLists] = useState<CallList[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [appendListId, setAppendListId] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [pendingRows, setPendingRows] = useState<PendingRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [incentiveMemberFilter, setIncentiveMemberFilter] = useState<string>("all");
  const [salesUserIds, setSalesUserIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesByContact, setNotesByContact] = useState<Record<string, ContactNote[]>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNoteFor, setSavingNoteFor] = useState<string | null>(null);
  const [ridesByContact, setRidesByContact] = useState<Record<string, ContactRide[]>>({});
  const [resetPrompt, setResetPrompt] = useState<Contact | null>(null);
  const [confirmPrompt, setConfirmPrompt] = useState<{ contact: Contact; booked: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [scriptBanner, setScriptBanner] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualForm, setManualForm] = useState({ first_name: "", last_name: "", phone: "", email: "", company: "", notes: "" });
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", phone: "", email: "", company: "", notes: "" });
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);

  function openEdit(c: Contact) {
    setEditContact(c);
    setEditForm({
      first_name: c.first_name || "",
      last_name: c.last_name || "",
      phone: c.phone || "",
      email: c.email || "",
      company: c.company || "",
      notes: c.notes || "",
    });
  }

  async function handleEditSave() {
    if (!editContact) return;
    setEditSaving(true);
    const fn = editForm.first_name.trim();
    const ln = editForm.last_name.trim();
    const fullName = `${fn} ${ln}`.trim();
    const updates = {
      first_name: fn || null,
      last_name: ln || null,
      name: fullName || null,
      phone: formatUSPhone(editForm.phone.trim()) || null,
      email: editForm.email.trim() || null,
      company: editForm.company.trim() || null,
      notes: editForm.notes.trim() || null,
    };
    const { error } = await supabase
      .from("outbound_call_contacts")
      .update(updates)
      .eq("id", editContact.id);
    setEditSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    setContacts((prev) => prev.map((c) => (c.id === editContact.id ? { ...c, ...updates } : c)));
    setEditContact(null);
    toast({ title: "Lead updated" });
  }

  async function handleDeleteContact() {
    if (!deleteContact) return;
    const id = deleteContact.id;
    const listId = deleteContact.list_id;
    const { error } = await supabase.from("outbound_call_contacts").delete().eq("id", id);
    if (error) {
      toast({ title: "Could not delete", description: error.message, variant: "destructive" });
      return;
    }
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setDeleteContact(null);
    // refresh list count
    const remaining = contacts.filter((c) => c.id !== id).length;
    await supabase.from("outbound_call_lists").update({ contact_count: remaining }).eq("id", listId);
    loadLists();
    toast({ title: "Lead deleted" });
  }


  async function handleManualAdd() {
    if (!activeListId) return;
    const fn = manualForm.first_name.trim();
    const ln = manualForm.last_name.trim();
    const phoneRaw = manualForm.phone.trim();
    const email = manualForm.email.trim();
    if (!fn && !ln && !phoneRaw && !email) {
      toast({ title: "Missing data", description: "Enter at least a name, phone, or email.", variant: "destructive" });
      return;
    }
    const digits = phoneRaw.replace(/\D/g, "");
    let formattedPhone: string | null = null;
    if (digits) {
      const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
      if (last10.length !== 10) {
        toast({ title: "Invalid phone", description: "US phone must have 10 digits.", variant: "destructive" });
        return;
      }
      formattedPhone = `+1 (${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`;
    }
    setManualSaving(true);
    const fullName = [fn, ln].filter(Boolean).join(" ") || null;
    const { error } = await supabase.from("outbound_call_contacts").insert({
      list_id: activeListId,
      first_name: fn || null,
      last_name: ln || null,
      name: fullName,
      phone: formattedPhone,
      email: email || null,
      company: manualForm.company.trim() || null,
      notes: manualForm.notes.trim() || null,
      extra_data: {},
    });
    setManualSaving(false);
    if (error) {
      toast({ title: "Add failed", description: error.message, variant: "destructive" });
      return;
    }
    const current = lists.find((l) => l.id === activeListId);
    await supabase.from("outbound_call_lists").update({ contact_count: (current?.contact_count || 0) + 1 }).eq("id", activeListId);
    setManualOpen(false);
    setManualForm({ first_name: "", last_name: "", phone: "", email: "", company: "", notes: "" });
    toast({ title: "Contact added", description: fullName || formattedPhone || email || "Lead saved." });
    loadLists();
    loadContacts(activeListId);
  }

  const userMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of users) m.set(u.user_id, u.full_name?.trim() || u.email);
    return m;
  }, [users]);

  const visibleLists = useMemo(
    () => lists,
    [lists, isAdmin, user?.id],
  );
  const activeList = useMemo(() => lists.find((l) => l.id === activeListId) || null, [lists, activeListId]);

  async function loadLists() {
    setLoading(true);
    const [{ data: listData }, { data: userData }, { data: salesPerms }, { data: adminRoles }] = await Promise.all([
      supabase.from("outbound_call_lists").select("*").order("created_at", { ascending: false }),
      supabase.from("admin_users_directory").select("user_id, full_name, email"),
      supabase.from("user_module_permissions").select("user_id").eq("module_name", "dept-sales"),
      supabase.from("user_roles").select("user_id").eq("role", "admin"),
    ]);
    setLists((listData || []) as CallList[]);
    setUsers((userData || []) as AdminUser[]);
    const ids = new Set<string>();
    for (const r of (salesPerms || []) as { user_id: string }[]) ids.add(r.user_id);
    for (const r of (adminRoles || []) as { user_id: string }[]) ids.add(r.user_id);
    setSalesUserIds(ids);
    setLoading(false);
  }

  async function loadContacts(listId: string) {
    setContactsLoading(true);
    const [{ data }, { data: rideData }] = await Promise.all([
      supabase
        .from("outbound_call_contacts")
        .select("*")
        .eq("list_id", listId)
        .order("created_at", { ascending: true }),
      supabase
        .from("outbound_call_contact_rides")
        .select("*")
        .eq("list_id", listId)
        .order("submitted_at", { ascending: false }),
    ]);
    setContacts((data || []) as Contact[]);
    const grouped: Record<string, ContactRide[]> = {};
    for (const r of (rideData || []) as ContactRide[]) {
      (grouped[r.contact_id] ||= []).push(r);
    }
    setRidesByContact(grouped);
    setContactsLoading(false);
  }

  async function loadNotesFor(contactId: string) {
    const { data } = await supabase
      .from("outbound_call_contact_notes")
      .select("*")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: true });
    setNotesByContact((prev) => ({ ...prev, [contactId]: (data || []) as ContactNote[] }));
  }

  async function addNote(contactId: string) {
    const body = (noteDrafts[contactId] || "").trim();
    if (!body) return;
    setSavingNoteFor(contactId);
    const { data, error } = await supabase
      .from("outbound_call_contact_notes")
      .insert({ contact_id: contactId, author_id: user?.id ?? null, body })
      .select("*")
      .single();
    setSavingNoteFor(null);
    if (error || !data) {
      toast({ title: "Could not save note", description: error?.message, variant: "destructive" });
      return;
    }
    setNotesByContact((prev) => ({
      ...prev,
      [contactId]: [...(prev[contactId] || []), data as ContactNote],
    }));
    setNoteDrafts((prev) => ({ ...prev, [contactId]: "" }));
  }

  async function deleteNote(contactId: string, noteId: string) {
    const { error } = await supabase
      .from("outbound_call_contact_notes")
      .delete()
      .eq("id", noteId);
    if (error) {
      toast({ title: "Could not delete", description: error.message, variant: "destructive" });
      return;
    }
    setNotesByContact((prev) => ({
      ...prev,
      [contactId]: (prev[contactId] || []).filter((n) => n.id !== noteId),
    }));
  }

  useEffect(() => { loadLists(); }, []);

  useEffect(() => {
    if (activeListId) loadContacts(activeListId);
    else setContacts([]);
    setExpandedId(null);
  }, [activeListId]);

  // Realtime: keep contacts in sync when bookings are approved/denied/edited from anywhere (e.g., approvals bell).
  useEffect(() => {
    if (!activeListId) return;
    const channel = supabase
      .channel(`outbound-contacts-${activeListId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "outbound_call_contacts", filter: `list_id=eq.${activeListId}` },
        () => loadContacts(activeListId),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "outbound_call_contact_rides", filter: `list_id=eq.${activeListId}` },
        () => loadContacts(activeListId),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeListId]);

  function toggleExpand(c: Contact) {
    const next = expandedId === c.id ? null : c.id;
    setExpandedId(next);
    if (next && !notesByContact[c.id]) loadNotesFor(c.id);
  }

  // ----------------- CSV file pick -----------------
  function onFilePicked(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const rows = parseCsv(text);
      if (rows.length < 2) {
        toast({ title: "Empty CSV", description: "No rows detected.", variant: "destructive" });
        return;
      }
      const headers = rows[0].map(normalizeCsvHeader);
      const parsed: PendingRow[] = rows.slice(1).map((r) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => (obj[h] = r[i] ?? ""));
        const { first_name, last_name, name } = csvLeadName(obj);
        const extra_data: Record<string, string> = {};
        for (const h of headers) {
          if (RESERVED.has(h)) continue;
          const v = (obj[h] || "").trim();
          if (v) extra_data[h] = v;
        }
        const baseNotes = pick(obj, NOTES_KEYS);
        const instagram = pick(obj, INSTAGRAM_KEYS);
        const compCard = pick(obj, COMP_CARD_KEYS);
        return {
          first_name,
          last_name,
          name: name || null,
          phone: formatUSPhone(pick(obj, PHONE_KEYS)),
          email: pick(obj, EMAIL_KEYS),
          company: pick(obj, COMPANY_KEYS),
          notes: baseNotes || null,
          extra_data,
          instagram,
          comp_card: compCard,
        };
      }).filter((r) => r.name || r.phone || r.email || r.first_name || r.last_name);
      setPendingRows(parsed);
      if (!uploadName) {
        const base = file.name.replace(/\.[^.]+$/, "");
        setUploadName(base);
      }
    };
    reader.readAsText(file);
  }

  async function handleUpload() {
    const isAppend = !!appendListId;
    if (pendingRows.length === 0 || (!isAppend && !uploadName.trim())) {
      toast({ title: "Missing data", description: "Pick a CSV" + (isAppend ? "." : " and give the list a name."), variant: "destructive" });
      return;
    }
    setUploading(true);

    let listId = appendListId;
    if (!isAppend) {
      const { data: listInsert, error: listErr } = await supabase
        .from("outbound_call_lists")
        .insert({
          name: uploadName.trim(),
          created_by: user?.id ?? null,
          contact_count: pendingRows.length,
        })
        .select("*")
        .single();
      if (listErr || !listInsert) {
        setUploading(false);
        toast({ title: "Upload failed", description: listErr?.message, variant: "destructive" });
        return;
      }
      listId = listInsert.id;
    }

    const payload = pendingRows.map((r) => {
      const { instagram, comp_card, ...rest } = r;
      return { list_id: listId!, ...rest, _instagram: instagram, _comp_card: comp_card };
    });
    const { data: existingData, error: existingErr } = await supabase
      .from("outbound_call_contacts")
      .select("id, name, first_name, last_name, phone, email, company, notes, extra_data")
      .eq("list_id", listId!);
    if (existingErr) {
      setUploading(false);
      toast({ title: "Upload failed", description: existingErr.message, variant: "destructive" });
      return;
    }

    const existingByPhone = new Map<string, ExistingContact>();
    const existingByEmail = new Map<string, ExistingContact>();
    for (const row of (existingData || []) as ExistingContact[]) {
      const pk = phoneKey(row.phone);
      const ek = emailKey(row.email);
      if (pk) existingByPhone.set(pk, row);
      if (ek) existingByEmail.set(ek, row);
    }

    type EnrichedInsert = { row: any; instagram: string | null; comp_card: string | null };
    const updates: Array<Partial<Contact> & { id: string; _instagram?: string | null; _comp_card?: string | null }> = [];
    const inserts: EnrichedInsert[] = [];
    const seenExisting = new Set<string>();
    for (const row of payload) {
      const { _instagram, _comp_card, ...clean } = row;
      const existing = existingByPhone.get(phoneKey(clean.phone)) || existingByEmail.get(emailKey(clean.email));
      if (existing && !seenExisting.has(existing.id)) {
        seenExisting.add(existing.id);
        updates.push({
          id: existing.id,
          first_name: clean.first_name || existing.first_name,
          last_name: clean.last_name || existing.last_name,
          name: clean.name || existing.name,
          phone: clean.phone || existing.phone,
          email: clean.email || existing.email,
          company: clean.company || existing.company,
          notes: mergeText(existing.notes, clean.notes),
          extra_data: { ...(existing.extra_data || {}), ...(clean.extra_data || {}) },
          _instagram,
          _comp_card,
        });
      } else {
        inserts.push({ row: clean, instagram: _instagram, comp_card: _comp_card });
      }
    }

    // Insert new contacts and collect their ids
    const newNotePairs: Array<{ contact_id: string; body: string }> = [];
    for (let i = 0; i < inserts.length; i += 500) {
      const slice = inserts.slice(i, i + 500);
      const { data: insData, error } = await supabase
        .from("outbound_call_contacts")
        .insert(slice.map((s) => s.row))
        .select("id");
      if (error) {
        setUploading(false);
        toast({ title: "Insert error", description: error.message, variant: "destructive" });
        return;
      }
      (insData || []).forEach((rec: any, idx: number) => {
        const src = slice[idx];
        if (src.instagram) newNotePairs.push({ contact_id: rec.id, body: `Instagram: ${src.instagram}` });
        if (src.comp_card) newNotePairs.push({ contact_id: rec.id, body: `Comp card: ${src.comp_card}` });
      });
    }
    for (const update of updates) {
      const { id, _instagram, _comp_card, ...values } = update;
      const { error } = await supabase.from("outbound_call_contacts").update(values).eq("id", id);
      if (error) {
        setUploading(false);
        toast({ title: "Update error", description: error.message, variant: "destructive" });
        return;
      }
      if (_instagram || _comp_card) {
        const { data: existingNotes } = await supabase
          .from("outbound_call_contact_notes")
          .select("body")
          .eq("contact_id", id);
        const bodies = new Set((existingNotes || []).map((n: any) => (n.body || "").trim()));
        if (_instagram) {
          const body = `Instagram: ${_instagram}`;
          if (!bodies.has(body)) newNotePairs.push({ contact_id: id, body });
        }
        if (_comp_card) {
          const body = `Comp card: ${_comp_card}`;
          if (!bodies.has(body)) newNotePairs.push({ contact_id: id, body });
        }
      }
    }

    if (newNotePairs.length) {
      for (let i = 0; i < newNotePairs.length; i += 500) {
        const slice = newNotePairs.slice(i, i + 500).map((n) => ({
          contact_id: n.contact_id,
          author_id: user?.id ?? null,
          body: n.body,
        }));
        await supabase.from("outbound_call_contact_notes").insert(slice);
      }
    }

    if (isAppend) {
      // bump contact_count on existing list
      const current = lists.find((l) => l.id === listId);
      const newCount = (current?.contact_count || 0) + inserts.length;
      await supabase.from("outbound_call_lists").update({ contact_count: newCount }).eq("id", listId!);
    }

    setUploading(false);
    setUploadOpen(false);
    setAppendListId(null);
    setPendingRows([]);
    setUploadName("");
    if (fileRef.current) fileRef.current.value = "";
    toast({ title: isAppend ? "Contacts added" : "List uploaded", description: `${inserts.length} added${updates.length ? `, ${updates.length} updated` : ""}.` });
    loadLists();
    if (isAppend && listId) loadContacts(listId);
  }

  async function submitContact(contact: Contact, rideBooked: boolean) {
    const now = new Date().toISOString();
    // 1. Insert a new ride row (history of attempts)
    const { data: rideInserted, error: rideErr } = await supabase
      .from("outbound_call_contact_rides")
      .insert({
        contact_id: contact.id,
        list_id: contact.list_id,
        booked: rideBooked,
        submitted_by: user?.id ?? null,
        submitted_at: now,
        incentive_amount: 5.0,
        incentive_status: "pending",
      })
      .select("*")
      .single();
    if (rideErr) {
      toast({ title: "Could not save", description: rideErr.message, variant: "destructive" });
      return;
    }
    // 2. Update contacts cache so existing UI (bell, stats) reflects latest attempt.
    const { error } = await supabase
      .from("outbound_call_contacts")
      .update({
        ride_booked: rideBooked,
        submitted_by: user?.id ?? null,
        submitted_at: now,
        incentive_status: "pending",
        incentive_reviewed_by: null,
        incentive_reviewed_at: null,
      })
      .eq("id", contact.id);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contact.id
          ? {
              ...c,
              ride_booked: rideBooked,
              submitted_by: user?.id ?? null,
              submitted_at: now,
              incentive_status: "pending",
              incentive_reviewed_by: null,
              incentive_reviewed_at: null,
            }
          : c,
      ),
    );
    if (rideInserted) {
      setRidesByContact((prev) => ({
        ...prev,
        [contact.id]: [rideInserted as ContactRide, ...(prev[contact.id] || [])],
      }));
    }
    const count = (ridesByContact[contact.id]?.length || 0) + 1;
    toast({
      title: rideBooked ? "Ride logged" : "Marked as no",
      description: rideBooked ? `Ride #${count} for this lead.` : undefined,
    });
  }

  const [sendingLinkFor, setSendingLinkFor] = useState<string | null>(null);
  async function sendLeadLink(contact: Contact, sourcePage: "download" | "swimweek") {
    if (!contact.phone && !contact.email) {
      toast({ title: "No phone or email", description: "This lead has no contact info.", variant: "destructive" });
      return;
    }
    setSendingLinkFor(contact.id);
    const { data, error } = await supabase.functions.invoke("send-lead-link", {
      body: { contact_id: contact.id, source_page: sourcePage },
    });
    setSendingLinkFor(null);
    if (error || !data?.ok) {
      toast({
        title: "Send failed",
        description: error?.message || data?.error || "Could not send link.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: `/${sourcePage} link sent`,
      description: `Delivered via SMS to ${contact.phone || ""}`.trim(),
    });
    // Refresh notes if the lead is expanded so the auto-note appears immediately.
    if (expandedId === contact.id) loadNotesFor(contact.id);
  }

  async function clearContact(contact: Contact) {
    if (!isAdmin) {
      toast({ title: "Admins only", description: "Only admins can reset leads.", variant: "destructive" });
      return;
    }
    // Wipe ride history for this contact, then clear the cache so it returns to pending.
    const { error: ridesErr } = await supabase
      .from("outbound_call_contact_rides")
      .delete()
      .eq("contact_id", contact.id);
    if (ridesErr) {
      toast({ title: "Could not reset", description: ridesErr.message, variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("outbound_call_contacts")
      .update({
        ride_booked: null,
        submitted_by: null,
        submitted_at: null,
        incentive_status: "pending",
        incentive_reviewed_by: null,
        incentive_reviewed_at: null,
      })
      .eq("id", contact.id);
    if (error) {
      toast({ title: "Could not reset", description: error.message, variant: "destructive" });
      return;
    }
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contact.id
          ? {
              ...c,
              ride_booked: null,
              submitted_by: null,
              submitted_at: null,
              incentive_status: "pending",
              incentive_reviewed_by: null,
              incentive_reviewed_at: null,
            }
          : c,
      ),
    );
    setRidesByContact((prev) => ({ ...prev, [contact.id]: [] }));
    toast({ title: "Lead reset", description: "Ride history cleared." });
  }

  async function deleteList(id: string) {
    if (!confirm("Delete this list and all its contacts?")) return;
    const { error } = await supabase.from("outbound_call_lists").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setActiveListId(null);
    loadLists();
  }

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      [c.name, c.first_name, c.last_name, c.phone, c.email, c.company].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [contacts, search]);

  const stats = useMemo(() => {
    const total = contacts.length;
    const booked = contacts.filter((c) => c.ride_booked === true).length;
    const declined = contacts.filter((c) => c.ride_booked === false).length;
    const pending = total - booked - declined;
    return { total, booked, declined, pending };
  }, [contacts]);

  // Current week range (Monday → Sunday), used as the default payout window.
  const currentWeekRange = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun..6=Sat
    const diffToMon = (day + 6) % 7; // days since Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMon);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { from: iso(monday), to: iso(sunday) };
  }, []);
  const [payoutFrom, setPayoutFrom] = useState<string>(currentWeekRange.from);
  const [payoutTo, setPayoutTo] = useState<string>(currentWeekRange.to);

  // Flatten all rides across loaded contacts so each booking is attributed to its actual submitter.
  const allRides = useMemo(() => {
    const out: ContactRide[] = [];
    for (const rides of Object.values(ridesByContact)) out.push(...rides);
    return out;
  }, [ridesByContact]);

  const payoutFilteredRides = useMemo(() => {
    const from = payoutFrom ? new Date(payoutFrom + "T00:00:00").getTime() : null;
    const to = payoutTo ? new Date(payoutTo + "T23:59:59.999").getTime() : null;
    return allRides.filter((r) => {
      if (!r.booked) return false;
      if (from === null && to === null) return true;
      if (!r.submitted_at) return false;
      const t = new Date(r.submitted_at).getTime();
      if (from !== null && t < from) return false;
      if (to !== null && t > to) return false;
      return true;
    });
  }, [allRides, payoutFrom, payoutTo]);

  const incentivesByUser = useMemo(() => {
    const map = new Map<string, { pending: number; approved: number; denied: number; paid: number; pendingCount: number; approvedCount: number }>();
    for (const r of payoutFilteredRides) {
      if (!r.submitted_by) continue;
      const amt = Number(r.incentive_amount ?? 0);
      const cur = map.get(r.submitted_by) || { pending: 0, approved: 0, denied: 0, paid: 0, pendingCount: 0, approvedCount: 0 };
      if (r.incentive_status === "pending") { cur.pending += amt; cur.pendingCount++; }
      else if (r.incentive_status === "approved") { cur.approved += amt; cur.approvedCount++; }
      else if (r.incentive_status === "denied") { cur.denied += amt; }
      else if (r.incentive_status === "paid") { cur.paid += amt; }
      map.set(r.submitted_by, cur);
    }
    return map;
  }, [payoutFilteredRides]);

  const myIncentives = user?.id ? incentivesByUser.get(user.id) : undefined;

  async function setIncentiveStatus(contact: Contact, status: IncentiveStatus) {
    const reviewed_at = new Date().toISOString();
    const { error } = await supabase
      .from("outbound_call_contacts")
      .update({ incentive_status: status, incentive_reviewed_by: user?.id ?? null, incentive_reviewed_at: reviewed_at })
      .eq("id", contact.id);
    if (error) {
      toast({ title: "Could not update incentive", description: error.message, variant: "destructive" });
      return;
    }
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contact.id
          ? { ...c, incentive_status: status, incentive_reviewed_by: user?.id ?? null, incentive_reviewed_at: reviewed_at }
          : c
      )
    );
  }

  function fmtMoney(n: number) {
    return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
  }

  function displayName(c: Contact) {
    const composed = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
    return composed || c.name || "—";
  }

  // ----------------- LIST VIEW -----------------
  if (!activeListId) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-light tracking-wide metallic-shimmer">Outbound Call Tracker</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upload contact lists, log call outcomes, and see which agent booked each ride.
            </p>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setUploadOpen(true)}
              className="bg-gradient-to-b from-[hsl(0,0%,85%)] via-[hsl(0,0%,70%)] to-[hsl(0,0%,80%)] text-black font-bold border border-white/20 btn-shimmer"
            >
              <Upload className="h-4 w-4 mr-1.5" />
              Upload Contact List
            </Button>
          )}
        </div>

        <Card className="p-0 bg-card/50 border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-foreground/90">Lists</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : visibleLists.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {isAdmin ? "No call lists yet. Upload a CSV to get started." : "No call lists available yet."}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {visibleLists.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setActiveListId(l.id)}
                  className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/[0.04] text-left transition-colors"
                >
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{l.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {l.contact_count} contacts · uploaded by{" "}
                      {l.created_by ? (userMap.get(l.created_by)?.split(" ")[0] || "—") : "—"} ·{" "}
                      {new Date(l.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <UploadDialog
          open={uploadOpen}
          appendListName={appendListId ? (lists.find((l) => l.id === appendListId)?.name || null) : null}
          onOpenChange={(o) => {
            setUploadOpen(o);
            if (!o) {
              setPendingRows([]);
              setUploadName("");
              setAppendListId(null);
              if (fileRef.current) fileRef.current.value = "";
            }
          }}
          uploadName={uploadName}
          setUploadName={setUploadName}
          pendingRows={pendingRows}
          onFilePick={onFilePicked}
          uploading={uploading}
          onConfirm={handleUpload}
          fileRef={fileRef}
        />

        <Dialog open={manualOpen} onOpenChange={(o) => { if (!manualSaving) setManualOpen(o); }}>
          <DialogContent className="bg-popover border-white/10 max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Contact Manually</DialogTitle>
              <DialogDescription>
                Add a single lead to "{activeList?.name}". Phone will be auto-formatted to US (+1).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">First Name</label>
                  <Input value={manualForm.first_name} onChange={(e) => setManualForm((f) => ({ ...f, first_name: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Last Name</label>
                  <Input value={manualForm.last_name} onChange={(e) => setManualForm((f) => ({ ...f, last_name: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Phone (US)</label>
                <Input
                  value={manualForm.phone}
                  onChange={(e) => setManualForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
                <Input type="email" value={manualForm.email} onChange={(e) => setManualForm((f) => ({ ...f, email: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Company</label>
                <Input value={manualForm.company} onChange={(e) => setManualForm((f) => ({ ...f, company: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</label>
                <Textarea value={manualForm.notes} onChange={(e) => setManualForm((f) => ({ ...f, notes: e.target.value }))} className="mt-1" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setManualOpen(false)} disabled={manualSaving}>Cancel</Button>
              <Button
                onClick={handleManualAdd}
                disabled={manualSaving}
                className="bg-gradient-to-b from-[hsl(0,0%,85%)] via-[hsl(0,0%,70%)] to-[hsl(0,0%,80%)] text-black font-bold"
              >
                {manualSaving ? "Adding…" : "Add Contact"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ----------------- DETAIL VIEW -----------------
  return (
    <div className="space-y-6">
      {scriptBanner && (
        <div className="fixed bottom-4 right-4 z-[9999] bg-popover border border-white/20 text-foreground text-sm px-4 py-3 rounded-md shadow-xl animate-in fade-in slide-in-from-bottom-2">
          No script for this list — contact admin.
        </div>
      )}
      <CallScriptDialog
        open={scriptOpen}
        onOpenChange={setScriptOpen}
        script={getCallScript(activeList?.name)}
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Button size="sm" variant="ghost" onClick={() => setActiveListId(null)} className="shrink-0 px-2">
            <ArrowLeft className="h-4 w-4 md:mr-1.5" /> <span className="hidden md:inline">All Lists</span>
          </Button>
          <div className="min-w-0">
            <h2 className="text-base md:text-xl font-light tracking-wide metallic-shimmer truncate">{activeList?.name}</h2>
            <p className="text-[11px] md:text-xs text-muted-foreground truncate">
              Uploaded by {activeList?.created_by ? (userMap.get(activeList.created_by)?.split(" ")[0] || "—") : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
          {activeList && <BookingApprovalsBell listId={activeList.id} />}
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setManualOpen(true)}
              className="px-2.5 md:px-3"
            >
              <span className="md:hidden">+ Manual</span>
              <span className="hidden md:inline">+ Add Manual</span>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const script = getCallScript(activeList?.name);
              if (script) {
                setScriptOpen(true);
              } else {
                setScriptBanner(true);
                window.setTimeout(() => setScriptBanner(false), 3500);
              }
            }}
            className="px-2.5 md:px-3"
            title="View call script"
          >
            <MessageSquare className="h-4 w-4 md:mr-1.5" />
            <span className="hidden md:inline">Call Script</span>
            <span className="md:hidden ml-1">Script</span>
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => { if (activeList) { setAppendListId(activeList.id); setUploadOpen(true); } }}
              className="bg-gradient-to-b from-[hsl(0,0%,85%)] via-[hsl(0,0%,70%)] to-[hsl(0,0%,80%)] text-black font-bold border border-white/20 btn-shimmer px-2.5 md:px-3"
            >
              <Upload className="h-4 w-4 md:mr-1.5" /> <span className="hidden md:inline">Add Contacts</span><span className="md:hidden ml-1">Contacts</span>
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => activeList && deleteList(activeList.id)} className="px-2.5 md:px-3" title="Delete list">
              <Trash2 className="h-4 w-4 md:mr-1.5" /> <span className="hidden md:inline">Delete List</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-card/50 border-white/10">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total</div>
          <div className="text-2xl font-light">{stats.total}</div>
        </Card>
        <Card className="p-4 bg-card/50 border-white/10">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Booked</div>
          <div className="text-2xl font-light text-emerald-400">{stats.booked}</div>
        </Card>
        <Card className="p-4 bg-card/50 border-white/10">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Declined</div>
          <div className="text-2xl font-light text-destructive-foreground">{stats.declined}</div>
        </Card>
        <Card className="p-4 bg-card/50 border-white/10">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Pending</div>
          <div className="text-2xl font-light">{stats.pending}</div>
        </Card>
      </div>

      <Card className="p-4 bg-card/50 border-white/10 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">My Incentives (this list)</div>
            <div className="text-xs text-muted-foreground mt-1">$5.00 per confirmed booked ride. Subject to admin approval.</div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending</div><div className="text-lg font-light text-amber-300">{fmtMoney(myIncentives?.pending || 0)}</div></div>
            <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Approved</div><div className="text-lg font-light text-emerald-400">{fmtMoney(myIncentives?.approved || 0)}</div></div>
            <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Paid</div><div className="text-lg font-light">{fmtMoney(myIncentives?.paid || 0)}</div></div>
            <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Denied</div><div className="text-lg font-light text-red-500">{fmtMoney(myIncentives?.denied || 0)}</div></div>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-white/5">
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Payout From</label>
            <Input type="date" value={payoutFrom} onChange={(e) => setPayoutFrom(e.target.value)} className="h-9 w-full md:w-[160px]" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Payout To</label>
            <Input type="date" value={payoutTo} onChange={(e) => setPayoutTo(e.target.value)} className="h-9 w-full md:w-[160px]" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(() => {
              const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              const today = new Date();
              const presets: { label: string; from: string; to: string }[] = [
                { label: "This week", from: currentWeekRange.from, to: currentWeekRange.to },
                { label: "Today", from: iso(today), to: iso(today) },
                ...([["Last 7 days", 7], ["Last month", 30], ["Last 3 months", 90], ["Last year", 365]] as [string, number][]).map(([label, days]) => {
                  const from = new Date(); from.setDate(from.getDate() - days);
                  return { label, from: iso(from), to: iso(today) };
                }),
                { label: "All time", from: "", to: "" },
              ];
              return presets.map(({ label, from, to }) => {
                const isActive = payoutFrom === from && payoutTo === to;
                return (
                  <Button
                    key={label}
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    className={`h-9 ${isActive ? "bg-foreground text-background hover:bg-foreground/90" : ""}`}
                    onClick={() => { setPayoutFrom(from); setPayoutTo(to); }}
                  >
                    {label}
                  </Button>
                );
              });
            })()}
          </div>
          <div className="text-[11px] text-muted-foreground ml-auto">
            Filters totals by date the ride outcome was submitted.
          </div>
        </div>
      </Card>

      {isAdmin && (() => {
        const memberEntries = Array.from(incentivesByUser.entries());
        const zero = { pending: 0, approved: 0, denied: 0, paid: 0, pendingCount: 0, approvedCount: 0 };
        // Roster: only staff/ambassadors with Sales module access (plus anyone who has already submitted a booking, just in case).
        const rosterIds = Array.from(new Set([
          ...users.map((u) => u.user_id).filter((uid) => salesUserIds.has(uid)),
          ...memberEntries.map(([uid]) => uid),
        ])).sort((a, b) => (userMap.get(a) || "").localeCompare(userMap.get(b) || ""));
        const visible = incentiveMemberFilter === "all"
          ? memberEntries
          : [[incentiveMemberFilter, incentivesByUser.get(incentiveMemberFilter) || zero] as [string, typeof zero]];
        const rangeLabel = !payoutFrom && !payoutTo
          ? "All time"
          : `${payoutFrom || "…"} → ${payoutTo || "…"}`;
        return (
          <Card className="p-0 bg-card/50 border-white/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <div className="text-xs uppercase tracking-[0.2em] text-foreground/90">
                  Team Incentives (admin view)
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {rangeLabel} · synced with date filter above · filter by ambassador / staff submitter
                </div>
              </div>
              <select
                value={incentiveMemberFilter}
                onChange={(e) => setIncentiveMemberFilter(e.target.value)}
                className="h-8 px-2 text-xs bg-background border border-white/10 rounded text-foreground"
              >
                <option value="all">All ambassadors & staff</option>
                {rosterIds.map((uid) => (
                  <option key={uid} value={uid}>{userMap.get(uid) || "—"}</option>
                ))}
              </select>
            </div>
            <div className="divide-y divide-white/5">
              {visible.map(([uid, v]) => {
                const due = v.pending + v.approved;
                return (
                  <div key={uid} className="px-5 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                    <div className="flex-1 min-w-[140px] font-medium">{userMap.get(uid) || "—"}</div>
                    <div className="text-xs"><span className="text-muted-foreground">Pending </span><span className="text-amber-300">{fmtMoney(v.pending)}</span></div>
                    <div className="text-xs"><span className="text-muted-foreground">Approved </span><span className="text-emerald-400">{fmtMoney(v.approved)}</span></div>
                    <div className="text-xs"><span className="text-muted-foreground">Paid </span>{fmtMoney(v.paid)}</div>
                    <div className="text-xs"><span className="text-muted-foreground">Denied </span><span className="text-destructive-foreground">{fmtMoney(v.denied)}</span></div>
                    <div className="text-xs pl-3 border-l border-white/10"><span className="text-muted-foreground">Amount Due </span><span className="text-foreground font-medium">{fmtMoney(due)}</span></div>
                  </div>
                );
              })}
              {visible.length === 0 && (
                <div className="px-5 py-4 text-xs text-muted-foreground">No bookings submitted in this range.</div>
              )}
            </div>
          </Card>
        );
      })()}

      <div className="relative">
        <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          placeholder="Search by name, phone, email, or company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 pl-9"
        />
      </div>

      <Card className="p-0 bg-card/50 border-white/10 overflow-hidden">
        {contactsLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading contacts…</div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No contacts match.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredContacts.map((c) => {
              const submittedName = c.submitted_by ? userMap.get(c.submitted_by) || "—" : null;
              const isOpen = expandedId === c.id;
              const notes = notesByContact[c.id] || [];
              const extras = c.extra_data && typeof c.extra_data === "object" ? c.extra_data : {};
              const extraEntries = Object.entries(extras).filter(([, v]) => v && String(v).trim() !== "");
              return (
                <div key={c.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleExpand(c)}
                      className="w-full md:flex-1 md:min-w-[180px] text-left flex items-start gap-2 hover:opacity-80 transition-opacity"
                    >
                      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-foreground truncate">{displayName(c)}</div>
                        <div className="text-xs text-muted-foreground flex flex-col md:flex-row md:flex-wrap md:gap-x-3 gap-y-0.5 mt-0.5">
                          {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" /> {c.phone}</span>}
                          {c.email && <span className="truncate">{c.email}</span>}
                          {c.company && <span className="truncate">{c.company}</span>}
                        </div>
                      </div>
                    </button>
                    <div className="w-full md:w-auto grid grid-cols-2 md:flex md:items-center gap-1.5 md:gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={sendingLinkFor === c.id || !c.phone}
                            title={!c.phone ? "No phone on file" : "Send referral link via SMS"}
                            className="w-full md:w-auto"
                          >
                            <Send className="h-4 w-4 mr-1" />
                            {sendingLinkFor === c.id ? "Sending…" : "Send Link"}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover z-[60]">
                          <DropdownMenuItem className="hover:bg-foreground/10" onClick={() => sendLeadLink(c, "download")}>
                            /download — App referral link
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-foreground/10" onClick={() => sendLeadLink(c, "swimweek")}>
                            /swimweek — Swim Week link
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {c.ride_booked === null && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmPrompt({ contact: c, booked: true })}
                            className="w-full md:w-auto"
                          >
                            <Check className="h-4 w-4 mr-1" /> Booked
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmPrompt({ contact: c, booked: false })}
                            className="w-full md:w-auto"
                          >
                            <X className="h-4 w-4 mr-1" /> No
                          </Button>
                        </>
                      )}
                      {c.ride_booked === true && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => setConfirmPrompt({ contact: c, booked: true })}
                            className="w-full md:w-auto bg-emerald-500 text-black hover:bg-emerald-400"
                            title="Log another ride for this lead"
                          >
                            <Plus className="h-4 w-4 mr-1" /> Book Another
                          </Button>
                          {isAdmin && (
                            <Button size="sm" variant="ghost" onClick={() => setResetPrompt(c)} className="w-full md:w-auto" title="Admin: clear ride history">
                              <RotateCcw className="h-4 w-4 mr-1" /> Reset
                            </Button>
                          )}
                        </>
                      )}
                      {c.ride_booked === false && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => setConfirmPrompt({ contact: c, booked: true })}
                            className="w-full md:w-auto bg-emerald-500 text-black hover:bg-emerald-400"
                            title="They said yes after all — log a ride"
                          >
                            <Check className="h-4 w-4 mr-1" /> Booked
                          </Button>
                          {isAdmin && (
                            <Button size="sm" variant="ghost" onClick={() => setResetPrompt(c)} className="w-full md:w-auto" title="Admin: clear status">
                              <RotateCcw className="h-4 w-4 mr-1" /> Reset
                            </Button>
                          )}
                        </>
                      )}
                      <Button size="sm" variant="outline" onClick={() => openEdit(c)} title="Edit lead" className="w-full md:w-auto">
                        <Pencil className="h-4 w-4 md:mr-0 mr-1" /><span className="md:hidden">Edit</span>
                      </Button>
                      {isAdmin && (
                        <Button size="sm" variant="ghost" onClick={() => setDeleteContact(c)} title="Delete lead" className="w-full md:w-auto text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4 md:mr-0 mr-1" /><span className="md:hidden">Delete</span>
                        </Button>
                      )}
                    </div>
                    {submittedName && (isAdmin || c.submitted_by === user?.id) && (
                      <div className="w-full text-[11px] text-muted-foreground">
                        Submitted by <span className="text-foreground">{c.submitted_by === user?.id ? "You" : submittedName}</span>
                        {c.submitted_at && ` · ${new Date(c.submitted_at).toLocaleString()}`}
                      </div>
                    )}
                    {c.ride_booked === true && (isAdmin || c.submitted_by === user?.id) && (
                      <div className="w-full flex flex-wrap items-center gap-2 pt-1.5 border-t border-white/5 mt-1">
                        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Incentive {fmtMoney(Number(c.incentive_amount ?? 0))}</span>
                        <IncentiveBadge status={c.incentive_status} />
                        {c.incentive_reviewed_at && (
                          <span className="text-[11px] text-muted-foreground">
                            · {c.incentive_status}{isAdmin ? ` by ${c.incentive_reviewed_by ? userMap.get(c.incentive_reviewed_by) || "—" : "—"}` : ""} · {new Date(c.incentive_reviewed_at).toLocaleDateString()}
                          </span>
                        )}
                        {isAdmin && (
                          <div className="ml-auto flex items-center gap-1.5">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setIncentiveStatus(c, "approved")} disabled={c.incentive_status === "approved"}>Approve</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setIncentiveStatus(c, "denied")} disabled={c.incentive_status === "denied"}>Deny</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setIncentiveStatus(c, "paid")} disabled={c.incentive_status === "paid"}>Mark Paid</Button>
                            {c.incentive_status !== "pending" && (
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIncentiveStatus(c, "pending")}>Reset</Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {isOpen && (
                    <div className="mt-3 ml-6 space-y-4 pb-2">
                      {/* All lead fields */}
                      <div className="rounded-md border border-white/10 bg-background/40 p-3">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Lead Details</div>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                          {c.created_at && <FieldRow label="Uploaded" value={new Date(c.created_at).toLocaleString()} />}
                          {c.first_name && <FieldRow label="First Name" value={c.first_name} />}
                          {c.last_name && <FieldRow label="Last Name" value={c.last_name} />}
                          {c.phone && <FieldRow label="Phone" value={c.phone} />}
                          {c.email && <FieldRow label="Email" value={c.email} />}
                          {c.company && <FieldRow label="Company" value={c.company} />}
                          {c.notes && <FieldRow label="Imported Notes" value={c.notes} />}
                          {extraEntries.map(([k, v]) => (
                            <FieldRow key={k} label={titleCase(k)} value={String(v)} />
                          ))}
                          {!c.first_name && !c.last_name && !c.phone && !c.email && !c.company && !c.notes && extraEntries.length === 0 && (
                            <div className="text-xs text-muted-foreground">No additional fields.</div>
                          )}
                        </dl>
                      </div>

                      {/* Ride history */}
                      {(() => {
                        const rides = ridesByContact[c.id] || [];
                        const bookedCount = rides.filter((r) => r.booked).length;
                        return (
                          <div className="rounded-md border border-white/10 bg-background/40 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                <History className="h-3.5 w-3.5" /> Ride History
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                Rides booked: <span className="text-emerald-400 font-semibold">{bookedCount}</span>
                                {rides.length > bookedCount && <> · No: <span className="text-foreground/70">{rides.length - bookedCount}</span></>}
                              </div>
                            </div>
                            {rides.length === 0 ? (
                              <div className="text-xs text-muted-foreground">No rides yet.</div>
                            ) : (
                              <div className="space-y-1.5">
                                {rides.map((r) => {
                                  const isMine = r.submitted_by === user?.id;
                                  if (!isAdmin && !isMine) {
                                    return (
                                      <div key={r.id} className="flex flex-wrap items-center gap-2 text-xs bg-white/[0.03] rounded px-2.5 py-1.5">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold ${r.booked ? "bg-emerald-500/20 text-emerald-300" : "bg-destructive/20 text-destructive-foreground"}`}>
                                          {r.booked ? "Booked" : "No"}
                                        </span>
                                        <span className="text-muted-foreground">{new Date(r.submitted_at).toLocaleString()}</span>
                                        <span className="text-foreground/50 italic">Another team member</span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={r.id} className="flex flex-wrap items-center gap-2 text-xs bg-white/[0.03] rounded px-2.5 py-1.5">
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold ${r.booked ? "bg-emerald-500/20 text-emerald-300" : "bg-destructive/20 text-destructive-foreground"}`}>
                                        {r.booked ? "Booked" : "No"}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {new Date(r.submitted_at).toLocaleString()}
                                      </span>
                                      <span className="text-foreground/80">
                                        {isMine ? "You" : (r.submitted_by ? userMap.get(r.submitted_by) || "—" : "—")}
                                      </span>
                                      {r.booked && <IncentiveBadge status={r.incentive_status} />}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Notes thread */}
                      <div className="rounded-md border border-white/10 bg-background/40 p-3 space-y-3">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          <MessageSquare className="h-3.5 w-3.5" /> Staff Notes
                        </div>
                        {notes.length === 0 ? (
                          <div className="text-xs text-muted-foreground">No notes yet.</div>
                        ) : (
                          <div className="space-y-2">
                            {notes.map((n) => (
                              <div key={n.id} className="rounded-md bg-white/5 px-3 py-2">
                                <div className="text-[11px] text-muted-foreground flex items-center justify-between gap-2">
                                  <span>
                                    <span className="text-foreground">{n.author_id ? userMap.get(n.author_id) || "—" : "—"}</span>
                                    {" · "}{new Date(n.created_at).toLocaleString()}
                                  </span>
                                  {n.author_id === user?.id && (
                                    <button
                                      type="button"
                                      onClick={() => deleteNote(c.id, n.id)}
                                      className="text-muted-foreground hover:text-destructive-foreground"
                                      aria-label="Delete note"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                                <div className="text-sm whitespace-pre-wrap break-all mt-1 leading-relaxed">
                                  <Linkified text={n.body} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Leave a note for the team…"
                            value={noteDrafts[c.id] || ""}
                            onChange={(e) => setNoteDrafts((p) => ({ ...p, [c.id]: e.target.value }))}
                            className="min-h-[60px] text-sm"
                          />
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => addNote(c.id)}
                              disabled={savingNoteFor === c.id || !(noteDrafts[c.id] || "").trim()}
                            >
                              {savingNoteFor === c.id ? "Saving…" : "Add Note"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <UploadDialog
        open={uploadOpen}
        appendListName={appendListId ? (lists.find((l) => l.id === appendListId)?.name || null) : null}
        onOpenChange={(o) => {
          setUploadOpen(o);
          if (!o) {
            setPendingRows([]);
            setUploadName("");
            setAppendListId(null);
            if (fileRef.current) fileRef.current.value = "";
          }
        }}
        uploadName={uploadName}
        setUploadName={setUploadName}
        pendingRows={pendingRows}
        onFilePick={onFilePicked}
        uploading={uploading}
        onConfirm={handleUpload}
        fileRef={fileRef}
      />

      <AlertDialog open={!!confirmPrompt} onOpenChange={(o) => { if (!o) setConfirmPrompt(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmPrompt?.booked ? "Confirm ride booked?" : "Confirm no booking?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmPrompt?.booked
                ? "This logs a new ride for this lead and submits your $5.00 incentive for admin approval. You can book this lead again later for additional rides."
                : "This marks the lead as No for now. They can still be booked later if they change their mind."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmPrompt) return;
                await submitContact(confirmPrompt.contact, confirmPrompt.booked);
                setConfirmPrompt(null);
              }}
              className={confirmPrompt?.booked ? "bg-emerald-500 text-black hover:bg-emerald-400" : "bg-destructive text-destructive-foreground hover:opacity-90"}
            >
              {confirmPrompt?.booked ? "Yes, log this ride" : "Yes, mark as No"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!resetPrompt} onOpenChange={(o) => { if (!o) setResetPrompt(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears the entire ride history for this lead and returns it to pending. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!resetPrompt) return;
                await clearContact(resetPrompt);
                setResetPrompt(null);
              }}
              className="bg-destructive text-destructive-foreground hover:opacity-90"
            >
              Yes, reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={manualOpen} onOpenChange={(o) => { if (!manualSaving) setManualOpen(o); }}>
        <DialogContent className="bg-popover border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Contact Manually</DialogTitle>
            <DialogDescription>
              Add a single lead to "{activeList?.name}". Phone will be auto-formatted to US (+1).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">First Name</label>
                <Input value={manualForm.first_name} onChange={(e) => setManualForm((f) => ({ ...f, first_name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Last Name</label>
                <Input value={manualForm.last_name} onChange={(e) => setManualForm((f) => ({ ...f, last_name: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Phone (US)</label>
              <Input value={manualForm.phone} onChange={(e) => setManualForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" className="mt-1" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
              <Input type="email" value={manualForm.email} onChange={(e) => setManualForm((f) => ({ ...f, email: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Company</label>
              <Input value={manualForm.company} onChange={(e) => setManualForm((f) => ({ ...f, company: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</label>
              <Textarea value={manualForm.notes} onChange={(e) => setManualForm((f) => ({ ...f, notes: e.target.value }))} className="mt-1" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setManualOpen(false)} disabled={manualSaving}>Cancel</Button>
            <Button onClick={handleManualAdd} disabled={manualSaving} className="bg-gradient-to-b from-[hsl(0,0%,85%)] via-[hsl(0,0%,70%)] to-[hsl(0,0%,80%)] text-black font-bold">
              {manualSaving ? "Adding…" : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editContact} onOpenChange={(o) => { if (!editSaving && !o) setEditContact(null); }}>
        <DialogContent className="bg-popover border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>Update or remove this lead's info. Phone is auto-formatted to US (+1).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">First Name</label>
                <Input value={editForm.first_name} onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Last Name</label>
                <Input value={editForm.last_name} onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Phone (US)</label>
              <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" className="mt-1" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Company</label>
              <Input value={editForm.company} onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Imported Notes</label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} className="mt-1" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditContact(null)} disabled={editSaving}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editSaving} className="bg-gradient-to-b from-[hsl(0,0%,85%)] via-[hsl(0,0%,70%)] to-[hsl(0,0%,80%)] text-black font-bold">
              {editSaving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteContact} onOpenChange={(o) => { if (!o) setDeleteContact(null); }}>
        <AlertDialogContent className="bg-popover border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {deleteContact?.name || "this lead"} and all of their notes from the list. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContact} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Linkified({ text }: { text: string }) {
  // Match URLs, emails, and @handles
  const pattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[\w.+-]+@[\w-]+\.[\w.-]+|(?<=^|\s)@[A-Za-z0-9_.]+)/g;
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (/^https?:\/\//i.test(part) || /^www\./i.test(part)) {
          const href = part.startsWith("http") ? part : `https://${part}`;
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[hsl(45,70%,65%)] underline decoration-[hsl(45,70%,65%)]/40 underline-offset-2 hover:decoration-[hsl(45,70%,65%)] break-all"
            >
              {part}
            </a>
          );
        }
        if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(part)) {
          return (
            <a
              key={i}
              href={`mailto:${part}`}
              className="text-[hsl(45,70%,65%)] underline decoration-[hsl(45,70%,65%)]/40 underline-offset-2 hover:decoration-[hsl(45,70%,65%)] break-all"
            >
              {part}
            </a>
          );
        }
        if (/^@[A-Za-z0-9_.]+$/.test(part)) {
          const handle = part.slice(1);
          return (
            <a
              key={i}
              href={`https://instagram.com/${handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[hsl(45,70%,65%)] underline decoration-[hsl(45,70%,65%)]/40 underline-offset-2 hover:decoration-[hsl(45,70%,65%)]"
            >
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col min-w-0">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-foreground break-all whitespace-pre-wrap">
        <Linkified text={value} />
      </dd>
    </div>
  );
}

function titleCase(s: string) {
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function IncentiveBadge({ status }: { status: IncentiveStatus }) {
  const styles: Record<IncentiveStatus, string> = {
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    denied: "bg-destructive/15 text-destructive-foreground border-destructive/30",
    paid: "bg-foreground/10 text-foreground border-foreground/20",
  };
  return (
    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles[status]}`}>
      {status}
    </span>
  );
}

// ----------------- Upload Dialog -----------------
function UploadDialog({
  open,
  onOpenChange,
  uploadName,
  setUploadName,
  pendingRows,
  onFilePick,
  uploading,
  onConfirm,
  fileRef,
  appendListName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  uploadName: string;
  setUploadName: (v: string) => void;
  pendingRows: PendingRow[];
  onFilePick: (f: File) => void;
  uploading: boolean;
  onConfirm: () => void;
  fileRef: React.RefObject<HTMLInputElement>;
  appendListName?: string | null;
}) {
  const isAppend = !!appendListName;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle>{isAppend ? `Add Contacts to "${appendListName}"` : "Upload Contact List"}</DialogTitle>
          <DialogDescription>
            CSV columns: <code>personal information</code> = first name, <code>last name</code> = last name. Common fields like <code>phone</code>, <code>email</code>, <code>company</code>, <code>notes</code> are auto-detected. Any other columns are kept and shown inside each lead.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!isAppend && (
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">List Name</label>
              <Input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="e.g. March 2026 — Miami Hotels"
                className="mt-1"
              />
            </div>
          )}
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">CSV File</label>
            <Input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFilePick(f);
              }}
              className="mt-1"
            />
          </div>
          {pendingRows.length > 0 && (
            <div className="text-xs text-muted-foreground border border-white/10 rounded-md p-3">
              Detected <span className="text-foreground font-medium">{pendingRows.length}</span> contacts.
              Preview: {pendingRows.slice(0, 3).map((r) => r.name || r.phone || r.email).filter(Boolean).join(", ")}
              {pendingRows.length > 3 ? "…" : ""}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={uploading}>Cancel</Button>
          <Button
            onClick={onConfirm}
            disabled={uploading || pendingRows.length === 0 || (!isAppend && !uploadName.trim())}
            className="bg-gradient-to-b from-[hsl(0,0%,85%)] via-[hsl(0,0%,70%)] to-[hsl(0,0%,80%)] text-black font-bold"
          >
            {uploading ? "Uploading…" : isAppend ? `Add ${pendingRows.length || ""} Contacts` : `Upload ${pendingRows.length || ""} Contacts`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
