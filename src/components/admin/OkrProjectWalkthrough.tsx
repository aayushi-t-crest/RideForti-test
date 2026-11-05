import WalkthroughOverlay, { WalkthroughStep } from "./WalkthroughOverlay";

const STEPS: WalkthroughStep[] = [
  {
    target: "okr-project-header",
    title: "Inside an Objective",
    body: "You're now inside one Objective. Projects (a.k.a. Key Results) are the concrete initiatives that move this Objective forward.",
  },
  {
    target: "okr-project-new",
    title: "Create a Project",
    body: "Add a Project for each measurable initiative — e.g. 'Launch ambassador onboarding flow' or 'Run paid search test'. You can assign teammates to it.",
  },
  {
    target: "okr-project-empty",
    title: "Project workspace",
    body: "Once you add Projects, they'll appear here as cards showing status, owners, and progress. Click any project to open its task board.",
  },
  {
    target: "okr-project-status",
    title: "Status at a glance",
    body: "The status badge next to the title (on track, at risk, behind, completed) reflects how this Objective is trending across all its Projects.",
  },
];

const OkrProjectWalkthrough = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <WalkthroughOverlay open={open} onClose={onClose} steps={STEPS} />
);

export default OkrProjectWalkthrough;
