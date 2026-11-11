/**
  People Portal Server
  Copyright (C) 2026  Atheesh Thirumalairajan

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Document, Schema, model } from "mongoose";

export enum RsvpStatus {
    ACCEPT = "Accept",
    DECLINE = "Decline",
    CANCEL = "Cancel",
}

export interface IRsvp extends Document {
    eventId: string; // Event id of corresponding event.
    status: RsvpStatus;
    email: string;
}

const rsvpSchema = new Schema<IRsvp>(
    {
        eventId: {
            type: String,
            required: true,
            lowercase: true,
        },
        status: {
            type: String,
            enum: Object.values(RsvpStatus),
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
    },
    { timestamps: true },
);

// One RSVP per person per event. Also serves "all RSVPs for this event"
// lookups, since eventId is the first field.
rsvpSchema.index({ eventId: 1, email: 1 }, { unique: true });

// Lets the server count an event's RSVPs by status straight from the index.
rsvpSchema.index({ eventId: 1, status: 1 });

export const EventRsvp = model<IRsvp>("RSVP", rsvpSchema);

/**
 * Records a person's RSVP and returns the status that was saved.
 *
 * Each write is a single upsert, so a double-click or retried request
 * updates the same record instead of creating a second one. Declining
 * after accepting is saved as Cancel.
 */
export async function saveRsvp(
    eventId: string,
    email: string,
    accept: boolean,
): Promise<RsvpStatus> {
    eventId = eventId.toLowerCase();
    const upsert = { upsert: true, runValidators: true };

    if (accept) {
        await EventRsvp.updateOne(
            { eventId, email },
            { $set: { status: RsvpStatus.ACCEPT } },
            upsert,
        );
        return RsvpStatus.ACCEPT;
    }

    // Only an RSVP that is currently Accept becomes Cancel.
    const cancelled = await EventRsvp.updateOne(
        { eventId, email, status: RsvpStatus.ACCEPT },
        { $set: { status: RsvpStatus.CANCEL } },
    );
    if (cancelled.modifiedCount > 0) return RsvpStatus.CANCEL;

    await EventRsvp.updateOne(
        { eventId, email },
        { $set: { status: RsvpStatus.DECLINE } },
        upsert,
    );
    return RsvpStatus.DECLINE;
}
