import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const videos = [
  {
    title: "Metricool Pt 1",
    description: "Introduction to scheduling and automating content with Metricool.",
    url: "https://drive.google.com/file/d/1e8Ey_H2-1auf6cp9UVIZzpR97vArbJ8C/view?usp=sharing",
  },
  {
    title: "Metricool Pt 2",
    description: "Advanced Metricool features and analytics.",
    url: "https://drive.google.com/file/d/1NvxRVPjkA9VGoBj_4L7qNnMAuwug9NlY/view?usp=sharing",
  },
  {
    title: "Instagram",
    description: "How to manage Instagram content and engagement.",
    url: "https://drive.google.com/file/d/1LVsP2f0JKvD9b20EF-NE_SgFRIXfLIJg/view?usp=sharing",
  },
  {
    title: "Canva — Stills",
    description: "Creating still graphics and branded content in Canva.",
    url: "https://drive.google.com/file/d/1LoLwb34Xb8VHb3VzZoIv1d7NeNS0Q8mf/view?usp=share_link",
  },
  {
    title: "Canva — Reels",
    description: "Editing and formatting video reels in Canva.",
    url: "https://drive.google.com/file/d/15PQoexjQMnQ0kbDo1mBZp_jdmMDcHOEJ/view?usp=share_link",
  },
  {
    title: "Higgsfield",
    description: "Generating AI video content with Higgsfield.",
    url: "https://drive.google.com/file/d/1gY6Ie32VZWqVjS9to4UhfgDrykTmj4S6/view?usp=sharing",
  },
  {
    title: "Indown",
    description: "Downloading Instagram videos for curated content.",
    url: "https://drive.google.com/file/d/1plFIwlbB3J64gdbadlsGiIfmY7o7m4VG/view?usp=sharing",
  },
  {
    title: "OnlineConverter",
    description: "Resizing videos and converting aspect ratios.",
    url: "https://drive.google.com/file/d/1losOzLl3GXiJ0zFCzhS6KE7n1d2clRdW/view?usp=sharing",
  },
  {
    title: "SOP Overview",
    description: "Full walkthrough of the Content Operations SOP.",
    url: "https://drive.google.com/file/d/1nrd2XajGF1V9fjzKptc6ak3C320uSxgm/view?usp=sharing",
  },
  {
    title: "ChatGPT & Cadence",
    description: "Using ChatGPT for captions and managing posting cadence.",
    url: "https://drive.google.com/file/d/1KHGfjdmBxh_XJBYBPjcCqkgaLEUyS4GK/view?usp=sharing",
  },
];

const ContentTraining = () => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Training tutorials for each tool in the content pipeline. Review these to understand the workflow.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {videos.map((video, i) => (
          <div
            key={video.title}
            className="rounded-lg border border-border bg-card p-4 flex items-center gap-4"
          >
            <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shrink-0">
              <Play className="h-4 w-4 text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">{video.title}</h3>
              <p className="text-xs text-muted-foreground truncate">{video.description}</p>
            </div>
            <Button
              variant="fortiGhost"
              size="sm"
              onClick={() => window.open(video.url, "_blank")}
            >
              Watch
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContentTraining;
