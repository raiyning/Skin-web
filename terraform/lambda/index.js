// lambda/index.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const ok = (status, body = {}) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
  },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  let email;
  try { ({ email } = JSON.parse(event.body || "{}")); } catch {}
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return ok(400, { error: "Invalid email" });

  try {
    await ddb.send(new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        email: email.toLowerCase(),
        created_at: new Date().toISOString(),
        consent: "web-form",
      },
      ConditionExpression: "attribute_not_exists(email)",
    }));
  } catch (e) {
    if (e.name !== "ConditionalCheckFailedException") {
      console.error(e);
      return ok(500, { error: "Server error" });
    }
  }
  return ok(200, { ok: true });
};
