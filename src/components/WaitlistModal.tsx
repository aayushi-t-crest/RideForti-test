import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import { Check, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import fortiLogo from "@/assets/forti-logo.png";
import { emailWaitlistRegistration } from "@/lib/publicSms";

interface WaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WaitlistModal = ({ open, onOpenChange }: WaitlistModalProps) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedTerms) {
      setShowError(true);
      toast({
        title: t("waitlist.errors.agreementRequired"),
        description: t("waitlist.errors.agreementDescription"),
        variant: "destructive",
      });
      return;
    }
    
    setShowError(false);
    setIsLoading(true);

    const { error } = await supabase
      .from("waitlist")
      .insert(emailWaitlistRegistration(name, email));

    setIsLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast({
          title: t("waitlist.errors.alreadyRegistered"),
          description: t("waitlist.errors.alreadyRegisteredDescription"),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("waitlist.errors.error"),
          description: t("waitlist.errors.errorDescription"),
          variant: "destructive",
        });
      }
      return;
    }

    setSubmitted(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after closing
    setTimeout(() => {
      setEmail("");
      setName("");
      setAgreedTerms(false);
      setSubmitted(false);
      setShowError(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="bg-black/80 backdrop-blur-sm z-[9999]" />
      <DialogContent className="w-[95vw] max-w-md p-0 bg-background border-border overflow-hidden rounded-3xl mx-auto [&>button]:hidden z-[9999]">
        <div className="relative p-6 pt-8">
          {/* Custom close button */}
          <button
            onClick={handleClose}
            className="absolute right-2 top-2 z-50 p-2 rounded-full bg-secondary/80 opacity-80 transition-opacity hover:opacity-100"
          >
            <X className="h-5 w-5 text-foreground" />
            <span className="sr-only">Close</span>
          </button>
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={fortiLogo} alt="Forti" className="h-[80px] w-auto" />
          </div>

          {!submitted ? (
            <>
              {/* Heading */}
              <h2 className="text-2xl font-bold text-center mb-6 text-foreground">
                {t("waitlist.title")} <span className="bg-gradient-to-r from-gray-500 via-gray-300 via-40% to-gray-500 bg-clip-text text-transparent">{t("waitlist.titleHighlight")}</span>
              </h2>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="text"
                  placeholder={t("waitlist.fullName")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-14 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground rounded-xl text-base focus-visible:ring-foreground focus-visible:ring-2 focus-visible:border-foreground"
                />
                <Input
                  type="email"
                  placeholder={t("waitlist.email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-14 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground rounded-xl text-base focus-visible:ring-foreground focus-visible:ring-2 focus-visible:border-foreground"
                />
                {/* Terms acceptance */}
                <div className="text-left pt-2 space-y-3">
                  {/* Terms acceptance (required) */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="modal-terms-agreement"
                      checked={agreedTerms}
                      onCheckedChange={(checked) => {
                        setAgreedTerms(checked as boolean);
                        if (checked) setShowError(false);
                      }}
                      className={`mt-0.5 border-border data-[state=checked]:bg-forti-gold data-[state=checked]:border-forti-gold ${showError ? 'border-red-500' : ''}`}
                    />
                    <label htmlFor="modal-terms-agreement" className={`text-xs leading-relaxed ${showError ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {t("waitlist.consentTerms")} <a href="https://rideforti.com/terms" className="text-foreground underline cursor-pointer hover:text-forti-gold transition-colors">{t("waitlist.termsAndConditions")}</a> & <a href="https://rideforti.com/privacy-policy" className="text-foreground underline cursor-pointer hover:text-forti-gold transition-colors">{t("waitlist.privacyPolicy")}</a>.
                    </label>
                  </div>
                </div>

                {showError && (
                  <p className="text-red-500 text-sm text-left">
                    {t("waitlist.errors.pleaseAcceptTerms")}
                  </p>
                )}

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-bold text-base shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:shadow-[0_0_30px_rgba(220,38,38,0.7)] transition-all duration-300 disabled:opacity-50 rounded-xl"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("waitlist.joining")}
                    </>
                  ) : (
                    t("waitlist.submit")
                  )}
                </Button>
              </form>

              {/* Trust note */}
              <p className="mt-6 text-xs text-muted-foreground text-center">
                {t("waitlist.trustNote")}
              </p>
            </>
          ) : (
            <>
              {/* Success state */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-forti-gold/10 border border-forti-gold/30 mb-6">
                  <Check className="h-8 w-8 text-forti-gold" />
                </div>
                <h2 className="text-2xl font-bold mb-3">
                  {t("waitlist.successTitle")} <span className="forti-gold-text">{t("waitlist.successHighlight")}</span>
                </h2>
                <p className="text-muted-foreground mb-6">
                  {t("waitlist.successMessage")}
                </p>
                <Button 
                  variant="fortiOutline" 
                  size="lg"
                  onClick={handleClose}
                >
                  {t("waitlist.returnHome")}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WaitlistModal;
