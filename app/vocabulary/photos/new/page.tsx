import { redirect } from "next/navigation";

import { PhotoUploadForm } from "@/components/vocabulary/photo-upload-form";
import { auth } from "@/lib/auth";

export default async function NewPhotoUploadPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/vocabulary/photos/new");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">사진으로 단어장 만들기</h1>
        <p className="text-sm text-foreground/60">
          단어장 페이지를 촬영하거나 사진을 선택하면 다음 단계에서 텍스트를 자동으로 추출해줘요.
        </p>
      </div>
      <PhotoUploadForm />
    </main>
  );
}
