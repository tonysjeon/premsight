import type { ResultMark } from '@/lib/season';

const FULL_LABEL: Record<ResultMark, string> = { W: 'won', D: 'drew', L: 'lost' };

export function FormGuide({ marks }: { marks: readonly ResultMark[] }) {
  if (!marks.length) return <span className="card-note">No games played</span>;
  const description = marks.map((mark) => FULL_LABEL[mark]).join(', ');
  return (
    <span className="form" role="img" aria-label={`Last ${marks.length}: ${description}`}>
      {marks.map((mark, index) => (
        <span
          className={`form-mark form-mark--${mark.toLowerCase()}`}
          key={`${index}-${mark}`}
          aria-hidden="true"
        >
          {mark}
        </span>
      ))}
    </span>
  );
}
