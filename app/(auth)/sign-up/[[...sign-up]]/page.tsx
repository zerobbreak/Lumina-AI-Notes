import { SignUp } from "@clerk/nextjs";
import { clerkAuthAppearance } from "@/lib/clerkAppearance";

export default function Page() {
  return <SignUp forceRedirectUrl="/onboarding" appearance={clerkAuthAppearance} />;
}
