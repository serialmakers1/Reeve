import { useRequireAuth } from "@/hooks/useRequireAuth";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MyPropertyDetail() {
  const { loading } = useRequireAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 min-h-[44px]"
          onClick={() => navigate("/my-properties")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to My Properties
        </Button>
        <p className="text-muted-foreground">Property details coming soon.</p>
      </div>
    </Layout>
  );
}
