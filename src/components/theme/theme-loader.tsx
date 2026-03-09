"use client";

import { useEffect } from "react";
import { applyTheme, fetchOrgThemeSettings } from "@/lib/theme";
import { useOrg } from "@/components/org/org-provider";

export function ThemeLoader() {
  const { activeOrgId } = useOrg();

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
