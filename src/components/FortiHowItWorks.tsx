import { useTranslation } from "react-i18next";
import { useHowItWorksImages } from "@/hooks/useHowItWorksImages";
import { ImageWithSkeleton } from "@/components/ImageWithSkeleton";

const FortiHowItWorks = () => {
  const { t } = useTranslation();
  const { data: stepImages = {} } = useHowItWorksImages();

  // Locked zoom levels for each step
  const zoomLevels: Record<string, number> = {
    "01": 1,
    "02": 1,
    "03": 1.1
  };

  const steps = [
    {
      number: "01",
      title: t("howItWorks.step1.title"),
      description: t("howItWorks.step1.description")
    },
    {
      number: "02",
      title: t("howItWorks.step2.title"),
      description: t("howItWorks.step2.description")
    },
    {
      number: "03",
      title: t("howItWorks.step3.title"),
      description: t("howItWorks.step3.description")
    }
  ];

  return (
    <section id="how-it-works" className="py-8 md:py-12 lg:py-20 relative overflow-x-clip overflow-y-visible">
      {/* Background grid pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--forti-gold)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--forti-gold)) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
          }}
        />
      </div>
      
      <div className="forti-container relative z-10">
        {/* Section header */}
        <div className="text-center mb-8">
          <h2 className="forti-heading-lg mb-4">
            {t("howItWorks.title")}
          </h2>
          <p className="forti-text-subtle max-w-xl mx-auto">
            {t("howItWorks.subtitle")}
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 items-stretch">
          {steps.map((step, index) => (
            <div key={step.number} className="relative group flex">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-1/2 w-full h-px bg-gradient-to-r from-border via-forti-gold/20 to-border" />
              )}
              
              <div className="forti-card text-center relative flex flex-col flex-1">
                {/* Step number */}
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white/10 border border-white/30 flex items-center justify-center">
                  <span className="text-xs font-medium text-white">{step.number}</span>
                </div>

                {/* Image area */}
                {stepImages[step.number] && (
                  <div className="mb-4 w-full h-40 bg-white rounded-xl overflow-hidden flex-shrink-0">
                    <ImageWithSkeleton 
                      src={stepImages[step.number]!} 
                      alt={step.title}
                      className="w-full h-full object-cover"
                      style={{ transform: `scale(${zoomLevels[step.number] || 1})` }}
                    />
                  </div>
                )}

                {/* Content */}
                <div className="flex flex-col flex-1">
                  <h3 className="forti-heading-md mb-3">{step.title}</h3>
                  <p className="forti-text-subtle">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FortiHowItWorks;