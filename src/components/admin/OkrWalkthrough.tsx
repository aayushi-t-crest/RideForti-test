import WalkthroughOverlay, { WalkthroughStep } from "./WalkthroughOverlay";

const STEPS: WalkthroughStep[] = [
  {
    target: "okr-header",
    title: "OKRs & Projects",
    body: "This is where teams set Objectives (the big goals), break them into measurable Key Results, and track the Tasks that move the needle.",
  },
  {
    target: "okr-new-objective",
    title: "Create a new Objective",
    body: "Start by adding an Objective — a clear, ambitious goal for the quarter (e.g. 'Grow ambassador-driven downloads by 3x').",
  },
  {
    target: "okr-objective-card",
    title: "Objective card",
    body: "Each card shows status, description, and live progress. Click it to open the Objective and manage its Key Results and Tasks.",
  },
  {
    target: "okr-objective-progress",
    title: "Live progress bar",
    body: "Progress rolls up automatically from the Key Results inside. As tasks get done and KR values move, this bar updates in real time.",
  },
  {
    target: "okr-objective-menu",
    title: "Edit or delete",
    body: "Use the ⋯ menu to rename, change status, or delete the Objective. Deleting also removes its Key Results and Tasks.",
  },
];

const OkrWalkthrough = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <WalkthroughOverlay open={open} onClose={onClose} steps={STEPS} />
);

export default OkrWalkthrough;
