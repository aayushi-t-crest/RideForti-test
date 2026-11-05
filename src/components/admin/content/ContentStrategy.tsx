import { Target, Users, TrendingUp } from "lucide-react";

const icps = [
  { name: "Guards", description: "Executive protection professionals" },
  { name: "Drivers", description: "Luxury rideshare drivers" },
  { name: "Riders", description: "Paying customers — the primary revenue source" },
];

const brandPositioning = [
  "The rideshare space",
  "The executive protection space",
  "The concierge and luxury transportation space",
];

const ContentStrategy = () => {
  return (
    <div className="space-y-6">
      {/* ICPs */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Target User Groups (ICPs)</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          While riders are the paying customer, content should speak to all three groups.
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          {icps.map((icp) => (
            <div key={icp.name} className="rounded-lg bg-muted/50 p-3">
              <p className="font-medium text-sm">{icp.name}</p>
              <p className="text-[11px] text-muted-foreground">{icp.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Brand Positioning */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Brand Positioning</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          When riders visit Forti's social media, they should see that Forti understands:
        </p>
        <div className="space-y-2">
          {brandPositioning.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <p className="text-sm">{item}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-primary/80 italic mt-2">
          Goal: Establish Forti as a true authority within the mobility and protection industries.
        </p>
      </div>

      {/* Posting Cadence */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Posting Cadence</h3>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xl font-bold text-primary">10</p>
            <p className="text-[10px] text-muted-foreground uppercase">Per Day</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xl font-bold text-primary">70</p>
            <p className="text-[10px] text-muted-foreground uppercase">Per Week</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xl font-bold text-primary">280</p>
            <p className="text-[10px] text-muted-foreground uppercase">Per Month</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          High posting volume is designed to trigger algorithm momentum and rapid organic growth.
        </p>
      </div>
    </div>
  );
};

export default ContentStrategy;
