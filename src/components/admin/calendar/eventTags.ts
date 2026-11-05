// Available role tags for events. Tags marked countable accept a numeric count.
export interface RoleTagDef {
  key: string;
  label: string;
  countable: boolean;
  color: string; // tailwind classes
}

export const ROLE_TAGS: RoleTagDef[] = [
  { key: "security", label: "Security Needed", countable: true, color: "bg-red-500/15 text-red-300 border-red-500/30" },
  { key: "photographer", label: "Photographer Needed", countable: false, color: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  { key: "videographer", label: "Videographer Needed", countable: false, color: "bg-pink-500/15 text-pink-300 border-pink-500/30" },
  { key: "drivers", label: "Drivers Needed", countable: true, color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  { key: "brand_ambassadors", label: "Brand Ambassadors", countable: true, color: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  { key: "management", label: "Management Needed", countable: false, color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
];

export interface EventTag {
  key: string;
  count?: number;
}

export const tagDefByKey = (key: string) => ROLE_TAGS.find((t) => t.key === key);
export const tagLabel = (t: EventTag) => {
  const def = tagDefByKey(t.key);
  if (!def) return t.key;
  if (def.countable && t.count) return `${def.label} (${t.count})`;
  return def.label;
};
