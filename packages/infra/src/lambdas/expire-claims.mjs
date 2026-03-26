import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { notifyScrappee, getUserEmail, sendEmail } from "./email.mjs";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.LISTINGS_TABLE;
const STATUS_INDEX = process.env.STATUS_INDEX;
const APP_URL = process.env.APP_URL || "https://scrappr.trevor.fail";

const EXPIRY_HOURS = Number(process.env.CLAIM_EXPIRY_HOURS);
const WARNING_HOURS = EXPIRY_HOURS * 0.75;

export const handler = async () => {
  const now = new Date();
  const expiryThreshold = new Date(now.getTime() - EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
  const warningThreshold = new Date(now.getTime() - WARNING_HOURS * 60 * 60 * 1000).toISOString();

  try {
    // Query all claimed listings
    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: STATUS_INDEX,
        KeyConditionExpression: "#status = :claimed",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":claimed": "claimed" },
      })
    );

    const claimedListings = result.Items || [];
    let expired = 0;
    let warned = 0;

    for (const listing of claimedListings) {
      if (!listing.claimedAt) continue;

      if (listing.claimedAt < expiryThreshold) {
        // Expired — revert to available
        try {
          await ddb.send(
            new UpdateCommand({
              TableName: TABLE,
              Key: { userId: listing.userId, listingId: listing.listingId },
              UpdateExpression: "SET #status = :available REMOVE claimedBy, claimedAt",
              ExpressionAttributeNames: { "#status": "status" },
              ExpressionAttributeValues: {
                ":available": "available",
                ":claimed": "claimed",
              },
              ConditionExpression: "#status = :claimed",
            })
          );

          expired++;

          // Notify scrappee
          notifyScrappee({
            ownerUserId: listing.userId,
            subject: "Your listing is available again",
            heading: "Claim expired",
            message: `The hauler who claimed your listing wasn't able to pick it up in time, so it's back on the market. No action needed — other haulers in the area can now see and claim it.`,
            listing,
          });

          // Notify hauler
          if (listing.claimedBy) {
            const haulerEmail = await getUserEmail(listing.claimedBy);
            if (haulerEmail) {
              sendEmail({
                to: haulerEmail,
                subject: "Your claim has expired",
                html: `
                  <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                      <img src="${APP_URL}/scrappy-mascot.png" alt="Scrappy" width="48" height="48" style="border-radius: 50%; margin-bottom: 8px;" />
                      <h1 style="color: #059669; font-size: 24px; margin: 0;">Scrappr</h1>
                    </div>
                    <div style="background: #f9fafb; border-radius: 12px; padding: 24px;">
                      <h2 style="color: #111827; font-size: 18px; margin: 0 0 8px;">Claim expired</h2>
                      <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px;">
                        Your claim on a <strong>${listing.category}</strong> listing has expired because it wasn't picked up within ${EXPIRY_HOURS} hours.
                        The listing is now available for other haulers. You can reclaim it if it's still available.
                      </p>
                      <a href="${APP_URL}/haul" style="display: inline-block; background: #059669; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
                        Browse Listings
                      </a>
                    </div>
                    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
                      Scrappr &mdash; Your scrap. Their hustle. Zero waste.
                    </p>
                  </div>
                `,
              });
            }
          }
        } catch (err) {
          if (err.name !== "ConditionalCheckFailedException") {
            console.error(`Failed to expire listing ${listing.listingId}:`, err);
          }
        }
      } else if (listing.claimedAt < warningThreshold && !listing.expiryWarned) {
        // Warning window — notify hauler their claim is about to expire
        if (listing.claimedBy) {
          const haulerEmail = await getUserEmail(listing.claimedBy);
          if (haulerEmail) {
            const hoursLeft = Math.round(
              (new Date(listing.claimedAt).getTime() + EXPIRY_HOURS * 60 * 60 * 1000 - now.getTime()) / (60 * 60 * 1000)
            );

            sendEmail({
              to: haulerEmail,
              subject: "Your claim expires soon — pick it up!",
              html: `
                <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #059669; font-size: 24px; margin: 0;">Scrappr</h1>
                  </div>
                  <div style="background: #fef3c7; border-radius: 12px; padding: 24px;">
                    <h2 style="color: #92400e; font-size: 18px; margin: 0 0 8px;">Heads up — claim expiring soon</h2>
                    <p style="color: #78350f; font-size: 14px; margin: 0 0 16px;">
                      Your claim on a <strong>${listing.category}</strong> listing expires in about ${hoursLeft} hour${hoursLeft === 1 ? "" : "s"}.
                      If you can't make the pickup, no worries — it'll be released for other haulers. But if you're still planning to grab it, head over now!
                    </p>
                    <a href="${APP_URL}/haul" style="display: inline-block; background: #d97706; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
                      View My Claims
                    </a>
                  </div>
                  <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
                    Scrappr &mdash; Your scrap. Their hustle. Zero waste.
                  </p>
                </div>
              `,
            });

            // Mark as warned so we don't spam
            try {
              await ddb.send(
                new UpdateCommand({
                  TableName: TABLE,
                  Key: { userId: listing.userId, listingId: listing.listingId },
                  UpdateExpression: "SET expiryWarned = :true",
                  ExpressionAttributeValues: { ":true": true },
                })
              );
              warned++;
            } catch {
              // non-critical
            }
          }
        }
      }
    }

    console.log(`Expire claims: ${expired} expired, ${warned} warned, ${claimedListings.length} total claimed`);

    return { expired, warned };
  } catch (err) {
    console.error("expire-claims failed:", err);
    throw err;
  }
};
