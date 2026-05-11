import { SignIn } from "@clerk/nextjs";
import { clerkAuthAppearance } from "@/lib/clerkAppearance";

export default function Page() {
  return (
    <SignIn
      forceRedirectUrl="/dashboard"
      appearance={clerkAuthAppearance}
    />
  );
}
