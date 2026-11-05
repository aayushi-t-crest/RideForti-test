import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useHowItWorksImages = () => {
  return useQuery({
    queryKey: ['how-it-works-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('how_it_works_images')
        .select('step_number, image_url');
      
      if (error) throw error;
      
      const imageMap: Record<string, string | null> = {};
      data?.forEach(item => {
        imageMap[item.step_number] = item.image_url;
      });
      return imageMap;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};
