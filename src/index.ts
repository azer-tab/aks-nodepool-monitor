import { AzureCollector } from './collectors/azure-collector';
import { KubernetesCollector } from './collectors/kubernetes-collector';
import { SubnetAnalyzer } from './analyzers/subnet-analyzer';
import { NodepoolAnalyzer } from './analyzers/nodepool-analyzer';
import { ResilienceAnalyzer } from './analyzers/resilience-analyzer';
import { JsonReporter } from './reporters/json-reporter';
import { ConsoleReporter } from './reporters/console-reporter';

async function main() {
    const azureCollector = new AzureCollector();
    const kubernetesCollector = new KubernetesCollector();

    const azureData = await azureCollector.collect();
    const kubernetesData = await kubernetesCollector.collect();

    const subnetAnalyzer = new SubnetAnalyzer(azureData);
    const nodepoolAnalyzer = new NodepoolAnalyzer(azureData);
    const resilienceAnalyzer = new ResilienceAnalyzer(kubernetesData);

    const subnetAnalysis = subnetAnalyzer.analyze();
    const nodepoolAnalysis = nodepoolAnalyzer.analyze();
    const resilienceAnalysis = resilienceAnalyzer.analyze();

    const report = {
        subnet: subnetAnalysis,
        nodepool: nodepoolAnalysis,
        resilience: resilienceAnalysis,
    };

    const jsonReporter = new JsonReporter();
    const consoleReporter = new ConsoleReporter();

    await jsonReporter.report(report);
    consoleReporter.report(report);
}

main().catch(error => {
    console.error('Error running the AKS Nodepool Monitor:', error);
});