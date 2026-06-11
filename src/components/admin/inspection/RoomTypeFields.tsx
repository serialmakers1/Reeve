/**
 * RoomTypeFields — Room-type-specific feature fields for the inspection form.
 *
 * One component for all room types. Switch on roomType, render the matching
 * content component. Collapsed by default.
 *
 * All sub-components are defined at MODULE SCOPE (rerender-no-inline-components).
 * rfv/rfSet closures are created inside RoomTypeFields and passed as props.
 *
 * Keys written to room_features JSONB. Electrical detail fields (light_brand,
 * switchboard_brand, wifi_point, wifi_brand) are now in ElectricalSubsection
 * under namespaced keys — NOT rendered here.
 *
 * Balcony fittings (fan_present/light_present/switchboard_present) are
 * presence-based booleans distinct from the count-based electrical inventory.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ROOM_CONDITION_OPTIONS, GLASS_CONDITION_OPTIONS } from "@/types/inspection";

// ── Shared types ──────────────────────────────────────────────────────────────

type RV = (key: string) => string;
type RS = (key: string, value: unknown) => void;

// ── Atomic field helpers (module-level) ───────────────────────────────────────

function SubHeader({ label }: { label: string }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide md:col-span-2">
      {label}
    </p>
  );
}

function SField({
  label,
  featureKey,
  options,
  placeholder = "Select",
  rfv,
  rfSet,
}: {
  label: string;
  featureKey: string;
  options: string[];
  placeholder?: string;
  rfv: RV;
  rfSet: RS;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select
        value={rfv(featureKey) || undefined}
        onValueChange={(v) => rfSet(featureKey, v)}
      >
        <SelectTrigger className="h-9 min-h-[44px]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CondField({
  label,
  featureKey,
  rfv,
  rfSet,
}: {
  label: string;
  featureKey: string;
  rfv: RV;
  rfSet: RS;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select
        value={rfv(featureKey) || undefined}
        onValueChange={(v) => rfSet(featureKey, v)}
      >
        <SelectTrigger className="h-9 min-h-[44px]">
          <SelectValue placeholder="Select condition" />
        </SelectTrigger>
        <SelectContent>
          {ROOM_CONDITION_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function GlassCondField({
  label,
  featureKey,
  rfv,
  rfSet,
}: {
  label: string;
  featureKey: string;
  rfv: RV;
  rfSet: RS;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select
        value={rfv(featureKey) || undefined}
        onValueChange={(v) => rfSet(featureKey, v)}
      >
        <SelectTrigger className="h-9 min-h-[44px]">
          <SelectValue placeholder="Select condition" />
        </SelectTrigger>
        <SelectContent>
          {GLASS_CONDITION_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TField({
  label,
  featureKey,
  placeholder,
  type = "text",
  min,
  rfv,
  rfSet,
}: {
  label: string;
  featureKey: string;
  placeholder?: string;
  type?: "text" | "number";
  min?: number;
  rfv: RV;
  rfSet: RS;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        className="h-9"
        type={type}
        min={min}
        placeholder={placeholder}
        value={rfv(featureKey)}
        onChange={(e) => rfSet(featureKey, e.target.value)}
        onBlur={(e) => rfSet(featureKey, e.target.value)}
      />
    </div>
  );
}

function YNField({
  label,
  featureKey,
  rfv,
  rfSet,
}: {
  label: string;
  featureKey: string;
  rfv: RV;
  rfSet: RS;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select
        value={rfv(featureKey) || undefined}
        onValueChange={(v) => rfSet(featureKey, v)}
      >
        <SelectTrigger className="h-9 min-h-[44px]">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Y">Yes</SelectItem>
          <SelectItem value="N">No</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function TAField({
  label,
  featureKey,
  placeholder,
  rows = 2,
  rfv,
  rfSet,
}: {
  label: string;
  featureKey: string;
  placeholder?: string;
  rows?: number;
  rfv: RV;
  rfSet: RS;
}) {
  return (
    <div className="space-y-1.5 md:col-span-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Textarea
        rows={rows}
        placeholder={placeholder}
        value={rfv(featureKey)}
        onChange={(e) => rfSet(featureKey, e.target.value)}
        onBlur={(e) => rfSet(featureKey, e.target.value)}
      />
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function LockFields({
  prefix,
  label,
  showKeys = true,
  rfv,
  rfSet,
}: {
  prefix: string;
  label: string;
  showKeys?: boolean;
  rfv: RV;
  rfSet: RS;
}) {
  return (
    <>
      <SubHeader label={label} />
      <TField
        label="Lock Brand"
        featureKey={`${prefix}_brand`}
        placeholder="e.g. Godrej, Yale, Dorset"
        rfv={rfv}
        rfSet={rfSet}
      />
      {showKeys && (
        <TField
          label="No. of Keys"
          featureKey={`${prefix}_keys`}
          type="number"
          min={0}
          rfv={rfv}
          rfSet={rfSet}
        />
      )}
    </>
  );
}

function CurtainFieldsHelper({ rfv, rfSet }: { rfv: RV; rfSet: RS }) {
  return (
    <>
      <TField
        label="Curtain Rod Count"
        featureKey="curtain_rod_count"
        type="number"
        rfv={rfv}
        rfSet={rfSet}
      />
      <SField
        label="Curtain Rod Type"
        featureKey="curtain_rod_type"
        options={["Wall-mounted", "Ceiling", "None"]}
        rfv={rfv}
        rfSet={rfSet}
      />
      <YNField label="Curtains Present" featureKey="curtains_present" rfv={rfv} rfSet={rfSet} />
      {rfv("curtains_present") === "Y" && (
        <SField
          label="Curtain Type"
          featureKey="curtain_type"
          options={["Sheer", "Blackout", "Regular", "Blind"]}
          rfv={rfv}
          rfSet={rfSet}
        />
      )}
    </>
  );
}

// ── Room content components (all module-level) ─────────────────────────────

function LivingRoomContent({ rfv, rfSet }: { rfv: RV; rfSet: RS }) {
  return (
    <>
      <CurtainFieldsHelper rfv={rfv} rfSet={rfSet} />
      <YNField label="TV Wall Mount" featureKey="tv_wall_mount" rfv={rfv} rfSet={rfSet} />
      <SField
        label="Pooja Unit / Mandir"
        featureKey="pooja_unit"
        options={["None", "Wall-mounted wooden", "Freestanding unit"]}
        rfv={rfv}
        rfSet={rfSet}
      />
      <LockFields prefix="room_lock" label="Room Lock" rfv={rfv} rfSet={rfSet} />
    </>
  );
}

function BedroomContent({ rfv, rfSet }: { rfv: RV; rfSet: RS }) {
  return (
    <>
      <CurtainFieldsHelper rfv={rfv} rfSet={rfSet} />
      <YNField label="AC Point Present" featureKey="ac_point_present" rfv={rfv} rfSet={rfSet} />
      {rfv("ac_point_present") === "Y" && (
        <>
          <YNField label="AC Unit Mounted" featureKey="ac_mounted" rfv={rfv} rfSet={rfSet} />
          {rfv("ac_mounted") === "Y" && (
            <>
              <TField
                label="AC Brand"
                featureKey="ac_brand"
                placeholder="e.g. Daikin, Voltas, LG"
                rfv={rfv}
                rfSet={rfSet}
              />
              <TAField label="AC Notes" featureKey="ac_notes" rfv={rfv} rfSet={rfSet} />
            </>
          )}
        </>
      )}
      <SField
        label="Wardrobe Type"
        featureKey="wardrobe_type"
        options={["None", "Built-in wood", "Built-in aluminium", "Sliding mirror doors"]}
        rfv={rfv}
        rfSet={rfSet}
      />
      {rfv("wardrobe_type") && rfv("wardrobe_type") !== "None" && (
        <>
          <TField
            label="No. of Shutters"
            featureKey="wardrobe_shutters"
            type="number"
            rfv={rfv}
            rfSet={rfSet}
          />
          <TAField label="Wardrobe Notes" featureKey="wardrobe_notes" rfv={rfv} rfSet={rfSet} />
          <LockFields prefix="cupboard_lock" label="Cupboard / Wardrobe Lock" rfv={rfv} rfSet={rfSet} />
        </>
      )}
      <YNField label="Study Table" featureKey="study_table" rfv={rfv} rfSet={rfSet} />
      <YNField label="Dressing Table / Mirror" featureKey="dressing_table" rfv={rfv} rfSet={rfSet} />
      <LockFields prefix="room_lock" label="Room Lock" rfv={rfv} rfSet={rfSet} />
    </>
  );
}

function KitchenContent({ rfv, rfSet }: { rfv: RV; rfSet: RS }) {
  return (
    <>
      <YNField label="Modular Kitchen" featureKey="modular_kitchen" rfv={rfv} rfSet={rfSet} />
      {rfv("modular_kitchen") === "Y" && (
        <>
          <SField
            label="Material"
            featureKey="modular_material"
            options={["Wood", "PVC", "Aluminium", "Acrylic"]}
            rfv={rfv}
            rfSet={rfSet}
          />
          <CondField label="Shutter Condition" featureKey="modular_shutters" rfv={rfv} rfSet={rfSet} />
          <CondField label="Hinge Condition" featureKey="modular_hinges" rfv={rfv} rfSet={rfSet} />
          <CondField label="Channel/Slide Condition" featureKey="modular_channel_condition" rfv={rfv} rfSet={rfSet} />
          <CondField label="Handle Condition" featureKey="modular_handles" rfv={rfv} rfSet={rfSet} />
          <TAField label="Modular Kitchen Notes" featureKey="modular_notes" rfv={rfv} rfSet={rfSet} />
        </>
      )}
      <SField
        label="Counter / Slab Material"
        featureKey="counter_material"
        options={["Granite", "Marble", "Tile", "Corian"]}
        rfv={rfv}
        rfSet={rfSet}
      />
      <CondField label="Counter Condition" featureKey="counter_condition" rfv={rfv} rfSet={rfSet} />
      <TAField label="Counter Notes" featureKey="counter_notes" rfv={rfv} rfSet={rfSet} />
      <SField
        label="Sink Type"
        featureKey="sink_type"
        options={["Single basin", "Double basin"]}
        rfv={rfv}
        rfSet={rfSet}
      />
      <SField
        label="Sink Material"
        featureKey="sink_material"
        options={["Stainless Steel", "Ceramic"]}
        rfv={rfv}
        rfSet={rfSet}
      />
      <YNField label="Tap Working" featureKey="sink_tap_working" rfv={rfv} rfSet={rfSet} />
      <YNField label="Drainage OK" featureKey="sink_drainage" rfv={rfv} rfSet={rfSet} />
      <YNField label="Loft Storage" featureKey="loft_storage" rfv={rfv} rfSet={rfSet} />
      <SField
        label="Chimney Provision"
        featureKey="chimney_provision"
        options={["None", "Ducted", "Recirculating"]}
        rfv={rfv}
        rfSet={rfSet}
      />
      <SField
        label="Gas Connection Type"
        featureKey="gas_type"
        options={["PNG (Piped)", "LPG Cylinder", "None"]}
        rfv={rfv}
        rfSet={rfSet}
      />
      {rfv("gas_type") === "LPG Cylinder" && (
        <TField
          label="Cylinder Capacity (no. of cylinders)"
          featureKey="gas_cylinder_count"
          type="number"
          min={1}
          rfv={rfv}
          rfSet={rfSet}
        />
      )}
      {rfv("gas_type") === "PNG (Piped)" && (
        <TField
          label="Regulator Location"
          featureKey="gas_regulator_location"
          placeholder="e.g. Near cylinder, Behind counter"
          rfv={rfv}
          rfSet={rfSet}
        />
      )}
      <YNField label="Gas Cylinder Storage" featureKey="gas_cylinder_storage" rfv={rfv} rfSet={rfSet} />
      {rfv("gas_cylinder_storage") === "Y" && (
        <TField
          label="Cylinder Capacity (no. of cylinders)"
          featureKey="gas_cylinder_capacity"
          type="number"
          min={1}
          rfv={rfv}
          rfSet={rfSet}
        />
      )}
      <YNField label="Water Purifier Point" featureKey="water_purifier_point" rfv={rfv} rfSet={rfSet} />
      <YNField label="Exhaust Fan" featureKey="exhaust_fan_present" rfv={rfv} rfSet={rfSet} />
    </>
  );
}

function BathroomContent({ rfv, rfSet }: { rfv: RV; rfSet: RS }) {
  return (
    <>
      <SField
        label="Geyser"
        featureKey="geyser_status"
        options={["No provision", "Point only", "Geyser mounted"]}
        rfv={rfv}
        rfSet={rfSet}
      />
      {rfv("geyser_status") === "Geyser mounted" && (
        <TField
          label="Geyser Brand"
          featureKey="geyser_brand"
          placeholder="e.g. Racold, AO Smith, Venus"
          rfv={rfv}
          rfSet={rfSet}
        />
      )}
      <YNField label="Exhaust Fan" featureKey="exhaust_fan_present" rfv={rfv} rfSet={rfSet} />
      <YNField label="Mirror" featureKey="mirror_present" rfv={rfv} rfSet={rfSet} />
      <TField
        label="Towel Rod Count"
        featureKey="towel_rod_count"
        type="number"
        rfv={rfv}
        rfSet={rfSet}
      />
      <SField
        label="Flush Type"
        featureKey="flush_type"
        options={["Western", "Indian"]}
        rfv={rfv}
        rfSet={rfSet}
      />
      <SField
        label="Flush Mechanism"
        featureKey="flush_mechanism"
        options={["Concealed tank", "Exposed tank"]}
        rfv={rfv}
        rfSet={rfSet}
      />
      <YNField label="Flush Working" featureKey="flush_working" rfv={rfv} rfSet={rfSet} />
      <TField
        label="Flush Brand"
        featureKey="flush_brand"
        placeholder="e.g. Parryware, Hindware, Cera"
        rfv={rfv}
        rfSet={rfSet}
      />
      <TAField label="Flush Notes" featureKey="flush_notes" rfv={rfv} rfSet={rfSet} />
      <YNField label="Hot + Cold Mixer" featureKey="mixer_present" rfv={rfv} rfSet={rfSet} />
      {rfv("mixer_present") === "Y" && (
        <>
          <YNField label="Mixer Working" featureKey="mixer_working" rfv={rfv} rfSet={rfSet} />
          <TField
            label="Mixer / Tap Brand"
            featureKey="tap_brand"
            placeholder="e.g. Jaquar, Kohler, Parryware"
            rfv={rfv}
            rfSet={rfSet}
          />
        </>
      )}
      <YNField label="Sink Present" featureKey="sink_present" rfv={rfv} rfSet={rfSet} />
      {rfv("sink_present") === "Y" && (
        <>
          <SField
            label="Sink Type"
            featureKey="sink_type"
            options={["Pedestal", "Vanity", "Wall-hung"]}
            rfv={rfv}
            rfSet={rfSet}
          />
          <TField
            label="Sink Brand"
            featureKey="sink_brand"
            placeholder="e.g. Hindware, Cera, Kohler"
            rfv={rfv}
            rfSet={rfSet}
          />
        </>
      )}
      <YNField label="Overhead Shower" featureKey="shower_overhead" rfv={rfv} rfSet={rfSet} />
      <YNField label="Handheld Shower" featureKey="shower_handheld" rfv={rfv} rfSet={rfSet} />
      <TField
        label="Shower Brand"
        featureKey="shower_brand"
        placeholder="e.g. Jaquar, Grohe, Cera"
        rfv={rfv}
        rfSet={rfSet}
      />
      <SField
        label="Shower Partition"
        featureKey="shower_partition"
        options={["None", "Glass partition", "Curtain rod + curtain", "Tiled step"]}
        rfv={rfv}
        rfSet={rfSet}
      />
      {rfv("shower_partition") === "Glass partition" && (
        <GlassCondField
          label="Shower Glass Condition"
          featureKey="shower_glass_condition"
          rfv={rfv}
          rfSet={rfSet}
        />
      )}
      <YNField label="Grout Stained" featureKey="tiles_grout_stained" rfv={rfv} rfSet={rfSet} />
      <TField
        label="Cracked Tiles Count"
        featureKey="tiles_cracked_count"
        type="number"
        rfv={rfv}
        rfSet={rfSet}
      />
      <LockFields prefix="washroom_lock" label="Washroom Lock" showKeys={false} rfv={rfv} rfSet={rfSet} />
    </>
  );
}

function BalconyContent({ rfv, rfSet }: { rfv: RV; rfSet: RS }) {
  return (
    <>
      <TField
        label="Attached To"
        featureKey="attached_to"
        placeholder="e.g. Living Room, Master Bedroom"
        rfv={rfv}
        rfSet={rfSet}
      />
      <SField
        label="Grill Type"
        featureKey="grill_type"
        options={["Open", "MS grill", "Glass railing", "Closed with windows"]}
        rfv={rfv}
        rfSet={rfSet}
      />
      {(rfv("grill_type") === "Glass railing" ||
        rfv("grill_type") === "Closed with windows") && (
        <GlassCondField
          label="Glass Condition"
          featureKey="grill_glass_condition"
          rfv={rfv}
          rfSet={rfSet}
        />
      )}
      <SField
        label="Ventilation"
        featureKey="ventilation"
        options={["Open", "Grilled", "Closed with glass", "Closed solid"]}
        rfv={rfv}
        rfSet={rfSet}
      />
      <SField
        label="Flooring Type"
        featureKey="flooring_type"
        options={["Tiles", "Mosaic", "Cement", "Marble", "Anti-skid tiles", "Other"]}
        rfv={rfv}
        rfSet={rfSet}
      />
      <YNField label="Washing Machine Tap Point" featureKey="wm_tap_point" rfv={rfv} rfSet={rfSet} />
      <YNField label="WM Drainage Point" featureKey="wm_drainage" rfv={rfv} rfSet={rfSet} />
      <YNField
        label="Additional Water Tap (for cleaning)"
        featureKey="additional_water_tap"
        rfv={rfv}
        rfSet={rfSet}
      />
      <SField
        label="Clothes Drying Provision"
        featureKey="drying_provision"
        options={["Rod", "Hooks", "Wire", "None"]}
        rfv={rfv}
        rfSet={rfSet}
      />
      <SField
        label="Floor Waterproofed"
        featureKey="floor_waterproofed"
        options={["Yes", "No", "Unknown"]}
        rfv={rfv}
        rfSet={rfSet}
      />
      <YNField label="Gas Cylinder Storage" featureKey="gas_cylinder_storage" rfv={rfv} rfSet={rfSet} />
      {rfv("gas_cylinder_storage") === "Y" && (
        <TField
          label="Cylinder Capacity (no. of cylinders)"
          featureKey="gas_cylinder_capacity"
          type="number"
          min={1}
          rfv={rfv}
          rfSet={rfSet}
        />
      )}
      <SubHeader label="Utility Sink" />
      <YNField label="Utility Sink Present" featureKey="utility_sink_present" rfv={rfv} rfSet={rfSet} />
      {rfv("utility_sink_present") === "Y" && (
        <>
          <SField
            label="Sink Type"
            featureKey="sink_type"
            options={["Wall-hung", "Floor-mounted", "Counter-top"]}
            rfv={rfv}
            rfSet={rfSet}
          />
          <SField
            label="Sink Material"
            featureKey="sink_material"
            options={["Stainless Steel", "Ceramic", "PVC", "Stone"]}
            rfv={rfv}
            rfSet={rfSet}
          />
        </>
      )}
      {/* Fittings (fan/light/switchboard) removed — use the Electrical
          subsection inventory for this room instead. */}
      <LockFields prefix="balcony_lock" label="Balcony Lock" rfv={rfv} rfSet={rfSet} />
    </>
  );
}

