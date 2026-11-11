/**
 * Saving an RSVP must never create a second record for the same person and
 * event. It used to look up the RSVP and then create one if none was found,
 * so a double-click could slip two creates in between and inflate the counts.
 */
const assert = require("node:assert/strict");
const test = require("node:test");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const {
  EventRsvp,
  RsvpStatus,
  saveRsvp,
} = require("../../dist/models/EventRsvp.js");

const EVENT_ID = "6650f0c2a1b2c3d4e5f60718";
const EMAIL = "member@example.invalid";

let mongo;

test.before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri("people-portal-test"));
  await EventRsvp.syncIndexes();
});

test.after(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test.beforeEach(async () => {
  await EventRsvp.deleteMany({});
});

test("many simultaneous RSVPs from one person leave a single record", async () => {
  await Promise.all(
    Array.from({ length: 20 }, () => saveRsvp(EVENT_ID, EMAIL, true)),
  );

  const rows = await EventRsvp.find({ eventId: EVENT_ID, email: EMAIL });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, RsvpStatus.ACCEPT);
});

test("the database itself rejects a duplicate RSVP", async () => {
  await EventRsvp.create({ eventId: EVENT_ID, email: EMAIL, status: RsvpStatus.ACCEPT });

  await assert.rejects(
    EventRsvp.create({ eventId: EVENT_ID, email: EMAIL, status: RsvpStatus.DECLINE }),
    (err) => err.code === 11000,
  );
});

test("status changes keep the existing Accept / Decline / Cancel rules", async () => {
  assert.equal(await saveRsvp(EVENT_ID, EMAIL, false), RsvpStatus.DECLINE);
  assert.equal(await saveRsvp(EVENT_ID, EMAIL, true), RsvpStatus.ACCEPT);
  assert.equal(await saveRsvp(EVENT_ID, EMAIL, false), RsvpStatus.CANCEL);
  // Declining again after cancelling is a plain Decline, as before.
  assert.equal(await saveRsvp(EVENT_ID, EMAIL, false), RsvpStatus.DECLINE);

  assert.equal(await EventRsvp.countDocuments({ eventId: EVENT_ID }), 1);
});

test("different people and different events each get their own record", async () => {
  await saveRsvp(EVENT_ID, EMAIL, true);
  await saveRsvp(EVENT_ID, "other@example.invalid", true);
  await saveRsvp("6650f0c2a1b2c3d4e5f60719", EMAIL, true);

  assert.equal(await EventRsvp.countDocuments({}), 3);
});
