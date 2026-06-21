import fs from 'fs';

export class JsonReporter {
  constructor(private readonly reportPath: string = 'report.json') {}

  public async report(reportData: unknown): Promise<void> {
    this.generateReport(reportData);
  }

  public generateReport(reportData: unknown): void {
    fs.writeFileSync(this.reportPath, JSON.stringify(reportData, null, 2), 'utf-8');
  }
}
