import { readdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { en, ro } from '../../i18n/translations';

const SRC_ROOT = resolve(process.cwd(), 'src');

function walkSourceFiles(dir: string, out: string[] = []): string[] {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'test' || entry.name === '__tests__') {
            continue;
        }

        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            walkSourceFiles(fullPath, out);
            continue;
        }

        if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
            out.push(fullPath);
        }
    }

    return out;
}

function hasPath(obj: unknown, key: string): boolean {
    const parts = key.split('.');
    let cursor: unknown = obj;

    for (const part of parts) {
        if (!cursor || typeof cursor !== 'object' || !(part in (cursor as Record<string, unknown>))) {
            return false;
        }
        cursor = (cursor as Record<string, unknown>)[part];
    }

    return true;
}

describe('translation key usage', () => {
    it('covers all literal t(...) keys in en and ro', () => {
        const files = walkSourceFiles(SRC_ROOT);
        const keyRegex = /\bt\(\s*(['"])([^'"`]+)\1\s*\)/g;
        const keys = new Set<string>();

        for (const file of files) {
            const content = readFileSync(file, 'utf8');
            let match: RegExpExecArray | null = null;
            while ((match = keyRegex.exec(content)) !== null) {
                keys.add(match[2]);
            }
        }

        const missing = Array.from(keys)
            .filter((key) => !hasPath(en, key) || !hasPath(ro, key))
            .sort();

        expect(missing).toEqual([]);
    });
});
