/**
 * RFC 4180 방식의 CSV 파서. 따옴표로 감싼 칸 안의 쉼표·줄바꿈·이중 따옴표(`""`)를 처리하고,
 * 줄바꿈은 CRLF/LF/CR을 모두 받으며, 맨 앞의 UTF-8 BOM은 버린다. 내보내기는 `lib/admin/csv`의
 * `toCsv`(수식 주입 방어 포함)를 그대로 쓰므로 여기는 읽기만 한다.
 */
export class CsvParseError extends Error {
  constructor(
    message: string,
    /** 문제가 시작된 줄(1부터, 따옴표 안 줄바꿈 포함). */
    readonly line: number,
  ) {
    super(message);
    this.name = "CsvParseError";
  }
}

export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let quoteStartLine = 0;
  let line = 1;
  let cellStarted = false;

  const endCell = () => {
    row.push(cell);
    cell = "";
    cellStarted = false;
  };
  const endRow = () => {
    endCell();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === "\n") line++;
        cell += char;
      }
      continue;
    }

    if (char === '"' && !cellStarted) {
      inQuotes = true;
      cellStarted = true;
      quoteStartLine = line;
    } else if (char === ",") {
      endCell();
    } else if (char === "\r" || char === "\n") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      endRow();
      line++;
    } else {
      cell += char;
      cellStarted = true;
    }
  }

  if (inQuotes) {
    throw new CsvParseError('따옴표(")가 닫히지 않았어요.', quoteStartLine);
  }
  // 마지막 줄에 줄바꿈이 없으면 남은 칸/행을 마무리한다(빈 마지막 줄은 행으로 세지 않는다).
  if (cell !== "" || cellStarted || row.length > 0) endRow();

  return rows;
}
