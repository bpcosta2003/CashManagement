import { useEffect, useRef, useState } from "react";
import type { Row } from "../../types";
import type { ImportResult } from "../../lib/excel";
import {
  clearState,
  daysSince,
  getLastBackup,
  getStorageSize,
  isStoragePersisted,
  setLastBackup,
} from "../../lib/storage";
import styles from "./BackupPanel.module.css";

const loadExcel = () => import("../../lib/excel");

interface Props {
  open: boolean;
  rows: Row[];
  onClose: () => void;
  onImportMerge: (rows: Row[]) => void;
  onImportReplace: (rows: Row[]) => void;
  onClearAll: () => void;
  onToast?: (msg: string) => void;
}

interface PreviewState {
  fileName: string;
  result: ImportResult;
}

export function BackupPanel({
  open,
  rows,
  onClose,
  onImportMerge,
  onImportReplace,
  onClearAll,
  onToast,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [persisted, setPersisted] = useState(false);

  useEffect(() => {
    if (!open) {
      setPreview(null);
      setConfirmReplace(false);
      return;
    }
    isStoragePersisted().then(setPersisted);
  }, [open]);

  if (!open) return null;

  const lastBackup = getLastBackup();
  const lastBackupDays = daysSince(lastBackup);

  const handleExport = async () => {
    try {
      const { exportToExcel } = await loadExcel();
      exportToExcel(rows);
      setLastBackup();
      onToast?.("Backup exportado com sucesso");
    } catch (e) {
      console.error(e);
      onToast?.("Erro ao exportar backup");
    }
  };

  const handlePickFile = () => fileRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const { importFromExcel } = await loadExcel();
    const result = await importFromExcel(file);
    setPreview({ fileName: file.name, result });
  };

  const handleClear = () => {
    if (confirm("Apagar TODOS os dados do app? Essa ação não pode ser desfeita.")) {
      clearState();
      onClearAll();
      onToast?.("Todos os dados foram apagados");
      onClose();
    }
  };

  const totalImport = preview?.result.rows.length ?? 0;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    // No desktop, não fechar por clique fora (seleção de texto escapa)
    if (typeof window !== "undefined" && window.innerWidth > 720) return;
    onClose();
  };

  return (
    <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
      <div className={styles.panel} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <span className={styles.title}>💾 Backup & Restauração</span>
          <button className={styles.close} onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        {!preview ? (
          <div className={styles.body}>
            <button className={styles.action} onClick={handleExport}>
              <span className={styles.actionIcon}>📥</span>
              <span className={styles.actionTextWrap}>
                <span className={styles.actionTitle}>Exportar Excel</span>
                <span className={styles.actionDesc}>
                  Baixa o arquivo .xlsx com todos os dados em 3 abas:
                  Lançamentos, Resumo Mensal e Projeção Futura.
                </span>
              </span>
            </button>

            <button className={styles.action} onClick={handlePickFile}>
              <span className={styles.actionIcon}>📤</span>
              <span className={styles.actionTextWrap}>
                <span className={styles.actionTitle}>Importar Excel</span>
                <span className={styles.actionDesc}>
                  Restaurar de um arquivo .xlsx. Você verá um preview antes
                  de confirmar.
                </span>
              </span>
            </button>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
              hidden
            />

            <ul className={styles.stats}>
              <li className={styles.statItem}>
                <span className={styles.statLabel}>Lançamentos</span>
                <span className={styles.statValue}>{rows.length}</span>
              </li>
              <li className={styles.statItem}>
                <span className={styles.statLabel}>Tamanho</span>
                <span className={styles.statValue}>{getStorageSize()} KB</span>
              </li>
              <li className={styles.statItem}>
                <span className={styles.statLabel}>Último backup</span>
                <span className={styles.statValue}>
                  {lastBackupDays === null
                    ? "Nunca"
                    : lastBackupDays === 0
                      ? "Hoje"
                      : `Há ${lastBackupDays} dia${lastBackupDays === 1 ? "" : "s"}`}
                </span>
              </li>
              <li className={styles.statItem}>
                <span className={styles.statLabel}>Armazenamento</span>
                <span className={styles.statValue}>
                  {persisted ? "🔒 Protegido" : "⚠ Não persistente"}
                </span>
              </li>
            </ul>

            <div className={styles.danger}>
              <span className={styles.dangerLabel}>Zona de perigo</span>
              <button className={styles.dangerBtn} onClick={handleClear}>
                🗑 Apagar todos os dados
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.preview}>
              <span className={styles.previewName}>📄 {preview.fileName}</span>
              {preview.result.success ? (
                <>
                  <span className={styles.previewStat}>
                    Encontrados: <strong>{totalImport}</strong> lançamentos
                  </span>
                  {preview.result.skipped > 0 && (
                    <span className={styles.previewStat}>
                      Ignorados: {preview.result.skipped} (sem valor ou
                      formato inválido)
                    </span>
                  )}
                </>
              ) : (
                <span className={styles.previewStat} style={{ color: "var(--color-negative)" }}>
                  Falha ao processar o arquivo.
                </span>
              )}
              {preview.result.errors.length > 0 && (
                <div className={styles.previewErrors}>
                  {preview.result.errors.slice(0, 8).map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                  {preview.result.errors.length > 8 && (
                    <div>+ {preview.result.errors.length - 8} outros erros…</div>
                  )}
                </div>
              )}
            </div>
            <div className={styles.previewActions}>
              {preview.result.success && totalImport > 0 && !confirmReplace && (
                <>
                  <button
                    className={`${styles.previewBtn} ${styles.previewBtnPrimary}`}
                    onClick={() => {
                      onImportMerge(preview.result.rows);
                      onToast?.(
                        `${totalImport} lançamentos adicionados (duplicados ignorados)`,
                      );
                      onClose();
                    }}
                  >
                    Adicionar aos existentes
                  </button>
                  <button
                    className={styles.previewBtn}
                    onClick={() => setConfirmReplace(true)}
                  >
                    Substituir tudo (apaga atuais)
                  </button>
                </>
              )}
              {confirmReplace && (
                <>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--color-negative)",
                      fontWeight: 600,
                    }}
                  >
                    Tem certeza? Os {rows.length} lançamentos atuais serão
                    apagados.
                  </span>
                  <button
                    className={`${styles.previewBtn} ${styles.previewBtnDanger}`}
                    onClick={() => {
                      onImportReplace(preview.result.rows);
                      onToast?.(
                        `Dados substituídos: ${totalImport} lançamentos importados`,
                      );
                      onClose();
                    }}
                  >
                    Sim, substituir tudo
                  </button>
                  <button
                    className={styles.previewBtn}
                    onClick={() => setConfirmReplace(false)}
                  >
                    Voltar
                  </button>
                </>
              )}
              <button className={styles.previewBtn} onClick={onClose}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
