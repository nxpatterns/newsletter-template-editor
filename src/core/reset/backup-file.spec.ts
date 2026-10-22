import { seedNewsletter } from '../seed';
import { buildBackup, isBackupFile, parseBackupFile } from './backup-file';

const template = { id: 'tpl-a', displayName: 'A', updatedAt: '2026-10-20T10:00:00.000Z', newsletter: seedNewsletter('en') };

describe('backup file', () => {
  it('holds only the checked kinds (decision 67)', () => {
    const file = buildBackup(
      { templates: [template], ownBlocks: [], blockVersions: [], viewSettings: { k: 'v' } },
      ['viewSettings', 'templates'],
      '2026-10-22T12:00:00.000Z',
    );
    expect(file.kind).toBe('nte-backup');
    expect(file.contains).toEqual(['templates', 'viewSettings']);
    expect(file.templates).toHaveLength(1);
    expect(file.viewSettings).toEqual({ k: 'v' });
    expect('ownBlocks' in file).toBe(false);
    expect('workingDraft' in file).toBe(false);
  });

  it('reads back what it wrote', () => {
    const raw = JSON.stringify(buildBackup({ templates: [template] }, ['templates'], '2026-10-22T12:00:00.000Z'));
    expect(isBackupFile(raw)).toBe(true);
    const parsed = parseBackupFile(raw);
    expect(parsed?.contains).toEqual(['templates']);
    expect(parsed?.templates?.[0].id).toBe('tpl-a');
    expect(parsed?.exportedAt).toBe('2026-10-22T12:00:00.000Z');
  });

  it('drops broken rows, unknown kinds and non-text settings', () => {
    const raw = JSON.stringify({
      kind: 'nte-backup',
      contains: ['templates', 'ownBlocks', 'blockDrafts', 'viewSettings', 'passwords'],
      templates: [template, { id: 'no-newsletter' }, { newsletter: template.newsletter }],
      ownBlocks: [{ id: 'b1' }, 'x'],
      blockVersions: [{ id: 'v1', blockId: 'b1', content: {} }, { id: 'v2', content: {} }],
      blockDrafts: [{ id: 'd1', blockId: null, content: {} }, { id: 'd2' }],
      viewSettings: { a: '1', b: 2 },
    });
    const parsed = parseBackupFile(raw)!;
    expect(parsed.contains).toEqual(['templates', 'ownBlocks', 'blockDrafts', 'viewSettings']);
    expect(parsed.templates?.map((t) => t.id)).toEqual(['tpl-a']);
    expect(parsed.ownBlocks?.map((b) => b.id)).toEqual(['b1']);
    expect(parsed.blockVersions?.map((v) => v.id)).toEqual(['v1']);
    expect(parsed.blockDrafts?.map((d) => d.id)).toEqual(['d1']);
    expect(parsed.viewSettings).toEqual({ a: '1' });
  });

  it('a project file or broken text is no backup', () => {
    const project = JSON.stringify({ kind: 'nte-project', newsletter: template.newsletter });
    expect(isBackupFile(project)).toBe(false);
    expect(parseBackupFile(project)).toBeNull();
    expect(parseBackupFile('{oops')).toBeNull();
  });
});
