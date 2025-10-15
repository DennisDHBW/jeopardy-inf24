"use client";

import { signUp } from "@/actions/signup";
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
import {
  type FormEventHandler,
  useCallback,
  useRef,
} from "react";
import { Loader2Icon } from "lucide-react";

export default function SignupPage() {
  const { state, formAction, pending } = useFormAction(signUp, {});

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);
  const validatePasswordConfirmation = useCallback<
    FormEventHandler<HTMLInputElement>
  >((ev) => {
    confirmPasswordInputRef.current?.setCustomValidity("");
    if (passwordInputRef.current?.value !== ev.currentTarget.value) {
      confirmPasswordInputRef.current?.setCustomValidity(
        "Passwords do not match",
      );
    }
  }, []);

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
                      Create your account
                    </h1>
                    <p className="text-muted-foreground text-sm text-balance">
                      Enter your email below to create your account.
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
                    <FieldDescription>
                      We&apos;ll use this to contact you. We will not share your
                      email with anyone else.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="John Doe"
                      required
                    />
                  </Field>
                  <Field>
                    <Field className="grid grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel htmlFor="password">Password</FieldLabel>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          required
                          ref={passwordInputRef}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="confirm-password">
                          Confirm Password
                        </FieldLabel>
                        <Input
                          id="confirm-password"
                          type="password"
                          required
                          minLength={8}
                          onInput={validatePasswordConfirmation}
                          ref={confirmPasswordInputRef}
                        />
                      </Field>
                    </Field>
                    <FieldDescription>
                      Must be at least 8 characters long.
                    </FieldDescription>
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
                      Create Account
                    </Button>
                  </Field>

                  <FieldDescription className="text-center text-sm">
                    Already have an account?{" "}
                    <Link
                      href="/login"
                      className="text-primary font-medium hover:underline"
                    >
                      Log in
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
