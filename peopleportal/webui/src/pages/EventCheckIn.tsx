import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export function EventCheckIn() {
    const { eventId } = useParams<{ eventId: string }>();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [checkedInAt, setCheckedInAt] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        setCheckedInAt(null);
        setError(null);

        if (
            !eventId ||
            !/^[a-f0-9]{24}$/i.test(eventId) ||
            !token ||
            !/^[a-f0-9]{64}$/.test(token)
        ) {
            setError(
                "This check-in link is invalid. Scan the QR code again or enter the event code on the Events page.",
            );
            return;
        }

        const controller = new AbortController();

        function signIn() {
            // Preserve the event ID and token through portal login.
            const returnTo = encodeURIComponent(window.location.href);

            window.location.assign(
                `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/auth/login?return_to=${returnTo}`,
            );
        }

        async function checkIn() {
            try {
                const session = await fetch(
                    `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/auth/userinfo`,
                    {
                        credentials: "include",
                        redirect: "manual",
                        signal: controller.signal,
                    },
                );

                if (controller.signal.aborted) return;

                // A manual redirect can appear as an opaque response
                // with status 0 in the browser.
                if (
                    session.status === 401 ||
                    session.status === 0 ||
                    session.status === 302
                ) {
                    signIn();
                    return;
                }

                if (!session.ok) {
                    throw new Error(
                        "Unable to verify your portal account. Please try again.",
                    );
                }

                const response = await fetch(
                    `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/events/${encodeURIComponent(eventId!)}/check-in`,
                    {
                        method: "POST",
                        credentials: "include",
                        redirect: "manual",
                        signal: controller.signal,
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ token }),
                    },
                );

                if (controller.signal.aborted) return;

                if (
                    response.status === 401 ||
                    response.status === 0 ||
                    response.status === 302
                ) {
                    signIn();
                    return;
                }

                const body = await response.json().catch(() => null);

                if (!response.ok) {
                    const fallback =
                        response.status === 429
                            ? "Too many attempts. Wait a few minutes before trying again."
                            : response.status === 403
                              ? "Your portal account cannot check in to this event."
                              : response.status === 404
                                ? "This event could not be found."
                                : "Unable to check in. Ask the event organizer for help.";

                    throw new Error(body?.message || fallback);
                }

                if (
                    typeof body?.checkedInAt !== "string" ||
                    Number.isNaN(Date.parse(body.checkedInAt))
                ) {
                    throw new Error(
                        "We could not confirm your check-in. Please try again.",
                    );
                }

                if (!controller.signal.aborted) {
                    setCheckedInAt(body.checkedInAt);
                }
            } catch (error) {
                if (controller.signal.aborted) return;

                setError(
                    error instanceof Error
                        ? error.message
                        : "Unable to connect. Please try again.",
                );
            }
        }

        void checkIn();

        return () => controller.abort();
    }, [eventId, token, attempt]);

    return (
        <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <p className="text-sm text-muted-foreground">
                        Event attendance
                    </p>

                    <CardTitle className="text-3xl">
                        {checkedInAt
                            ? "You're checked in."
                            : error
                              ? "Check-in unavailable"
                              : "Checking you in…"}
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                    {checkedInAt ? (
                        <div role="status" className="space-y-3">
                            <p>
                                Your attendance has been recorded.
                                You're all set.
                            </p>

                            <p className="text-sm text-muted-foreground">
                                Checked in{" "}
                                <time dateTime={checkedInAt}>
                                    {new Date(checkedInAt).toLocaleString()}
                                </time>
                            </p>
                        </div>
                    ) : error ? (
                        <div className="space-y-4">
                            <p role="alert">{error}</p>

                            <Button
                                onClick={() =>
                                    setAttempt((current) => current + 1)
                                }
                            >
                                Try again
                            </Button>
                        </div>
                    ) : (
                        <p role="status" className="text-muted-foreground">
                            Sign in with your portal account if prompted.
                            Your attendance will be recorded automatically.
                        </p>
                    )}

                    <Button asChild variant="outline" className="w-full">
                        <Link to="/community/events">
                            Back to events
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
}