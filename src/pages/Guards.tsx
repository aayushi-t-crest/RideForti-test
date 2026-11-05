import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Check, DollarSign, Clock, Award, Users, Target, Lock } from "lucide-react";
import FortiHeader from "@/components/FortiHeader";
import FortiFooter from "@/components/FortiFooter";
import fortiLogo from "@/assets/forti-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { usePreloadImages } from "@/hooks/usePreloadImages";
import WaitlistModal from "@/components/WaitlistModal";

interface RequirementImage {
  id: string;
  requirement_key: string;
  image_url: string | null;
  zoom_level: number;
}

interface BenefitImage {
  id: string;
  benefit_key: string;
  image_url: string | null;
  zoom_level: number;
}

const Guards = () => {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const benefits = [{
    key: 'compensation',
    icon: DollarSign,
    title: "Top-Tier Compensation",
    description: "Security professionals command premium rates. Our clients understand the value of protection."
  }, {
    key: 'flexible',
    icon: Clock,
    title: "Flexible Assignments",
    description: "Choose assignments that match your schedule. Single rides to multi-day executive details."
  }, {
    key: 'growth',
    icon: Award,
    title: "Professional Growth",
    description: "Continuous training opportunities and career advancement within the Forti network."
  }, {
    key: 'clientele',
    icon: Users,
    title: "Elite Clientele",
    description: "Serve executives, high-net-worth individuals, and families who prioritize security."
  }, {
    key: 'mission',
    icon: Target,
    title: "Mission-Focused",
    description: "Every assignment has one objective: the safety and security of our clients."
  }, {
    key: 'operations',
    icon: Lock,
    title: "Operations Support",
    description: "24/7 operations center with real-time monitoring and immediate response capabilities."
  }];

  const requirements = ["Valid Class D or Class G Security License (Florida)", "Minimum 3 years professional security experience", "Clean criminal background with no felonies or violent misdemeanors", "Valid concealed carry permit (CCW/CWL) required", "Current CPR/First Aid certification", "Professional appearance and executive presence", "Strong communication and de-escalation skills", "Physical fitness standards (ability to respond to emergencies)"];
  const preferredQualifications = ["Law enforcement or military background", "Executive protection (EP) training or certification", "Advanced tactical or firearms training", "Multilingual capabilities", "Medical training beyond basic first aid", "Experience with high-profile or celebrity protection", "Defensive driving certification"];
  
  const requirementCards = [{
    key: "required",
    title: "Required Qualifications",
    subtitle: "Must meet all criteria",
    items: requirements,
    icon: Shield,
    isGold: true
  }, {
    key: "preferred",
    title: "Preferred Qualifications",
    subtitle: "Stand out from the crowd",
    items: preferredQualifications,
    icon: Award,
    isGold: false
  }];

  // Fetch requirement images from database
  const { data: requirementImages } = useQuery({
    queryKey: ['guard-requirement-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guard_requirement_images')
        .select('requirement_key, image_url, zoom_level');
      if (error) throw error;
      return data as RequirementImage[];
    }
  });

  // Fetch benefit images from database
  const { data: benefitImages } = useQuery({
    queryKey: ['guard-benefit-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guard_benefit_images')
        .select('benefit_key, image_url, zoom_level');
      if (error) throw error;
      return data as BenefitImage[];
    }
  });

  // Preload a small set of images so they feel instant once the user scrolls.
  const preloadUrls = useMemo(() => {
    const urls = [
      benefitImages?.find((b) => b.benefit_key === "compensation")?.image_url ?? undefined,
      benefitImages?.find((b) => b.benefit_key === "flexible")?.image_url ?? undefined,
      requirementImages?.find((r) => r.requirement_key === "required")?.image_url ?? undefined,
      requirementImages?.find((r) => r.requirement_key === "preferred")?.image_url ?? undefined,
    ].filter((u): u is string => typeof u === "string" && u.length > 0);

    return Array.from(new Set(urls));
  }, [benefitImages, requirementImages]);

  usePreloadImages(preloadUrls, { rel: "preload" });

  const getImageForRequirement = (requirementKey: string) => {
    return requirementImages?.find(img => img.requirement_key === requirementKey);
  };

  const getImageForBenefit = (benefitKey: string) => {
    return benefitImages?.find(img => img.benefit_key === benefitKey);
  };

  return (
    <div className="min-h-screen bg-background">
      <FortiHeader />
      <main>
        {/* Hero Section */}
        <section className="relative min-h-[80vh] flex items-center justify-center pt-20 overflow-hidden">
          {/* Animated moving background */}
          <div className="absolute inset-0 bg-gradient-to-b from-forti-charcoal via-background to-background" />
          
          {/* Animated gradient orbs */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-[600px] h-[600px] rounded-full blur-[150px] opacity-20" style={{
              background: 'radial-gradient(circle, hsl(var(--forti-gold) / 0.3) 0%, transparent 70%)',
              animation: 'float1 20s ease-in-out infinite',
              top: '10%',
              left: '20%'
            }} />
            <div className="absolute w-[500px] h-[500px] rounded-full blur-[130px] opacity-15" style={{
              background: 'radial-gradient(circle, hsl(0 0% 40% / 0.4) 0%, transparent 70%)',
              animation: 'float2 25s ease-in-out infinite',
              top: '40%',
              right: '10%'
            }} />
            <div className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-10" style={{
              background: 'radial-gradient(circle, hsl(var(--forti-gold) / 0.2) 0%, transparent 70%)',
              animation: 'float3 18s ease-in-out infinite',
              bottom: '20%',
              left: '40%'
            }} />
          </div>
          
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
              {/* Headline */}
              <h1 className="forti-heading-xl mb-6 animate-fade-up delay-100">
                Protect <span className="metallic-shimmer">Forti</span>
              </h1>

              {/* Subheadline */}
              <p className="forti-text-body text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-up delay-200">
                Join Florida's premier mobile security network. Use your skills to protect executives, families, and high-profile individuals who demand the highest level of security.
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
                  The Forti advantage
                </p>
                <div className="flex items-center justify-center gap-8 md:gap-12 opacity-60 flex-wrap">
                  <div className="text-lg font-medium tracking-tight">Premium Rates</div>
                  <div className="text-lg font-medium tracking-tight">Elite Clients</div>
                  <div className="text-lg font-medium tracking-tight">Full Support</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="forti-section relative bg-secondary/30">
          <div className="forti-container">
            <div className="text-center mb-16">
              <p className="text-sm text-forti-gold uppercase tracking-widest mb-4">Benefits</p>
              <h2 className="forti-heading-lg mb-4">
                Your Skills, Elevated
              </h2>
              <p className="forti-text-subtle max-w-xl mx-auto">
                Forti connects top security professionals with clients who value protection above all.
              </p>
            </div>

            {/* Desktop/Tablet Grid */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((benefit, index) => {
                const imageData = getImageForBenefit(benefit.key);
                const zoomLevel = imageData?.zoom_level || 100;
                return (
                  <div key={benefit.key} className="group p-6 rounded-xl border border-border/50 bg-background hover:border-foreground/30 transition-all duration-300">
                    {/* Image Container */}
                    <div className="relative mb-4 rounded-lg overflow-hidden bg-secondary/50">
                      <AspectRatio ratio={16 / 9}>
                        {imageData?.image_url ? (
                          <img 
                            src={imageData.image_url} 
                            alt={benefit.title} 
                            className="w-full h-full object-cover" 
                            style={{ transform: `scale(${zoomLevel / 100})` }} 
                            loading={index < 2 ? "eager" : "lazy"}
                            decoding="async"
                            {...(index < 2 ? ({ fetchPriority: "high" } as any) : ({ fetchPriority: "low" } as any))}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-secondary/30 border border-dashed border-border">
                            <div className="text-center text-muted-foreground">
                              <benefit.icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            </div>
                          </div>
                        )}
                      </AspectRatio>
                    </div>

                    <h3 className="text-lg font-medium mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                  </div>
                );
              })}
            </div>

            {/* Mobile Horizontal Marquee */}
            <div className="sm:hidden overflow-hidden relative">
              <div className="animate-marquee-horizontal flex w-max flex-row gap-4">
                {/* Original items */}
                {benefits.map((benefit, index) => {
                  const imageData = getImageForBenefit(benefit.key);
                  const zoomLevel = imageData?.zoom_level || 100;
                  return (
                    <div key={benefit.key} className="group p-4 rounded-xl border border-border/50 bg-background flex flex-col shrink-0 w-[280px]">
                      <div className="mb-3 w-full h-[140px] rounded-lg overflow-hidden bg-secondary/50 border border-border/30 relative">
                        {imageData?.image_url ? (
                          <img 
                            src={imageData.image_url} 
                            alt={benefit.title} 
                            className="w-full h-full object-cover" 
                            style={{ transform: `scale(${zoomLevel / 100})` }} 
                            loading={index < 1 ? "eager" : "lazy"}
                            decoding="async"
                            {...(index < 1 ? ({ fetchPriority: "high" } as any) : ({ fetchPriority: "low" } as any))}
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <benefit.icon className="h-6 w-6 text-muted-foreground mb-2 opacity-50" />
                          </div>
                        )}
                      </div>
                      <h3 className="text-base font-medium mb-1">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{benefit.description}</p>
                    </div>
                  );
                })}
                {/* Duplicated items for seamless loop */}
                {benefits.map((benefit) => {
                  const imageData = getImageForBenefit(benefit.key);
                  const zoomLevel = imageData?.zoom_level || 100;
                  return (
                    <div key={`${benefit.key}-dup`} className="group p-4 rounded-xl border border-border/50 bg-background flex flex-col shrink-0 w-[280px]">
                      <div className="mb-3 w-full h-[140px] rounded-lg overflow-hidden bg-secondary/50 border border-border/30 relative">
                        {imageData?.image_url ? (
                          <img 
                            src={imageData.image_url} 
                            alt={benefit.title} 
                            className="w-full h-full object-cover" 
                            style={{ transform: `scale(${zoomLevel / 100})` }} 
                            loading="lazy"
                            decoding="async"
                            {...({ fetchPriority: "low" } as any)}
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <benefit.icon className="h-6 w-6 text-muted-foreground mb-2 opacity-50" />
                          </div>
                        )}
                      </div>
                      <h3 className="text-base font-medium mb-1">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{benefit.description}</p>
                    </div>
                  );
                })}
              </div>
              {/* Gradient fades at left and right */}
              <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-secondary/30 to-transparent pointer-events-none z-10" />
              <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-secondary/30 to-transparent pointer-events-none z-10" />
            </div>
          </div>
        </section>

        {/* Requirements Section */}
        <section id="requirements" className="forti-section relative">
          {/* Gold grid background - all breakpoints */}
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
                Standards of Excellence
              </h2>
              <p className="forti-text-subtle max-w-xl mx-auto">
                Our clients trust us with their lives. We accept only the most qualified security professionals.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {requirementCards.map(card => {
                const imageData = getImageForRequirement(card.key);
                const zoomLevel = imageData?.zoom_level || 100;
                return (
                  <div key={card.key} className={`forti-card ${card.isGold ? '' : 'border-forti-gold/20'}`}>
                    {/* Image Container */}
                    <div className="relative mb-6 rounded-lg overflow-hidden bg-secondary/50">
                      <AspectRatio ratio={16 / 9}>
                        {imageData?.image_url ? (
                          <img 
                            src={imageData.image_url} 
                            alt={card.title} 
                            className="w-full h-full object-cover" 
                            style={{ transform: `scale(${zoomLevel / 100})` }} 
                            loading="lazy"
                            decoding="async"
                            {...({ fetchPriority: "low" } as any)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-secondary/30 border border-dashed border-border">
                            <div className="text-center text-muted-foreground">
                              <card.icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            </div>
                          </div>
                        )}
                      </AspectRatio>
                    </div>

                    {/* Card Header */}
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold">{card.title}</h3>
                      <p className={`text-sm ${card.isGold ? 'text-muted-foreground' : 'text-forti-gold'}`}>{card.subtitle}</p>
                    </div>

                    {/* Items List */}
                    <ul className="space-y-3">
                      {card.items.map((item, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Check className={`h-5 w-5 ${card.isGold ? 'text-forti-gold' : 'text-muted-foreground'} shrink-0 mt-0.5`} />
                          <span className="text-sm text-secondary-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="forti-section relative">
          <div className="forti-container">
            <div className="max-w-3xl mx-auto text-center">
              <img src={fortiLogo} alt="Forti" className="h-12 mx-auto mb-8" />
              <h2 className="forti-heading-lg mb-4">
                Ready to Serve the
                <span className="metallic-shimmer"> Elite?</span>
              </h2>
              <p className="forti-text-subtle max-w-xl mx-auto mb-8">
                Your training and experience deserve the right platform. Join Forti and protect clients who demand the best.
              </p>
              <Button variant="forti" size="xl" className="btn-shimmer" onClick={() => setWaitlistOpen(true)}>
                Download Now
              </Button>
              <p className="mt-6 text-xs text-muted-foreground">
                All credentials verified. Background investigation required.
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

export default Guards;
