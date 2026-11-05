import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FeatureImageData {
  url: string | null;
  zoom: number;
}

export const useSecurityImages = () => {
  return useQuery({
    queryKey: ['security-feature-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_feature_images')
        .select('feature_key, image_url, zoom_level');
      
      if (error) throw error;
      
      const imageMap: Record<string, FeatureImageData> = {};
      data?.forEach(item => {
        imageMap[item.feature_key] = {
          url: item.image_url,
          zoom: item.zoom_level || 100
        };
      });
      return imageMap;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};
