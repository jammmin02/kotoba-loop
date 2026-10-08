import { PixelSpinner } from "@/components/icons/pixel-icons";

export default function Loading() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 py-8"
      role="status"
      aria-live="polite"
    >
      <PixelSpinner className="size-10 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm font-bold text-muted">불러오는 중...</p>
    </main>
  );
}
