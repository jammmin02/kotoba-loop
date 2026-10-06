import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (lastPage <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        이전
      </Button>
      <span className="text-sm font-bold">
        {page} / {lastPage}
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={page >= lastPage}
        onClick={() => onChange(page + 1)}
      >
        다음
      </Button>
    </div>
  );
}
