export interface DemoRestaurant {
  id: string;
  name: string;
  label: string;
  story: string;
  location: string;
  hours: string;
  tagline: string;
  atmosphere: string;
  seatingPrompt: string;
  menuIntro: string;
  featuredItemIds: string[];
  houseNotes: Array<{
    title: string;
    copy: string;
  }>;
  serviceHighlights: Array<{
    title: string;
    copy: string;
  }>;
}

export const demoRestaurant: DemoRestaurant = {
  id: "rest_demo",
  name: "Common House",
  label: "Neighborhood grill and cocktail bar",
  story:
    "A warm corner spot for shared plates, low-light cocktails, and the kind of dinner that turns one round into two without the table ever feeling stuck in checkout mode.",
  location: "Hudson Square, New York",
  hours: "Sun-Thu 5pm-10pm | Fri-Sat 5pm-11pm",
  tagline: "Shared plates, citrus-forward cocktails, and a table tab that stays social.",
  atmosphere: "Come for the room, stay for the second round, and settle up without breaking the table rhythm.",
  seatingPrompt:
    "Already seated? One tap at the table opens the live tab so guests can split the check without slowing dinner down.",
  menuIntro:
    "Start with what's on tonight's menu, then open the live tab once the table is ready to order another round or settle up.",
  featuredItemIds: ["item_burger", "item_pitcher", "item_feta", "item_crudo"],
  houseNotes: [
    {
      title: "Start with the table",
      copy: "Shared starters, a cocktail pitcher, and enough room for the table to settle in."
    },
    {
      title: "Keep the night easy",
      copy: "When the check starts moving around the group, each guest can cover their share without derailing the mood."
    },
    {
      title: "Nothing slips through",
      copy: "Extra sauces, add-ons, and little charges stay visible until somebody actually covers them."
    }
  ],
  serviceHighlights: [
    {
      title: "Start with the menu",
      copy: "Guests can browse the restaurant and the dinner lineup before they ever think about the bill."
    },
    {
      title: "Split without confusion",
      copy: "Guests can cover their own share while the rest of the table still stays clearly open."
    },
    {
      title: "Built for social tabs",
      copy: "Pitchers, shared plates, and add-ons stay readable even once the table starts splitting things up."
    }
  ]
};

export function getDemoRestaurantById(restaurantId: string) {
  return restaurantId === demoRestaurant.id ? demoRestaurant : null;
}
