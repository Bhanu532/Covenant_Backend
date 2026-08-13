import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { Interest } from "../models/Interest";
import { Notification } from "../models/Notification";
import { authenticateSocketToken } from "../socket";
import { getJwtSecret } from "../config/auth";

const secret = getJwtSecret();
const userId = "507f1f77bcf86cd799439011";

assert.throws(() => authenticateSocketToken(undefined), /Unauthorized/);
assert.throws(() => authenticateSocketToken("invalid-token"), /Unauthorized/);
assert.equal(
  authenticateSocketToken(jwt.sign({ userId }, secret, { expiresIn: "1m" })),
  userId,
);

const interestUnique = Interest.schema
  .indexes()
  .some(
    ([keys, options]) =>
      keys.from_user === 1 && keys.to_user === 1 && options.unique === true,
  );
assert.equal(
  interestUnique,
  true,
  "interests must enforce one sender/recipient row",
);

const notificationUnique = Notification.schema
  .indexes()
  .some(
    ([keys, options]) =>
      keys.recipient === 1 &&
      keys.type === 1 &&
      keys.interest === 1 &&
      options.unique === true,
  );
assert.equal(
  notificationUnique,
  true,
  "notifications must enforce exactly one event per recipient/type/interest",
);

console.log("Notification auth and exactly-once invariants passed.");
