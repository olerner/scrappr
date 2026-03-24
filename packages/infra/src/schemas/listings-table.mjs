/**
 * Single source of truth for the listings table schema.
 * Imported by both the CDK stack and the local dev setup script.
 */
export const listingsTable = {
  partitionKey: { name: "userId", type: "S" },
  sortKey: { name: "listingId", type: "S" },
};
