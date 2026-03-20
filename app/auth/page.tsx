import { AuthView } from "@/src/components/AuthView";

interface AuthPageProps {
  searchParams: Promise<{
    redirectTo?: string;
    reason?: string;
  }>;
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirectTo ?? "/dashboard";
  const reason = params.reason ?? "";

  return <AuthView redirectTo={redirectTo} reason={reason} />;
}
