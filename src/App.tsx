import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStorage } from "./hooks/useStorage";
import { useCalc } from "./hooks/useCalc";
import { useAnnual } from "./hooks/useAnnual";
import { useClients } from "./hooks/useClients";
import { useBreakpoint } from "./hooks/useBreakpoint";
import { useAuth } from "./hooks/useAuth";
import { useSync } from "./hooks/useSync";
import { useTheme } from "./hooks/useTheme";
import { Header } from "./components/layout/Header";
import { PeriodNav, type Period } from "./components/layout/PeriodNav";
import { TaxBar } from "./components/layout/TaxBar";
import { BottomNav, type MobileTab } from "./components/layout/BottomNav";
import { InstallBanner } from "./components/layout/InstallBanner";
import { ThemeToggle } from "./components/layout/ThemeToggle";
import { SummaryCards } from "./components/summary/SummaryCards";
import { PaymentBreakdown } from "./components/summary/PaymentBreakdown";
import { EntryList } from "./components/list/EntryList";
import { ProjectionSection } from "./components/projection/ProjectionSection";
import { AnnualDashboard } from "./components/annual/AnnualDashboard";
import { ClientsView } from "./components/clients/ClientsView";
import { FAB } from "./components/mobile/FAB";
import { Sheet } from "./components/forms/Sheet";
import { EntryForm } from "./components/forms/EntryForm";
import { BackupPanel } from "./components/backup/BackupPanel";
import { Toaster, useToast } from "./components/feedback/Toaster";
import { BackupReminder } from "./components/feedback/BackupReminder";
import { FirstUseModal } from "./components/onboarding/FirstUseModal";
import { LoginPanel } from "./components/auth/LoginPanel";
import { SyncStatus } from "./components/auth/SyncStatus";
import { BusinessSwitcher } from "./components/business/BusinessSwitcher";
import { requestPersistentStorage } from "./lib/storage";
import { uid } from "./lib/calc";
import type { BusinessProfile, Row } from "./types";

type SheetMode =
  | { kind: "create"; draft: Row }
  | { kind: "edit"; id: string }
  | null;

