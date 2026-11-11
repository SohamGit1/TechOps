import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

interface Credentials {
    token: string;
    code: string;
    closed: boolean;
}

export function EventCheckInDisplay() {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();

    const [credentials, setCredentials] =
        useState<Credentials | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    useEffect(() => {
        if (!eventId) return;

        const controller = new AbortController();

        async function load() {
            try {
                const response = await fetch(
                    `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/events/${encodeURIComponent(eventId!)}/check-in/credentials`,
                    {
                        credentials: "include",
                        signal: controller.signal,
                    },
                );

                const body = await response.json().catch(() => null);

                if (!response.ok) {
                    throw new Error(
                        body?.message ?? "Unable to load check-in codes.",
                    );
                }

                setCredentials(body);
            } catch (error) {
                if (controller.signal.aborted) return;

                setError(
                    error instanceof Error
                        ? error.message
                        : "Unable to connect.",
                );
            }
        }

        void load();
        return () => controller.abort();
    }, [eventId]);

    async function toggleClosed() {
        if (!credentials || !eventId || pending) return;

        setPending(true);
        setError(null);

        try {
            const response = await fetch(
                `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/events/${encodeURIComponent(eventId)}/check-in`,
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        closed: !credentials.closed,
                    }),
                },
            );

            const body = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    body?.message ?? "Unable to update check-in.",
                );
            }

            setCredentials((current) =>
                current
                    ? { ...current, closed: body.closed }
                    : current,
            );
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Unable to connect.",
            );
        } finally {
            setPending(false);
        }
    }

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            <Button
                variant="outline"
                className="self-start"
                onClick={() => navigate("/community/events")}
            >
                Back to events
            </Button>

            <h1 className="text-3xl font-bold">Event check-in</h1>

            {error && (
                <p role="alert" className="text-destructive">
                    {error}
                </p>
            )}

            {!credentials && !error && (
                <p role="status">Loading check-in details…</p>
            )}

            {credentials && (
                <Card>
                    <CardHeader>
                        <CardTitle>Event code</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-6 text-center">
                        <p className="font-mono text-5xl font-bold tracking-widest">
                            {credentials.code}
                        </p>

                        <p className="text-sm text-muted-foreground">
                            Attendees can enter this code using Check in
                            on the Events page during the event.
                        </p>

                        <p className="text-sm">
                            {credentials.closed
                                ? "Check-in is manually closed."
                                : "Check-in is enabled during the scheduled event time."}
                        </p>

                        <Button
                            variant="outline"
                            disabled={pending}
                            onClick={() => void toggleClosed()}
                        >
                            {pending
                                ? "Saving…"
                                : credentials.closed
                                  ? "Reopen check-in"
                                  : "Close check-in"}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}