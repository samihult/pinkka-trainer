"use client";

import type React from "react";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { HatGlasses } from "lucide-react";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: t("auth.errorTitle"),
        description: t("auth.signUp.passwordMismatch"),
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: t("auth.errorTitle"),
        description: t("auth.signUp.passwordTooShort"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password);
      toast({
        title: t("auth.signUp.createdTitle"),
        description: t("auth.signUp.createdDescription"),
      });
      router.push("/");
    } catch (error: any) {
      toast({
        title: t("auth.errorTitle"),
        description: error.message || t("auth.signUp.failureDescription"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <HatGlasses className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t("auth.signUp.title")}</CardTitle>
          <CardDescription>{t("auth.signUp.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("auth.signUp.submitLoading") : t("auth.signUp.submit")}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              {`${t("auth.signUp.hasAccount")} `}
              <Link
                href="/auth/signin"
                className="text-primary hover:underline"
              >
                {t("auth.signIn.link")}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