function makeBlankRow(mes: number, ano: number, businessId: string): Row {
  return {
    id: uid(),
    businessId,
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
    addBusiness,
    updateBusiness,
    deleteBusiness,
    setActiveBusinessId,
    upsertClient,
    updateClient,
    deleteClient,
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
  const [period, setPeriod] = useState<Period>("month");
  const [taxBarOpen, setTaxBarOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [tab, setTab] = useState<MobileTab>("lancamentos");
  const [backupOpen, setBackupOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const activeBusinessId = state.activeBusinessId;
  const activeBusiness = useMemo(
    () => state.businesses.find((b) => b.id === activeBusinessId) ?? null,
    [state.businesses, activeBusinessId],
  );
  const businessName = activeBusiness?.name ?? "";

  // Onboarding: mostra quando não tem nenhum empreendimento ainda.
  const needsOnboarding = state.businesses.length === 0;
  const [firstUseOpen, setFirstUseOpen] = useState(needsOnboarding);

  useEffect(() => {
    setFirstUseOpen(needsOnboarding);
  }, [needsOnboarding]);

  // Clientes do empreendimento ativo (passados pro autocomplete)
  const activeClients = useMemo(
    () =>
      activeBusinessId
        ? state.clients.filter((c) => c.businessId === activeBusinessId)
        : [],
    [state.clients, activeBusinessId],
  );

  const {
    monthRows,
    summary,
    paymentBreakdown,
    projecao,
    liqDelta,
    prevMonthLabel,
    sparkline,
  } = useCalc(state.rows, mes, ano, activeBusinessId);

  const annual = useAnnual(state.rows, ano, activeBusinessId);
  const clientStats = useClients(state.clients, state.rows, activeBusinessId);

  // Sugestões de serviço pro autocomplete do EntryForm — únicos do
  // empreendimento ativo, ordenados pelo uso mais recente.
  const servicoSuggestions = useMemo(() => {
    if (!activeBusinessId) return [];
    const seen = new Map<string, string>();
    const scoped = state.rows.filter(
      (r) => r.businessId === activeBusinessId && r.servico.trim(),
    );
    // Mais recentes primeiro
    [...scoped]
      .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1))
      .forEach((r) => {
        const trimmed = r.servico.trim();
        const key = trimmed.toLowerCase();
        if (!seen.has(key)) seen.set(key, trimmed);
      });
    return Array.from(seen.values()).slice(0, 30);
  }, [state.rows, activeBusinessId]);

  const handleSelectMonthFromAnnual = useCallback((m: number, y: number) => {
    setMes(m);
    setAno(y);
    setPeriod("month");
    setTab("lancamentos");
  }, []);

  // Track whether the inline "+ Novo" in EntryList is visible.
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

  useEffect(() => {
    requestPersistentStorage().then(({ supported, persisted }) => {
      if (supported && !persisted) {
        console.info("Storage não-persistente. Instale o app para proteger.");
      }
    });
  }, []);

  useEffect(() => {
    if (isMobile && tab === "backup") {
      setBackupOpen(true);
      setTab("lancamentos");
    }
  }, [isMobile, tab]);

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
    if (!activeBusinessId) {
      setFirstUseOpen(true);
      return;
    }
    setSheetMode({
      kind: "create",
      draft: makeBlankRow(mes, ano, activeBusinessId),
    });
  }, [mes, ano, activeBusinessId]);

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

  const handleSave = (row: Row, clientPhone?: string) => {
    if (!sheetMode) return;
    // Upsert cliente: tanto na criação quanto na edição.
    upsertClient(row.cliente, clientPhone);

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

  const handleSubmitBusiness = (profile: BusinessProfile) => {
    addBusiness({ name: profile.name, type: profile.type });
    setFirstUseOpen(false);
  };

  const showSwitcher = state.businesses.length > 0;

  return (
    <div className="app-shell">
      <Header
        businessName={businessName}
        onBrandClick={showSwitcher ? () => setSwitcherOpen(true) : undefined}
        showBrandChevron={showSwitcher}
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

      {/* PeriodNav só faz sentido em visões com tempo (não em Clientes) */}
      {!(isMobile && tab === "clientes") && (
        <PeriodNav
          period={period}
          mes={mes}
          ano={ano}
          onChangePeriod={setPeriod}
          onChangeMes={handleChangeMes}
          onChangeAno={setAno}
        />
      )}

      {isMobile && tab === "clientes" ? (
        <ClientsView
          clients={clientStats}
          onUpdate={updateClient}
          onDelete={deleteClient}
        />
      ) : period === "year" ? (
        <AnnualDashboard
          summary={annual}
          onSelectMonth={handleSelectMonthFromAnnual}
        />
      ) : (
        <>
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

          {/* Desktop mostra Clientes embedded no fim do flow */}
          {!isMobile && clientStats.length > 0 && (
            <ClientsView
              clients={clientStats}
              onUpdate={updateClient}
              onDelete={deleteClient}
            />
          )}
        </>
      )}

      {period === "month" &&
        tab === "lancamentos" &&
        !inlineAddVisible && <FAB onClick={handleAddSheet} />}
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
            clients={activeClients}
            servicoSuggestions={servicoSuggestions}
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
        rows={state.rows.filter(
          (r) => !activeBusinessId || r.businessId === activeBusinessId,
        )}
        onClose={() => setBackupOpen(false)}
        onImportMerge={(rows) =>
          mergeRows(
            rows.map((r) => ({
              ...r,
              businessId: r.businessId || activeBusinessId,
            })),
          )
        }
        onImportReplace={(rows) => {
          // Substitui apenas os do empreendimento ativo, preserva os outros
          const others = state.rows.filter(
            (r) => r.businessId !== activeBusinessId,
          );
          const scoped = rows.map((r) => ({
            ...r,
            businessId: activeBusinessId,
          }));
          replaceAllRows([...others, ...scoped]);
        }}
        onClearAll={() => {
          const others = state.rows.filter(
            (r) => r.businessId !== activeBusinessId,
          );
          replaceAllRows(others);
        }}
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

      <BusinessSwitcher
        open={switcherOpen}
        businesses={state.businesses}
        activeBusinessId={activeBusinessId}
        onClose={() => setSwitcherOpen(false)}
        onSelect={setActiveBusinessId}
        onCreate={(data) => addBusiness(data)}
        onUpdate={updateBusiness}
        onDelete={deleteBusiness}
      />

      <FirstUseModal
        open={firstUseOpen}
        cloudAvailable={auth.configured}
        onSubmit={handleSubmitBusiness}
        onClose={() => setFirstUseOpen(false)}
        onWantsCloud={() => setLoginOpen(true)}
      />

      <Toaster toasts={toasts} />
    </div>
  );
}
