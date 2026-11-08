import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth/account";
import { getTrackList } from "@/lib/tracks/data";
import { parseTrackPage } from "@/lib/tracks/model";
import TracksManager from "@/components/tracks/tracks-manager";

export const dynamic = "force-dynamic";
export default async function TracksPage({ searchParams }: { searchParams: Promise<{ view?: string; page?: string }> }) {
  const account = await getCurrentAccount();
  if (!account) redirect("/login");
  const params = await searchParams;
  const view = params.view === "archived" ? "archived" : "active";
  const requestedPage = parseTrackPage(params.page);
  const data = await getTrackList(account.user.id, view, requestedPage);
  if (data.page !== requestedPage) redirect(`/tracks?view=${view}&page=${data.page}`);
  return <TracksManager account={{ displayName: account.profile.display_name, role: account.role }} data={data} />;
}
