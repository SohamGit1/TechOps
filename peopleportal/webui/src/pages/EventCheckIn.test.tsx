import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventCheckIn } from "./EventCheckIn";

const eventId = "a".repeat(24);
const token = "b".repeat(64);
function show(link = `/community/events/${eventId}/check-in?token=${token}`) {
    return render(<MemoryRouter initialEntries={[link]}><Routes>
        <Route path="/community/events/:eventId/check-in" element={<EventCheckIn />} />
    </Routes></MemoryRouter>);
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("event QR check-in", () => {
    it("checks the session and submits the QR token, then shows confirmation", async () => {
        const fetcher = vi.fn()
            .mockResolvedValueOnce(new Response("{}", { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ checkedInAt: "2026-11-12T18:00:00Z" })));
        vi.stubGlobal("fetch", fetcher);
        show();
        expect(await screen.findByText("You're checked in.")).toBeInTheDocument();
        expect(fetcher).toHaveBeenCalledTimes(2);
        expect(fetcher.mock.calls[1][0]).toBe(`/api/events/${eventId}/check-in`);
        expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ token });
    });
    it("preserves the full scanned link through portal login without submitting attendance", async () => {
        const href = `https://portal.example/community/events/${eventId}/check-in?token=${token}`;
        const assign = vi.fn();
        vi.stubGlobal("location", { href, assign });
        const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
        vi.stubGlobal("fetch", fetcher);
        show();
        await waitFor(() => expect(assign).toHaveBeenCalledWith(
            `/api/auth/login?return_to=${encodeURIComponent(href)}`));
        expect(fetcher).toHaveBeenCalledTimes(1);
    });
    it("rejects malformed links without making requests", async () => {
        const fetcher = vi.fn();
        vi.stubGlobal("fetch", fetcher);
        show(`/community/events/${eventId}/check-in?token=bad`);
        expect(await screen.findByRole("alert")).toHaveTextContent("invalid");
        expect(fetcher).not.toHaveBeenCalled();
    });
    it("shows the backend reason when check-in is closed", async () => {
        vi.stubGlobal("fetch", vi.fn()
            .mockResolvedValueOnce(new Response("{}"))
            .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Check-in is closed." }), { status: 409 })));
        show();
        expect(await screen.findByRole("alert")).toHaveTextContent("Check-in is closed.");
        expect(screen.queryByText("You're checked in.")).not.toBeInTheDocument();
    });
});
