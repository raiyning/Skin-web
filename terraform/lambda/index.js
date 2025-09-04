// lambda/index.js
// Runtime: Node.js 20.x
// Env vars expected: TABLE_NAME, ALLOWED_ORIGIN, RATE_TABLE (optional for rate limit)


//TODO Cloudflare Turnstile (free) on the form. Send the token to Lambda and verify server-side (simple fetch to Turnstile’s verify API). This blocks most commodity bots without user friction. Keep the honeypot and rate limit anyway.
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// --- Security knobs ---
const THRESHOLD = 5;    // max requests per IP per minute
const MAX_BODY  = 1024; // max raw body size in bytes

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const TABLE_NAME     = process.env.TABLE_NAME;
const RATE_TABLE     = process.env.RATE_TABLE; // if not set, rate limiting is skipped

// Build a consistent response with CORS
const respond = (status, body = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" }, // <-- no CORS here
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  // 1) Method allow-list (Function URL handles OPTIONS preflight externally)
  const method = event?.requestContext?.http?.method || "GET";
  if (method !== "POST") return respond(405, { error: "Method not allowed" });

  // 2) Content-Type & body size limits
  const contentType = (event.headers?.["content-type"] || event.headers?.["Content-Type"] || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    return respond(415, { error: "Unsupported Media Type" });
  }
  // Size check (handles base64 bodies too)
  const raw = event.body || "";
  const rawSize = event.isBase64Encoded ? Buffer.byteLength(raw, "base64") : Buffer.byteLength(raw, "utf8");
  if (rawSize > MAX_BODY) return respond(413, { error: "Payload too large" });

  // 3) Optional extra origin pin (belt & braces)
  const origin = event.headers?.origin || event.headers?.Origin;
  if (ALLOWED_ORIGIN !== "*" && origin && origin !== ALLOWED_ORIGIN) {
    return respond(403, { error: "Forbidden origin" });
  }

  // 4) Parse body + honeypot
  let email, website;
  try { ({ email, website } = JSON.parse(event.isBase64Encoded ? Buffer.from(raw, "base64").toString("utf8") : raw)); }
  catch { /* fall through to validation below */ }

  // Honeypot: if bots fill this, silently no-op as success
  if (website) return respond(204);

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return respond(400, { error: "Invalid email" });
  }
  email = String(email).trim().toLowerCase();

  // 5) Simple per-IP rate limiting (1-minute buckets)
  if (RATE_TABLE) {
    const ip = event?.requestContext?.http?.sourceIp || "0.0.0.0";
    const minute = Math.floor(Date.now() / 60000);
    const key = `${ip}#${minute}`;
    const ttl = Math.floor(Date.now() / 1000) + 90; // expire shortly after window

    try {
      const up = await ddb.send(new UpdateCommand({
        TableName: RATE_TABLE,
        Key: { key },
        UpdateExpression: "ADD #count :one SET ttl_epoch = :ttl",
        ExpressionAttributeNames: { "#count": "count" },
        ExpressionAttributeValues: { ":one": 1, ":ttl": ttl },
        ReturnValues: "UPDATED_NEW",
      }));
      if ((up.Attributes?.count || 0) > THRESHOLD) {
        return respond(429, { error: "Too many requests" });
      }
    } catch (e) {
      // Fail-open on limiter errors (don’t block legit users if DDB hiccups)
      console.error("RateLimitError", e);
    }
  }

  // 6) Idempotent subscribe (first write wins)
  try {
    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        email,
        created_at: new Date().toISOString(),
        consent: "web-form",
      },
      ConditionExpression: "attribute_not_exists(email)",
    }));
  } catch (e) {
    if (e.name !== "ConditionalCheckFailedException") {
      console.error("PutError", e);
      return respond(500, { error: "Server error" });
    }
    // already subscribed -> still return 200
  }

  return respond(200, { ok: true });
};
