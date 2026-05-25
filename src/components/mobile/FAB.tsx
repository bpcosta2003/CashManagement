import styles from "./FAB.module.css";

interface Props {
  onClick: () => void;
}

export function FAB({ onClick }: Props) {
  return (
    <button
      className={styles.fab}
      onClick={onClick}
      aria-label="Novo lançamento"
      data-tour="add-row"
    >
      {/* SVG em vez do glifo "+" — o caractere de texto fica óptico-
          mente fora de centro; o SVG garante centragem perfeita. */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  );
}
