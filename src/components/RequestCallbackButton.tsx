import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import RequestCallbackModal from "./RequestCallbackModal";

// ─── Props ────────────────────────────────────────────────────────────────────

interface RequestCallbackButtonProps {
  context?: "general" | "property" | "owner_landing" | "tenant_search";
  propertyId?: string;
  defaultIntent?: "owner" | "tenant";
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const RequestCallbackButton: React.FC<RequestCallbackButtonProps> = ({
  context = "general",
  propertyId,
  defaultIntent,
  className,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = async () => {
    setChecking(true);
    try {
      // Step 1: require auth
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate(
          `/login?returnTo=${encodeURIComponent(window.location.pathname)}`
        );
        return;
      }

      // Step 2: check for an existing active callback request
      const { data: existing } = await (supabase as any)
        .from("callback_requests")
        .select("id")
        .eq("user_id", session.user.id)
        .in("status", ["pending", "called"])
        .limit(1)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Callback already scheduled",
          description:
            "You already have a callback scheduled. We'll be in touch soon.",
        });
        return;
      }

      // Step 3: open modal
      setModalOpen(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={checking}
        className={`min-h-[44px] gap-2 ${className ?? ""}`}
      >
        {checking ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Phone className="h-4 w-4" />
        )}
        Request a Callback
      </Button>

      <RequestCallbackModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        propertyId={propertyId}
        defaultIntent={defaultIntent}
        context={context}
      />
    </>
  );
};

export default RequestCallbackButton;
