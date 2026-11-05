import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ROLE_TAGS, type EventTag } from "./eventTags";

interface Props {
  value: EventTag[];
  onChange: (tags: EventTag[]) => void;
}

const TagsEditor = ({ value, onChange }: Props) => {
  const toggle = (key: string, checked: boolean) => {
    if (checked) onChange([...value.filter((t) => t.key !== key), { key, count: 1 }]);
    else onChange(value.filter((t) => t.key !== key));
  };
  const setCount = (key: string, count: number) => {
    onChange(value.map((t) => (t.key === key ? { ...t, count } : t)));
  };
  const isOn = (key: string) => value.some((t) => t.key === key);
  const getCount = (key: string) => value.find((t) => t.key === key)?.count || 1;

  return (
    <div className="space-y-2">
      {ROLE_TAGS.map((def) => {
        const on = isOn(def.key);
        return (
          <div key={def.key} className="flex items-center gap-2">
            <label className="flex items-center gap-2 flex-1 cursor-pointer">
              <Checkbox checked={on} onCheckedChange={(v) => toggle(def.key, !!v)} />
              <span className={`text-xs px-2 py-0.5 rounded border ${def.color}`}>{def.label}</span>
            </label>
            {def.countable && on && (
              <Input
                type="number"
                min={1}
                value={getCount(def.key)}
                onChange={(e) => setCount(def.key, Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 h-7 text-xs"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TagsEditor;
