import { cn } from "@/lib/utils";

/**
 * Shared page title block for every route that renders without the global Topbar.
 *
 * While the Topbar was mounted everywhere it carried the page name, so these
 * headings were secondary: `text-lg`, no rule, and only 16px of air before the
 * page content. With the Topbar dashboard-only they became the top-level title
 * of their page, so this component standardises the rhythm in one place —
 *
 *   - a prominent `h1` (the page had no `h1` of its own before) sized at `text-lg`
 *     to sit just above the Topbar's old `text-base` title rather than jump past
 *     it — the rest of the UI is deliberately dense (14px card titles, 13px
 *     section labels, 11px field labels) and a `text-xl` page title outweighed
 *     every data value on the page,
 *   - a muted description seated one step below it, `max-w-4xl` so even the
 *     longest one in the app (ATM Intelligence, ~120 characters) stays on a single
 *     line — `max-w-3xl` left Money Trail clearing the cap by ~4%, which meant a
 *     different font or platform could tip it onto a second line and drop this
 *     page's rule out of line with the others. Both are also `text-balance`d so a
 *     narrow viewport still breaks into two even lines rather than orphaning the
 *     last two or three words,
 *   - optional page actions (`actions`) centred against the text block on the
 *     trailing edge — a two-line title block is taller than a typical 36–40px
 *     control, so top-aligning the control leaves a dead gap under it and makes
 *     it read as detached,
 *   - a hairline `border-b` that takes over the Topbar's old `border-b` as the
 *     separator between page identity and page content.
 *
 * Only presentation lives here; callers own all copy and the surrounding
 * `<main>` padding so each page keeps its existing rhythm.
 */
export default function PageHeader({ title, description, actions, className }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-balance text-lg font-semibold leading-tight tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 max-w-4xl text-balance text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}