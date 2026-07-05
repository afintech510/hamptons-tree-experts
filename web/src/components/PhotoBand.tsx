interface PhotoBandProps {
  src: string;
  alt: string;
  /** CSS object-position, e.g. "center", "center 30%". Defaults to "center". */
  position?: string;
  /** Responsive height utility classes. */
  height?: string;
  /** Optional caption overlaid on the bottom-left. */
  caption?: string;
  className?: string;
}

/**
 * Full-bleed photographic band used beneath page heroes and between sections.
 * Uses a plain <img> (object-cover) so it works under `output: standalone`
 * without the Next image optimizer / sharp runtime dependency.
 */
export function PhotoBand({
  src,
  alt,
  position = "center",
  height = "h-64 sm:h-80 lg:h-[26rem]",
  caption,
  className = "",
}: PhotoBandProps) {
  return (
    <div className={`relative w-full overflow-hidden ${height} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover"
        style={{ objectPosition: position }}
      />
      {caption ? (
        <>
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
          <p className="absolute bottom-4 left-6 max-w-[80%] text-sm font-medium text-white drop-shadow">
            {caption}
          </p>
        </>
      ) : null}
    </div>
  );
}
