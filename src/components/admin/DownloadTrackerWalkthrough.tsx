import WalkthroughOverlay, { WalkthroughStep } from "./WalkthroughOverlay";

const STEPS: WalkthroughStep[] = [
  {
    target: "dt-header",
    title: "Download Tracker",
    body: "This dashboard shows every app download and which brand ambassador it came from — based on referral links and QR code scans.",
  },
  {
    target: "dt-range",
    title: "Filter by date range",
    body: "Pick Today, 7 Days, 30 Days, All Time — or set a custom window. All stats and the leaderboard update instantly.",
  },
  {
    target: "dt-search",
    title: "Find an ambassador",
    body: "Search by name or city, or pick one from the dropdown to see only their attributed downloads.",
  },
  {
    target: "dt-stat-total",
    title: "Total Downloads",
    body: "Every visit that landed on the download page during the selected range — attributed or not.",
  },
  {
    target: "dt-stat-attributed",
    title: "Attributed Downloads",
    body: "Downloads tied to a specific brand ambassador via their referral link or QR code. These count toward their leaderboard score.",
  },
  {
    target: "dt-stat-unattributed",
    title: "Unattributed",
    body: "Visitors who selected 'Other / Not sure' when asked who sent them. These don't count toward any ambassador.",
  },
  {
    target: "dt-leaderboard",
    title: "Ambassador Leaderboard",
    body: "Real-time ranking of your top performers. Use this to reward top ambassadors and identify who needs more support.",
  },
];

const DownloadTrackerWalkthrough = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <WalkthroughOverlay open={open} onClose={onClose} steps={STEPS} />
);

export default DownloadTrackerWalkthrough;
