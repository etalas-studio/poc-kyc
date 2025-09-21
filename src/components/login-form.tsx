"use client";

import { GalleryVerticalEnd } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin, loginSchema, type LoginData } from "@/hooks/use-auth";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [successMessage, setSuccessMessage] = useState("");
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginData) => {
    try {
      await loginMutation.mutateAsync(data);
      setSuccessMessage("Login successful! Redirecting...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (error) {
      // Error is handled by the mutation
      console.error("Login error:", error);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <a
              href="#"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">Etalas.</span>
            </a>
            <h1 className="text-xl font-bold">Welcome back!</h1>
            {/* <div className="text-center text-sm">
              Don&apos;t have an account?{" "}
              <a
                href="/signup"
                aria-disabled={true}
                className="underline underline-offset-4"
              >
                Sign up
              </a>
            </div> */}
          </div>

          {successMessage && (
            <div className="text-center text-sm text-green-600 bg-green-50 p-3 rounded-md">
              {successMessage}
            </div>
          )}

          {loginMutation.error && (
            <div className="text-center text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {loginMutation.error.message}
            </div>
          )}

          <div className="flex flex-col gap-6">
            <div className="grid gap-3">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={"h@etalas.com"}
                className="h-11"
                {...register("email")}
                disabled={true}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div className="grid gap-3">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={"@Intelcorei7"}
                className="h-11"
                disabled={true}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full h-11"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </div>
      </form>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
