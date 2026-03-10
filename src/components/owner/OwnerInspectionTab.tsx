import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Phone, CheckCircle2, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const TIME_SLOTS = [
  "9:00 AM – 12:00 PM",
  "12:00 PM – 3:00 PM",
  "3:00 PM – 6:00 PM",
  "6:00 PM – 9:00 PM",
  "Other (specify)",
];

interface Property {
  id: string;
  building_name: string;
  locality: string | null;
}

interface OwnerInspectionTabProps {
  userId: string;
  userPhone: string;
  showCallbackForm: boolean;
  setShowCallbackForm: (v: boolean) => void;
  selectedSlot: string;
  setSelectedSlot: (v: string) => void;
  customSlot: string;
  setCustomSlot: (v: string) => void;
  submitting: boolean;
  callbackSubmitted: boolean;
  existingSlot: string;
  handleCallbackSubmit: () => void;
}

export default function OwnerInspectionTab({
  userId,
  userPhone,
  showCallbackForm,
  setShowCallbackForm,
  selectedSlot,
  setSelectedSlot,
  customSlot,
  setCustomSlot,
  submitting,
  callbackSubmitted,
  existingSlot,
  handleCallbackSubmit,
}: OwnerInspectionTabProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [loadingProps, setLoadingProps] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, building_name, locality")
        .eq("owner_id", userId);
      if (data) setProperties(data);
      setLoadingProps(false);
    })();
  }, [userId]);

  const selectedProp = properties.find((p) => p.id === selectedPropertyId);

  const whatsappUrl = selectedProp
    ? `https://wa.me/917899874281?text=Hi%2C%20I%27d%20like%20to%20schedule%20an%20inspection%20for%20my%20property%20at%20${encodeURIComponent(selectedProp.building_name)}%2C%20${encodeURIComponent(selectedProp.locality || "")}`
    : "";

  const displaySlot = existingSlot
    ? existingSlot
    : selectedSlot === "Other (specify)" && customSlot.trim()
      ? customSlot.trim()
      : selectedSlot;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Initiate Property Inspection for Listing
        </h2>
      </div>

      {/* Property selector */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Select Property</label>
        {loadingProps ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading properties…</span>
          </div>
        ) : properties.length === 0 ? (
          <p className="text-sm text-muted-foreground">No properties found.</p>
        ) : (
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Choose a property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.building_name}{p.locality ? `, ${p.locality}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* WhatsApp Card */}
        <Card className="border-2" style={{ borderColor: "#25D366" }}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" style={{ color: "#25D366" }} />
              <CardTitle className="text-base">Chat with Us on WhatsApp</CardTitle>
            </div>
            <CardDescription className="text-sm">
              Prefer to talk it through? Message us directly and our team will guide you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedPropertyId ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="w-full inline-block">
                    <Button
                      variant="outline"
                      className="w-full min-h-[44px] font-medium pointer-events-none opacity-50"
                      style={{ borderColor: "#25D366", color: "#25D366" }}
                    >
                      Open WhatsApp
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Please select a property first</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="outline"
                className="w-full min-h-[44px] font-medium"
                style={{ borderColor: "#25D366", color: "#25D366" }}
                onClick={() => window.open(whatsappUrl, "_blank")}
              >
                Open WhatsApp
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Callback Card */}
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              <CardTitle className="text-base text-primary-foreground">Request a Callback</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {!showCallbackForm && !callbackSubmitted && (
              <Button
                variant="secondary"
                className="w-full min-h-[44px]"
                onClick={() => setShowCallbackForm(true)}
              >
                Schedule a Callback
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expanded callback form */}
      {showCallbackForm && !callbackSubmitted && (
        <Card className="animate-in fade-in slide-in-from-top-2 duration-300">
          <CardContent className="pt-6 space-y-4">
            <label className="text-sm font-medium text-card-foreground">
              Preferred Callback Time <span className="text-destructive">*</span>
            </label>

            <div className="flex flex-wrap gap-2">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors min-h-[44px] ${
                    selectedSlot === slot
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-accent"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>

            {selectedSlot === "Other (specify)" && (
              <Input
                type="text"
                placeholder="Enter your preferred time"
                value={customSlot}
                onChange={(e) => setCustomSlot(e.target.value)}
                className="min-h-[44px]"
              />
            )}

            <p className="text-xs text-muted-foreground">
              We only call when you request it. No spam calls.
            </p>

            <Button
              onClick={handleCallbackSubmit}
              disabled={
                !selectedSlot ||
                submitting ||
                (selectedSlot === "Other (specify)" && !customSlot.trim())
              }
              className="w-full min-h-[44px]"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Callback Request
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Callback success state */}
      {callbackSubmitted && (
        <Card className="animate-in fade-in duration-300">
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
            <h3 className="text-lg font-bold text-card-foreground">We'll call you soon!</h3>
            <p className="text-sm text-muted-foreground">
              Your callback request has been received. Our team will call you at{" "}
              <span className="font-medium text-card-foreground">{userPhone}</span> between{" "}
              <span className="font-medium text-card-foreground">{displaySlot}</span>.
            </p>
            <p className="text-xs text-muted-foreground">
              In the meantime, feel free to chat with us on WhatsApp.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
