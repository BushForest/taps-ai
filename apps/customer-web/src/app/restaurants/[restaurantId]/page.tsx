import { notFound } from "next/navigation";
import { RestaurantHome } from "../../../components/restaurant-home";
import { fetchPublicRestaurantMenu } from "../../../lib/api-client";
import { getDemoRestaurantById } from "../../../lib/demo-restaurant";

export default async function RestaurantPage(props: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await props.params;
  if (!getDemoRestaurantById(restaurantId)) {
    notFound();
  }

  const menu = await fetchPublicRestaurantMenu(restaurantId);
  return <RestaurantHome menu={menu} />;
}
