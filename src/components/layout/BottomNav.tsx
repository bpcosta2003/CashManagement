import styles from "./BottomNav.module.css";

export type MobileTab =
  | "lancamentos"
  | "projecao"
  | "clientes"
  | "catalogo"
  | "backup";

interface Props {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
}

const TABS: { id: MobileTab; label: string; icon: string }[] = [
  { id: "lancamentos", label: "Lançamentos", icon: "📋" },
  { id: "projecao", label: "Projeção", icon: "📈" },
  { id: "clientes", label: "Clientes", icon: "👥" },
  { id: "catalogo", label: "Catálogo", icon: "🏷️" },
  { id: "backup", label: "Backup", icon: "💾" },
];

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav className={styles.nav}>
      {TABS.map((t) => (
        <button
          key={t.id}
          className={styles.btn}
          data-active={t.id === active}
          onClick={() => onChange(t.id)}
        >
          <span className={styles.icon}>{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
