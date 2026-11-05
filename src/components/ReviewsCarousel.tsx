import { Star } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";

const reviews = [
  {
    name: "Michael R.",
    role: "Business Executive",
    rating: 5,
    text: "FORTI gave me peace of mind I never knew I needed. The armed guard escort made my late-night airport transfers feel completely safe.",
  },
  {
    name: "Sarah T.",
    role: "Real Estate Agent",
    rating: 5,
    text: "As a woman who often shows properties in unfamiliar areas, FORTI has been a game changer. Professional, discreet, and always on time.",
  },
  {
    name: "James K.",
    role: "Retired Veteran",
    rating: 5,
    text: "Love that FORTI supports veteran and law enforcement communities. The service is top-notch and the drivers are always respectful.",
  },
  {
    name: "Patricia L.",
    role: "Healthcare Worker",
    rating: 5,
    text: "Working night shifts means commuting at odd hours. FORTI's protection service lets me get home safely every single time.",
  },
  {
    name: "David M.",
    role: "Attorney",
    rating: 4,
    text: "The luxury fleet combined with professional security is unmatched. I recommend FORTI to all my colleagues who travel frequently.",
  },
  {
    name: "Angela W.",
    role: "Event Planner",
    rating: 5,
    text: "I use FORTI for VIP client transportation. The level of professionalism and security has impressed every single one of my clients.",
  },
];

const ReviewsCarousel = () => {
  const autoplayPlugin = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  );

  return (
    <section className="py-16 md:py-24 bg-forti-dark/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What Our Clients Say
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Real experiences from people who trust FORTI for safe, secure transportation.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <Carousel
            plugins={[autoplayPlugin.current]}
            opts={{ loop: true, align: "start" }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {reviews.map((review, index) => (
                <CarouselItem
                  key={index}
                  className="pl-4 basis-full md:basis-1/2 lg:basis-1/3"
                >
                  <div className="h-full rounded-2xl border border-forti-gold/20 bg-card/60 backdrop-blur-sm p-6 flex flex-col">
                    {/* Stars */}
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? "fill-forti-gold text-forti-gold"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Review text */}
                    <p className="text-muted-foreground text-sm leading-relaxed flex-1 mb-6">
                      "{review.text}"
                    </p>

                    {/* Author */}
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-forti-gold/20 flex items-center justify-center text-forti-gold font-semibold text-sm">
                        {review.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-foreground font-medium text-sm">
                          {review.name}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {review.role}
                        </p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-12 border-forti-gold/30 text-forti-gold hover:bg-forti-gold/10" />
            <CarouselNext className="hidden md:flex -right-12 border-forti-gold/30 text-forti-gold hover:bg-forti-gold/10" />
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default ReviewsCarousel;
