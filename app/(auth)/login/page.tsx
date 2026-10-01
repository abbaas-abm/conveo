import type { Metadata } from "next";
import { AuthGateway } from "@/components/auth/AuthGateway";

export const metadata: Metadata = { title: "Sign In" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { redirectTo } = await props.searchParams;
  return (
    <AuthGateway
      redirectTo={typeof redirectTo === "string" ? redirectTo : undefined}
    />
  );
}
