import WalkthroughOverlay, { WalkthroughStep } from "./WalkthroughOverlay";

const STEPS: WalkthroughStep[] = [
  {
    target: "okr-task-header",
    title: "Task board",
    body: "You're inside one Project. Tasks are the actual day-to-day work that moves this Project — and its parent Objective — forward.",
  },
  {
    target: "okr-task-new",
    title: "Add a Task",
    body: "Click 'New Task' to add work. Each task can have a priority, an assignee, a due date, and optional email/SMS reminders.",
  },
  {
    target: "okr-task-col-todo",
    title: "To Do",
    body: "Newly created tasks live here. This is your team's queue — what hasn't been picked up yet.",
  },
  {
    target: "okr-task-col-progress",
    title: "In Progress",
    body: "Move a task here when someone actively starts it. Use the ⋯ menu on any card to switch columns.",
  },
  {
    target: "okr-task-col-done",
    title: "Done",
    body: "Completed tasks land here. As tasks finish, the Project's progress and the parent Objective's progress both update automatically.",
  },
];

const OkrTaskWalkthrough = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <WalkthroughOverlay open={open} onClose={onClose} steps={STEPS} />
);

export default OkrTaskWalkthrough;
