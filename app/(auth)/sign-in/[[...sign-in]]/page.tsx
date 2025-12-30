import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <SignIn
      forceRedirectUrl="/dashboard"
      appearance={{
        elements: {
          rootBox: "mx-auto",
          card: "bg-background/50 backdrop-blur-md border-border shadow-xl",
          headerTitle: "text-foreground",
          headerSubtitle: "text-muted-foreground",
          socialButtonsBlockButton:
            "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          formButtonPrimary:
            "bg-primary text-primary-foreground hover:bg-primary/90",
          footerActionLink: "text-primary hover:text-primary/90",
        },
      }}
    />
  );
}
