import { randomBytes, randomInt } from "node:crypto";
import { Schema, model } from "mongoose";

interface IEventCheckIn {
    eventId: string;
    token: string;
    code: string;
    closed: boolean;
}

const eventCheckInSchema = new Schema<IEventCheckIn>({
    eventId: {
        type: String,
        required: true,
        unique: true,
    },
    token: {
        type: String,
        required: true,
        default: () => randomBytes(32).toString("hex"),
    },
    code: {
        type: String,
        required: true,
        default: () =>
            randomInt(0, 1_000_000).toString().padStart(6, "0"),
    },
    closed: {
        type: Boolean,
        required: true,
        default: false,
    },
});

export const EventCheckIn = model<IEventCheckIn>(
    "EventCheckIn",
    eventCheckInSchema,
);

// Persistent attempt limiting, shared across server instances.
interface ICheckInAttempt {
    _id: string;
    count: number;
    expiresAt: Date;
}

const attemptSchema = new Schema<ICheckInAttempt>({
    _id: { type: String, required: true },
    count: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
});

attemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const EventCheckInAttempt = model<ICheckInAttempt>(
    "EventCheckInAttempt",
    attemptSchema,
);