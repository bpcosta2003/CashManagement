import { useCallback, useEffect, useRef, useState } from "react";
import { useStorage } from "./hooks/useStorage";
import { useCalc } from "./hooks/useCalc";
import { useBreakpoint } from "./hooks/useBreakpoint";
import { useAuth } from "./hooks/useAuth";
import { useSync } from "./hooks/useSync";
import { useTheme } from "./hooks/useTheme";
import { Header } from "./components/layout/Header";
import { MonthNav } from "./components/layout/MonthNav";
import { TaxBar } from "./components/layout/TaxBar";
import { BottomNav, type MobileTab } from "./components/layout/BottomNav";
import { InstallBanner } from "./components/layout/InstallBanner";
import { ThemeToggle } from "./components/layout/ThemeToggle";
import { SummaryCards } from "./components/summary/SummaryCards";
import { PaymentBreakdown } from "./components/summary/PaymentBreakdown";
import { EntryList } from "./components/list/EntryList";
import { ProjectionSection } from "./components/projection/ProjectionSection";
import { FAB } from "./components/mobile/FAB";
import { Sheet } from "./components/forms/Sheet";
import { EntryForm } from "./components/forms/EntryForm";
import { BackupPanel } from "./components/backup/BackupPanel";
import { Toaster, useToast } from "./components/feedback/Toaster";
import { BackupReminder } from "./components/feedback/BackupReminder";
import { FirstUseModal } from "./components/onboarding/FirstUseModal";
import { LoginPanel } from "./components/auth/LoginPanel";
import { SyncStatus } from "./components/auth/SyncStatus";
import { requestPersistentStorage } from "./lib/storage";
import { uid } from "./lib/calc";
import type { BusinessProfile, Row } from "./types";

type SheetMode =
  | { kind: "create"; draft: Row }
  | { kind: "edit"; id: string }
  | null;

function makeBlankRow(mes: number, ano: number): Row {
  return {
    id: uid(),
    cliente: "",
    servico: "",
    valor: "",
    forma: "Pix",
    parc: 1,
    taxa: 0,
    custo: "",
    desconto: "",
    status: "Pago",
    mes,
    ano,
    criadoEm: new Date().toISOString(),
  };
}

