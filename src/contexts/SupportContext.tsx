import { createContext, useContext, useState, ReactNode } from "react";
import { openPublicSupport } from "@/lib/publicSms";
import { toast } from "sonner";

interface SupportContextType {
  isOpen: boolean;
  openSupport: () => void;
  closeSupport: () => void;
  toggleSupport: () => void;
}

const SupportContext = createContext<SupportContextType | undefined>(undefined);

export const SupportProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openSupport = () => {
    if (window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/")) {
      setIsOpen(true);
      return;
    }
    if (!openPublicSupport()) {
      toast.error("Chat is still loading. Please try again shortly.");
    }
  };
  const closeSupport = () => setIsOpen(false);
  const toggleSupport = () => setIsOpen((prev) => !prev);

  return (
    <SupportContext.Provider value={{ isOpen, openSupport, closeSupport, toggleSupport }}>
      {children}
    </SupportContext.Provider>
  );
};

export const useSupport = () => {
  const context = useContext(SupportContext);
  if (!context) {
    throw new Error("useSupport must be used within a SupportProvider");
  }
  return context;
};
