import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

interface TokenRefundPolicyProps {
  variant: "pre_payment" | "post_payment";
}

export default function TokenRefundPolicy({ variant }: TokenRefundPolicyProps) {
  if (variant === "pre_payment") {
    return (
      <div className="space-y-3">

        {/* EDIT 1 — Hero line (new) */}
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">
            Your ₹5,000 confirms your spot and goes toward your first month's rent.
          </p>
          <p className="text-sm text-muted-foreground">
            Think of it as paying the first ₹5,000 of rent today, not a separate fee.
          </p>
        </div>

        {/* Label — kept, but "Token Refund Policy" heading removed */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="space-y-1 text-sm text-emerald-800">
              <p className="font-medium">Fully refundable if:</p>
              {/* EDIT — bullets replaced with approved copy */}
              <ul className="space-y-0.5 list-disc list-inside text-emerald-700">
                <li>The owner withdraws or changes their mind after your payment</li>
                <li>The property becomes unavailable for reasons outside your control</li>
                <li>Reeve is unable to proceed with the lease for reasons not caused by you</li>
              </ul>
            </div>
          </div>
          {/* EDIT 2 — footer updated: 7 days + "We initiate automatically" */}
          <div className="border-t border-emerald-200 pt-3 text-xs text-emerald-700">
            Refunds are processed within 7 business days to your original payment method.
            We initiate them automatically — no forms, no follow-ups from your side.
          </div>
        </div>

        {/* EDIT 3 — non-refundable block replaced with proper structured block */}
        <div className="space-y-2 rounded-lg bg-muted/40 p-4">
          <p className="text-sm font-medium text-foreground">Not refundable if:</p>
          <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
            <li>You decide not to proceed after KYC or agreement stage</li>
            <li>You provide incorrect information that causes the application to fail</li>
          </ul>
          <p className="text-xs text-muted-foreground pt-1">
            In these cases, the ₹5,000 covers the verification and paperwork already
            completed on your behalf.
          </p>
        </div>

        {/* Links — stacked, not inline */}
        <div className="space-y-1">
          <Link
            to="/refund"
            className="block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground py-2"
          >
            Read the full refund policy →
          </Link>
          <Link
            to="/contact"
            className="block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground py-2"
          >
            Have doubts before paying? Talk to us →
          </Link>
        </div>

      </div>
    );
  }

  // post_payment variant — updated with approved copy
  return (
    <div className="space-y-2">
      <p className="text-sm text-foreground">
        Your ₹5,000 is credited toward your first month's rent.
      </p>
      <p className="text-sm text-muted-foreground">
        Still protected: full refund if the owner withdraws or the property becomes unavailable.
      </p>
      <Link
        to="/refund"
        className="block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground py-2"
      >
        Refund policy →
      </Link>
    </div>
  );
}
