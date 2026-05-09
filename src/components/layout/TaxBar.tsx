import { FORMA_COLORS } from "../../constants";
import styles from "./TaxBar.module.css";

interface Props {
  visible: boolean;
}

const ITEMS = [
  { forma: "Dinheiro", taxa: "0%" },
  { forma: "Pix", taxa: "0%" },
  { forma: "Débito", taxa: "1.5%" },
  { forma: "Crédito 1×", taxa: "2.9%", color: "Crédito" },
  { forma: "Crédito 2–6×", taxa: "3.9%", color: "Crédito" },
  { forma: "Crédito 7×+", taxa: "4.9%", color: "Crédito" },
];

export function TaxBar({ visible }: Props) {
  if (!visible) return null;
  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <span className={styles.label}>Taxas de referência</span>
        {ITEMS.map((it) => {
          const colorKey = it.color ?? it.forma;
          const c = FORMA_COLORS[colorKey];
          return (
            <span
              key={it.forma}
              className={styles.chip}
              style={
                c
                  ? { background: c.bg, borderColor: c.border, color: c.c }
                  : undefined
              }
            >
              {it.forma} <strong>{it.taxa}</strong>
            </span>
          );
        })}
      </div>
    </div>
  );
}
