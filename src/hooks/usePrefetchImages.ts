import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const warmedImageUrls = new Set<string>();

type FetchPriorityValue = "high" | "low" | "auto";

/**
 * Preloads an image binary into the browser cache using new Image().
 * Does NOT resize or compress — just warms the cache.
 */
function preloadImageBinary(url: string, priority: FetchPriorityValue = "auto") {
  if (!url || warmedImageUrls.has(url)) return;
  warmedImageUrls.add(url);

  const img = new Image();
  img.decoding = "async";
  (img as HTMLImageElement & { fetchPriority?: FetchPriorityValue }).fetchPriority = priority;
  img.src = url;
}

/**
 * Preloads a batch of image URLs into the browser cache.
 */
function preloadBatch(urls: (string | null | undefined)[], priority: FetchPriorityValue = "auto") {
  for (const url of urls) {
    if (url) preloadImageBinary(url, priority);
  }
}

function runWhenIdle(task: () => void, timeout = 1200) {
  if (typeof window === "undefined") return () => {};

  const w = window as Window & typeof globalThis;
  const maybeIdleWindow = w as Window & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (maybeIdleWindow.requestIdleCallback && maybeIdleWindow.cancelIdleCallback) {
    const id = maybeIdleWindow.requestIdleCallback(task, { timeout });
    return () => maybeIdleWindow.cancelIdleCallback?.(id);
  }

  const id = globalThis.setTimeout(task, timeout);
  return () => globalThis.clearTimeout(id);
}

function addPreconnectHint(href: string) {
  if (typeof document === "undefined") return () => {};

  const existing = document.head.querySelector<HTMLLinkElement>(
    `link[rel="preconnect"][href="${href}"]`
  );

  if (existing) return () => {};

  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = href;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);

  return () => {
    link.parentNode?.removeChild(link);
  };
}

/**
 * Prefetches all image-related queries at app startup so data is
 * ready before lazy-loaded sections mount. After fetching URLs,
 * also preloads the actual image binaries into the browser cache.
 * Does NOT resize or compress images.
 */
export function usePrefetchImages() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    try {
      const backendOrigin = new URL(import.meta.env.VITE_SUPABASE_URL).origin;
      cleanups.push(addPreconnectHint(backendOrigin));
    } catch {
      // No-op: skip hint if env URL is unavailable
    }

    // How it works — above the fold on homepage (high priority)
    queryClient.prefetchQuery({
      queryKey: ["how-it-works-images"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("how_it_works_images")
          .select("step_number, image_url");
        if (error) throw error;
        const map: Record<string, string | null> = {};
        data?.forEach((i) => {
          map[i.step_number] = i.image_url;
          if (i.image_url) preloadImageBinary(i.image_url, "high");
        });
        return map;
      },
      staleTime: 1000 * 60 * 10,
    });

    // Vehicle images — commonly seen early in flow (high priority)
    queryClient.prefetchQuery({
      queryKey: ["vehicle-images"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("vehicle_images")
          .select("vehicle_type, experience_level, image_url");
        if (error) throw error;
        const map: Record<string, string> = {};
        data?.forEach((i) => {
          map[`${i.vehicle_type}-${i.experience_level}`] = i.image_url;
          preloadImageBinary(i.image_url, "high");
        });
        return map;
      },
      staleTime: 1000 * 60 * 10,
    });

    // Security images — preload on idle to avoid competing with critical images
    queryClient.prefetchQuery({
      queryKey: ["security-images"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("security_feature_images")
          .select("feature_key, image_url, zoom_level");
        if (error) throw error;
        const map: Record<string, { url: string | null; zoom: number }> = {};
        data?.forEach((i) => {
          map[i.feature_key] = { url: i.image_url, zoom: i.zoom_level };
        });
        cleanups.push(runWhenIdle(() => preloadBatch(data?.map((i) => i.image_url), "low")));
        return map;
      },
      staleTime: 1000 * 60 * 10,
    });

    // Use case images — preload on idle
    queryClient.prefetchQuery({
      queryKey: ["use-case-images"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("use_case_images")
          .select("use_case_key, image_url");
        if (error) throw error;
        const map: Record<string, string | null> = {};
        data?.forEach((i) => {
          map[i.use_case_key] = i.image_url;
        });
        cleanups.push(runWhenIdle(() => preloadBatch(data?.map((i) => i.image_url), "low")));
        return map;
      },
      staleTime: 1000 * 60 * 10,
    });

    // Trust badges — preload on idle
    queryClient.prefetchQuery({
      queryKey: ["trust-badges"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("trust_badges")
          .select("*")
          .order("display_order", { ascending: true });
        if (error) throw error;
        cleanups.push(runWhenIdle(() => preloadBatch(data?.map((b) => b.image_url), "low")));
        return data;
      },
      staleTime: 1000 * 60 * 10,
    });

    // Gallery carousel — lowest priority
    queryClient.prefetchQuery({
      queryKey: ["gallery-carousel-images"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("gallery_carousel_images")
          .select("id, image_url, display_order")
          .order("display_order", { ascending: true });
        if (error) throw error;
        cleanups.push(runWhenIdle(() => preloadBatch(data?.slice(0, 3).map((i) => i.image_url), "low"), 2200));
        return data;
      },
      staleTime: 1000 * 60 * 10,
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [queryClient]);
}