function DiningRoomContent({ rfv, rfSet }: { rfv: RV; rfSet: RS }) {
  return (
    <>
      <CurtainFieldsHelper rfv={rfv} rfSet={rfSet} />
      <YNField label="Wash Basin Present" featureKey="wash_basin_present" rfv={rfv} rfSet={rfSet} />
      {rfv("wash_basin_present") === "Y" && (
        <TField
          label="Wash Basin Brand"
          featureKey="wash_basin_brand"
          placeholder="e.g. Hindware, Cera"
          rfv={rfv}
          rfSet={rfSet}
        />
      )}
      <LockFields prefix="room_lock" label="Room Lock" rfv={rfv} rfSet={rfSet} />
    </>
  );
}

function DefaultRoomContent({ rfv, rfSet }: { rfv: RV; rfSet: RS }) {
  return (
    <>
      <SField
        label="Ventilation"
        featureKey="ventilation"
        options={["Window", "Exhaust fan", "Both", "None"]}
        rfv={rfv}
        rfSet={rfSet}
      />
      <YNField
        label="Dedicated Electrical Point"
        featureKey="electrical_point"
        rfv={rfv}
        rfSet={rfSet}
      />
      {rfv("electrical_point") === "Y" && (
        <TField
          label="Electrical Point Count"
          featureKey="electrical_point_count"
          type="number"
          min={1}
          rfv={rfv}
          rfSet={rfSet}
        />
      )}
      <YNField label="Gas Cylinder Storage" featureKey="gas_cylinder_storage" rfv={rfv} rfSet={rfSet} />
      {rfv("gas_cylinder_storage") === "Y" && (
        <TField
          label="Cylinder Capacity (no. of cylinders)"
          featureKey="gas_cylinder_capacity"
          type="number"
          min={1}
          rfv={rfv}
          rfSet={rfSet}
        />
      )}
      <TAField
        label="General Notes"
        featureKey="general_notes"
        placeholder="Any additional observations"
        rfv={rfv}
        rfSet={rfSet}
      />
      <LockFields prefix="room_lock" label="Room Lock" rfv={rfv} rfSet={rfSet} />
    </>
  );
}

