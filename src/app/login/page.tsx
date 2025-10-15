"use client";

import { login } from "@/actions/login";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/lib/use-form-action";
import Link from "next/link";
import { Loader2Icon } from "lucide-react";

type LoginState = { error?: string };

export default function LoginPage() {
  const { state, formAction, pending } = useFormAction<LoginState>(login, {});

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-md">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden p-0">
            <CardContent className="flex flex-col p-0">
              <form action={formAction} className="p-6 md:p-8">
                <FieldGroup className="space-y-5">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <h1 className="text-2xl font-semibold md:text-3xl">
                      Welcome back
                    </h1>
                    <p className="text-muted-foreground text-sm text-balance">
                      Sign in with your email and password to continue playing.
                    </p>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                    />
                  </Field>

                  {state?.error && (
                    <FieldError
                      className="text-center"
                      errors={state.error.split("\n").map((err) => ({
                        message: err,
                      }))}
                    />
                  )}

                  <Field>
                    <Button
                      type="submit"
                      variant="jeopardy"
                      className="w-full"
                      disabled={pending}
                    >
                      {pending && (
                        <Loader2Icon className="size-4 animate-spin" />
                      )}
                      Log in
                    </Button>
                  </Field>

                  <FieldDescription className="text-center text-sm">
                    Don&apos;t have an account?{" "}
                    <Link
                      href="/signup"
                      className="text-primary font-medium hover:underline"
                    >
                      Sign up
                    </Link>
                  </FieldDescription>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
          <FieldDescription className="px-6 text-center text-xs text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <Link href="/terms">Terms of Service</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </FieldDescription>
        </div>
      </div>
    </div>
  );
}
