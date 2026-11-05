import { useEffect } from "react";

type PreloadRel = "preload" | "prefetch";

interface UsePreloadImagesOptions {
  /**
   * "preload" = high priority (best for a small number of near-term images)
   * "prefetch" = low priority (best for later / below-the-fold)
   */
  rel?: PreloadRel;
  /** Storage/object URLs usually require anonymous CORS for best caching behavior */
  crossOrigin?: "anonymous" | "use-credentials" | "";
}

/**
 * Preloads a small set of image URLs by injecting <link rel="preload" as="image">.
 * Keep the list small to avoid competing with JS/CSS on initial load.
 */
export function usePreloadImages(urls: string[], options: UsePreloadImagesOptions = {}) {
  const { rel = "preload", crossOrigin = "anonymous" } = options;

  useEffect(() => {
    const unique = Array.from(new Set(urls)).filter(
      (u): u is string => typeof u === "string" && u.length > 0
    );

    if (unique.length === 0) return;

    const links: HTMLLinkElement[] = [];

    for (const href of unique) {
      const link = document.createElement("link");
      link.rel = rel;
      if (rel === "preload") link.as = "image";
      link.href = href;
      if (crossOrigin !== undefined) link.crossOrigin = crossOrigin;

      document.head.appendChild(link);
      links.push(link);
    }

    return () => {
      for (const link of links) link.parentNode?.removeChild(link);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rel, crossOrigin, urls.join("|")]);
}
