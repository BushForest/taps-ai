import { notFound } from "next/navigation";
import { RestaurantHome } from "../components/restaurant-home";
import { fetchPublicRestaurantMenu } from "../lib/api-client";
import { demoRestaurant } from "../lib/demo-restaurant";

export default async function HomePage() {
  try {
    const menu = await fetchPublicRestaurantMenu(demoRestaurant.id);
    return <RestaurantHome menu={menu} />;
  } catch {
    notFound();
  }
}
