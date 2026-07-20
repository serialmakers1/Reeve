import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  propertyId: string;
}

// B6: owner-side swap for RequestContactPanel. Same outer footprint so the
// PropertyDetail layout stays visually stable when isOwnProperty toggles.
export default function ManageListingCard({ propertyId }: Props) {
  return (
    <Card className="border-border">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-lg font-semibold text-foreground">Manage your listing</p>
          <p className="text-sm text-muted-foreground">
            View applications, manage visits, and update your listing details.
          </p>
        </div>
        <Button asChild size="sm">
          <Link to={`/owner-dashboard/property/${propertyId}`}>Go to dashboard →</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
