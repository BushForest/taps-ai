import { createDbClient, nfcTags, physicalTables, restaurants } from "@taps/db";

const demoRestaurant = {
  id: "rest_demo",
  name: "Taps Demo Restaurant",
  timezone: "America/New_York",
  status: "active",
  posProvider: "memory",
  paymentProvider: "mock",
  loyaltyMode: "optional",
  publicSessionGraceMinutes: 15,
  supportRetentionDays: 30,
  configurationVersion: 1
} as const;

const demoTable = {
  id: "table_12",
  restaurantId: demoRestaurant.id,
  tableCode: "12",
  displayName: "Table 12",
  serviceArea: "Main Dining"
} as const;

const demoTag = {
  id: "tag_table_12",
  restaurantId: demoRestaurant.id,
  tableId: demoTable.id,
  tagCode: "demo-table-12",
  status: "active"
} as const;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to seed the demo restaurant.");
  }

  const db = createDbClient(databaseUrl);

  await db
    .insert(restaurants)
    .values({
      ...demoRestaurant
    })
    .onConflictDoUpdate({
      target: restaurants.id,
      set: {
        name: demoRestaurant.name,
        timezone: demoRestaurant.timezone,
        status: demoRestaurant.status,
        posProvider: demoRestaurant.posProvider,
        paymentProvider: demoRestaurant.paymentProvider,
        loyaltyMode: demoRestaurant.loyaltyMode,
        publicSessionGraceMinutes: demoRestaurant.publicSessionGraceMinutes,
        supportRetentionDays: demoRestaurant.supportRetentionDays,
        configurationVersion: demoRestaurant.configurationVersion,
        updatedAt: new Date()
      }
    });

  await db
    .insert(physicalTables)
    .values({
      ...demoTable
    })
    .onConflictDoUpdate({
      target: physicalTables.id,
      set: {
        restaurantId: demoTable.restaurantId,
        tableCode: demoTable.tableCode,
        displayName: demoTable.displayName,
        serviceArea: demoTable.serviceArea,
        updatedAt: new Date()
      }
    });

  await db
    .insert(nfcTags)
    .values({
      ...demoTag
    })
    .onConflictDoUpdate({
      target: nfcTags.id,
      set: {
        restaurantId: demoTag.restaurantId,
        tableId: demoTag.tableId,
        tagCode: demoTag.tagCode,
        status: demoTag.status,
        updatedAt: new Date()
      }
    });

  console.log("Seeded demo restaurant, table, and NFC tag for Taps.");
  console.log(`Restaurant: ${demoRestaurant.id}`);
  console.log(`Table: ${demoTable.id} (${demoTable.displayName})`);
  console.log(`Tag: ${demoTag.tagCode}`);
}

void main();
