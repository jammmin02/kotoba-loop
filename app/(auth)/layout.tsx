import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <Image src="/image.png" alt="" fill preload className="object-cover" aria-hidden="true" />
      <div className="relative w-full max-w-sm">{children}</div>
    </main>
  );
}
