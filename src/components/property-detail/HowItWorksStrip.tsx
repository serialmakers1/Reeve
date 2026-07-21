/**
 * P6 how-it-works reassurance strip. Replaces the old "No Contact Policy"
 * static card. 3 numbered steps, brand-primary icons, muted body.
 */
import type { LucideIcon } from "lucide-react";
import { MessageSquarePlus, UserCheck, Phone } from "lucide-react";

interface Step {
  icon: LucideIcon;
  heading: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: MessageSquarePlus,
    heading: "Request Contact",
    body: "Tap the button and send a message to the owner.",
  },
  {
    icon: UserCheck,
    heading: "Owner Decides",
    body: "The owner reviews your profile and responds.",
  },
  {
    icon: Phone,
    heading: "You Connect",
    body: "If approved, you both receive each other's contact details. No charges.",
  },
];

export default function HowItWorksStrip() {
  return (
    <section className="mx-4 rounded-2xl bg-muted/30 px-5 py-4 lg:mx-0">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.heading}>
              <p className="text-xs text-muted-foreground">Step {i + 1}</p>
              <Icon className="mt-1 h-6 w-6 text-primary" />
              <p className="mt-2 text-sm font-semibold text-foreground">{s.heading}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
