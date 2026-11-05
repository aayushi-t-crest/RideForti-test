import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Check, Car } from "lucide-react";
import FortiHeader from "@/components/FortiHeader";
import FortiFooter from "@/components/FortiFooter";
import fortiLogo from "@/assets/forti-logo.png";
import { useDriverBenefitImages, useDriverRequirementImages } from "@/hooks/useDriverBenefitImages";
import { ImageWithSkeleton } from "@/components/ImageWithSkeleton";
import { usePreloadImages } from "@/hooks/usePreloadImages";
import WaitlistModal from "@/components/WaitlistModal";

const Drivers = () => {
  const { data: benefitImages = {} } = useDriverBenefitImages();
  const { data: requirementImages = {} } = useDriverRequirementImages();
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  // Preload a *small* set of images so they appear instantly when the user scrolls.
  const preloadUrls = useMemo(() => {
    const urls = [
      benefitImages["premium-earnings"]?.url,
      benefitImages["flexible-schedule"]?.url,
      requirementImages["standard-driver"]?.url,
      requirementImages["armed-driver"]?.url,
    ].filter((u): u is string => typeof u === "string" && u.length > 0);
    return Array.from(new Set(urls));
  }, [benefitImages, requirementImages]);

  usePreloadImages(preloadUrls, { rel: "preload" });

  const benefits = [{
    key: "premium-earnings",
    title: "Premium Earnings",
    description: "Earn significantly more than standard rideshare. Our clients value safety and pay accordingly."
  }, {
    key: "flexible-schedule",
    title: "Flexible Schedule",
    description: "Choose when you work. Accept rides that fit your availability and preferences."
  }, {
    key: "elite-network",
    title: "Elite Network",
    description: "Join an exclusive network of verified professionals serving high-profile clients."
  }, {
    key: "priority-matching",
    title: "Priority Matching",
    description: "Get matched with executives, families, and clients who value professional drivers."
  }, {
    key: "full-support",
    title: "Full Support",
    description: "24/7 operations center backing every ride. You're never alone on the road."
  }, {
    key: "premium-routes",
    title: "Premium Routes",
    description: "Airport transfers, corporate events, and executive travel across Florida."
  }];

  const requirements = ["Valid driver's license with clean driving record (minimum 5 years)", "Pass comprehensive background check and drug screening", "Vehicle must meet premium standards (2019 or newer, sedan or SUV)", "Professional appearance and demeanor", "Excellent communication skills", "Smartphone with reliable data connection", "Flexible availability including evenings and weekends"];
  const armedRequirements = ["All standard driver requirements", "Valid concealed carry permit (CCW/CWL)", "Completion of Forti tactical driving course", "Annual firearms qualification and safety training", "Law enforcement or military background preferred", "Additional background investigation clearance"];

  return (
    <div className="min-h-screen bg-background">
      <FortiHeader />
      <main>
        {/* Hero Section */}
        <section className="relative min-h-[80vh] flex items-center justify-center pt-20 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-forti-charcoal via-background to-background" />
          
          {/* Subtle grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(hsl(var(--forti-gold) / 0.3) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(var(--forti-gold) / 0.3) 1px, transparent 1px)`,
            backgroundSize: '80px 80px'
          }} />

          {/* Radial glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-forti-gold/5 rounded-full blur-[120px]" />

          <div className="relative forti-container text-center">
            <div className="max-w-4xl mx-auto">
              {/* Logo */}
              <img src={fortiLogo} alt="Forti" className="h-16 md:h-20 mx-auto mb-8 animate-fade-up" />

              {/* Headline */}
              <h1 className="forti-heading-xl mb-6 animate-fade-up delay-100">
                Drive<span className="metallic-shimmer"> Forti</span>
              </h1>

              {/* Subheadline */}
              <p className="forti-text-body text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-up delay-200">
                Join an elite network of professional drivers serving executives, families, and high-profile clients who value safety above all else.
              </p>

              {/* CTAs */}
              <div className="flex flex-row items-center justify-center gap-3 animate-fade-up delay-300">
                <Button variant="forti" size="default" className="btn-shimmer" onClick={() => setWaitlistOpen(true)}>
                  Download Now
                </Button>
                <a href="#requirements">
                  <Button variant="fortiRed" size="default">
                    View Requirements
                  </Button>
                </a>
              </div>

              {/* Trust indicators */}
              <div className="mt-16 pt-12 border-t border-border/50 animate-fade-up delay-400">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-6">
                  Why drivers choose Forti
                </p>
                <div className="flex items-center justify-center gap-8 md:gap-12 opacity-60 flex-wrap">
                  <div className="text-lg font-medium tracking-tight">Higher Earnings</div>
                  <div className="text-lg font-medium tracking-tight">Premium Clients</div>
                  <div className="text-lg font-medium tracking-tight">24/7 Support</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="forti-section relative bg-secondary/30 overflow-hidden">
          <div className="forti-container">
            <div className="text-center mb-16">
              <p className="text-sm text-forti-gold uppercase tracking-widest mb-4">Benefits</p>
              <h2 className="forti-heading-lg mb-4">
                Why Drive with Forti?
              </h2>
              <p className="forti-text-subtle max-w-xl mx-auto">
                More than a rideshare. A career in premium, secure transportation.
              </p>
            </div>

            {/* Desktop/Tablet Grid */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((benefit, index) => (
                <div key={benefit.key} className="group p-6 rounded-xl border border-border/50 bg-background hover:border-forti-gold/20 transition-all duration-300 flex flex-col">
                  <div className="mb-4 w-full aspect-[16/9] rounded-lg overflow-hidden bg-secondary/50 border border-border/30 relative">
                    {benefitImages[benefit.key]?.url ? (
                      <ImageWithSkeleton 
                        src={benefitImages[benefit.key].url!} 
                        alt={benefit.title} 
                        className="w-full h-full object-cover"
                        style={{ transform: `scale(${(benefitImages[benefit.key]?.zoom ?? 100) / 100})` }}
                        loading={index < 2 ? "eager" : "lazy"}
                        fetchPriority={index < 2 ? "high" : "low"}
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Car className="h-8 w-8 text-muted-foreground opacity-50" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-medium mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                </div>
              ))}
            </div>

            {/* Mobile Horizontal Marquee */}
            <div className="sm:hidden overflow-hidden relative">
              <div className="animate-marquee-horizontal flex w-max flex-row gap-4">
                {/* Original items */}
                {benefits.map((benefit, index) => (
                  <div key={benefit.key} className="group p-4 rounded-xl border border-border/50 bg-background flex flex-col shrink-0 w-[280px]">
                    <div className="mb-3 w-full h-[140px] rounded-lg overflow-hidden bg-secondary/50 border border-border/30 relative">
                      {benefitImages[benefit.key]?.url ? (
                        <ImageWithSkeleton 
                          src={benefitImages[benefit.key].url!} 
                          alt={benefit.title} 
                          className="w-full h-full object-cover"
                          style={{ transform: `scale(${(benefitImages[benefit.key]?.zoom ?? 100) / 100})` }}
                          loading={index < 1 ? "eager" : "lazy"}
                          fetchPriority={index < 1 ? "high" : "low"}
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <Car className="h-6 w-6 text-muted-foreground opacity-50" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-base font-medium mb-1">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{benefit.description}</p>
                  </div>
                ))}
                {/* Duplicated items for seamless loop */}
                {benefits.map((benefit) => (
                  <div key={`${benefit.key}-dup`} className="group p-4 rounded-xl border border-border/50 bg-background flex flex-col shrink-0 w-[280px]">
                    <div className="mb-3 w-full h-[140px] rounded-lg overflow-hidden bg-secondary/50 border border-border/30 relative">
                      {benefitImages[benefit.key]?.url ? (
                        <ImageWithSkeleton 
                          src={benefitImages[benefit.key].url!} 
                          alt={benefit.title} 
                          className="w-full h-full object-cover"
                          style={{ transform: `scale(${(benefitImages[benefit.key]?.zoom ?? 100) / 100})` }}
                          loading="lazy"
                          fetchPriority="low"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <Car className="h-6 w-6 text-muted-foreground opacity-50" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-base font-medium mb-1">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{benefit.description}</p>
                  </div>
                ))}
              </div>
              {/* Gradient fades at left and right */}
              <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-secondary/30 to-transparent pointer-events-none z-10" />
              <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-secondary/30 to-transparent pointer-events-none z-10" />
            </div>
          </div>
        </section>

        {/* Requirements Section */}
        <section id="requirements" className="forti-section relative">
          {/* Background grid pattern */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 opacity-[0.08]" style={{
              backgroundImage: `linear-gradient(hsl(var(--forti-gold)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--forti-gold)) 1px, transparent 1px)`,
              backgroundSize: '32px 32px',
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
            }} />
          </div>

          <div className="forti-container relative z-10">
            <div className="text-center mb-16">
              <p className="text-sm text-forti-gold uppercase tracking-widest mb-4">Requirements</p>
              <h2 className="forti-heading-lg mb-4">
                What It Takes
              </h2>
              <p className="forti-text-subtle max-w-xl mx-auto">
                We hold our drivers to the highest standards. Our clients trust us with their safety.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Standard Driver */}
              <div className="forti-card flex flex-col">
                <div className="mb-6 w-full aspect-[16/9] rounded-lg overflow-hidden bg-secondary/50 border border-border/30 relative">
                  {requirementImages['standard-driver']?.url ? (
                    <ImageWithSkeleton 
                      src={requirementImages['standard-driver'].url!} 
                      alt="Standard Driver" 
                      className="w-full h-full object-cover"
                      style={{ transform: `scale(${(requirementImages['standard-driver']?.zoom ?? 100) / 100})` }}
                      loading="lazy"
                      fetchPriority="low"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Car className="h-8 w-8 text-muted-foreground opacity-50" />
                    </div>
                  )}
                </div>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold">Standard Driver</h3>
                  <p className="text-sm text-muted-foreground">Forti Black</p>
                </div>
                <ul className="space-y-3">
                  {requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-forti-gold shrink-0 mt-0.5" />
                      <span className="text-sm text-secondary-foreground">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Armed Driver */}
              <div className="forti-card border-forti-gold/20 flex flex-col">
                <div className="mb-6 w-full aspect-[16/9] rounded-lg overflow-hidden bg-secondary/50 border border-border/30 relative">
                  {requirementImages['armed-driver']?.url ? (
                    <ImageWithSkeleton 
                      src={requirementImages['armed-driver'].url!} 
                      alt="Armed Driver" 
                      className="w-full h-full object-cover"
                      style={{ transform: `scale(${(requirementImages['armed-driver']?.zoom ?? 100) / 100})` }}
                      loading="lazy"
                      fetchPriority="low"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Shield className="h-8 w-8 text-muted-foreground opacity-50" />
                    </div>
                  )}
                </div>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold">Armed Driver</h3>
                  <p className="text-sm text-forti-gold">Forti Black+ & Black X</p>
                </div>
                <ul className="space-y-3">
                  {armedRequirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-forti-gold shrink-0 mt-0.5" />
                      <span className="text-sm text-secondary-foreground">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="forti-section relative bg-secondary/30">
          <div className="forti-container">
            <div className="max-w-3xl mx-auto text-center">
              <img src={fortiLogo} alt="Forti" className="h-12 mx-auto mb-8" />
              <h2 className="forti-heading-lg mb-4">
                Ready to Join the
                <span className="metallic-shimmer"> Elite?</span>
              </h2>
              <p className="forti-text-subtle max-w-xl mx-auto mb-8">
                Apply now and start earning with Florida's premier secure transportation network. Your skills deserve premium compensation.
              </p>
              <Button variant="forti" size="xl" className="btn-shimmer" onClick={() => setWaitlistOpen(true)}>
                Start Your Application
              </Button>
              <p className="mt-6 text-xs text-muted-foreground">
                Applications reviewed within 48 hours. Background check required.
              </p>
            </div>
          </div>
        </section>
      </main>
      <FortiFooter />
      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} />
    </div>
  );
};

export default Drivers;
