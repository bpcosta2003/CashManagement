import type { CalculatedRow } from "../../types";
import { MobileCard } from "./MobileCard";
import styles from "./MobileCard.module.css";

interface Props {
  rows: CalculatedRow[];
  onSelect: (id: string) => void;
}

export function MobileCardList({ rows, onSelect }: Props) {
  return (
    <div className={styles.list}>
      {rows.length === 0 ? (
        <div className={styles.empty}>
          Nenhum lançamento neste mês.
          <br />
          Toque no <strong>+</strong> para adicionar.
        </div>
      ) : (
        rows.map((r) => (
          <MobileCard key={r.id} row={r} onClick={() => onSelect(r.id)} />
        ))
      )}
    </div>
  );
}
