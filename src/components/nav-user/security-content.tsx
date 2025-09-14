"use client";
import { useState } from "react";
import { Shield, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import type { User } from "@/types/nav-user";

interface SecurityContentProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User>>;
}

export function SecurityContent({ user, setUser }: SecurityContentProps) {
  const [is2FAEnabled, setIs2FAEnabled] = useState(
    user.twoFactorEnabled || false
  );
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [twoFAError, setTwoFAError] = useState("");
  const [twoFASuccess, setTwoFASuccess] = useState("");
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);

  const handleEnable2FA = async () => {
    setIsEnabling2FA(true);
    setTwoFAError("");
    setTwoFASuccess("");

    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        credentials: "same-origin",
      });

      if (res.ok) {
        setShowVerificationInput(true);
        setTwoFASuccess("Verification code sent to your email");
      } else {
        const data = await res.json();
        setTwoFAError(data.error || "Failed to enable 2FA");
      }
    } catch (error) {
      setTwoFAError("Failed to enable 2FA");
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) return;

    setIsVerifying(true);
    setTwoFAError("");

    try {
      const res = await fetch("/api/auth/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode }),
        credentials: "same-origin",
      });

      if (res.ok) {
        setIs2FAEnabled(true);
        setTwoFASuccess("2FA has been enabled successfully");
        setShowVerificationInput(false);
        setVerificationCode("");
        setUser((prev) => ({ ...prev, twoFactorEnabled: true }));
      } else {
        const data = await res.json();
        setTwoFAError(data.error || "Invalid verification code");
        setVerificationCode("");
      }
    } catch (error) {
      setTwoFAError("Failed to verify code");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisable2FA = async () => {
    if (
      !confirm(
        "Are you sure you want to disable 2FA? This will make your account less secure."
      )
    ) {
      return;
    }

    setIsDisabling2FA(true);
    setTwoFAError("");

    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        credentials: "same-origin",
      });

      if (res.ok) {
        setIs2FAEnabled(false);
        setTwoFASuccess("2FA has been disabled");
        setUser((prev) => ({ ...prev, twoFactorEnabled: false }));
      } else {
        setTwoFAError("Failed to disable 2FA");
      }
    } catch (error) {
      setTwoFAError("Failed to disable 2FA");
    } finally {
      setIsDisabling2FA(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col pl-40">
      <div className="border-b py-3.5 px-6 w-full">
        <h2 className="text-lg">Beveiliging</h2>
      </div>
      <div className="space-y-6">
        {/* 2FA Section */}
        <div className="space-y-4 px-6 pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <Label className="text-sm font-medium">
                  Two-Factor Authentication (2FA)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Add an extra layer of security to your account
              </p>
            </div>
            {is2FAEnabled ? (
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">
                  Enabled
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ShieldOff className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-600 font-medium">
                  Disabled
                </span>
              </div>
            )}
          </div>

          {twoFAError && (
            <Alert variant="destructive">
              <AlertDescription>{twoFAError}</AlertDescription>
            </Alert>
          )}

          {twoFASuccess && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                {twoFASuccess}
              </AlertDescription>
            </Alert>
          )}

          {!is2FAEnabled && !showVerificationInput && (
            <Button
              onClick={handleEnable2FA}
              disabled={isEnabling2FA}
              size="sm"
              className="w-full"
            >
              {isEnabling2FA ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                "Enable 2FA"
              )}
            </Button>
          )}

          {!is2FAEnabled && showVerificationInput && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to your email
              </p>
              <div className="flex justify-start">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={setVerificationCode}
                  onComplete={handleVerifyCode}
                  disabled={isVerifying}
                  className="shadow-none w-full"
                >
                  <InputOTPGroup className="gap-2">
                    <InputOTPSlot
                      className="aspect-square w-12 h-12 text-lg shadow-none rounded-md"
                      index={0}
                    />
                    <InputOTPSlot
                      className="aspect-square w-12 h-12 text-lg shadow-none rounded-md border-l"
                      index={1}
                    />
                    <InputOTPSlot
                      className="aspect-square w-12 h-12 text-lg shadow-none rounded-md border-l"
                      index={2}
                    />
                    <InputOTPSlot
                      className="aspect-square w-12 h-12 text-lg shadow-none rounded-md border-l"
                      index={3}
                    />
                    <InputOTPSlot
                      className="aspect-square w-12 h-12 text-lg shadow-none rounded-md border-l"
                      index={4}
                    />
                    <InputOTPSlot
                      className="aspect-square w-12 h-12 text-lg shadow-none rounded-md border-l"
                      index={5}
                    />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleVerifyCode}
                  disabled={verificationCode.length !== 6 || isVerifying}
                  size="sm"
                  className="flex-1"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify"
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setShowVerificationInput(false);
                    setVerificationCode("");
                    setTwoFAError("");
                    setTwoFASuccess("");
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {is2FAEnabled && (
            <Button
              onClick={handleDisable2FA}
              disabled={isDisabling2FA}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              {isDisabling2FA ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                "Disable 2FA"
              )}
            </Button>
          )}
        </div>

        {/* Password Change Section */}
        <div className="px-6 py-4  border-t">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Password</Label>
            <p className="text-xs text-muted-foreground">
              Change your account password
            </p>
          </div>
          <Button variant="outline" size="sm" className="mt-3">
            Change Password
          </Button>
        </div>
      </div>
    </div>
  );
}
