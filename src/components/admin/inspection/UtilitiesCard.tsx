/**
 * UtilitiesCard — Property & Utilities Overview section.
 *
 * Pure controlled form — owns no local state.
 * All reads from `utilitiesOverview` prop, all writes via `updateUtility`.
 *
 * Sections: Main Entrance & Door · Water · Gas & Electricity · Safety · Society & Maintenance · Parking
 */
import type { UtilityKey } from "@/lib/inspection-report/types";
import {
  LOCK_TYPE_OPTIONS,
  ROOM_CONDITION_OPTIONS,
} from "@/types/inspection";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CollapsibleCard } from "./CollapsibleCard";

type UtilitiesCardProps = {
  utilitiesOverview: Record<string, unknown>;
  updateUtility: (key: UtilityKey, value: unknown) => void;
};

export function UtilitiesCard({ utilitiesOverview, updateUtility }: UtilitiesCardProps) {
  const u = utilitiesOverview;

  return (
    <CollapsibleCard title="Property & Utilities Overview">
      <div className="space-y-6">
        {/* A — Main Entrance & Door */}
        <div>
          <p className="font-semibold mb-3">Main Entrance & Door</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Double Door</Label>
              <RadioGroup value={u.door_is_double ?? ""} onValueChange={(v) => updateUtility("door_is_double", v)} className="grid grid-cols-2 gap-3">
                {[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }].map((o) => (
                  <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", u.door_is_double === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                    <RadioGroupItem value={o.value} /><span>{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            {u.door_is_double === "Y" ? (
              <>
                <div className="space-y-2">
                  <Label>Outer Door Type</Label>
                  <Select value={u.door_outer_type || undefined} onValueChange={(v) => updateUtility("door_outer_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["Steel mesh / Grill", "Glass", "Wooden grill", "Aluminium grill"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Inner Door Type</Label>
                  <Select value={u.door_inner_type || undefined} onValueChange={(v) => updateUtility("door_inner_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["Wood", "Steel", "Fibre", "Glass"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>Door Type</Label>
                <Select value={u.door_type || undefined} onValueChange={(v) => updateUtility("door_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Wood", "Steel", "Fibre", "Glass"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Lock Type</Label>
              <Select value={u.door_lock_type || undefined} onValueChange={(v) => updateUtility("door_lock_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {LOCK_TYPE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lock Brand</Label>
              <Input value={u.door_lock_brand ?? ""} onChange={(e) => updateUtility("door_lock_brand", e.target.value)} onBlur={(e) => updateUtility("door_lock_brand", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>No. of Keys</Label>
              <Input type="number" min={0} value={u.door_keys_count ?? ""} onChange={(e) => updateUtility("door_keys_count", e.target.value)} onBlur={(e) => updateUtility("door_keys_count", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Child Lock Present</Label>
              <RadioGroup value={u.door_child_lock ?? ""} onValueChange={(v) => updateUtility("door_child_lock", v)} className="grid grid-cols-2 gap-3">
                {[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }].map((o) => (
                  <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", u.door_child_lock === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                    <RadioGroupItem value={o.value} /><span>{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Peephole Present</Label>
              <RadioGroup value={u.door_peephole ?? ""} onValueChange={(v) => updateUtility("door_peephole", v)} className="grid grid-cols-2 gap-3">
                {[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }].map((o) => (
                  <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", u.door_peephole === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                    <RadioGroupItem value={o.value} /><span>{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Intercom / Bell</Label>
              <Select value={u.door_intercom || undefined} onValueChange={(v) => updateUtility("door_intercom", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["None", "Bell only", "Intercom", "Video doorbell"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {u.door_intercom && u.door_intercom !== "None" && (
              <>
                <div className="space-y-2">
                  <Label>Intercom Brand</Label>
                  <Input value={u.door_intercom_brand ?? ""} onChange={(e) => updateUtility("door_intercom_brand", e.target.value)} onBlur={(e) => updateUtility("door_intercom_brand", e.target.value)} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Checkbox
                    id="intercom_creds"
                    checked={!!u.door_intercom_creds_documented}
                    onCheckedChange={(v) => updateUtility("door_intercom_creds_documented", !!v)}
                  />
                  <label htmlFor="intercom_creds" className="text-sm font-medium cursor-pointer">Credentials documented separately</label>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Door Condition</Label>
              <Select value={u.door_condition || undefined} onValueChange={(v) => updateUtility("door_condition", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {ROOM_CONDITION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Door Notes</Label>
              <Textarea rows={2} value={u.door_notes ?? ""} onChange={(e) => updateUtility("door_notes", e.target.value)} onBlur={(e) => updateUtility("door_notes", e.target.value)} />
            </div>
          </div>
        </div>

        <hr className="border-border" />

        {/* B — Water */}
        <div>
          <p className="font-semibold mb-3">Water</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Water Source</Label>
              <Select value={u.water_source || undefined} onValueChange={(v) => updateUtility("water_source", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["Corporation", "Borewell", "Tanker", "Corporation + Borewell", "All three"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Consumer ID / Account No.</Label>
              <Input value={u.water_consumer_id ?? ""} onChange={(e) => updateUtility("water_consumer_id", e.target.value)} onBlur={(e) => updateUtility("water_consumer_id", e.target.value)} placeholder="BWSSB / BBMP consumer ID" />
            </div>
            <div className="space-y-2">
              <Label>Supply</Label>
              <RadioGroup value={u.water_supply ?? ""} onValueChange={(v) => updateUtility("water_supply", v)} className="grid grid-cols-3 gap-3">
                {[{ value: "24hr", label: "24hr" }, { value: "Timed", label: "Timed" }, { value: "No", label: "No" }].map((o) => (
                  <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", u.water_supply === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                    <RadioGroupItem value={o.value} /><span>{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            {u.water_supply === "Timed" && (
              <div className="space-y-2">
                <Label>Timing</Label>
                <Input value={u.water_timing ?? ""} onChange={(e) => updateUtility("water_timing", e.target.value)} onBlur={(e) => updateUtility("water_timing", e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Water Meter</Label>
              <RadioGroup value={u.water_meter ?? ""} onValueChange={(v) => updateUtility("water_meter", v)} className="grid grid-cols-2 gap-3">
                {[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }].map((o) => (
                  <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", u.water_meter === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                    <RadioGroupItem value={o.value} /><span>{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Sump Present</Label>
              <RadioGroup value={u.water_sump ?? ""} onValueChange={(v) => updateUtility("water_sump", v)} className="grid grid-cols-2 gap-3">
                {[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }].map((o) => (
                  <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", u.water_sump === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                    <RadioGroupItem value={o.value} /><span>{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Overhead Tank</Label>
              <RadioGroup value={u.water_overhead_tank ?? ""} onValueChange={(v) => updateUtility("water_overhead_tank", v)} className="grid grid-cols-2 gap-3">
                {[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }].map((o) => (
                  <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", u.water_overhead_tank === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                    <RadioGroupItem value={o.value} /><span>{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>
        </div>

        <hr className="border-border" />

        {/* C — Gas & Electricity */}
        <div>
          <p className="font-semibold mb-3">Gas & Electricity</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Gas Type</Label>
              <Select value={u.gas_type || undefined} onValueChange={(v) => updateUtility("gas_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["Piped PNG", "Cylinder", "None"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Meter / Regulator Location</Label>
              <Input value={u.gas_location ?? ""} onChange={(e) => updateUtility("gas_location", e.target.value)} onBlur={(e) => updateUtility("gas_location", e.target.value)} />
            </div>
            {u.gas_type === "Piped PNG" && (
              <div className="space-y-2">
                <Label>Gas Consumer ID / Account No.</Label>
                <Input value={u.gas_consumer_id ?? ""} onChange={(e) => updateUtility("gas_consumer_id", e.target.value)} onBlur={(e) => updateUtility("gas_consumer_id", e.target.value)} placeholder="PNG consumer number" />
              </div>
            )}
            <div className="space-y-2">
              <Label>MCB / DB Box Location</Label>
              <Input value={u.electricity_mcb_location ?? ""} onChange={(e) => updateUtility("electricity_mcb_location", e.target.value)} onBlur={(e) => updateUtility("electricity_mcb_location", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Electricity Consumer ID / Account No.</Label>
              <Input value={u.electricity_consumer_id ?? ""} onChange={(e) => updateUtility("electricity_consumer_id", e.target.value)} onBlur={(e) => updateUtility("electricity_consumer_id", e.target.value)} placeholder="BESCOM / BBMP account number" />
            </div>
            <div className="space-y-2">
              <Label>No. of Circuits</Label>
              <Input type="number" value={u.electricity_circuits ?? ""} onChange={(e) => updateUtility("electricity_circuits", e.target.value)} onBlur={(e) => updateUtility("electricity_circuits", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Inverter / UPS Provision</Label>
              <RadioGroup value={u.electricity_inverter ?? ""} onValueChange={(v) => updateUtility("electricity_inverter", v)} className="grid grid-cols-2 gap-3">
                {[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }].map((o) => (
                  <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", u.electricity_inverter === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                    <RadioGroupItem value={o.value} /><span>{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>DG / Generator Backup</Label>
              <Select value={u.electricity_backup || undefined} onValueChange={(v) => updateUtility("electricity_backup", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["None", "Common area only", "Full flat"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <hr className="border-border" />

        {/* D — Safety */}
        <div>
          <p className="font-semibold mb-3">Safety</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Fire Extinguisher</Label>
              <RadioGroup value={u.safety_fire_extinguisher ?? ""} onValueChange={(v) => updateUtility("safety_fire_extinguisher", v)} className="grid grid-cols-2 gap-3">
                {[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }].map((o) => (
                  <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", u.safety_fire_extinguisher === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                    <RadioGroupItem value={o.value} /><span>{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            {u.safety_fire_extinguisher === "Y" && (
              <div className="space-y-2">
                <Label>Last Service Date</Label>
                <Input type="date" value={u.safety_fire_extinguisher_date ?? ""} onChange={(e) => updateUtility("safety_fire_extinguisher_date", e.target.value)} onBlur={(e) => updateUtility("safety_fire_extinguisher_date", e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>CCTV</Label>
              <Select value={u.safety_cctv || undefined} onValueChange={(v) => updateUtility("safety_cctv", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["None", "Building only", "Flat entrance", "Both"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Building Security</Label>
              <Select value={u.safety_security || undefined} onValueChange={(v) => updateUtility("safety_security", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["None", "Watchman only", "Intercom + watchman", "Gated with security"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {u.safety_security === "Watchman only" && (
              <div className="space-y-2">
                <Label>Watchman Timing</Label>
                <RadioGroup value={u.safety_watchman_timing ?? ""} onValueChange={(v) => updateUtility("safety_watchman_timing", v)} className="grid grid-cols-2 gap-3">
                  {[{ value: "24hr", label: "24 Hours" }, { value: "Timed", label: "Timed" }].map((o) => (
                    <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", u.safety_watchman_timing === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                      <RadioGroupItem value={o.value} /><span>{o.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            )}
            {u.safety_watchman_timing === "Timed" && (
              <div className="space-y-2">
                <Label>Watchman Hours</Label>
                <Input value={u.safety_watchman_hours ?? ""} onChange={(e) => updateUtility("safety_watchman_hours", e.target.value)} onBlur={(e) => updateUtility("safety_watchman_hours", e.target.value)} placeholder="e.g. 8 PM – 6 AM" />
              </div>
            )}
            {u.safety_security === "Gated with security" && (
              <>
                <div className="space-y-2">
                  <Label>Security App Name</Label>
                  <Input value={u.safety_security_app ?? ""} onChange={(e) => updateUtility("safety_security_app", e.target.value)} onBlur={(e) => updateUtility("safety_security_app", e.target.value)} placeholder="e.g. MyGate, Tata Housing, NoBrokerHood" />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Checkbox
                    id="security_app_creds"
                    checked={!!u.safety_security_creds_documented}
                    onCheckedChange={(v) => updateUtility("safety_security_creds_documented", !!v)}
                  />
                  <label htmlFor="security_app_creds" className="text-sm font-medium cursor-pointer">App credentials documented separately</label>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Security Guard Name</Label>
              <Input value={u.safety_guard_name ?? ""} onChange={(e) => updateUtility("safety_guard_name", e.target.value)} onBlur={(e) => updateUtility("safety_guard_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Security Guard Phone</Label>
              <Input value={u.safety_guard_phone ?? ""} onChange={(e) => updateUtility("safety_guard_phone", e.target.value)} onBlur={(e) => updateUtility("safety_guard_phone", e.target.value)} placeholder="+91" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Safety Notes</Label>
              <Textarea rows={2} value={u.safety_notes ?? ""} onChange={(e) => updateUtility("safety_notes", e.target.value)} onBlur={(e) => updateUtility("safety_notes", e.target.value)} />
            </div>
          </div>
        </div>

        <hr className="border-border" />

        {/* E — Society & Maintenance */}
        <div>
          <p className="font-semibold mb-3">Society & Maintenance</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Society / RWA Name</Label>
              <Input value={u.society_name ?? ""} onChange={(e) => updateUtility("society_name", e.target.value)} onBlur={(e) => updateUtility("society_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Society Contact Name</Label>
              <Input value={u.society_contact_name ?? ""} onChange={(e) => updateUtility("society_contact_name", e.target.value)} onBlur={(e) => updateUtility("society_contact_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Society Contact Phone</Label>
              <Input value={u.society_contact_phone ?? ""} onChange={(e) => updateUtility("society_contact_phone", e.target.value)} onBlur={(e) => updateUtility("society_contact_phone", e.target.value)} placeholder="+91" />
            </div>
            <div className="space-y-2">
              <Label>Monthly Maintenance Amount (₹)</Label>
              <Input type="number" value={u.society_maintenance_amount ?? ""} onChange={(e) => updateUtility("society_maintenance_amount", e.target.value)} onBlur={(e) => updateUtility("society_maintenance_amount", e.target.value)} placeholder="Verified amount at inspection" />
            </div>
            <div className="space-y-2">
              <Label>Payment Frequency</Label>
              <Select value={u.society_payment_frequency || undefined} onValueChange={(v) => updateUtility("society_payment_frequency", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["Monthly", "Quarterly", "Annually"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={u.society_payment_method || undefined} onValueChange={(v) => updateUtility("society_payment_method", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["Online portal", "NEFT / IMPS", "Cheque", "Cash", "Auto-debit"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {u.society_payment_method === "Online portal" && (
              <div className="space-y-2">
                <Label>Payment App / Portal Name</Label>
                <Input value={u.society_payment_app ?? ""} onChange={(e) => updateUtility("society_payment_app", e.target.value)} onBlur={(e) => updateUtility("society_payment_app", e.target.value)} placeholder="e.g. ApnaComplex, MyGate, NoBrokerHood" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Last Paid Date</Label>
              <Input type="date" value={u.society_last_paid_date ?? ""} onChange={(e) => updateUtility("society_last_paid_date", e.target.value)} onBlur={(e) => updateUtility("society_last_paid_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Outstanding Dues</Label>
              <RadioGroup value={u.society_outstanding_dues ?? ""} onValueChange={(v) => updateUtility("society_outstanding_dues", v)} className="grid grid-cols-2 gap-3">
                {[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }].map((o) => (
                  <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", u.society_outstanding_dues === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                    <RadioGroupItem value={o.value} /><span>{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            {u.society_outstanding_dues === "Y" && (
              <>
                <div className="space-y-2">
                  <Label>Outstanding Amount (₹)</Label>
                  <Input type="number" value={u.society_outstanding_amount ?? ""} onChange={(e) => updateUtility("society_outstanding_amount", e.target.value)} onBlur={(e) => updateUtility("society_outstanding_amount", e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Outstanding Dues Details</Label>
                  <Textarea rows={2} value={u.society_outstanding_details ?? ""} onChange={(e) => updateUtility("society_outstanding_details", e.target.value)} onBlur={(e) => updateUtility("society_outstanding_details", e.target.value)} />
                </div>
              </>
            )}
          </div>
        </div>

        <hr className="border-border" />

        {/* F — Parking */}
        <div>
          <p className="font-semibold mb-3">Parking</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>4-Wheeler Slot No. / Location</Label>
              <Input value={u.parking_4w_slot ?? ""} onChange={(e) => updateUtility("parking_4w_slot", e.target.value)} onBlur={(e) => updateUtility("parking_4w_slot", e.target.value)} placeholder="e.g. B2-45, Basement Level 1" />
            </div>
            <div className="space-y-2">
              <Label>2-Wheeler Slot No. / Location</Label>
              <Input value={u.parking_2w_slot ?? ""} onChange={(e) => updateUtility("parking_2w_slot", e.target.value)} onBlur={(e) => updateUtility("parking_2w_slot", e.target.value)} placeholder="e.g. G-12" />
            </div>
            <div className="space-y-2">
              <Label>EV Charging Point</Label>
              <RadioGroup value={u.parking_ev_charging ?? ""} onValueChange={(v) => updateUtility("parking_ev_charging", v)} className="grid grid-cols-2 gap-3">
                {[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }].map((o) => (
                  <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", u.parking_ev_charging === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                    <RadioGroupItem value={o.value} /><span>{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            {u.parking_ev_charging === "Y" && (
              <div className="space-y-2">
                <Label>EV Charging Type</Label>
                <Select value={u.parking_ev_type || undefined} onValueChange={(v) => updateUtility("parking_ev_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["15A socket", "Dedicated EV charger", "Common EV charger"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </div>
    </CollapsibleCard>
  );
}
