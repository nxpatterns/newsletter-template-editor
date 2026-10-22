import { inject, Injectable } from '@angular/core';
import { parseBackupFile, type BackupFileEnvelope } from '../../../core/reset/backup-file';
import { APP_DATA_STORE } from '../../editor/app-data-store.token';
import { NewsletterSession } from '../../editor/newsletter-session.service';
import { LocaleService } from '../../i18n/locale.service';
import { writeAppNotice } from '../../shell/reset/app-notice';
import { pickFile } from '../../shell/reset/browser-files';
import { APP_RELOAD, writeAppStorage } from '../../shell/reset/factory-reset.service';
import { SnackbarService } from '../../ui/snackbar/snackbar.service';
import { StartActionsService } from './start-actions.service';

/**
 * Start menu "Open from file…": a backup from the reset dialog adds what it holds and reloads the
 * app; a template file opens in the editor like the editor menu's "load template file".
 */
@Injectable({ providedIn: 'root' })
export class OpenFromFileService {
  private readonly i18n = inject(LocaleService);
  private readonly session = inject(NewsletterSession);
  private readonly store = inject(APP_DATA_STORE);
  private readonly actions = inject(StartActionsService);
  private readonly snackbar = inject(SnackbarService);
  private readonly reload = inject(APP_RELOAD);

  /** Must run inside the click, so the browser lets the file picker open. */
  async pick(): Promise<void> {
    const file = await pickFile('.json,application/json');
    if (file) await this.open(file);
  }

  async open(file: File): Promise<void> {
    let text: string;
    try {
      text = await file.text();
    } catch {
      this.snackbar.error(this.i18n.t('file.openFailed'));
      return;
    }
    const backup = parseBackupFile(text);
    if (backup) await this.restore(backup, file.name);
    else await this.actions.openProjectText(text, file.name);
  }

  private async restore(backup: BackupFileEnvelope, fileName: string): Promise<void> {
    try {
      // The open work is stored first, so the backup never replaces it.
      await this.session.flushRecovery();
      const added = await this.store.restore(backup);
      let views = 0;
      if (backup.viewSettings) {
        try {
          views = writeAppStorage(backup.viewSettings);
        } catch {
          /* storage blocked */
        }
      }
      await this.session.releaseForReload(true);
      writeAppNotice({
        kind: 'restored',
        file: fileName,
        restored: {
          templates: added.templates,
          ownBlocks: added.ownBlocks,
          blockDrafts: added.blockDrafts,
          workingDraft: added.workingDraft ? 1 : 0,
          viewSettings: views,
        },
      });
      this.reload();
    } catch {
      this.snackbar.error(this.i18n.t('file.openFailed'));
    }
  }
}
