"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Shield, Loader2 } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface TwoFactorViewProps {
  error: string;
  setError: (error: string) => void;
  successMessage: string;
  setSuccessMessage: (message: string) => void;
  onSuccess: () => void;
  onBack: () => void;
}

export function TwoFactorView({
  error,
  setError,
  successMessage,
  setSuccessMessage,
  onSuccess,
  onBack,
}: TwoFactorViewProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerify2FA = async (code: string) => {
    if (code.length !== 6) return;

    try {
      setError("");
      setIsVerifying(true);

      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error);
        setVerificationCode("");
        return;
      }

      onSuccess();
    } catch (err) {
      setError("An error occurred. Please try again.");
      setVerificationCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const resendCode = async () => {
    try {
      setError("");
      setIsResending(true);

      const res = await fetch("/api/auth/2fa/resend", {
        method: "POST",
      });

      if (res.ok) {
        setSuccessMessage("A new code has been sent to your email");
        setVerificationCode("");
      } else {
        setError("Failed to resend code");
      }
    } catch (err) {
      setError("Failed to resend code");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          <Shield className="size-9 text-primary mx-auto" />
        </div>
        <h1 className="text-xl font-bold">Two-Factor Authentication</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Enter the 6-digit code sent to your email
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center w-full justify-center">
        <InputOTP
          maxLength={6}
          value={verificationCode}
          onChange={setVerificationCode}
          onComplete={handleVerify2FA}
          disabled={isVerifying}
          className="shadow-none w-full"
        >
          <InputOTPGroup className="gap-2">
            <InputOTPSlot
              className="aspect-square w-10 h-10 text-lg shadow-none rounded-md"
              index={0}
            />
            <InputOTPSlot
              className="aspect-square w-10 h-10 text-lg shadow-none rounded-md border-l"
              index={1}
            />
            <InputOTPSlot
              className="aspect-square w-10 h-10 text-lg shadow-none rounded-md border-l"
              index={2}
            />
            <InputOTPSlot
              className="aspect-square w-10 h-10 text-lg shadow-none rounded-md border-l"
              index={3}
            />
            <InputOTPSlot
              className="aspect-square w-10 h-10 text-lg shadow-none rounded-md border-l"
              index={4}
            />
            <InputOTPSlot
              className="aspect-square w-10 h-10 text-lg shadow-none rounded-md border-l"
              index={5}
            />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => handleVerify2FA(verificationCode)}
          className="w-full"
          disabled={verificationCode.length !== 6 || isVerifying}
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
          variant="outline"
          onClick={resendCode}
          className="w-full"
          disabled={isResending || isVerifying}
        >
          {isResending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Resend code"
          )}
        </Button>

        <Button
          variant="ghost"
          onClick={onBack}
          className="w-full"
          disabled={isVerifying}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to login
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Didn't receive the code? Check your spam folder or click resend.
      </p>
    </div>
  );
}
