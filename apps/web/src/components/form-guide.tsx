import type { ResultMark } from '@/lib/season';

const FULL_LABEL: Record<ResultMark, string> = { W: 'won', D: 'drew', L: 'lost' };

export function FormGuide({ marks }: { marks: readonly ResultMark[] }) {
  if (!marks.length) return <span className="next-none">–</span>;
  const description = marks.map((mark) => FULL_LABEL[mark]).join(', ');
  return (
    <span className="form" role="img" aria-label={`Last ${marks.length}: ${description}`}>
      {marks.map((mark, index) => {
        const isLatest = index === marks.length - 1;
        return (
          <span
            className={`form-item${isLatest ? ' form-item--latest' : ''}`}
            key={`${index}-${mark}`}
          >
            <span className={`form-mark form-mark--${mark.toLowerCase()}`} aria-hidden="true">
              {mark}
            </span>
            {isLatest ? (
              <span
                className={`form-latest-bar form-latest-bar--${mark.toLowerCase()}`}
                aria-hidden="true"
              />
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
