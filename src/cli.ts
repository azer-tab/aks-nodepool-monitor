import { OPTION_SPECS } from './config';

export interface ParsedCliArgs {
  options: Record<string, string | boolean | undefined>;
  helpRequested: boolean;
  versionRequested: boolean;
}

const ALIASES: Record<string, string> = {
  s: 'subscription-id',
  g: 'resource-group',
  n: 'cluster-name',
  o: 'report-path',
  h: 'help',
  v: 'version'
};

const VALUE_OPTIONS = new Set(['subscription-id', 'resource-group', 'cluster-name', 'report-path']);
const BOOLEAN_OPTIONS = new Set(['print-console']);

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const options: Record<string, string | boolean | undefined> = {};
  let helpRequested = false;
  let versionRequested = false;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === '--') break;

    if (token.startsWith('--no-')) {
      const name = token.slice(5);
      ensureKnownBoolean(name);
      options[name] = false;
      continue;
    }

    if (token.startsWith('--')) {
      const [rawName, inlineValue] = token.slice(2).split('=', 2);
      const name = rawName.trim();

      if (name === 'help') {
        helpRequested = true;
        continue;
      }
      if (name === 'version') {
        versionRequested = true;
        continue;
      }
      if (BOOLEAN_OPTIONS.has(name)) {
        options[name] = inlineValue === undefined ? true : inlineValue;
        continue;
      }
      if (VALUE_OPTIONS.has(name)) {
        if (inlineValue !== undefined) {
          options[name] = inlineValue;
          continue;
        }

        const nextValue = argv[i + 1];
        if (!nextValue || nextValue.startsWith('-')) {
          throw new Error(`Option --${name} requires a value.`);
        }
        options[name] = nextValue;
        i += 1;
        continue;
      }

      throw new Error(`Unknown option: --${name}`);
    }

    if (token.startsWith('-') && token.length > 1) {
      const alias = token.slice(1);
      const name = ALIASES[alias];
      if (!name) throw new Error(`Unknown option: -${alias}`);

      if (name === 'help') {
        helpRequested = true;
        continue;
      }
      if (name === 'version') {
        versionRequested = true;
        continue;
      }

      const nextValue = argv[i + 1];
      if (!nextValue || nextValue.startsWith('-')) {
        throw new Error(`Option -${alias} requires a value.`);
      }
      options[name] = nextValue;
      i += 1;
      continue;
    }

    throw new Error(`Unexpected positional argument: ${token}`);
  }

  return { options, helpRequested, versionRequested };
}

function ensureKnownBoolean(name: string): void {
  if (!BOOLEAN_OPTIONS.has(name)) throw new Error(`Unknown boolean option: --no-${name}`);
}

export function formatHelp(commandName: string, version: string): string {
  const optionLines = OPTION_SPECS.map(spec => {
    const aliases = aliasFor(spec.flag);
    const valueHint = spec.flag === 'print-console' ? '' : ` <value>`;
    const defaultSuffix = spec.defaultValue === undefined ? '' : ` Default: ${spec.defaultValue}.`;
    const requiredSuffix = spec.required ? ' Required.' : '';
    return `  ${aliases}--${spec.flag}${valueHint}\n      ${spec.description} Env: ${spec.env}.${requiredSuffix}${defaultSuffix}`;
  });

  return [
    `${commandName} ${version}`,
    '',
    'Analyze AKS node pool health, subnet usage, and workload resilience.',
    '',
    'Usage:',
    `  ${commandName} --subscription-id <id> --resource-group <name> --cluster-name <name> [options]`,
    '',
    'Options:',
    ...optionLines,
    '  --no-print-console',
    '      Do not print the JSON report to stdout.',
    '  -h, --help',
    '      Show this help message.',
    '  -v, --version',
    '      Show the package version.',
    '',
    'Environment fallback:',
    '  CLI arguments take precedence over environment variables and .env values.',
    '',
    'Examples:',
    `  ${commandName} -s 00000000-0000-0000-0000-000000000000 -g prod-rg -n prod-aks -o ./reports/report.json`,
    `  AZURE_SUBSCRIPTION_ID=00000000-0000-0000-0000-000000000000 AKS_RESOURCE_GROUP=prod-rg AKS_CLUSTER_NAME=prod-aks ${commandName}`
  ].join('\n');
}

function aliasFor(flag: string): string {
  const alias = Object.entries(ALIASES).find(([, value]) => value === flag)?.[0];
  return alias ? `-${alias}, ` : '    ';
}
