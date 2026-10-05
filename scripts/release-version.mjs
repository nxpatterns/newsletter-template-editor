import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.resolve(repoRoot, 'package.json');
const packageLockPath = path.resolve(repoRoot, 'package-lock.json');

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      i += 1;
    } else {
      parsed[key] = 'true';
    }
  }
  return parsed;
}

function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function formatSemver(parts) {
  return `${parts.major}.${parts.minor}.${parts.patch}`;
}

function nextVersion(currentVersion, bumpType, setVersion) {
  if (bumpType === 'set') {
    const parsedSet = parseSemver(setVersion ?? '');
    if (!parsedSet) {
      throw new Error(
        `Invalid set version "${setVersion}". Expected format: MAJOR.MINOR.PATCH`,
      );
    }
    return formatSemver(parsedSet);
  }

  const current = parseSemver(currentVersion);
  if (!current) {
    throw new Error(
      `Invalid current version "${currentVersion}". Expected format: MAJOR.MINOR.PATCH`,
    );
  }

  if (bumpType === 'major') {
    return formatSemver({ major: current.major + 1, minor: 0, patch: 0 });
  }
  if (bumpType === 'minor') {
    return formatSemver({
      major: current.major,
      minor: current.minor + 1,
      patch: 0,
    });
  }
  if (bumpType === 'patch') {
    return formatSemver({
      major: current.major,
      minor: current.minor,
      patch: current.patch + 1,
    });
  }
  throw new Error(
    `Unsupported bump type "${bumpType}". Use one of: major, minor, patch, set.`,
  );
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function updatePackageLockVersion(newVersion) {
  try {
    const lock = await readJson(packageLockPath);
    lock.version = newVersion;
    if (lock.packages && lock.packages['']) {
      lock.packages[''].version = newVersion;
    }
    await writeJson(packageLockPath, lock);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bumpType = args['bump-type'] ?? process.env.BUMP_TYPE ?? 'patch';
  const setVersion = args['set-version'] ?? process.env.SET_VERSION;

  if (!['major', 'minor', 'patch', 'set'].includes(bumpType)) {
    throw new Error(
      `Invalid bump type "${bumpType}". Use one of: major, minor, patch, set.`,
    );
  }
  if (bumpType === 'set' && !setVersion) {
    throw new Error('set_version is required when bump_type is set.');
  }

  const pkg = await readJson(packageJsonPath);
  const newVersion = nextVersion(pkg.version, bumpType, setVersion);
  pkg.version = newVersion;
  await writeJson(packageJsonPath, pkg);
  await updatePackageLockVersion(newVersion);
  process.stdout.write(`${newVersion}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
