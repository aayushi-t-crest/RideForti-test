import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import fortiLogo from "@/assets/forti-logo.png";
import { emailWaitlistRegistration } from "@/lib/publicSms";

const Waitlist = () => {
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

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-forti-charcoal via-background to-background" />
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--forti-gold) / 0.3) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--forti-gold) / 0.3) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }}
      />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-forti-gold/5 rounded-full blur-[120px]" />

      {/* Header */}
      <header className="relative z-10 p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">{t("waitlist.backToHome")}</span>
        </Link>
      </header>

      {/* Content */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-md text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src={fortiLogo} alt="Forti" className="h-[100px] w-auto" />
          </div>

          {!submitted ? (
            <>
              {/* Heading */}
              <h1 className="forti-heading-lg mb-8 text-foreground">
                {t("waitlist.title")} <span className="bg-gradient-to-r from-gray-500 via-gray-300 via-40% to-gray-500 bg-clip-text text-transparent">{t("waitlist.titleHighlight")}</span>
              </h1>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="text"
                  placeholder={t("waitlist.fullName")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-12 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground focus:border-forti-gold focus:ring-forti-gold/20"
                />
                <Input
                  type="email"
                  placeholder={t("waitlist.email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground focus:border-forti-gold focus:ring-forti-gold/20"
                />
                {/* Terms acceptance */}
                <div className="text-left pt-2 space-y-3">
                  {/* Terms acceptance (required) */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms-agreement"
                      checked={agreedTerms}
                      onCheckedChange={(checked) => {
                        setAgreedTerms(checked as boolean);
                        if (checked) setShowError(false);
                      }}
                      className={`mt-0.5 border-border data-[state=checked]:bg-forti-gold data-[state=checked]:border-forti-gold ${showError ? 'border-red-500' : ''}`}
                    />
                    <label htmlFor="terms-agreement" className={`text-xs leading-relaxed ${showError ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {t("waitlist.consentTerms")} <a href="https://rideforti.com/terms" className="text-foreground underline cursor-pointer hover:text-forti-gold transition-colors">{t("waitlist.termsAndConditions")}</a> & <a href="https://rideforti.com/privacy-policy" className="text-foreground underline cursor-pointer hover:text-forti-gold transition-colors">{t("waitlist.privacyPolicy")}</a>.
                    </label>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold text-base shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:shadow-[0_0_30px_rgba(220,38,38,0.7)] transition-all duration-300 disabled:opacity-50"
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
              <p className="mt-8 text-xs text-muted-foreground">
                {t("waitlist.trustNote")}
              </p>
            </>
          ) : (
            <>
              {/* Success state */}
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-forti-gold/10 border border-forti-gold/30 mb-8">
                <Check className="h-8 w-8 text-forti-gold" />
              </div>
              <h1 className="forti-heading-lg mb-4">
                {t("waitlist.successTitle")} <span className="forti-gold-text">{t("waitlist.successHighlight")}</span>
              </h1>
              <p className="forti-text-subtle mb-10">
                {t("waitlist.successMessage")}
              </p>
              <Link to="/">
                <Button variant="fortiOutline" size="lg">
                  {t("waitlist.returnHome")}
                </Button>
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Waitlist;
