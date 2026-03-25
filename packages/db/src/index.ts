export * from "./client";
export * from "./schema/core";
export * as schema from "./schema/core";
// Re-export drizzle operators so consumers share the same drizzle-orm instance as the schema
export { and, asc, desc, eq, gt, gte, inArray, isNull, lt, lte, ne, notInArray, or, sql } from "drizzle-orm";
