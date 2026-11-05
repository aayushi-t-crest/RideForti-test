import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import { useSecurityImages } from "@/hooks/useSecurityImages";
import { ImageWithSkeleton } from "@/components/ImageWithSkeleton";

const FortiSecurity = () => {
  const { t } = useTranslation();
  const { data: featureImages = {} } = useSecurityImages();
  
  const features = [
    {
      key: "verified",
      title: t("security.features.verified.title"),
      description: t("security.features.verified.description")
    },
    {
      key: "sos",
      title: t("security.features.sos.title"),
      description: t("security.features.sos.description")
    },
    {
      key: "tracking",
      title: t("security.features.tracking.title"),
      description: t("security.features.tracking.description")
    },
    {
      key: "admin",
      title: t("security.features.admin.title"),
      description: t("security.features.admin.description")
    },
    {
      key: "encryption",
      title: t("security.features.encryption.title"),
      description: t("security.features.encryption.description")
    },
    {
      key: "insurance",
      title: t("security.features.insurance.title"),
      description: t("security.features.insurance.description")
    }
  ];

  return (
    <section id="security" className="forti-section relative overflow-x-clip">
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
        <div className="text-center mb-16">
          <p className="text-sm text-forti-gold uppercase tracking-widest mb-4">{t("security.label")}</p>
          <h2 className="forti-heading-lg mb-4">
            {t("security.title")}
          </h2>
          <p className="forti-text-subtle max-w-xl mx-auto">
            {t("security.subtitle")}
          </p>
        </div>

        {/* Features grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div 
              key={feature.key} 
              className="group p-6 rounded-xl border border-border/50 bg-background hover:border-forti-gold/20 transition-all duration-300"
            >
              <div className="mb-4 w-full aspect-[16/9] rounded-lg overflow-hidden bg-secondary/50 border border-border/30 relative">
                {featureImages[feature.key]?.url ? (
                  <ImageWithSkeleton 
                    src={featureImages[feature.key].url!} 
                    alt={feature.title}
                    className="w-full h-full object-cover object-center"
                    style={{ transform: `scale(${(featureImages[feature.key]?.zoom ?? 100) / 100})` }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Shield className="h-8 w-8 text-muted-foreground opacity-50" />
                  </div>
                )}
              </div>
              
              <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FortiSecurity;