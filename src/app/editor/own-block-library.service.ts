import { Injectable, inject, signal } from '@angular/core';
import { normalizeCloneContent, type CloneContent } from '../../core/own-blocks/clone';
import type { BlockDraft, OwnBlock, OwnBlockVersion } from '../../core/own-blocks/model';
import { saveBlockWork } from '../../core/own-blocks/operations';
import { BLOCK_REPOSITORY } from './block-repository.token';
import { ID_SOURCE } from './id-source.token';
import { StoragePersistence } from './storage-persistence.service';

/** One own block as the block panel lists it. */
export interface OwnBlockEntry {
  block: OwnBlock;
  /** Content of the newest version; null while the block has no version (only a draft). */
  latest: CloneContent | null;
}

/** An own block opened in the block editor. */
export interface OwnBlockRecord {
  block: OwnBlock;
  latest: OwnBlockVersion | null;
  draft: BlockDraft | null;
  /** What the editor starts with: the draft if there is one, else the newest version. */
  content: CloneContent | null;
}

/** Own blocks of this browser: the list for the block panel, loading and saving for the block editor. */
@Injectable({ providedIn: 'root' })
export class OwnBlockLibrary {
  private readonly repo = inject(BLOCK_REPOSITORY);
  private readonly newId = inject(ID_SOURCE);
  private readonly persistence = inject(StoragePersistence);

  private readonly entriesSignal = signal<OwnBlockEntry[]>([]);
  /** Last changed first. */
  readonly entries = this.entriesSignal.asReadonly();

  async refresh(): Promise<void> {
    try {
      const blocks = await this.repo.listBlocks();
      const entries = await Promise.all(
        blocks.map(async (block): Promise<OwnBlockEntry> => {
          const version = block.latestVersionId ? await this.repo.getVersion(block.latestVersionId) : null;
          return { block, latest: version ? normalizeCloneContent(version.content) : null };
        }),
      );
      this.entriesSignal.set(entries);
    } catch {
      /* storage unavailable: the list stays as it was */
    }
  }

  /** The entry by own block id, from the last refresh. */
  entry(id: string): OwnBlockEntry | undefined {
    return this.entriesSignal().find((e) => e.block.id === id);
  }

  async open(id: string): Promise<OwnBlockRecord | null> {
    const block = await this.repo.getBlock(id);
    if (!block) return null;
    const [latest, draft] = await Promise.all([
      block.latestVersionId ? this.repo.getVersion(block.latestVersionId) : Promise.resolve(null),
      this.repo.draftForBlock(id),
    ]);
    const content = normalizeCloneContent(draft?.content) ?? normalizeCloneContent(latest?.content);
    return { block, latest, draft, content };
  }

  /** "Save draft" or "Save as own block": one transaction; the block is created on its first save. */
  async save(
    record: Pick<OwnBlockRecord, 'block' | 'draft'> | null,
    input: { id: string; name: string; content: CloneContent; publish: boolean },
  ): Promise<OwnBlockRecord> {
    const result = saveBlockWork(
      { now: new Date().toISOString(), newId: this.newId },
      {
        block: record?.block ?? null,
        draft: record?.draft ?? null,
        id: input.id,
        name: input.name,
        kind: 'clone',
        baseType: input.content.block.type,
        content: input.content,
        publish: input.publish,
      },
    );
    await this.repo.apply(result.change);
    void this.persistence.ensure();
    void this.refresh();
    const latest = result.version ?? (result.block.latestVersionId ? await this.repo.getVersion(result.block.latestVersionId) : null);
    return { block: result.block, latest, draft: result.draft, content: input.content };
  }
}
