import { redirect } from "next/navigation";
import { getCosmetics, getStudyRewards } from "@/lib/cosmetics/data";
import { parseTrackPage } from "@/lib/tracks/model";
import CosmeticsStudio from "@/components/cosmetics/cosmetics-studio";
export const metadata = { title: "Decorations · FocusExam" };
export default async function CosmeticsPage({ searchParams }: { searchParams: Promise<{ rewardPage?: string }> }) {
  const { ownerId, data } = await getCosmetics();
  if (!ownerId) redirect("/login?next=/cosmetics");
  const params = await searchParams;
  const rewards = await getStudyRewards(Math.min(100000, parseTrackPage(params.rewardPage)));
  return <CosmeticsStudio ownerId={ownerId} initial={data} rewards={rewards} />;
}
