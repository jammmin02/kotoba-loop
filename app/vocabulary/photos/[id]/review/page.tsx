import { redirect } from "next/navigation";

import { PhotoReview } from "@/components/vocabulary/photo-review";
import { auth } from "@/lib/auth";

export default async function PhotoReviewPage(props: PageProps<"/vocabulary/photos/[id]/review">) {
  const session = await auth();
  const { id } = await props.params;
  if (!session?.user) {
    redirect(`/login?callbackUrl=/vocabulary/photos/${id}/review`);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">사진 속 단어 검수</h1>
        <p className="text-sm text-foreground/60">
          AI가 찾아낸 단어를 확인하고, 필요하면 수정하거나 삭제한 뒤 단어장에 추가하세요.
        </p>
      </div>
      <PhotoReview photoId={id} />
    </main>
  );
}
