import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface GalleryImage {
  id: string;
  image_url: string;
  display_order: number;
}

export const useGalleryCarouselImages = () => {
  return useQuery({
    queryKey: ['gallery-carousel-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery_carousel_images')
        .select('id, image_url, display_order')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as GalleryImage[];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useUploadGalleryImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('gallery-carousel')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('gallery-carousel')
        .getPublicUrl(fileName);

      // Get current max order
      const { data: existing } = await supabase
        .from('gallery_carousel_images')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

      // Insert into database using service role via edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gallery-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          image_url: urlData.publicUrl,
          display_order: nextOrder,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save image to database');
      }

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-carousel-images'] });
    },
  });
};

export const useDeleteGalleryImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageId: string) => {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gallery-upload`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ id: imageId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-carousel-images'] });
    },
  });
};
