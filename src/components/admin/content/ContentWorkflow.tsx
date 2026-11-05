import { CheckCircle2 } from "lucide-react";

const steps = [
  {
    step: 1,
    title: "Select Content",
    description: "Select content from the curated content folder (Google Drive or Instagram Library).",
  },
  {
    step: 2,
    title: "Upload to Metricool",
    description: "Upload the selected content into Metricool for scheduling.",
  },
  {
    step: 3,
    title: "Verify Formatting",
    description: "Confirm video formatting, aspect ratio, and caption character counts are within platform limits.",
  },
  {
    step: 4,
    title: "Schedule Content",
    description: "Schedule content within the time blocks that historically generate the highest traffic.",
  },
  {
    step: 5,
    title: "Monitor Dashboards",
    description: "Monitor social dashboards to identify which content is performing well.",
  },
  {
    step: 6,
    title: "Engage & Amplify",
    description: "When content performs well — share to Stories, engage with comments, and interact with related pages.",
  },
];

const platforms = [
  { name: "Instagram", color: "bg-pink-500/20 text-pink-400" },
  { name: "Facebook", color: "bg-blue-500/20 text-blue-400" },
  { name: "YouTube Shorts", color: "bg-red-500/20 text-red-400" },
  { name: "TikTok", color: "bg-muted text-muted-foreground" },
];

const engagementSignals = ["Like", "Share", "Save", "Comment"];

const ContentWorkflow = () => {
  return (
    <div className="space-y-6">
      {/* Execution Steps */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Content Execution Workflow</h3>
        <div className="space-y-3">
          {steps.map((s) => (
            <div
              key={s.step}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">{s.step}</span>
              </div>
              <div>
                <h4 className="font-medium text-sm">{s.title}</h4>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cross-posting & Engagement */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-sm">Cross-Post Platforms</h3>
          <p className="text-xs text-muted-foreground">All content should be distributed across these platforms.</p>
          <div className="flex flex-wrap gap-2">
            {platforms.map((p) => (
              <span key={p.name} className={`text-xs px-2 py-1 rounded-full ${p.color}`}>
                {p.name}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-sm">Algorithm Signals</h3>
          <p className="text-xs text-muted-foreground">Each post should encourage these interactions.</p>
          <div className="flex flex-wrap gap-2">
            {engagementSignals.map((sig) => (
              <span key={sig} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-3 w-3" />
                {sig}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Content Storage */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="font-semibold text-sm">Content Storage</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium">Instagram Library</p>
            <p className="text-[11px] text-muted-foreground">Saved bookmarks contain curated content that can be reposted.</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium">Google Drive</p>
            <p className="text-[11px] text-muted-foreground">Shared folder for curated and edited Forti content. Referenced when scheduling.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentWorkflow;
