import { fetchGuestSummary, fetchCheck, fetchPublicRestaurantMenu } from "../../../lib/api-client";
import { SessionTabsPage } from "../../../components/session-tabs";

export default async function SessionHomePage(props: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: publicToken } = await props.params;
  const [summary, checkResponse, menu] = await Promise.all([
    fetchGuestSummary(publicToken),
    fetchCheck(publicToken).catch(() => null),
    fetchPublicRestaurantMenu("rest_demo").catch(() => null),
  ]);
  return <SessionTabsPage publicToken={publicToken} summary={summary} checkResponse={checkResponse} menu={menu} />;
}
