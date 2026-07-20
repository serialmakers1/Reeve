import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  state: "logged_out" | "needs_phone" | "needs_email" | "needs_both";
}

export default function CommentGateCard({ state }: Props) {
  if (state === "logged_out") {
    return (
      <Card className="border-border">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Join the conversation</p>
            <p className="text-sm text-muted-foreground">Log in to comment, reply, and like.</p>
          </div>
          <Button asChild size="sm">
            <Link to="/login">Log In</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const missing =
    state === "needs_both" ? "phone and email" :
    state === "needs_phone" ? "phone" : "email";

  return (
    <Card className="border-border">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          To keep comments trustworthy, only verified members can post. Verify your {missing} to comment, reply, and like.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link to="/profile">Complete Verification</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
