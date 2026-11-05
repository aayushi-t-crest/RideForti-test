import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useUseCaseImages = () => {
  return useQuery({
    queryKey: ['use-case-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('use_case_images')
        .select('use_case_key, image_url');
      
      if (error) throw error;
      
      const imageMap: Record<string, string | null> = {};
      data?.forEach(item => {
        imageMap[item.use_case_key] = item.image_url;
      });
      return imageMap;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};
