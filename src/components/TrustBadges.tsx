import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Shield, Star, Award, Badge, Settings, Upload, X, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TrustBadge {
  id: string;
  name: string;
  image_url: string | null;
  display_order: number;
}

const fallbackIcons = [Star, Shield, Badge, Award, Star, Shield];

const TrustBadges = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isManaging, setIsManaging] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const { data: badges = [], isLoading: loading } = useQuery({
    queryKey: ['trust-badges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trust_badges")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TrustBadge[];
    },
    staleTime: 1000 * 60 * 10,
  });

  const [localBadges, setLocalBadges] = useState<TrustBadge[]>([]);
  // Sync local state with query data for manage mode
  const manageBadges = isManaging ? localBadges : badges;

  const autoplayPlugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  // Default placeholder badges
  const defaultBadges = [
    { name: "Veterans Association" },
    { name: "Police Officers Association" },
    { name: "County Sheriffs" },
    { name: "First Responders" },
    { name: "Military Families" },
    { name: "Law Enforcement" },
  ];

  const refreshBadges = () => queryClient.invalidateQueries({ queryKey: ['trust-badges'] });

  const handleAddBadge = async () => {
    const nextOrder = localBadges.length;
    const { data, error } = await supabase
      .from("trust_badges")
      .insert({ name: "", display_order: nextOrder })
      .select()
      .single();

    if (error) {
      toast.error("Failed to add badge");
      return;
    }
    setLocalBadges((prev) => [...prev, data]);
  };

  const handleDeleteBadge = async (id: string) => {
    const badge = localBadges.find((b) => b.id === id);
    if (badge?.image_url) {
      const path = badge.image_url.split("/trust-badges/")[1];
      if (path) {
        await supabase.storage.from("trust-badges").remove([path]);
      }
    }

    const { error } = await supabase.from("trust_badges").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete badge");
      return;
    }
    setLocalBadges((prev) => prev.filter((b) => b.id !== id));
    toast.success("Badge removed");
  };

  const handleNameChange = async (id: string, name: string) => {
    setLocalBadges((prev) => prev.map((b) => (b.id === id ? { ...b, name } : b)));
  };

  const handleNameBlur = async (id: string, name: string) => {
    await supabase.from("trust_badges").update({ name }).eq("id", id);
  };

  const handleImageUpload = async (id: string, file: File) => {
    setUploading(id);
    const ext = file.name.split(".").pop();
    const path = `${id}.${ext}`;

    const badge = localBadges.find((b) => b.id === id);
    if (badge?.image_url) {
      const oldPath = badge.image_url.split("/trust-badges/")[1];
      if (oldPath) await supabase.storage.from("trust-badges").remove([oldPath]);
    }

    const { error: uploadError } = await supabase.storage
      .from("trust-badges")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Upload failed");
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("trust-badges")
      .getPublicUrl(path);

    const image_url = urlData.publicUrl;
    await supabase.from("trust_badges").update({ image_url }).eq("id", id);
    setLocalBadges((prev) =>
      prev.map((b) => (b.id === id ? { ...b, image_url } : b))
    );
    setUploading(null);
    toast.success("Image uploaded");
  };

  const displayBadges = badges.length > 0 ? badges : null;

  // If no DB badges and not managing, show placeholder defaults
  const showDefaults = !displayBadges && !isManaging;

  return (
    <section className="py-8 bg-secondary/30 border-y border-border/50 relative">
      {/* Manage toggle */}
      <button
        onClick={() => {
          if (!isManaging) {
            setLocalBadges([...badges]);
          } else {
            refreshBadges();
          }
          setIsManaging(!isManaging);
        }}
        className="absolute top-2 right-2 p-1.5 rounded-md text-muted-foreground/40 hover:text-muted-foreground transition-colors z-10"
        title="Manage badges"
      >
        <Settings className="h-4 w-4" />
      </button>

      <div className="forti-container">
        <p className="text-center text-sm text-muted-foreground uppercase tracking-widest mb-6">
          Proudly Supports
        </p>

        {isManaging ? (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
              {localBadges.map((badge, index) => (
                <div
                  key={badge.id}
                  className="flex flex-col items-center p-3 rounded-lg bg-background/50 border border-border/50 relative group"
                >
                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteBadge(badge.id)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>

                  {/* Image area */}
                  <label className="cursor-pointer w-16 h-16 flex items-center justify-center rounded-md border border-dashed border-border/50 hover:border-foreground/30 transition-colors mb-2 overflow-hidden">
                    {uploading === badge.id ? (
                      <div className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                    ) : badge.image_url ? (
                      <img
                        src={badge.image_url}
                        alt={badge.name}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(badge.id, file);
                      }}
                    />
                  </label>

                  {/* Name input */}
                  <input
                    type="text"
                    value={badge.name}
                    onChange={(e) => handleNameChange(badge.id, e.target.value)}
                    onBlur={(e) => handleNameBlur(badge.id, e.target.value)}
                    placeholder="Label"
                    className="w-full text-xs text-center bg-transparent border-b border-border/50 focus:border-foreground/50 outline-none text-muted-foreground py-1"
                  />
                </div>
              ))}

              {/* Add badge button */}
              <button
                onClick={handleAddBadge}
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-border/50 hover:border-foreground/30 transition-colors h-[120px] text-muted-foreground hover:text-foreground"
              >
                <span className="text-2xl mb-1">+</span>
                <span className="text-xs">Add Badge</span>
              </button>
            </div>

            <div className="flex justify-center">
              <Button
                variant="forti"
                size="sm"
                onClick={() => { refreshBadges(); setIsManaging(false); }}
              >
                <Check className="h-4 w-4 mr-1" /> Done
              </Button>
            </div>
          </div>
        ) : (
          <Carousel
            opts={{ align: "center", loop: true }}
            plugins={[autoplayPlugin.current]}
            className="w-full max-w-4xl mx-auto"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {showDefaults
                ? defaultBadges.map((assoc, index) => {
                    const Icon = fallbackIcons[index % fallbackIcons.length];
                    return (
                      <CarouselItem
                        key={index}
                        className="pl-2 md:pl-4 basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6"
                      >
                        <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-background/50 border border-border/50 hover:border-forti-gold/30 transition-colors h-24">
                          <Icon className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-xs text-muted-foreground text-center leading-tight">
                            {assoc.name}
                          </span>
                        </div>
                      </CarouselItem>
                    );
                  })
                : displayBadges?.map((badge, index) => (
                    <CarouselItem
                      key={badge.id}
                      className="pl-2 md:pl-4 basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6"
                    >
                      <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-background/50 border border-border/50 hover:border-forti-gold/30 transition-colors h-24">
                        {badge.image_url ? (
                          <img
                            src={badge.image_url}
                            alt={badge.name}
                            className="h-8 w-8 object-contain mb-2"
                          />
                        ) : (
                          (() => {
                            const Icon = fallbackIcons[index % fallbackIcons.length];
                            return <Icon className="h-8 w-8 text-muted-foreground mb-2" />;
                          })()
                        )}
                        <span className="text-xs text-muted-foreground text-center leading-tight">
                          {badge.name}
                        </span>
                      </div>
                    </CarouselItem>
                  ))}
            </CarouselContent>
          </Carousel>
        )}

        <p className="text-center text-xs text-muted-foreground/60 mt-4">
          Supporting those who serve our communities
        </p>
      </div>
    </section>
  );
};

export default TrustBadges;
