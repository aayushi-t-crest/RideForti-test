import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Briefcase } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import appStoreBadge from "@/assets/app-store-badge.svg";
import googlePlayBadge from "@/assets/google-play-badge.png";
import WaitlistModal from "@/components/WaitlistModal";
import { useUseCaseImages } from "@/hooks/useUseCaseImages";
import { ImageWithSkeleton } from "@/components/ImageWithSkeleton";

// Fixed frame height for use case images
const FRAME_HEIGHT = 140;

const FortiUseCases = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { data: useCaseImages = {} } = useUseCaseImages();
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  
  // Locked tablet badge sizes
  const TABLET_APP_STORE_SIZE = 56;
  const TABLET_GOOGLE_PLAY_SIZE = 78;

  const useCases = [
    {
      key: "executives",
      title: t("useCases.cases.executives.title"),
      description: t("useCases.cases.executives.description")
    },
    {
      key: "highProfile",
      title: t("useCases.cases.highProfile.title"),
      description: t("useCases.cases.highProfile.description")
    },
    {
      key: "families",
      title: t("useCases.cases.families.title"),
      description: t("useCases.cases.families.description")
    },
    {
      key: "airport",
      title: t("useCases.cases.airport.title"),
      description: t("useCases.cases.airport.description")
    },
    {
      key: "night",
      title: t("useCases.cases.night.title"),
      description: t("useCases.cases.night.description")
    },
    {
      key: "corporate",
      title: t("useCases.cases.corporate.title"),
      description: t("useCases.cases.corporate.description")
    }
  ];

  const handleBadgeClick = () => {
    if (isMobile) {
      setShowWaitlistModal(true);
    } else {
      navigate("/waitlist");
    }
  };

  const UseCaseCard = ({ useCase }: { useCase: typeof useCases[0] }) => (
    <div className="forti-card group hover:border-forti-gold/20 transition-all duration-300 h-full">
      <div className="flex items-start gap-4">
        <div 
          className="shrink-0 w-20 rounded-lg bg-secondary border border-border overflow-hidden relative"
          style={{ height: FRAME_HEIGHT }}
        >
          {useCaseImages[useCase.key] ? (
            <ImageWithSkeleton 
              src={useCaseImages[useCase.key]!} 
              alt={useCase.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-muted-foreground opacity-50" />
            </div>
          )}
        </div>
        
        <div>
          <h3 className="font-medium mb-1">{useCase.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{useCase.description}</p>
        </div>
      </div>
    </div>
  );

  return (
    <section id="use-cases" className="forti-section relative bg-secondary/30">
      <div className="forti-container">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-sm text-forti-gold uppercase tracking-widest mb-4">{t("useCases.label")}</p>
          <h2 className="forti-heading-lg mb-4">
            {t("useCases.title")}
          </h2>
          <p className="forti-text-subtle max-w-xl mx-auto">
            {t("useCases.subtitle")}
          </p>
        </div>

        {/* Mobile smooth scroll carousel */}
        {isMobile ? (
          <div className="overflow-hidden">
            <div 
              className="flex gap-4 animate-marquee hover:[animation-play-state:paused]"
              style={{
                width: 'max-content',
                animation: 'marquee 50s linear infinite',
              }}
            >
              {[...useCases, ...useCases].map((useCase, index) => (
                <div key={`${useCase.key}-${index}`} className="w-[320px] shrink-0">
                  <UseCaseCard useCase={useCase} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Desktop grid */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((useCase) => (
              <UseCaseCard key={useCase.key} useCase={useCase} />
            ))}
          </div>
        )}

        {/* App Store Badges */}
        <div className="flex justify-center items-center gap-4 md:gap-6 mt-12">
          <button onClick={handleBadgeClick} className="block">
            <img 
              src={appStoreBadge} 
              alt="Download on the App Store" 
              className="h-10 lg:h-10" 
              style={{ height: window.innerWidth >= 768 && window.innerWidth < 1024 ? `${TABLET_APP_STORE_SIZE}px` : undefined }}
            />
          </button>
          <button onClick={handleBadgeClick} className="block">
            <img 
              src={googlePlayBadge} 
              alt="Get it on Google Play" 
              className="h-14 lg:h-14" 
              style={{ height: window.innerWidth >= 768 && window.innerWidth < 1024 ? `${TABLET_GOOGLE_PLAY_SIZE}px` : undefined }}
            />
          </button>
        </div>

        {/* Waitlist Modal */}
        <WaitlistModal 
          open={showWaitlistModal} 
          onOpenChange={setShowWaitlistModal} 
        />
      </div>
    </section>
  );
};

export default FortiUseCases;