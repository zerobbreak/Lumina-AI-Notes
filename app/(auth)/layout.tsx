import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Left side - Image */}
      <div className="hidden lg:flex w-1/2 relative bg-black items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-violet-600/20 to-indigo-900/40 z-10" />
        <Image
          src="/images/auth-bg.png"
          alt="Authentication Background"
          fill
          className="object-cover opacity-80"
          priority
        />
        <div className="relative z-20 text-center px-10">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-white/60 mb-4">
            Welcome to Lumina AI
          </h1>
          <p className="text-gray-300 text-lg">
            Turn your raw lecture audio into a high-fidelity knowledge base.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
        {children}
      </div>
    </div>
  );
}
