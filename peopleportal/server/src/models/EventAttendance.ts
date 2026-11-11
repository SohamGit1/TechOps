import { Schema, model } from "mongoose";

export interface IEventAttendance {
    eventId: string;
    userPk: number;
    checkedInAt: Date;
    method: "qr" | "code" | "manual";
}

const eventAttendanceSchema = new Schema<IEventAttendance>(
    {
        eventId: {
            type: String,
            required: true,
        },
        userPk: {
            type: Number,
            required: true,
        },
        checkedInAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
        method: {
            type: String,
            enum: ["qr", "code", "manual"],
            required: true,
        },
    },
    { timestamps: true },
);

// One attendance record per person per event.
eventAttendanceSchema.index(
    { eventId: 1, userPk: 1 },
    { unique: true },
);

export const EventAttendance = model<IEventAttendance>(
    "EventAttendance",
    eventAttendanceSchema,
);