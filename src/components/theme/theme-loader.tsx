"use client";

import { useEffect } from "react";
import { applyTheme, applyWorkspaceFontSize, fetchOrgThemeSettings, readStoredWorkspaceFontSize } from "@/lib/theme";
import { useOrg } from "@/components/org/org-provider";

export function ThemeLoader() {
  const { activeOrgId } = useOrg();

  useEffect(() => {
    applyWorkspaceFontSize(readStoredWorkspaceFontSize());

    const syncWorkspaceFontSize = (event: Event) => {
      const nextSize = (event as CustomEvent<string>).detail;
      if (nextSize === "small" || nextSize === "medium" || nextSize === "large") {
        applyWorkspaceFontSize(nextSize);
        return;
      }

      applyWorkspaceFontSize(readStoredWorkspaceFontSize());
    };

    window.addEventListener("pv:workspace-font-size", syncWorkspaceFontSize);
    return () => {
      window.removeEventListener("pv:workspace-font-size", syncWorkspaceFontSize);
    };
  }, []);

  useEffect(() => {
    async function loadTheme() {
      if (!activeOrgId) return;

      try {
        const theme = await fetchOrgThemeSettings(activeOrgId);
        applyTheme(theme);
      } catch (error) {
        console.error("Failed to load org theme settings", error);
      }
    }

    loadTheme();
  }, [activeOrgId]);

  return null;
}
