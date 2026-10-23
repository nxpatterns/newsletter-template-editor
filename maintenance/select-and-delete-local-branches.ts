/**
 * Interactive local-branch cleaner.
 *
 * Fixes vs. the old copy:
 * - Merge status uses `merge-base --is-ancestor` against main/master (not broken
 *   whitespace parsing of `git branch --merged`).
 * - Linked worktrees are detected; deleting a branch checked out elsewhere
 *   offers to remove that worktree first.
 * - Current / protected branches are not selectable.
 * - Real git errors are printed instead of a silent force-delete prompt only.
 *
 * Does not touch remotes. Does not run non-interactively.
 */
import inquirer from 'inquirer';
import path from 'node:path';
import simpleGit, { type SimpleGit } from 'simple-git';

const git: SimpleGit = simpleGit();

const PROTECTED_BRANCHES = new Set(['main', 'master']);

interface BranchInfo {
  name: string;
  isCurrent: boolean;
  isMergedIntoBase: boolean;
  isProtected: boolean;
  /** Absolute worktree path if this branch is checked out somewhere (incl. main wt). */
  worktreePath: string | null;
  lastCommitDate: string;
  lastCommitMessage: string;
  lastCommitter: string;
  shortHash: string;
}

function shortPath(abs: string): string {
  const cwd = process.cwd();
  if (abs === cwd) return '.';
  if (abs.startsWith(cwd + path.sep)) return path.relative(cwd, abs);
  const home = process.env.HOME;
  if (home && abs.startsWith(home + path.sep)) {
    return '~' + abs.slice(home.length);
  }
  return abs;
}

async function resolveBaseBranch(): Promise<string> {
  const { all, current } = await git.branchLocal();
  if (all.includes('main')) return 'main';
  if (all.includes('master')) return 'master';
  try {
    const sym = (await git.raw(['symbolic-ref', 'refs/remotes/origin/HEAD'])).trim();
    const m = sym.match(/refs\/remotes\/origin\/(.+)$/);
    if (m?.[1] && all.includes(m[1])) return m[1];
  } catch {
    /* no origin/HEAD */
  }
  return current;
}

/** branch name → absolute worktree path (one checkout per branch). */
async function mapBranchToWorktree(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const porcelain = await git.raw(['worktree', 'list', '--porcelain']);
  let worktreePath = '';
  for (const raw of porcelain.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.startsWith('worktree ')) {
      worktreePath = line.slice('worktree '.length);
    } else if (line.startsWith('branch ') && worktreePath) {
      const ref = line.slice('branch '.length).trim();
      const name = ref.replace(/^refs\/heads\//, '');
      map.set(name, worktreePath);
    } else if (line === '') {
      worktreePath = '';
    }
  }
  return map;
}

async function isAncestor(branch: string, base: string): Promise<boolean> {
  if (branch === base) return true;
  try {
    // exit 0 ⇒ branch tip is reachable from base (fully merged by ancestry)
    await git.raw(['merge-base', '--is-ancestor', branch, base]);
    return true;
  } catch {
    return false;
  }
}

async function collectBranches(base: string): Promise<BranchInfo[]> {
  const { all, current } = await git.branchLocal();
  const worktrees = await mapBranchToWorktree();
  const infos: BranchInfo[] = [];

  for (const name of all) {
    const log = await git.log({ maxCount: 1, from: name });
    const tip = log.latest;
    infos.push({
      name,
      isCurrent: name === current,
      isMergedIntoBase: await isAncestor(name, base),
      isProtected: PROTECTED_BRANCHES.has(name),
      worktreePath: worktrees.get(name) ?? null,
      lastCommitDate: tip?.date ?? '?',
      lastCommitMessage: (tip?.message ?? '').replace(/\s+/g, ' ').slice(0, 48),
      lastCommitter: tip?.author_name ?? '?',
      shortHash: tip?.hash?.slice(0, 7) ?? '?',
    });
  }

  infos.sort((a, b) => b.lastCommitDate.localeCompare(a.lastCommitDate));
  return infos;
}

function formatChoice(
  info: BranchInfo,
  repoRoot: string,
): {
  name: string;
  value: string;
  disabled?: string | boolean;
  short?: string;
} {
  const mergeMark = info.isMergedIntoBase ? 'merged' : 'NOT merged';
  const wt =
    info.worktreePath && path.resolve(info.worktreePath) !== path.resolve(repoRoot)
      ? `  [worktree: ${shortPath(info.worktreePath)}]`
      : info.worktreePath && info.isCurrent
        ? '  [this checkout]'
        : '';

  const label = `${info.name}  ·  ${mergeMark}  ·  ${info.shortHash}  ·  ${info.lastCommitDate}  ·  ${info.lastCommitMessage}  ·  ${info.lastCommitter}${wt}`;

  if (info.isProtected) {
    return { name: label, value: info.name, disabled: 'protected', short: info.name };
  }
  if (info.isCurrent) {
    return { name: label, value: info.name, disabled: 'current branch', short: info.name };
  }
  return { name: label, value: info.name, short: info.name };
}

function gitErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { message?: string; stderr?: string };
    const text = (e.stderr || e.message || '').trim();
    if (text) return text;
  }
  return String(err);
}

