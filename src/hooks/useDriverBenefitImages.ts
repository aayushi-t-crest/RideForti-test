import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BenefitImageData {
  url: string | null;
  zoom: number;
}

export const useDriverBenefitImages = () => {
  return useQuery({
    queryKey: ['driver-benefit-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_benefit_images')
        .select('benefit_key, image_url, zoom_level');
      
      if (error) throw error;
      
      const imageMap: Record<string, BenefitImageData> = {};
      data?.forEach(item => {
        imageMap[item.benefit_key] = {
          url: item.image_url,
          zoom: item.zoom_level ?? 100
        };
      });
      return imageMap;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useDriverRequirementImages = () => {
  return useQuery({
    queryKey: ['driver-requirement-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_requirement_images')
        .select('requirement_key, image_url, zoom_level');
      
      if (error) throw error;
      
      const imageMap: Record<string, BenefitImageData> = {};
      data?.forEach(item => {
        imageMap[item.requirement_key] = {
          url: item.image_url,
          zoom: item.zoom_level ?? 100
        };
      });
      return imageMap;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};
