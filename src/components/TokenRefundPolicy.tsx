import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

interface TokenRefundPolicyProps {
  variant: "pre_payment" | "post_payment";
}

export default function TokenRefundPolicy({ variant }: TokenRefundPolicyProps) {
  if (variant === "pre_payment") {
    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Token Refund Policy</p>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="space-y-1 text-sm text-emerald-800">
              <p className="font-medium">Fully refundable if:</p>
              <ul className="space-y-0.5 list-disc list-inside text-emerald-700">
                <li>Owner withdraws or property becomes unavailable</li>
                <li>KYC fails due to a platform error on Reeve's end</li>
                <li>Agreement cannot be executed for reasons beyond your control</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-emerald-200 pt-3 text-xs text-emerald-700">
            Refunds are processed within 5–7 business days to the original payment method.
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Non-refundable if you withdraw after paying or KYC fails due to your documents.{" "}
          <Link to="/refund" className="underline underline-offset-2 hover:text-foreground">
            Full refund policy
          </Link>{" "}
          &middot;{" "}
          <Link to="/contact" className="underline underline-offset-2 hover:text-foreground">
            Contact us
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">
        Your token is refundable if the agreement cannot be executed for reasons beyond your control.
      </p>
      <p className="text-xs text-muted-foreground">
        <Link to="/refund" className="underline underline-offset-2 hover:text-foreground">
          View full refund policy
        </Link>
      </p>
    </div>
  );
}
