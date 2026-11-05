import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import WaitlistModal from "@/components/WaitlistModal";

const FortiPricing = () => {
  const { t } = useTranslation();
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  const tiers = [
    {
      name: t("pricing.tiers.free.name"),
      description: t("pricing.tiers.free.description"),
      price: t("pricing.tiers.free.price"),
      features: t("pricing.tiers.free.features", { returnObjects: true }) as string[],
      cta: t("pricing.tiers.free.cta"),
      featured: false,
      isFree: true
    },
    {
      name: t("pricing.tiers.plus.name"),
      description: t("pricing.tiers.plus.description"),
      price: t("pricing.tiers.plus.price"),
      features: t("pricing.tiers.plus.features", { returnObjects: true }) as string[],
      cta: t("pricing.tiers.plus.cta"),
      featured: true
    },
    {
      name: t("pricing.tiers.x.name"),
      description: t("pricing.tiers.x.description"),
      price: t("pricing.tiers.x.price"),
      features: t("pricing.tiers.x.features", { returnObjects: true }) as string[],
      cta: t("pricing.tiers.x.cta"),
      featured: false
    }
  ];

  const TierCard = ({ tier, onCtaClick }: { tier: typeof tiers[0]; onCtaClick: () => void }) => (
    <div 
      className={`relative rounded-2xl p-8 h-full flex flex-col ${
        tier.featured 
          ? 'bg-gradient-to-b from-foreground/5 to-transparent border-2 border-foreground/30' 
          : 'forti-card'
      }`}
    >
      {tier.featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold">
          {t("pricing.mostPopular")}
        </div>
      )}
      {tier.isFree && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-white text-black text-xs font-semibold">
          FREE
        </div>
      )}

      {/* Tier header */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>
        <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
        <div className="text-3xl font-semibold">{tier.price}</div>
      </div>

      {/* Features */}
      <ul className="space-y-4 mb-8 flex-grow">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check className="h-5 w-5 text-forti-gold shrink-0 mt-0.5" />
            <span className="text-sm text-secondary-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Button 
        variant="forti"
        className="w-full btn-shimmer"
        size="lg"
        onClick={onCtaClick}
      >
        {tier.cta}
      </Button>
    </div>
  );

  return (
    <section id="pricing" className="forti-section relative bg-secondary/30">
      <div className="forti-container">
        {/* Section header */}
        <div className="text-center mb-8 md:mb-16">
          <h2 className="forti-heading-lg mb-4">
            {t("pricing.title")}
          </h2>
          <p className="forti-text-subtle max-w-xl mx-auto">
            {t("pricing.subtitle")}
          </p>
        </div>

        {/* Mobile Carousel */}
        <div className="md:hidden pt-4">
          <Carousel
            opts={{
              align: "center",
              loop: true,
            }}
            className="w-full overflow-visible"
          >
            <CarouselContent containerClassName="overflow-visible" className="-ml-4 overflow-visible">
              {tiers.map((tier) => (
                <CarouselItem key={tier.name} className="pl-4 basis-[85%] overflow-visible">
                  <TierCard tier={tier} onCtaClick={() => setWaitlistOpen(true)} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          {/* Carousel dots indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {tiers.map((_, index) => (
              <div 
                key={index} 
                className="w-2 h-2 rounded-full bg-white/20"
              />
            ))}
          </div>
        </div>

        {/* Desktop Grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 lg:gap-8">
          {tiers.map((tier) => (
            <TierCard key={tier.name} tier={tier} onCtaClick={() => setWaitlistOpen(true)} />
          ))}
        </div>
      </div>

      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} />
    </section>
  );
};

export default FortiPricing;
