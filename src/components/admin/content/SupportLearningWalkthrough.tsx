import WalkthroughOverlay, { WalkthroughStep } from "../WalkthroughOverlay";

const STEPS: WalkthroughStep[] = [
  {
    target: "slz-header",
    title: "Support Learning Zone",
    body: "Before you can answer real customer tickets, you'll work through 16 short modules covering Forti's product, tone, escalation rules, and edge cases.",
  },
  {
    target: "slz-progress",
    title: "Module progress",
    body: "This bar tracks how many modules you've completed. Open each card, read the lesson, and mark it done — your progress saves automatically.",
  },
  {
    target: "slz-lock",
    title: "Ticket dashboard is gated",
    body: "The live support ticket dashboard stays locked until you pass the knowledge test. This protects customers from untrained replies.",
  },
  {
    target: "slz-test-btn",
    title: "Take the knowledge test",
    body: "Once you've completed the modules, click here to take the test. Score 85% or higher and the ticket dashboard unlocks instantly.",
  },
  {
    target: "slz-modules",
    title: "Module library",
    body: "Each card is a self-contained lesson with key takeaways. Re-open any module any time to refresh your memory before a tough ticket.",
  },
];

const SupportLearningWalkthrough = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <WalkthroughOverlay open={open} onClose={onClose} steps={STEPS} />
);

export default SupportLearningWalkthrough;
