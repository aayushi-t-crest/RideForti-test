import { Button } from "@/components/ui/button";
import { ArrowRight, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const FortiHero = () => {
  const { t } = useTranslation();

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-forti-charcoal via-background to-background" />
      
      {/* Subtle grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--forti-gold) / 0.3) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--forti-gold) / 0.3) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }}
      />

      {/* Radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-forti-gold/5 rounded-full blur-[120px]" />

      <div className="relative forti-container text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-secondary/50 mb-8 animate-fade-up">
            <Shield className="h-4 w-4 text-forti-gold" />
            <span className="text-sm text-muted-foreground">{t("hero.badge")}</span>
          </div>

          {/* Headline */}
          <h1 className="forti-heading-xl mb-6 animate-fade-up delay-100">
            {t("hero.title")}
            <span className="forti-gold-text"> {t("hero.titleHighlight")}</span>
          </h1>

          {/* Subheadline */}
          <p className="forti-text-body text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-up delay-200">
            {t("hero.subtitle")}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up delay-300">
            <Link to="/waitlist">
              <Button variant="forti" size="xl">
                {t("hero.cta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button variant="fortiOutline" size="xl">
              {t("hero.learnMore")}
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 pt-16 border-t border-border/50 animate-fade-up delay-400">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-6">
              {t("hero.trustIndicator")}
            </p>
            <div className="flex items-center justify-center gap-12 opacity-40">
              <div className="text-lg font-medium tracking-tight">{t("hero.fortune500")}</div>
              <div className="text-lg font-medium tracking-tight">{t("hero.privateEquity")}</div>
              <div className="text-lg font-medium tracking-tight">{t("hero.familyOffices")}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FortiHero;
