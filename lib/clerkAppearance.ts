/** Shared Clerk UI styling for sign-in and desktop browser auth callback. */
export const clerkAuthAppearance = {
  elements: {
    rootBox: "mx-auto w-full max-w-[420px]",
    card: "!bg-[rgba(11,17,32,0.85)] !backdrop-blur-xl !border !border-white/[0.06] !shadow-[0_8px_32px_rgba(0,0,0,0.4)] !rounded-2xl",
    headerTitle: "!text-[#e2e8f0] font-display",
    headerSubtitle: "!text-[#94a3b8]",
    socialButtonsBlockButton:
      "!bg-[rgba(255,255,255,0.04)] !border !border-white/[0.08] !text-[#e2e8f0] hover:!bg-[rgba(255,255,255,0.08)] hover:!border-white/[0.12] !transition-all !duration-200",
    socialButtonsBlockButtonText: "!text-[#e2e8f0] !font-medium",
    dividerLine: "!bg-white/[0.08]",
    dividerText: "!text-[#64748b]",
    formFieldLabel: "!text-[#94a3b8] !text-sm",
    formFieldInput:
      "!bg-[rgba(255,255,255,0.04)] !border !border-white/[0.08] !text-[#e2e8f0] !rounded-lg placeholder:!text-[#475569] focus:!border-[#d4a853]/50 focus:!ring-1 focus:!ring-[#d4a853]/30 !transition-all !duration-200",
    formButtonPrimary:
      "!bg-gradient-to-r !from-[#d4a853] !to-[#2dd4bf] !text-[#050a14] !font-semibold hover:!shadow-[0_0_20px_rgba(212,168,83,0.3)] !transition-all !duration-300 !border-0",
    formFieldAction: "!text-[#d4a853] hover:!text-[#2dd4bf] !transition-colors",
    footerActionLink: "!text-[#d4a853] hover:!text-[#2dd4bf] !transition-colors !font-medium",
    footerActionText: "!text-[#64748b]",
    identityPreviewEditButton: "!text-[#d4a853] hover:!text-[#2dd4bf]",
    identityPreviewText: "!text-[#e2e8f0]",
    formFieldInputShowPasswordButton: "!text-[#64748b] hover:!text-[#e2e8f0]",
    otpCodeFieldInput:
      "!bg-[rgba(255,255,255,0.04)] !border !border-white/[0.08] !text-[#e2e8f0] focus:!border-[#d4a853]/50",
    formResendCodeLink: "!text-[#d4a853] hover:!text-[#2dd4bf]",
    alert: "!bg-[rgba(255,100,100,0.08)] !border !border-red-500/20 !text-red-300",
    alertText: "!text-red-300",
    footer: "!bg-transparent",
    cardBox: "!shadow-none",
  },
  layout: {
    socialButtonsPlacement: "top",
    showOptionalFields: false,
  },
} as const;
