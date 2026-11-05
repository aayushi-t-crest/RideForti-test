import { MessageCircle, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import SupportChat from "./SupportChat";
import { useSupport } from "@/contexts/SupportContext";

const SupportWidget = () => {
  const { isOpen, toggleSupport, closeSupport } = useSupport();
  const { pathname } = useLocation();

  // Retain internal support only; public chat is provided by LeadConnector.
  if (pathname !== "/admin" && !pathname.startsWith("/admin/")) return null;

  return (
    <>
      <SupportChat isOpen={isOpen} onClose={closeSupport} />
      <button
        onClick={toggleSupport}
        className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-white border-2 border-black shadow-lg flex items-center justify-center hover:scale-110 transition-transform duration-200"
        aria-label={isOpen ? "Close Support" : "Contact Support"}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-black" />
        ) : (
          <MessageCircle className="h-6 w-6 text-black" />
        )}
      </button>
    </>
  );
};

export default SupportWidget;

