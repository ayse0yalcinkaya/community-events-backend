// Libraries
import { Injectable } from '@nestjs/common';
import { Workbook, Worksheet } from 'exceljs';

// Base
import { BaseExcelAdapter } from '../../base/base-excel-adapter.abstract';

// Interfaces
import { IExcelAdapter } from '../../interfaces/excel-adapter.interface';

// Decorators
import { RegisterExcelAdapter } from '../../decorators/register-excel-adapter.decorator';

interface IExportTicket {
  code: string;
  subject: string;
  severity: string;
  status: string;
  userName: string;
  categoryName: string;
  departmentName: string;
  isOverdue: boolean;
  createdAt: Date;
}

@RegisterExcelAdapter('tickets-report')
@Injectable()
export class TicketsReportExcelAdapter extends BaseExcelAdapter implements IExcelAdapter {
  readonly adapterName = 'tickets-report';

  async buildWorkbook(workbook: Workbook, data: any, lang: string): Promise<void> {
    const worksheet: Worksheet = workbook.addWorksheet('Tickets Report');

    // Define columns
    worksheet.columns = [
      { header: 'Kod', key: 'code', width: 20 },
      { header: 'Konu', key: 'subject', width: 40 },
      { header: 'Önem', key: 'severity', width: 12 },
      { header: 'Durum', key: 'status', width: 15 },
      { header: 'Kullanıcı', key: 'userName', width: 25 },
      { header: 'Kategori', key: 'categoryName', width: 20 },
      { header: 'Departman', key: 'departmentName', width: 20 },
      { header: 'SLA Aşımı', key: 'isOverdue', width: 12 },
      { header: 'Oluşturulma', key: 'createdAt', width: 18 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Add data rows
    const tickets: IExportTicket[] = data.tickets || [];
    tickets.forEach((ticket) => {
      const row = worksheet.addRow({
        code: ticket.code,
        subject: ticket.subject,
        severity: this.getSeverityLabel(ticket.severity),
        status: this.getStatusLabel(ticket.status),
        userName: ticket.userName,
        categoryName: ticket.categoryName,
        departmentName: ticket.departmentName,
        isOverdue: ticket.isOverdue ? 'Evet' : 'Hayır',
        createdAt: this.formatDate(ticket.createdAt),
      });

      // Apply conditional styling for overdue tickets
      if (ticket.isOverdue) {
        const overdueCell = row.getCell('isOverdue');
        overdueCell.font = { color: { argb: 'FFFF0000' }, bold: true };
      }

      // Apply severity-based styling
      const severityCell = row.getCell('severity');
      severityCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: this.getSeverityColor(ticket.severity) },
      };
    });

    // Apply auto-filter
    if (tickets.length > 0) {
      const lastRow = tickets.length + 1;
      this.applyAutoFilter(worksheet, {
        start: 'A1',
        end: `I${lastRow}`,
      });
    }

    // Freeze header row
    this.freezePanes(worksheet, { row: 1 });
  }

  private getSeverityLabel(severity: string): string {
    const labels: Record<string, string> = {
      CRITICAL: 'Kritik',
      HIGH: 'Yüksek',
      MEDIUM: 'Orta',
      LOW: 'Düşük',
    };
    return labels[severity] || severity;
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      OPEN: 'Bekliyor',
      IN_PROGRESS: 'İşlemde',
      REVIEW: 'İncelemede',
      CLOSED: 'Tamamlandı',
    };
    return labels[status] || status;
  }

  private getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      CRITICAL: 'FFFF6B6B',
      HIGH: 'FFFFA94D',
      MEDIUM: 'FFFFD93D',
      LOW: 'FF69DB7C',
    };
    return colors[severity] || 'FFFFFFFF';
  }

  private formatDate(date: Date): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
