"use client";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { defaultAppearance, type Appearance } from "@/lib/cosmetics/model";

const CosmeticsContext = createContext<{ ownerId: string | null; appearance: Appearance; owned: string[] }>({ ownerId: null, appearance: defaultAppearance, owned: [] });
export const useCosmetics = () => useContext(CosmeticsContext);
export default function CosmeticsProvider({ ownerId, appearance, owned, children }: { ownerId: string | null; appearance: Appearance; owned: string[]; children: ReactNode }) {
  useEffect(() => { document.documentElement.dataset.spaceTheme = appearance.site_theme; }, [appearance.site_theme]);
  return <CosmeticsContext.Provider value={{ ownerId, appearance, owned }}>{children}</CosmeticsContext.Provider>;
}
