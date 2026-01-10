import Image from "@tiptap/extension-image";

// Extend the base TipTap Image extension with custom styling
export const ImageExtension = Image.configure({
  HTMLAttributes: {
    class: "rounded-lg max-w-full h-auto my-4 border border-white/10",
  },
  allowBase64: false,
  inline: false,
});
