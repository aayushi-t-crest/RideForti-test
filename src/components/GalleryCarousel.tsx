import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGalleryCarouselImages, useUploadGalleryImage, useDeleteGalleryImage } from "@/hooks/useGalleryCarouselImages";
import { ImageWithSkeleton } from "@/components/ImageWithSkeleton";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const GalleryCarousel = () => {
  const { t } = useTranslation();
  const { data: images = [], isLoading } = useGalleryCarouselImages();
  const uploadMutation = useUploadGalleryImage();
  const deleteMutation = useDeleteGalleryImage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isManageOpen, setIsManageOpen] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    try {
      await uploadMutation.mutateAsync(file);
      toast.success("Image uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload image");
      console.error(error);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Image deleted");
    } catch (error) {
      toast.error("Failed to delete image");
    }
  };

  // Don't render section if no images
  if (!isLoading && images.length === 0) {
    return null;
  }

  // Duplicate images for seamless infinite scroll
  const displayImages = [...images, ...images, ...images];

  return (
    <section className="py-8 md:py-12 lg:py-16 overflow-hidden">
      <div className="forti-container mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="forti-heading-md">Gallery</h3>
            <p className="forti-text-subtle text-sm mt-1">Experience the journey</p>
          </div>
          
          <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-forti-gold/30 hover:border-forti-gold">
                <Plus className="h-4 w-4 mr-2" />
                Manage
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manage Gallery Images</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Upload button */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadMutation.isPending ? "Uploading..." : "Upload New Image"}
                  </Button>
                </div>

                {/* Image list */}
                <div className="grid grid-cols-2 gap-3">
                  {images.map((image) => (
                    <div key={image.id} className="relative group aspect-[3/4] rounded-lg overflow-hidden border border-border">
                      <img
                        src={image.image_url}
                        alt="Gallery"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleDelete(image.id)}
                        disabled={deleteMutation.isPending}
                        className="absolute top-2 right-2 p-1.5 bg-destructive/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3 text-destructive-foreground" />
                      </button>
                    </div>
                  ))}
                </div>

                {images.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No images yet. Upload your first image above.
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Vertical scrolling marquee */}
      <div className="relative h-[400px] md:h-[500px] flex gap-4 justify-center">
        {/* Column 1 - scrolls up */}
        <div className="w-48 md:w-64 overflow-hidden">
          <div className="flex flex-col gap-4 animate-scroll-up">
            {displayImages.map((image, index) => (
              <div
                key={`col1-${index}`}
                className="w-full aspect-[3/4] rounded-xl overflow-hidden border border-border/50 flex-shrink-0"
              >
                <ImageWithSkeleton
                  src={image.image_url}
                  alt="Gallery image"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Column 2 - scrolls down (offset) */}
        <div className="w-48 md:w-64 overflow-hidden">
          <div className="flex flex-col gap-4 animate-scroll-down" style={{ transform: 'translateY(-50%)' }}>
            {displayImages.map((image, index) => (
              <div
                key={`col2-${index}`}
                className="w-full aspect-[3/4] rounded-xl overflow-hidden border border-border/50 flex-shrink-0"
              >
                <ImageWithSkeleton
                  src={image.image_url}
                  alt="Gallery image"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Column 3 - scrolls up (different offset) - hidden on mobile */}
        <div className="hidden md:block w-64 overflow-hidden">
          <div className="flex flex-col gap-4 animate-scroll-up" style={{ animationDelay: '-10s' }}>
            {displayImages.map((image, index) => (
              <div
                key={`col3-${index}`}
                className="w-full aspect-[3/4] rounded-xl overflow-hidden border border-border/50 flex-shrink-0"
              >
                <ImageWithSkeleton
                  src={image.image_url}
                  alt="Gallery image"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Gradient overlays for fade effect */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
      </div>
    </section>
  );
};

export default GalleryCarousel;