// ── Room type title map ───────────────────────────────────────────────────────

const ROOM_TYPE_TITLES: Record<string, string> = {
  living_room:      "Living Room Details",
  bedroom:          "Bedroom Details",
  kitchen:          "Kitchen Details",
  bathroom:         "Bathroom Details",
  balcony:          "Balcony Details",
  dining_room:      "Dining Room Details",
  pooja_room:       "Pooja Room Details",
  study_room:       "Study Room Details",
  home_office:      "Home Office Details",
  servant_quarter:  "Servant Quarter Details",
  store_room:       "Store Room Details",
  utility:          "Utility Room Details",
  parking:          "Parking Details",
  common_area:      "Common Area Details",
  other:            "Room Details",
};

// ── Main export ───────────────────────────────────────────────────────────────

type RoomTypeFieldsProps = {
  roomId: string;
  roomType: string;
  roomFeatures: Record<string, unknown>;
  updateRoomFeature: (roomId: string, key: string, value: unknown) => void;
};

export function RoomTypeFields({
  roomId,
  roomType,
  roomFeatures,
  updateRoomFeature,
}: RoomTypeFieldsProps) {
  const [open, setOpen] = useState(false);

  const rfv = (key: string): string => String(roomFeatures[key] ?? "");
  const rfSet = (key: string, value: unknown) => updateRoomFeature(roomId, key, value);

  const title = ROOM_TYPE_TITLES[roomType] ?? "Room Details";

  let content: React.ReactNode;
  switch (roomType) {
    case "living_room":
      content = <LivingRoomContent rfv={rfv} rfSet={rfSet} />;
      break;
    case "bedroom":
      content = <BedroomContent rfv={rfv} rfSet={rfSet} />;
      break;
    case "kitchen":
      content = <KitchenContent rfv={rfv} rfSet={rfSet} />;
      break;
    case "bathroom":
      content = <BathroomContent rfv={rfv} rfSet={rfSet} />;
      break;
    case "balcony":
      content = <BalconyContent rfv={rfv} rfSet={rfSet} />;
      break;
    case "dining_room":
      content = <DiningRoomContent rfv={rfv} rfSet={rfSet} />;
      break;
    default:
      content = <DefaultRoomContent rfv={rfv} rfSet={rfSet} />;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border">
      <CollapsibleTrigger className="flex w-full min-h-[44px] cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors">
        <span>{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-5 pt-3">
          <div className="grid gap-4 md:grid-cols-2">{content}</div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
