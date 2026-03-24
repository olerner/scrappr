import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
} from "@aws-sdk/client-dynamodb";
import { listingsTable } from "../infra/src/schemas/listings-table.mjs";

const client = new DynamoDBClient({
  endpoint: "http://localhost:8000",
  region: "us-east-1",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});

const TABLE = "scrappr-listings-local";

try {
  await client.send(new DescribeTableCommand({ TableName: TABLE }));
  console.log(`Table "${TABLE}" already exists.`);
} catch (err) {
  if (err.name === "ResourceNotFoundException") {
    await client.send(
      new CreateTableCommand({
        TableName: TABLE,
        KeySchema: [
          { AttributeName: listingsTable.partitionKey.name, KeyType: "HASH" },
          { AttributeName: listingsTable.sortKey.name, KeyType: "RANGE" },
        ],
        AttributeDefinitions: [
          {
            AttributeName: listingsTable.partitionKey.name,
            AttributeType: listingsTable.partitionKey.type,
          },
          {
            AttributeName: listingsTable.sortKey.name,
            AttributeType: listingsTable.sortKey.type,
          },
        ],
        BillingMode: "PAY_PER_REQUEST",
      }),
    );
    console.log(`Table "${TABLE}" created.`);
  } else {
    throw err;
  }
}
