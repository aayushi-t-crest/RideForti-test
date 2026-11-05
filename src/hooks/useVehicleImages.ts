import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useVehicleImages = () => {
  return useQuery({
    queryKey: ['vehicle-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_images')
        .select('vehicle_type, experience_level, image_url');
      
      if (error) throw error;
      
      const imageMap: Record<string, string> = {};
      data?.forEach((item) => {
        const key = `${item.vehicle_type}-${item.experience_level}`;
        imageMap[key] = item.image_url;
      });
      return imageMap;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};
