export class ConsoleReporter {
  public report(reportData: unknown): void {
    console.log(JSON.stringify(reportData, null, 2));
  }
}

export default ConsoleReporter;
