"use client";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { LoginView } from "./auth/login/login-view";
import { OrganizationView } from "./auth/login/organization-view";
import { TwoFactorView } from "./auth/login/two-factor-view";
import { useRouter } from "next/navigation";
import type { LoginFormData, Organization, ViewState } from "@/types/login";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [viewState, setViewState] = useState<ViewState>("login");
  const [loginData, setLoginData] = useState<LoginFormData | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const transitionToView = (newView: ViewState) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setViewState(newView);
      setIsTransitioning(false);
      setError("");
    }, 300);
  };

  const handleLoginSubmit = async (data: LoginFormData) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error);
        return;
      }

      setLoginData(data);

      if (result.requiresOrgSelection) {
        setOrganizations(result.organizations);
        transitionToView("organizations");
        return;
      }

      if (result.requires2FA) {
        setSuccessMessage("Verification code sent to your email");
        transitionToView("verify-2fa");
        return;
      }

      if (result.success) {
        window.location.replace("/dashboard");
      }
    } catch (err) {
      console.error("Error during login:", err);
      setError("An error occurred. Please try again.");
    }
  };

  const handleOrganizationSelect = async (slug: string) => {
    if (!loginData) return;

    try {
      setError("");
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...loginData, organizationSlug: slug }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error);
        return;
      }

      if (result.requires2FA) {
        setSuccessMessage("Verification code sent to your email");
        transitionToView("verify-2fa");
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError("An error occurred. Please try again.");
    }
  };

  const handleVerificationSuccess = () => {
    setSuccessMessage("Verification successful! Redirecting...");
    setTimeout(() => {
      router.push("/dashboard");
    }, 1000);
  };

  const handleBackToLogin = () => {
    setSuccessMessage("");
    transitionToView("login");
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-6 md:p-8 relative overflow-hidden">
            <div
              className={cn(
                "flex flex-col gap-6 transition-all duration-300 ease-in-out",
                isTransitioning && "opacity-0 scale-95"
              )}
            >
              {viewState === "login" && (
                <LoginView error={error} onSubmit={handleLoginSubmit} />
              )}

              {viewState === "organizations" && (
                <OrganizationView
                  error={error}
                  organizations={organizations}
                  onSelectOrganization={handleOrganizationSelect}
                  onBack={handleBackToLogin}
                />
              )}

              {viewState === "verify-2fa" && (
                <TwoFactorView
                  error={error}
                  setError={setError}
                  successMessage={successMessage}
                  setSuccessMessage={setSuccessMessage}
                  onSuccess={handleVerificationSuccess}
                  onBack={handleBackToLogin}
                />
              )}
            </div>
          </div>

          <div className="bg-muted relative hidden md:block">
            <img
              src="/login-image.png"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>

      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
