export interface CliConfig {
  subscriptionId: string;
  resourceGroup: string;
  clusterName: string;
  reportPath: string;
  printConsole: boolean;
}

interface OptionSpec {
  name: keyof CliConfig;
  flag: string;
  env: string;
  required: boolean;
  description: string;
  defaultValue?: string | boolean;
}

export const OPTION_SPECS: OptionSpec[] = [
  {
    name: 'subscriptionId',
    flag: 'subscription-id',
    env: 'AZURE_SUBSCRIPTION_ID',
    required: true,
    description: 'Azure subscription ID containing the AKS cluster.'
  },
  {
    name: 'resourceGroup',
    flag: 'resource-group',
    env: 'AKS_RESOURCE_GROUP',
    required: true,
    description: 'Resource group containing the AKS cluster.'
  },
  {
    name: 'clusterName',
    flag: 'cluster-name',
    env: 'AKS_CLUSTER_NAME',
    required: true,
    description: 'AKS cluster name.'
  },
  {
    name: 'reportPath',
    flag: 'report-path',
    env: 'REPORT_PATH',
    required: false,
    description: 'Path where the JSON report will be written.',
    defaultValue: 'report.json'
  },
  {
    name: 'printConsole',
    flag: 'print-console',
    env: 'PRINT_CONSOLE',
    required: false,
    description: 'Print the JSON report to stdout. Use --no-print-console to disable.',
    defaultValue: true
  }
];

export function buildConfig(args: Record<string, string | boolean | undefined>, env: NodeJS.ProcessEnv): CliConfig {
  const subscriptionId = readString(args['subscription-id'], env.AZURE_SUBSCRIPTION_ID);
  const resourceGroup = readString(args['resource-group'], env.AKS_RESOURCE_GROUP);
  const clusterName = readString(args['cluster-name'], env.AKS_CLUSTER_NAME);
  const reportPath = readString(args['report-path'], env.REPORT_PATH, 'report.json');
  const printConsole = readBoolean(args['print-console'], env.PRINT_CONSOLE, true);

  const missing: string[] = [];
  if (!subscriptionId) missing.push('--subscription-id or AZURE_SUBSCRIPTION_ID');
  if (!resourceGroup) missing.push('--resource-group or AKS_RESOURCE_GROUP');
  if (!clusterName) missing.push('--cluster-name or AKS_CLUSTER_NAME');

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }

  return {
    subscriptionId,
    resourceGroup,
    clusterName,
    reportPath,
    printConsole
  };
}

function readString(value: string | boolean | undefined, envValue: string | undefined, defaultValue = ''): string {
  if (typeof value === 'string' && value.trim() !== '') return value;
  if (typeof envValue === 'string' && envValue.trim() !== '') return envValue;
  return defaultValue;
}

function readBoolean(value: string | boolean | undefined, envValue: string | undefined, defaultValue: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return parseBoolean(value, defaultValue);
  if (typeof envValue === 'string') return parseBoolean(envValue, defaultValue);
  return defaultValue;
}

function parseBoolean(value: string, defaultValue: boolean): boolean {
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return defaultValue;
}