async function removeWorktree(worktreePath: string): Promise<boolean> {
  const display = shortPath(worktreePath);
  const { confirmRemove } = await inquirer.prompt<{ confirmRemove: boolean }>([
    {
      type: 'confirm',
      name: 'confirmRemove',
      default: true,
      message: `Branch is checked out in worktree "${display}". Remove that worktree first?`,
    },
  ]);
  if (!confirmRemove) {
    console.log(`  skipped worktree remove: ${display}`);
    return false;
  }

  try {
    await git.raw(['worktree', 'remove', worktreePath]);
    console.log(`  removed worktree: ${display}`);
    return true;
  } catch (err) {
    console.log(`  worktree remove failed: ${gitErrorMessage(err)}`);
    const { forceRemove } = await inquirer.prompt<{ forceRemove: boolean }>([
      {
        type: 'confirm',
        name: 'forceRemove',
        default: false,
        message: `Force-remove worktree "${display}" (git worktree remove --force)?`,
      },
    ]);
    if (!forceRemove) return false;
    try {
      await git.raw(['worktree', 'remove', '--force', worktreePath]);
      console.log(`  force-removed worktree: ${display}`);
      return true;
    } catch (forceErr) {
      console.log(`  force worktree remove failed: ${gitErrorMessage(forceErr)}`);
      return false;
    }
  }
}

async function deleteBranch(
  name: string,
  infoByName: Map<string, BranchInfo>,
  repoRoot: string,
): Promise<void> {
  const info = infoByName.get(name);
  if (!info) {
    console.log(`  unknown branch "${name}", skip`);
    return;
  }
  if (info.isProtected || info.isCurrent) {
    console.log(`  refuse to delete "${name}" (protected or current)`);
    return;
  }

  const wt = info.worktreePath;
  if (wt && path.resolve(wt) !== path.resolve(repoRoot)) {
    const removed = await removeWorktree(wt);
    if (!removed) {
      console.log(`  not deleted: "${name}" still checked out in a worktree`);
      return;
    }
  } else if (wt && path.resolve(wt) === path.resolve(repoRoot) && info.isCurrent) {
    console.log(`  cannot delete current branch "${name}"`);
    return;
  }

  try {
    await git.raw(['branch', '-d', name]);
    console.log(`  deleted "${name}" (-d)`);
    return;
  } catch (err) {
    const detail = gitErrorMessage(err);
    console.log(`  -d failed for "${name}": ${detail}`);
  }

  if (!info.isMergedIntoBase) {
    const { forceDelete } = await inquirer.prompt<{ forceDelete: boolean }>([
      {
        type: 'confirm',
        name: 'forceDelete',
        default: false,
        message: `"${name}" is NOT fully merged into the base branch. Force delete with -D (may lose commits)?`,
      },
    ]);
    if (!forceDelete) {
      console.log(`  kept "${name}"`);
      return;
    }
  } else {
    const { forceDelete } = await inquirer.prompt<{ forceDelete: boolean }>([
      {
        type: 'confirm',
        name: 'forceDelete',
        default: true,
        message: `"${name}" looks merged by ancestry but -d failed. Retry with -D?`,
      },
    ]);
    if (!forceDelete) {
      console.log(`  kept "${name}"`);
      return;
    }
  }

  try {
    await git.raw(['branch', '-D', name]);
    console.log(`  force-deleted "${name}" (-D)`);
  } catch (err) {
    console.log(`  -D failed for "${name}": ${gitErrorMessage(err)}`);
  }
}

async function main(): Promise<void> {
  const repoRoot = (await git.revparse(['--show-toplevel'])).trim();
  const base = await resolveBaseBranch();
  console.log(`Base branch for merge check: ${base}`);
  console.log(`Repo: ${repoRoot}`);
  console.log(
    'Legend: "merged" = tip is ancestor of base (safe -d). Worktree paths are linked checkouts.\n',
  );

  const branches = await collectBranches(base);
  const infoByName = new Map(branches.map((b) => [b.name, b]));
  const selectable = branches.filter((b) => !b.isProtected && !b.isCurrent);

  if (selectable.length === 0) {
    console.log('No deletable local branches.');
    return;
  }

  const mergedCount = selectable.filter((b) => b.isMergedIntoBase).length;
  const wtCount = selectable.filter(
    (b) => b.worktreePath && path.resolve(b.worktreePath) !== path.resolve(repoRoot),
  ).length;
  console.log(
    `${selectable.length} deletable · ${mergedCount} merged into ${base} · ${wtCount} in other worktrees\n`,
  );

  const { branchesToDelete } = await inquirer.prompt<{ branchesToDelete: string[] }>([
    {
      type: 'checkbox',
      name: 'branchesToDelete',
      message: 'Select local branches to delete',
      pageSize: Math.min(20, branches.length + 2),
      choices: branches.map((b) => formatChoice(b, repoRoot)),
    },
  ]);

  if (branchesToDelete.length === 0) {
    console.log('Nothing selected.');
    return;
  }

  const { confirmGo } = await inquirer.prompt<{ confirmGo: boolean }>([
    {
      type: 'confirm',
      name: 'confirmGo',
      default: false,
      message: `Delete ${branchesToDelete.length} branch(es)? Worktrees will be prompted per branch when needed.`,
    },
  ]);
  if (!confirmGo) {
    console.log('Aborted.');
    return;
  }

  for (const name of branchesToDelete) {
    console.log(`\n→ ${name}`);
    await deleteBranch(name, infoByName, repoRoot);
  }

  try {
    await git.raw(['worktree', 'prune']);
  } catch {
    /* best-effort */
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
