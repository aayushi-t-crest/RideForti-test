import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const tools = [
  {
    name: "Higgsfield",
    description: "Used to generate AI video content.",
    url: "https://higgsfield.ai",
  },
  {
    name: "Claude AI",
    description: "Used to generate captions, curate content ideas, and write copy for Twitter / Threads posts.",
    url: "https://claude.ai",
  },
  {
    name: "Canva",
    description: "Used to design still graphics and edit videos.",
    url: "https://canva.com",
  },
  {
    name: "Indown",
    description: "Used to download Instagram videos for curated content.",
    url: "https://indown.io",
  },
  {
    name: "Metricool",
    description: "Used to automate and schedule weekly content posting.",
    url: "https://metricool.com",
  },
  {
    name: "OnlineConverter",
    description: "Used to resize videos and convert them to the correct platform aspect ratios.",
    url: "https://onlineconverter.com",
  },
];

const ContentTools = () => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Core tools used in the Forti content pipeline.
      </p>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <div
            key={tool.name}
            className="rounded-lg border border-border bg-card p-4 space-y-3"
          >
            <h3 className="font-semibold text-sm">{tool.name}</h3>
            <p className="text-xs text-muted-foreground">{tool.description}</p>
            <Button
              variant="fortiGhost"
              size="sm"
              className="w-full"
              onClick={() => window.open(tool.url, "_blank")}
            >
              <ExternalLink className="h-3 w-3 mr-1.5" />
              Open {tool.name}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContentTools;
