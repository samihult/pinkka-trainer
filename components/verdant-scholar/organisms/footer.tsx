/** Verdant Scholar footer matches the quiet institutional footer used across the Stitch layouts. */
import { cn } from "@/lib/utils";

/** Footer link metadata for Verdant Scholar layouts. */
export interface VerdantScholarFooterLink {
  href?: string;
  label: string;
}

/**
 * Props for the Verdant Scholar footer.
 * @property brand Brand label shown on the left.
 * @property className Optional wrapper classes.
 * @property links Footer links rendered in order.
 * @property meta Secondary copyright or institutional copy.
 */
export interface VerdantScholarFooterProps {
  brand: string;
  className?: string;
  links: VerdantScholarFooterLink[];
  meta: string;
}

/** Quiet institutional footer with brand block and policy links. */
export function VerdantScholarFooter({
  brand,
  className,
  links,
  meta,
}: VerdantScholarFooterProps) {
  return (
    <footer
      className={cn("border-t border-[color:rgba(194,201,180,0.2)]", className)}
    >
      <div className="mx-auto grid w-full max-w-[var(--vs-layout-max-width)] gap-6 px-6 py-8 text-[length:var(--vs-font-label-md)] uppercase tracking-[0.14em] text-[color:rgba(67,73,57,0.78)] lg:grid-cols-[1.2fr_2fr_1fr] lg:px-8">
        <div>
          <p className="text-sm text-[var(--vs-color-primary)] [font-family:var(--vs-font-display-family)] font-bold normal-case tracking-tight">
            {brand}
          </p>
          <p className="mt-2 leading-5 normal-case">{meta}</p>
        </div>
        <div className="flex flex-wrap gap-5">
          {links.map((link) => (
            <a key={link.label} href={link.href ?? "#"}>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
