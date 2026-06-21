import 'dotenv/config';
import { AzureCollector } from './collectors/azure-collector';
import { KubernetesCollector } from './collectors/kubernetes-collector';
import { SubnetAnalyzer } from './analyzers/subnet-analyzer';
import { NodepoolAnalyzer } from './analyzers/nodepool-analyzer';
import { ResilienceAnalyzer } from './analyzers/resilience-analyzer';
import { JsonReporter } from './reporters/json-reporter';
import { ConsoleReporter } from './reporters/console-reporter';


function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function main(): Promise<void> {

  const subscriptionId = requiredEnv('AZURE_SUBSCRIPTION_ID');
  const aksResourceGroup = requiredEnv('AKS_RESOURCE_GROUP');
  const aksName = requiredEnv('AKS_CLUSTER_NAME');

  const azureCollector = new AzureCollector(subscriptionId, aksResourceGroup, aksName);
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

  const jsonReporter = new JsonReporter(process.env.REPORT_PATH ?? 'report.json');
  const consoleReporter = new ConsoleReporter();

  await jsonReporter.report(report);
  consoleReporter.report(report);
}

main().catch(error => {
  console.error('Error running the AKS Nodepool Monitor:', error);
  process.exitCode = 1;
});
