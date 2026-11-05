import { lazy, Suspense } from "react";
import FortiHeader from "@/components/FortiHeader";
import RideBookingHero from "@/components/RideBookingHero";
import TrustBadges from "@/components/TrustBadges";
import FortiFooter from "@/components/FortiFooter";

// Lazy load below-the-fold components for faster initial load
const FortiHowItWorks = lazy(() => import("@/components/FortiHowItWorks"));
const GalleryCarousel = lazy(() => import("@/components/GalleryCarousel"));
const FortiPricing = lazy(() => import("@/components/FortiPricing"));
const ReviewsCarousel = lazy(() => import("@/components/ReviewsCarousel"));
const FortiSecurity = lazy(() => import("@/components/FortiSecurity"));
const FortiUseCases = lazy(() => import("@/components/FortiUseCases"));

// Simple loading placeholder
const SectionLoader = () => (
  <div className="py-20 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-forti-gold/30 border-t-forti-gold rounded-full animate-spin" />
  </div>
);

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <FortiHeader />
      <main>
        <RideBookingHero />
        <TrustBadges />
        <Suspense fallback={<SectionLoader />}>
          <FortiHowItWorks />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <GalleryCarousel />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <FortiPricing />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <ReviewsCarousel />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <FortiSecurity />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <FortiUseCases />
        </Suspense>
      </main>
      <FortiFooter />
    </div>
  );
};

export default Index;