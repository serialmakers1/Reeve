import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, Upload, X, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface OwnerProfileTabProps {
  userId: string;
}

interface DocRecord {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  submitted_at: string | null;
}

export default function OwnerProfileTab({ userId }: OwnerProfileTabProps) {
  const [loading, setLoading] = useState(true);

  // Read-only user info
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // NRI
  const [isForeignCitizen, setIsForeignCitizen] = useState(false);

  // Bank details
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountType, setAccountType] = useState("savings");
  const [savingBank, setSavingBank] = useState(false);

  // Docs
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [submittingDocs, setSubmittingDocs] = useState(false);

  const aadhaarInputRef = useRef<HTMLInputElement>(null);
  const panInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    const [userRes, profileRes, bankRes, docsRes] = await Promise.all([
      supabase.from("users").select("full_name, email, phone").eq("id", userId).maybeSingle(),
      supabase.from("profiles").select("is_foreign_citizen").eq("user_id", userId).maybeSingle(),
      supabase.from("owner_bank_details").select("*").eq("owner_id", userId).maybeSingle(),
      supabase
        .from("documents")
        .select("id, document_type, file_name, file_url, submitted_at")
        .eq("uploaded_by", userId)
        .in("document_type", ["aadhaar", "pan"])
        .is("application_id", null),
    ]);

    if (userRes.data) {
      setFullName(userRes.data.full_name || "");
      setEmail(userRes.data.email || "");
      setPhone(userRes.data.phone || "");
    }
    if (profileRes.data) {
      setIsForeignCitizen(profileRes.data.is_foreign_citizen);
    }
    if (bankRes.data) {
      setBankName(bankRes.data.bank_name || "");
      setAccountNumber(bankRes.data.account_number || "");
      setIfscCode(bankRes.data.ifsc_code || "");
      setAccountType(bankRes.data.account_type || "savings");
    }
    if (docsRes.data) {
      setDocs(docsRes.data as DocRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const handleNriChange = async (checked: boolean) => {
    setIsForeignCitizen(checked);
    await supabase.from("profiles").update({ is_foreign_citizen: checked }).eq("user_id", userId);
  };

  const handleSaveBank = async () => {
    setSavingBank(true);
    const { error } = await supabase.from("owner_bank_details").upsert(
      {
        owner_id: userId,
        bank_name: bankName,
        account_number: accountNumber,
        ifsc_code: ifscCode.toUpperCase(),
        account_type: accountType,
      },
      { onConflict: "owner_id" }
    );
    setSavingBank(false);
    if (error) {
      toast({ title: "Could not save. Please try again.", variant: "destructive" });
    } else {
      toast({ title: "Bank details saved" });
    }
  };

  const aadhaarDoc = docs.find((d) => d.document_type === "aadhaar");
  const panDoc = docs.find((d) => d.document_type === "pan");
  const aadhaarSubmitted = aadhaarDoc?.submitted_at != null;
  const panSubmitted = panDoc?.submitted_at != null;

  const canSubmitDocs =
    !submittingDocs &&
    (aadhaarFile || aadhaarSubmitted) &&
    (panFile || panSubmitted) &&
    !aadhaarSubmitted &&
    !panSubmitted;

  // Actually: enabled only when both files attached AND neither already submitted
  const submitEnabled =
    !submittingDocs && aadhaarFile && panFile && !aadhaarSubmitted && !panSubmitted;

  const handleSubmitDocs = async () => {
    if (!aadhaarFile || !panFile) return;
    setSubmittingDocs(true);

    try {
      for (const { file, docType } of [
        { file: aadhaarFile, docType: "aadhaar" as const },
        { file: panFile, docType: "pan" as const },
      ]) {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("owner-documents")
          .upload(`${userId}/${docType}/${file.name}`, file);

        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase.from("documents").insert({
          uploaded_by: userId,
          owner_user_id: userId,
          document_type: docType,
          category: "tenant_kyc" as any,
          file_name: file.name,
          file_url: uploadData.path,
          file_size_bytes: file.size,
          mime_type: "application/pdf",
          is_verified: false,
          is_mandatory: true,
          submitted_at: new Date().toISOString(),
        });

        if (insertError) throw insertError;
      }

      setAadhaarFile(null);
      setPanFile(null);
      await fetchData();
      toast({ title: "ID proof submitted successfully" });
    } catch {
      toast({ title: "Upload failed. Please try again.", variant: "destructive" });
    } finally {
      setSubmittingDocs(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Read-only info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
          <p className="text-xs text-muted-foreground">Cannot be edited</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-muted-foreground text-xs">Full Name</Label>
            <p className="text-sm font-medium text-foreground">{fullName || "—"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Email</Label>
            <p className="text-sm font-medium text-foreground">{email || "—"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Phone</Label>
            <p className="text-sm font-medium text-foreground">{phone || "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* NRI checkbox */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Checkbox
              id="nri"
              checked={isForeignCitizen}
              onCheckedChange={(checked) => handleNriChange(checked === true)}
              className="h-5 w-5"
            />
            <Label htmlFor="nri" className="text-sm cursor-pointer">
              I am a NRI / Foreign Citizen
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Bank details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bank Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bankName" className="text-sm">Bank Name</Label>
            <Input
              id="bankName"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. HDFC Bank"
              className="min-h-[44px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accountNumber" className="text-sm">Account Number</Label>
            <Input
              id="accountNumber"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Enter account number"
              className="min-h-[44px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ifscCode" className="text-sm">IFSC Code</Label>
            <Input
              id="ifscCode"
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              placeholder="e.g. HDFC0001234"
              className="min-h-[44px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accountType" className="text-sm">Account Type</Label>
            <Select value={accountType} onValueChange={setAccountType}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="nre">NRE</SelectItem>
                <SelectItem value="nro">NRO</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleSaveBank}
            disabled={savingBank || !bankName || !accountNumber || !ifscCode}
            className="w-full min-h-[44px]"
          >
            {savingBank && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Bank Details
          </Button>
        </CardContent>
      </Card>

      {/* ID Proof */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ID Proof</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Aadhaar */}
          <div className="space-y-1.5">
            <Label className="text-sm">Aadhaar Card (PDF only)</Label>
            {aadhaarSubmitted ? (
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 p-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm flex-1 truncate">{aadhaarDoc?.file_name}</span>
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <span className="text-xs text-muted-foreground">Submitted — cannot be changed</span>
              </div>
            ) : (
              <div>
                {aadhaarFile ? (
                  <div className="flex items-center gap-2 rounded-md border border-border p-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1 truncate">{aadhaarFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setAadhaarFile(null)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full min-h-[44px]"
                    onClick={() => aadhaarInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Aadhaar
                  </Button>
                )}
                <input
                  ref={aadhaarInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setAadhaarFile(f);
                    e.target.value = "";
                  }}
                />
              </div>
            )}
          </div>

          {/* PAN */}
          <div className="space-y-1.5">
            <Label className="text-sm">PAN Card (PDF only)</Label>
            {panSubmitted ? (
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 p-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm flex-1 truncate">{panDoc?.file_name}</span>
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <span className="text-xs text-muted-foreground">Submitted — cannot be changed</span>
              </div>
            ) : (
              <div>
                {panFile ? (
                  <div className="flex items-center gap-2 rounded-md border border-border p-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1 truncate">{panFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setPanFile(null)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full min-h-[44px]"
                    onClick={() => panInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload PAN
                  </Button>
                )}
                <input
                  ref={panInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setPanFile(f);
                    e.target.value = "";
                  }}
                />
              </div>
            )}
          </div>

          {!aadhaarSubmitted && !panSubmitted && (
            <Button
              onClick={handleSubmitDocs}
              disabled={!submitEnabled}
              className="w-full min-h-[44px]"
            >
              {submittingDocs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit ID Proof
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