export default function App() {
  const {
    state,
    commitRow,
    updateRow,
    deleteRow,
    replaceAllRows,
    mergeRows,
    setBusiness,
    setSettings,
    replaceState,
  } = useStorage();
  const { isMobile } = useBreakpoint();
  const { theme, toggle: toggleTheme } = useTheme();
  const auth = useAuth();
  const { toasts, push: pushToast } = useToast();
  const sync = useSync({
    user: auth.user,
    state,
    replaceState,
    onError: pushToast,
  });

  const today = new Date();
  const [mes, setMes] = useState(today.getMonth());
  const [ano, setAno] = useState(today.getFullYear());
  const [taxBarOpen, setTaxBarOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [tab, setTab] = useState<MobileTab>("lancamentos");
  const [backupOpen, setBackupOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  // Onboarding: mostra quando ainda não tem nome do empreendimento.
  const businessName = state.business?.name?.trim() ?? "";
  const [firstUseOpen, setFirstUseOpen] = useState(() => !businessName);

  useEffect(() => {
    // Se o estado mudou e ainda não há business name, mantém o modal aberto.
    if (!businessName) setFirstUseOpen(true);
  }, [businessName]);

  const {
    monthRows,
    summary,
    paymentBreakdown,
    projecao,
    liqDelta,
    prevMonthLabel,
    sparkline,
  } = useCalc(state.rows, mes, ano);

  // Track whether the inline "+ Novo" in EntryList is visible. The floating
  // FAB only appears when the inline button is OUT of view (mobile scroll).
  const addBtnRef = useRef<HTMLButtonElement | null>(null);
  const [inlineAddVisible, setInlineAddVisible] = useState(true);
  useEffect(() => {
    const el = addBtnRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => setInlineAddVisible(entry.isIntersecting),
      { rootMargin: "-56px 0px 0px 0px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [tab]);

  // Ask the browser to keep our data even under disk pressure.
  useEffect(() => {
    requestPersistentStorage().then(({ supported, persisted }) => {
      if (supported && !persisted) {
        console.info("Storage não-persistente. Instale o app para proteger.");
      }
    });
  }, []);

  // Mobile "backup" tab opens the panel
  useEffect(() => {
    if (isMobile && tab === "backup") {
      setBackupOpen(true);
      setTab("lancamentos");
    }
  }, [isMobile, tab]);

  // Quota toast
  useEffect(() => {
    const handler = () =>
      pushToast(
        "⚠️ Armazenamento quase cheio. Exporte um backup e limpe os dados antigos.",
      );
    window.addEventListener("storage-quota-exceeded", handler);
    return () => window.removeEventListener("storage-quota-exceeded", handler);
  }, [pushToast]);

  const handleChangeMes = useCallback((m: number, y: number) => {
    setMes(m);
    setAno(y);
  }, []);

  const handleAddSheet = useCallback(() => {
    setSheetMode({ kind: "create", draft: makeBlankRow(mes, ano) });
  }, [mes, ano]);

  const handleEditSheet = useCallback((id: string) => {
    setSheetMode({ kind: "edit", id });
  }, []);

  const closeSheet = () => setSheetMode(null);

  const editingRow: Row | null =
    sheetMode?.kind === "edit"
      ? (state.rows.find((r) => r.id === sheetMode.id) ?? null)
      : sheetMode?.kind === "create"
        ? sheetMode.draft
        : null;

  const handleSave = (row: Row) => {
    if (!sheetMode) return;
    if (sheetMode.kind === "create") {
      commitRow(row);
      pushToast("Lançamento adicionado");
    } else {
      (Object.keys(row) as (keyof Row)[]).forEach((k) => {
        updateRow(sheetMode.id, k, row[k]);
      });
      pushToast("Lançamento atualizado");
    }
    closeSheet();
  };

  const handleDeleteFromSheet = () => {
    if (sheetMode?.kind !== "edit") return;
    deleteRow(sheetMode.id);
    pushToast("Lançamento removido");
    closeSheet();
  };

  const handleDeleteInline = useCallback(
    (id: string, cliente: string) => {
      const label = cliente.trim() || "este lançamento";
      const ok = window.confirm(
        `Remover ${label}?\n\nEssa ação não pode ser desfeita.`,
      );
      if (!ok) return;
      deleteRow(id);
      pushToast("Lançamento removido");
    },
    [deleteRow, pushToast],
  );

  const handleSubmitBusiness = (business: BusinessProfile) => {
    setBusiness(business);
    setFirstUseOpen(false);
  };

  return (
    <div className="app-shell">
      <Header
        businessName={businessName}
        onOpenBackup={() => setBackupOpen(true)}
        onToggleTaxBar={() => setTaxBarOpen((v) => !v)}
        extraActions={
          <>
            <SyncStatus
              configured={auth.configured}
              signedIn={!!auth.user}
              status={sync.status}
              onClick={() => setLoginOpen(true)}
            />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </>
        }
      />
      <InstallBanner />
      <BackupReminder
        rows={state.rows}
        autoConsent={state.settings?.autoBackupConsent ?? null}
        onSetAutoConsent={(consent) => setSettings({ autoBackupConsent: consent })}
        onToast={pushToast}
      />
      <TaxBar visible={taxBarOpen} />
      <MonthNav mes={mes} ano={ano} onChange={handleChangeMes} />

      {(!isMobile || tab === "lancamentos") && (
        <>
          <SummaryCards
            summary={summary}
            mes={mes}
            liqDelta={liqDelta}
            prevMonthLabel={prevMonthLabel}
          />
          <PaymentBreakdown
            breakdown={paymentBreakdown}
            sparkline={sparkline}
          />
          <EntryList
            rows={monthRows}
            summary={summary}
            onAdd={handleAddSheet}
            onSelect={handleEditSheet}
            onDelete={handleDeleteInline}
            addBtnRef={addBtnRef}
          />
        </>
      )}

      {(!isMobile || tab === "projecao") && (
        <ProjectionSection projecao={projecao} />
      )}

      {tab === "lancamentos" && !inlineAddVisible && (
        <FAB onClick={handleAddSheet} />
      )}
      <BottomNav active={tab} onChange={setTab} />

      <Sheet
        open={!!editingRow}
        title={
          sheetMode?.kind === "create"
            ? "Novo lançamento"
            : editingRow?.cliente
              ? `Editar — ${editingRow.cliente}`
              : "Editar lançamento"
        }
        onClose={closeSheet}
      >
        {editingRow && (
          <EntryForm
            initial={editingRow}
            isNew={sheetMode?.kind === "create"}
            onSave={handleSave}
            onDelete={
              sheetMode?.kind === "edit" ? handleDeleteFromSheet : undefined
            }
            onCancel={closeSheet}
          />
        )}
      </Sheet>

      <BackupPanel
        open={backupOpen}
        rows={state.rows}
        onClose={() => setBackupOpen(false)}
        onImportMerge={mergeRows}
        onImportReplace={replaceAllRows}
        onClearAll={() => replaceAllRows([])}
        onToast={pushToast}
      />

      <LoginPanel
        open={loginOpen}
        user={auth.user}
        syncStatus={sync.status}
        lastSyncAt={sync.lastSyncAt}
        onClose={() => setLoginOpen(false)}
        onSignIn={auth.signInWithEmail}
        onSignOut={auth.signOut}
      />

      <FirstUseModal
        open={firstUseOpen}
        initialBusiness={state.business}
        cloudAvailable={auth.configured}
        onSubmit={handleSubmitBusiness}
        onClose={() => setFirstUseOpen(false)}
        onWantsCloud={() => setLoginOpen(true)}
      />

      <Toaster toasts={toasts} />
    </div>
  );
}
