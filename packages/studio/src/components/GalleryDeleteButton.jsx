export default function GalleryDeleteButton({
  onClick,
  title = "Remove from gallery",
  className = "",
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`p-2 bg-black/60 backdrop-blur-md rounded-full text-white transition-all border border-white/10 hover:bg-red-500/90 hover:text-white ${className}`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden
      >
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      </svg>
    </button>
  );
}
