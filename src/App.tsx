import { useCallback, useEffect, useState } from "react";
import { useStorage } from "./hooks/useStorage";
import { useCalc } from "./hooks/useCalc";
import { useBreakpoint } from "./hooks/useBreakpoint";
import { useAuth } from "./hooks/useAuth";
import { useSync } from "./hooks/useSync";
import { Header } from "./components/layout/Header";
import { TaxBar } from "./components/layout/TaxBar";
import { BottomNav, type MobileTab } from "./components/layout/BottomNav";
import { InstallBanner } from "./components/layout/InstallBanner";
import { SummaryCards } from "./components/summary/SummaryCards";
import { PaymentBreakdown } from "./components/summary/PaymentBreakdown";
import { DesktopTable } from "./components/table/DesktopTable";
import { ProjectionSection } from "./components/projection/ProjectionSection";
import { MobileCardList } from "./components/mobile/MobileCardList";
import { FAB } from "./components/mobile/FAB";
import { Sheet } from "./components/forms/Sheet";
import { EntryForm } from "./components/forms/EntryForm";
import { BackupPanel } from "./components/backup/BackupPanel";
import { Toaster, useToast } from "./components/feedback/Toaster";
import { BackupReminder } from "./components/feedback/BackupReminder";
import { FirstUseModal } from "./components/onboarding/FirstUseModal";
import { LoginPanel } from "./components/auth/LoginPanel";
import { SyncStatus } from "./components/auth/SyncStatus";
import {
  getFirstUseAcked,
  requestPersistentStorage,
} from "./lib/storage";
import type { Row } from "./types";

export default function App() {
  const {
    state,
    addRow,
    updateRow,
    deleteRow,
    replaceAllRows,
    mergeRows,
    replaceState,
  } = useStorage();
  const { isMobile } = useBreakpoint();
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tab, setTab] = useState<MobileTab>("lancamentos");
  const [backupOpen, setBackupOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [firstUseOpen, setFirstUseOpen] = useState(() => !getFirstUseAcked());

  const { monthRows, summary, paymentBreakdown, projecao } = useCalc(
    state.rows,
    mes,
    ano,
  );

  // Ask the browser to keep our data even under disk pressure.
  useEffect(() => {
    requestPersistentStorage().then(({ supported, persisted }) => {
      if (supported && !persisted) {
        // Browser declined now; PWA install often promotes data to persistent.
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

  const handleAddInline = useCallback(() => {
    addRow({ mes, ano });
  }, [addRow, mes, ano]);

  const handleAddSheet = useCallback(() => {
    const id = addRow({ mes, ano });
    setEditingId(id);
  }, [addRow, mes, ano]);

  const editing = editingId
    ? state.rows.find((r) => r.id === editingId) ?? null
    : null;

  const closeSheet = () => setEditingId(null);

  const handleSave = (patch: Partial<Row>) => {
    if (!editingId) return;
    (Object.keys(patch) as (keyof Row)[]).forEach((k) => {
      updateRow(editingId, k, patch[k]);
    });
    closeSheet();
    pushToast("Lançamento salvo");
  };

  const handleDeleteFromSheet = () => {
    if (!editingId) return;
    deleteRow(editingId);
    closeSheet();
    pushToast("Lançamento removido");
  };

  return (
    <div className="app-shell">
      <Header
        mes={mes}
        ano={ano}
        onChangeMes={handleChangeMes}
        onOpenBackup={() => setBackupOpen(true)}
        onToggleTaxBar={() => setTaxBarOpen((v) => !v)}
        extraActions={
          <SyncStatus
            configured={auth.configured}
            signedIn={!!auth.user}
            status={sync.status}
            onClick={() => setLoginOpen(true)}
          />
        }
      />
      <InstallBanner />
      <BackupReminder rows={state.rows} onToast={pushToast} />
      <TaxBar visible={taxBarOpen} />

      {(!isMobile || tab === "lancamentos") && (
        <>
          <SummaryCards summary={summary} />
          <PaymentBreakdown breakdown={paymentBreakdown} />
          <DesktopTable
            rows={monthRows}
            summary={summary}
            onAdd={handleAddInline}
            onUpdate={updateRow}
            onDelete={deleteRow}
          />
          <MobileCardList rows={monthRows} onSelect={setEditingId} />
        </>
      )}

      {(!isMobile || tab === "projecao") && (
        <ProjectionSection projecao={projecao} />
      )}

      <FAB onClick={handleAddSheet} />
      <BottomNav active={tab} onChange={setTab} />

      <Sheet
        open={!!editing}
        title={editing?.cliente ? `Editar — ${editing.cliente}` : "Novo lançamento"}
        onClose={closeSheet}
      >
        {editing && (
          <EntryForm
            initial={editing}
            onSave={handleSave}
            onDelete={handleDeleteFromSheet}
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
        cloudAvailable={auth.configured}
        onClose={() => setFirstUseOpen(false)}
        onWantsCloud={() => setLoginOpen(true)}
      />

      <Toaster toasts={toasts} />
    </div>
  );
}
