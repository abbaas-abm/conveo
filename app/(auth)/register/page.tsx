import type { Metadata } from "next";
import { AuthGateway } from "@/components/auth/AuthGateway";

export const metadata: Metadata = { title: "Register" };

export default async function RegisterPage(props: PageProps<"/register">) {
  const { redirectTo } = await props.searchParams;
  return (
    <AuthGateway
      redirectTo={typeof redirectTo === "string" ? redirectTo : undefined}
    />
  );
}
