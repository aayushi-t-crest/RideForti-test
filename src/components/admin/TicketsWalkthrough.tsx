import { useCallback, useEffect, useState } from "react";
import WalkthroughOverlay, { WalkthroughStep } from "./WalkthroughOverlay";

interface TicketsWalkthroughProps {
  open: boolean;
  onClose: () => void;
  onOpenDemoTicket: () => void;
  onCloseDemoTicket: () => void;
  isViewingDemo: boolean;
}

type TicketWalkthroughStep = WalkthroughStep & {
  view: "list" | "detail";
};

const STEPS: TicketWalkthroughStep[] = [
  {
    target: "tickets-ai-kb",
    title: "AI Knowledge Base",
    body: "Your support brain. The AI learns from FAQs, chats, and uploaded docs to auto-answer customers. Click here anytime to manage what it knows.",
    view: "list",
  },
  {
    target: "tickets-search",
    title: "Search any ticket",
    body: "Search by ticket #, subject, customer name, or email. Filters below narrow by status and source.",
    view: "list",
  },
  {
    target: "tickets-urgency",
    title: "Urgency thresholds",
    body: "Configure how long a ticket can sit before it gets escalated to Urgent, Critical, Imminent, or Catastrophic — triggering SMS + email alerts.",
    view: "list",
  },
  {
    target: "tickets-demo-row",
    title: "This is a demo ticket",
    body: "The pulsing red dot + 'Human Needed' badge means the customer asked for a real person. The orange tier badge shows how urgent it is right now. Click it to open the conversation.",
    view: "list",
  },
  {
    target: "ticket-detail-header",
    title: "Ticket detail view",
    body: "You're now inside the demo ticket. The header shows the customer, ticket #, and gives you tools to control the conversation.",
    view: "detail",
  },
  {
    target: "ticket-detail-timers",
    title: "Live urgency timers",
    body: "These ticking badges show how long the ticket has been open and how long since the last response — color-coded against your urgency thresholds.",
    view: "detail",
  },
  {
    target: "ticket-detail-ai-toggle",
    title: "AI On / Off",
    body: "Pause the AI to take over yourself, or re-enable it once the customer is back to a routine question.",
    view: "detail",
  },
  {
    target: "ticket-detail-faq",
    title: "Ask FAQ team",
    body: "Stuck? Submit the question to a teammate. Their answer is saved to the FAQ knowledge base and trains the AI for next time.",
    view: "detail",
  },
  {
    target: "ticket-detail-reply",
    title: "Reply as a human agent",
    body: "Type your message here. The customer sees it instantly, and the AI yields the floor.",
    view: "detail",
  },
];

const TicketsWalkthrough = ({
  open,
  onClose,
  onOpenDemoTicket,
  onCloseDemoTicket,
  isViewingDemo,
}: TicketsWalkthroughProps) => {
  const [activeStep, setActiveStep] = useState<TicketWalkthroughStep>(STEPS[0]);

  useEffect(() => {
    if (!open) return;
    if (activeStep.view === "detail" && !isViewingDemo) onOpenDemoTicket();
    if (activeStep.view === "list" && isViewingDemo) onCloseDemoTicket();
  }, [activeStep, isViewingDemo, onCloseDemoTicket, onOpenDemoTicket, open]);

  const handleStepChange = useCallback((_: number, step: WalkthroughStep) => {
    setActiveStep(step as TicketWalkthroughStep);
  }, []);

  const handleClose = useCallback(() => {
    setActiveStep(STEPS[0]);
    onCloseDemoTicket();
    onClose();
  }, [onClose, onCloseDemoTicket]);

  return (
    <WalkthroughOverlay
      open={open}
      onClose={handleClose}
      steps={STEPS}
      onStepChange={handleStepChange}
    />
  );
};

export default TicketsWalkthrough;
