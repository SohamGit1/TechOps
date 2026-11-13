import { QRCodeSVG } from "qrcode.react";
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
    const checkInUrl =
    credentials && eventId
        ? new URL(
              `/community/events/${encodeURIComponent(eventId)}/check-in?token=${encodeURIComponent(credentials.token)}`,
              window.location.origin,
          ).href
        : null;

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
                        <CardTitle>Scan to check in</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-6 text-center">
                        <div className="mx-auto w-fit max-w-full rounded-xl bg-white p-4">
                            <QRCodeSVG
                                value={checkInUrl!}
                                size={256}
                                marginSize={4}
                                title="Scan to check in to this event"
                                className="h-auto max-w-full"
                            />
                        </div>

                        {import.meta.env.DEV && checkInUrl && (
                            <div className="space-y-3 rounded-lg border p-4 text-left">
                                <p className="text-sm font-medium">
                                    Local QR debugging
                                </p>

                                <p className="text-sm text-muted-foreground">
                                    This opens the exact link encoded in
                                    the QR code. Opening it records
                                    attendance for the signed-in account.
                                </p>

                                <Button asChild variant="outline">
                                    <a
                                        href={checkInUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Open check-in link
                                    </a>
                                </Button>

                                <input
                                    aria-label="Check-in test URL"
                                    readOnly
                                    value={checkInUrl}
                                    onFocus={(event) =>
                                        event.currentTarget.select()
                                    }
                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                />
                            </div>
                        )}

                        <p className="text-sm text-muted-foreground">
                            Scan with your phone and sign in with your
                            portal account.
                        </p>

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