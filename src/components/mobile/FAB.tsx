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
    >
      +
    </button>
  );
}
