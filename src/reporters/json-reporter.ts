import fs from 'fs';
import path from 'path';
import { Report } from '../models/report';

export class JsonReporter {
    private reportPath: string;

    constructor(reportPath: string) {
        this.reportPath = reportPath;
    }

    public generateReport(reportData: Report): void {
        const reportJson = JSON.stringify(reportData, null, 2);
        fs.writeFileSync(this.reportPath, reportJson, 'utf-8');
    }
}