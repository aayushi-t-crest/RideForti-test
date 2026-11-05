import { BookOpen, Car, Laugh, Image, Tv, Newspaper, ShieldCheck, Building, Video, Type } from "lucide-react";

const categories = [
  {
    id: 1,
    name: "Informational",
    icon: BookOpen,
    description: "Educational content on security industry, luxury transportation, concierge services, and rideshare trends.",
    purpose: "Positions Forti as an educational authority in the space.",
    examples: ["Security industry insights", "Luxury transportation", "Concierge services", "Rideshare trends"],
  },
  {
    id: 2,
    name: "Armed Vehicles",
    icon: Car,
    description: "Content showcasing armored and security vehicles.",
    purpose: "Reinforces Forti's luxury security positioning.",
    examples: ["Armored SUVs", "Armored luxury sedans", "Armored Rolls Royce / Maybach", "Executive protection convoys"],
  },
  {
    id: 3,
    name: "Humor",
    icon: Laugh,
    description: "Relatable memes and comedic content.",
    purpose: "Drives shares and engagement velocity.",
    examples: ["Rideshare culture", "Driver and rider experiences", "City life situations"],
  },
  {
    id: 4,
    name: "Stills",
    icon: Image,
    description: "Still graphic content including facts, insights, and branded graphics.",
    purpose: "Builds authority and shareable informational content.",
    examples: ["Industry facts", "Luxury transportation insights", "Security statistics", "Forti branded graphics"],
  },
  {
    id: 5,
    name: "Entertainment",
    icon: Tv,
    description: "General entertaining content related to luxury and mobility.",
    purpose: "Engages broader audience with aspirational content.",
    examples: ["Luxury vehicles", "Nightlife transportation", "Travel experiences", "Mobility situations"],
  },
  {
    id: 6,
    name: "News",
    icon: Newspaper,
    description: "News coverage relevant to rideshare, security, and transportation.",
    purpose: "Keeps Forti connected to current industry developments.",
    examples: ["Rideshare industry", "Security industry", "Transportation technology", "City mobility"],
  },
  {
    id: 7,
    name: "Protection Tips",
    icon: ShieldCheck,
    description: "Basic personal protection advice.",
    purpose: "Aligns with Forti's safety-first brand positioning.",
    examples: ["Situational awareness", "Vehicle safety", "Personal security habits"],
  },
  {
    id: 8,
    name: "Industry",
    icon: Building,
    description: "Behind-the-scenes insights and updates.",
    purpose: "Shows industry depth and insider knowledge.",
    examples: ["Luxury rideshare", "Concierge services", "Executive protection", "Mobility developments"],
  },
  {
    id: 9,
    name: "Custom Content",
    icon: Video,
    description: "Original content produced by the Forti team.",
    purpose: "Builds authentic brand connection.",
    examples: ["Street interviews", "Event interviews", "Guard interviews", "Driver interviews", "Event activations"],
  },
  {
    id: 10,
    name: "Text-Based",
    icon: Type,
    description: "Text-based posts from Twitter, Threads, and Facebook.",
    purpose: "Cross-platform resharing to Instagram Stories and other platforms.",
    examples: ["Twitter posts", "Threads posts", "Facebook posts"],
  },
];

const ContentCategories = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          10 core content categories — one post per category per day = 10 posts/day.
        </p>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-1 rounded bg-muted">70/week</span>
          <span className="px-2 py-1 rounded bg-muted">280/month</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.id}
              className="rounded-lg border border-border bg-card p-4 space-y-2 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">#{cat.id}</span>
                    <h3 className="font-semibold text-sm">{cat.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
                </div>
              </div>
              <p className="text-[11px] text-primary/80 italic">{cat.purpose}</p>
              <div className="flex flex-wrap gap-1">
                {cat.examples.map((ex) => (
                  <span
                    key={ex}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                  >
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContentCategories;
