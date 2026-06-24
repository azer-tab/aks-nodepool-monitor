#!/usr/bin/env node
import 'dotenv/config';
import { AzureCollector } from './collectors/azure-collector';
import { KubernetesCollector } from './collectors/kubernetes-collector';
import { SubnetAnalyzer } from './analyzers/subnet-analyzer';
import { NodepoolAnalyzer } from './analyzers/nodepool-analyzer';
import { ResilienceAnalyzer } from './analyzers/resilience-analyzer';
import { JsonReporter } from './reporters/json-reporter';
import { ConsoleReporter } from './reporters/console-reporter';
import { buildConfig } from './config';
import { formatHelp, parseCliArgs } from './cli';

const packageJson = require('../package.json') as { name: string; version: string };

export async function run(argv: string[] = process.argv.slice(2)): Promise<void> {
  const parsed = parseCliArgs(argv);
  const commandName = 'aks-nodepool-monitor';

  if (parsed.helpRequested) {
    console.log(formatHelp(commandName, packageJson.version));
    return;
  }

  if (parsed.versionRequested) {
    console.log(packageJson.version);
    return;
  }

  const config = buildConfig(parsed.options, process.env);

  const azureCollector = new AzureCollector(config.subscriptionId, config.resourceGroup, config.clusterName);
  const kubernetesCollector = new KubernetesCollector();

  const azureData = await azureCollector.collect();
  const kubernetesData = await kubernetesCollector.collect();

  const subnetAnalyzer = new SubnetAnalyzer(azureData);
  const nodepoolAnalyzer = new NodepoolAnalyzer(azureCollector, kubernetesCollector);
  const resilienceAnalyzer = new ResilienceAnalyzer(kubernetesData);

  const report = {
    subnet: subnetAnalyzer.analyze(),
    nodepool: await nodepoolAnalyzer.analyze(),
    resilience: resilienceAnalyzer.analyze()
  };

  const jsonReporter = new JsonReporter(config.reportPath);
  await jsonReporter.report(report);

  if (config.printConsole) {
    const consoleReporter = new ConsoleReporter();
    consoleReporter.report(report);
  }
}

if (require.main === module) {
  run().catch(error => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error running AKS Nodepool Monitor: ${message}`);
    console.error('Run `aks-nodepool-monitor --help` for usage.');
    process.exitCode = 1;
  });
}
