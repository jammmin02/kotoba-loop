import type { SVGProps } from "react";

/**
 * Hand-drawn pixel-art icon set (16x16 grid, 2-unit blocks) replacing the
 * subset of Lucide icons used across the UI, to match the Y2K pixel-desktop
 * reskin (see kotoba-loop-roadmap.md D.2). Same prop contract as Lucide
 * icons — `className`/`aria-hidden` etc. — so they drop in as-is, including
 * in `Record<Category, PixelIconComponent>` icon maps.
 */
export type PixelIconComponent = (props: SVGProps<SVGSVGElement>) => React.JSX.Element;

type Block = readonly [x: number, y: number, w: number, h: number];

function PixelGlyph({ blocks, ...props }: { blocks: readonly Block[] } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" shapeRendering="crispEdges" {...props}>
      {blocks.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} />
      ))}
    </svg>
  );
}

export const PixelHome: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [7, 0, 2, 2],
      [5, 2, 6, 2],
      [3, 4, 10, 2],
      [1, 6, 14, 2],
      [3, 8, 10, 6],
    ]}
    {...props}
  />
);

export const PixelBookOpen: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [1, 4, 6, 9],
      [9, 4, 6, 9],
      [7, 3, 2, 10],
    ]}
    {...props}
  />
);

export const PixelPenTool: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [1, 12, 3, 3],
      [4, 9, 3, 3],
      [7, 6, 3, 3],
      [10, 3, 3, 3],
      [12, 1, 3, 3],
    ]}
    {...props}
  />
);

export const PixelSparkles: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [7, 2, 2, 4],
      [7, 10, 2, 4],
      [2, 7, 4, 2],
      [10, 7, 4, 2],
      [6, 6, 4, 4],
      [1, 1, 2, 2],
    ]}
    {...props}
  />
);

export const PixelBarChart: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [2, 10, 3, 4],
      [6, 6, 3, 8],
      [10, 2, 3, 12],
    ]}
    {...props}
  />
);

export const PixelUser: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [6, 1, 4, 4],
      [4, 7, 8, 3],
      [2, 10, 12, 4],
    ]}
    {...props}
  />
);

export const PixelCheck: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [2, 7, 3, 3],
      [4, 9, 3, 3],
      [6, 11, 3, 3],
      [9, 7, 3, 3],
      [12, 3, 3, 3],
    ]}
    {...props}
  />
);

export const PixelX: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [1, 1, 3, 3],
      [5, 5, 3, 3],
      [9, 9, 3, 3],
      [12, 12, 3, 3],
      [12, 1, 3, 3],
      [8, 5, 3, 3],
      [4, 9, 3, 3],
      [1, 12, 3, 3],
    ]}
    {...props}
  />
);

export const PixelInfo: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [6, 2, 4, 3],
      [6, 7, 4, 7],
    ]}
    {...props}
  />
);

export const PixelFlame: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [7, 0, 2, 2],
      [6, 2, 4, 2],
      [5, 4, 6, 2],
      [4, 6, 8, 2],
      [5, 8, 6, 2],
      [4, 10, 8, 2],
      [5, 12, 6, 3],
    ]}
    {...props}
  />
);

export const PixelLock: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [5, 0, 6, 2],
      [4, 2, 2, 4],
      [10, 2, 2, 4],
      [2, 6, 12, 8],
    ]}
    {...props}
  />
);

export const PixelChevronDown: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [2, 4, 3, 3],
      [5, 7, 3, 3],
      [8, 7, 3, 3],
      [11, 4, 3, 3],
    ]}
    {...props}
  />
);

export const PixelPlus: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [6, 1, 4, 14],
      [1, 6, 14, 4],
    ]}
    {...props}
  />
);

export const PixelTrash: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [6, 0, 4, 2],
      [3, 2, 10, 2],
      [4, 4, 8, 11],
    ]}
    {...props}
  />
);

export const PixelStar: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [7, 0, 2, 4],
      [6, 4, 4, 2],
      [1, 6, 14, 2],
      [3, 8, 10, 2],
      [4, 10, 8, 2],
      [3, 12, 3, 2],
      [10, 12, 3, 2],
      [1, 14, 2, 2],
      [13, 14, 2, 2],
    ]}
    {...props}
  />
);

export const PixelFlag: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [3, 1, 2, 14],
      [5, 1, 9, 2],
      [5, 3, 7, 2],
      [5, 5, 9, 2],
      [5, 7, 5, 2],
    ]}
    {...props}
  />
);

export const PixelSearch: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [2, 2, 8, 2],
      [2, 8, 8, 2],
      [2, 4, 2, 4],
      [8, 4, 2, 4],
      [9, 9, 2, 2],
      [11, 11, 2, 2],
      [13, 13, 2, 2],
    ]}
    {...props}
  />
);

export const PixelSpinner: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [7, 0, 2, 4],
      [7, 12, 2, 4],
      [0, 7, 4, 2],
      [12, 7, 4, 2],
    ]}
    {...props}
  />
);

export const PixelCamera: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [1, 5, 14, 9],
      [5, 3, 5, 2],
      [11, 7, 2, 2],
      [5, 8, 6, 5],
    ]}
    {...props}
  />
);

export const PixelImage: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [1, 2, 14, 12],
      [3, 4, 3, 3],
      [3, 11, 4, 2],
      [7, 9, 3, 2],
      [10, 6, 3, 5],
    ]}
    {...props}
  />
);

/** MY > 내 펫(components/my/my-page-view.tsx) 메뉴 아이콘 — 다마고치형 펫 성장 시스템(계획서 외 신규 기능). */
export const PixelEgg: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [6, 1, 4, 2],
      [4, 3, 8, 2],
      [3, 5, 10, 5],
      [4, 10, 8, 2],
      [6, 12, 4, 2],
    ]}
    {...props}
  />
);

/** MY > 친구(components/my/my-page-view.tsx) 메뉴 아이콘 — 겹쳐진 두 사람 실루엣(PROMPT 58). */
export const PixelUsers: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [2, 2, 3, 3],
      [1, 6, 5, 3],
      [8, 4, 4, 4],
      [6, 9, 8, 3],
      [5, 12, 10, 3],
    ]}
    {...props}
  />
);

/** PWA 홈 화면 추가 배너(components/pwa/install-prompt-banner.tsx) 아이콘 — 트레이로 내려오는 화살표(PROMPT 56). */
export const PixelDownload: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [7, 1, 2, 7],
      [4, 6, 2, 2],
      [10, 6, 2, 2],
      [6, 9, 4, 2],
      [1, 12, 14, 3],
    ]}
    {...props}
  />
);

/** MY > 커뮤니티 단어장(components/my/my-page-view.tsx) 메뉴 아이콘 — 위도선 지구본(PROMPT 58). */
export const PixelGlobe: PixelIconComponent = (props) => (
  <PixelGlyph
    blocks={[
      [6, 1, 4, 1],
      [4, 3, 8, 1],
      [2, 5, 12, 1],
      [1, 7, 14, 2],
      [2, 10, 12, 1],
      [4, 12, 8, 1],
      [6, 14, 4, 1],
    ]}
    {...props}
  />
);
