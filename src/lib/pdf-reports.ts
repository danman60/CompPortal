/**
 * PDF Report Generation Library
 * Uses jsPDF and jspdf-autotable for professional competition reports
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Brand colors from design system
const COLORS = {
  primary: '#a855f7', // purple-500
  secondary: '#ec4899', // pink-500
  accent: '#eab308', // yellow-500
  text: '#111827', // gray-900
  textLight: '#6b7280', // gray-500
  border: '#e5e7eb', // gray-200
  success: '#10b981', // green-500
  warning: '#f59e0b', // yellow-500
  error: '#ef4444', // red-500
};

/**
 * Initialize PDF with standard CompPortal branding
 */
function initPDF(title: string, orientation: 'portrait' | 'landscape' = 'portrait'): jsPDF {
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'letter',
  });

  // Add header with branding
  doc.setFontSize(20);
  doc.setTextColor(COLORS.primary);
  doc.text('✨ GlowDance CompPortal', 15, 15);

  doc.setFontSize(12);
  doc.setTextColor(COLORS.text);
  doc.text(title, 15, 25);

  doc.setFontSize(9);
  doc.setTextColor(COLORS.textLight);
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`Generated: ${date}`, 15, 32);

  return doc;
}

/**
 * Add footer with page numbers
 */
function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(COLORS.textLight);
  doc.text(
    `Page ${pageNum} of ${totalPages}`,
    doc.internal.pageSize.width / 2,
    pageHeight - 10,
    { align: 'center' }
  );
  doc.text('GlowDance CompPortal', 15, pageHeight - 10);
}

/**
 * Entry Score Sheet - Individual entry with all judge scores
 */
export function generateEntryScoreSheet(data: {
  competition: {
    name: string;
    dates: string;
  };
  entry: {
    entry_number: number;
    title: string;
    studio_name: string;
    category: string;
    age_group: string;
    dancers: string[];
  };
  scores: {
    judge_name: string;
    judge_number: string;
    technical_score: number;
    artistic_score: number;
    performance_score: number;
    total_score: number;
    comments?: string;
  }[];
  average_score: number;
  award_level: string;
}): Blob {
  const doc = initPDF(`Entry Score Sheet - #${data.entry.entry_number}`);

  // Competition info section
  let yPos = 40;
  doc.setFontSize(14);
  doc.setTextColor(COLORS.primary);
  doc.text(data.competition.name, 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setTextColor(COLORS.textLight);
  doc.text(data.competition.dates, 15, yPos);
  yPos += 12;

  // Entry details box
  doc.setDrawColor(COLORS.border);
  doc.setFillColor(248, 250, 252); // gray-50
  doc.roundedRect(15, yPos, 180, 45, 3, 3, 'FD');

  yPos += 8;
  doc.setFontSize(16);
  doc.setTextColor(COLORS.text);
  doc.text(`Entry #${data.entry.entry_number}: ${data.entry.title}`, 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setTextColor(COLORS.textLight);
  doc.text(`Studio: ${data.entry.studio_name}`, 20, yPos);
  yPos += 6;
  doc.text(`Category: ${data.entry.category} | Age Group: ${data.entry.age_group}`, 20, yPos);
  yPos += 6;
  doc.text(`Dancers: ${data.entry.dancers.join(', ')}`, 20, yPos);
  yPos += 15;

  // Scores table
  autoTable(doc, {
    startY: yPos,
    head: [['Judge', 'Technical', 'Artistic', 'Performance', 'Total']],
    body: data.scores.map((score) => [
      `${score.judge_name} (#${score.judge_number})`,
      score.technical_score.toFixed(1),
      score.artistic_score.toFixed(1),
      score.performance_score.toFixed(1),
      score.total_score.toFixed(1),
    ]),
    foot: [
      [
        'AVERAGE SCORE',
        '',
        '',
        '',
        data.average_score.toFixed(2),
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: '#ffffff',
      fontSize: 10,
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: COLORS.secondary,
      textColor: '#ffffff',
      fontSize: 11,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { halign: 'center', cellWidth: 27.5 },
      2: { halign: 'center', cellWidth: 27.5 },
      3: { halign: 'center', cellWidth: 27.5 },
      4: { halign: 'center', cellWidth: 27.5 },
    },
  });

  // Award level badge
  yPos = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.setTextColor(COLORS.text);
  doc.text('Award Level:', 15, yPos);

  const awardColor = data.award_level?.toLowerCase().includes('platinum')
    ? COLORS.primary
    : data.award_level?.toLowerCase().includes('gold')
    ? COLORS.accent
    : COLORS.success;

  doc.setFontSize(18);
  doc.setTextColor(awardColor);
  doc.text(data.award_level || 'TBD', 60, yPos);

  // Comments section
  if (data.scores.some((s) => s.comments)) {
    yPos += 15;
    doc.setFontSize(12);
    doc.setTextColor(COLORS.text);
    doc.text('Judge Comments:', 15, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setTextColor(COLORS.textLight);
    data.scores.forEach((score) => {
      if (score.comments) {
        doc.text(`${score.judge_name}: ${score.comments}`, 15, yPos, {
          maxWidth: 180,
        });
        yPos += 10;
      }
    });
  }

  addFooter(doc, 1, 1);

  return doc.output('blob');
}

/**
 * Category Results Report - Rankings within a category
 */
export function generateCategoryResultsReport(data: {
  competition: {
    name: string;
    dates: string;
  };
  category: string;
  age_group: string;
  entries: {
    placement: number;
    entry_number: number;
    title: string;
    studio_name: string;
    average_score: number;
    award_level: string;
  }[];
}): Blob {
  const doc = initPDF(`Category Results - ${data.category} (${data.age_group})`);

  // Competition info
  let yPos = 40;
  doc.setFontSize(14);
  doc.setTextColor(COLORS.primary);
  doc.text(data.competition.name, 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setTextColor(COLORS.textLight);
  doc.text(data.competition.dates, 15, yPos);
  yPos += 12;

  // Category header
  doc.setFontSize(16);
  doc.setTextColor(COLORS.text);
  doc.text(`${data.category} - ${data.age_group}`, 15, yPos);
  yPos += 10;

  // Results table with medal emojis
  const tableData = data.entries.map((entry) => {
    let medal = '';
    if (entry.placement === 1) medal = '🥇';
    else if (entry.placement === 2) medal = '🥈';
    else if (entry.placement === 3) medal = '🥉';

    return [
      `${medal} ${entry.placement}`,
      `#${entry.entry_number}`,
      entry.title,
      entry.studio_name,
      entry.average_score.toFixed(2),
      entry.award_level,
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Place', 'Entry #', 'Title', 'Studio', 'Score', 'Award']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: '#ffffff',
      fontSize: 10,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 60 },
      3: { cellWidth: 45 },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 25, halign: 'center' },
    },
    didDrawCell: (data: any) => {
      // Highlight top 3 placements
      if (data.section === 'body' && data.column.index === 0) {
        const placement = parseInt(data.cell.text[0]?.replace(/[🥇🥈🥉]/g, '').trim());
        if (placement === 1) {
          doc.setFillColor(255, 215, 0, 0.1); // gold tint
        } else if (placement === 2) {
          doc.setFillColor(192, 192, 192, 0.1); // silver tint
        } else if (placement === 3) {
          doc.setFillColor(205, 127, 50, 0.1); // bronze tint
        }
      }
    },
  });

  addFooter(doc, 1, 1);

  return doc.output('blob');
}

/**
 * Judge Scorecard - All scores by a specific judge
 */
export function generateJudgeScorecardReport(data: {
  competition: {
    name: string;
    dates: string;
  };
  judge: {
    name: string;
    judge_number: string;
    credentials: string;
  };
  scores: {
    entry_number: number;
    title: string;
    category: string;
    technical_score: number;
    artistic_score: number;
    performance_score: number;
    total_score: number;
  }[];
}): Blob {
  const doc = initPDF(`Judge Scorecard - ${data.judge.name}`, 'landscape');

  // Competition info
  let yPos = 40;
  doc.setFontSize(14);
  doc.setTextColor(COLORS.primary);
  doc.text(data.competition.name, 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setTextColor(COLORS.textLight);
  doc.text(data.competition.dates, 15, yPos);
  yPos += 12;

  // Judge info
  doc.setFontSize(12);
  doc.setTextColor(COLORS.text);
  doc.text(`Judge: ${data.judge.name} (#${data.judge.judge_number})`, 15, yPos);
  yPos += 6;
  doc.setFontSize(9);
  doc.setTextColor(COLORS.textLight);
  doc.text(data.judge.credentials, 15, yPos);
  yPos += 10;

  // Scores table
  autoTable(doc, {
    startY: yPos,
    head: [['Entry #', 'Title', 'Category', 'Technical', 'Artistic', 'Performance', 'Total']],
    body: data.scores.map((score) => [
      `#${score.entry_number}`,
      score.title,
      score.category,
      score.technical_score.toFixed(1),
      score.artistic_score.toFixed(1),
      score.performance_score.toFixed(1),
      score.total_score.toFixed(1),
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: '#ffffff',
      fontSize: 10,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 50 },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 30, halign: 'center' },
      6: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
    },
  });

  // Summary statistics
  yPos = (doc as any).lastAutoTable.finalY + 15;
  const avgTotal =
    data.scores.reduce((sum, s) => sum + s.total_score, 0) / data.scores.length;

  doc.setFontSize(11);
  doc.setTextColor(COLORS.text);
  doc.text(`Total Entries Scored: ${data.scores.length}`, 15, yPos);
  yPos += 7;
  doc.text(`Average Score Given: ${avgTotal.toFixed(2)}`, 15, yPos);

  addFooter(doc, 1, 1);

  return doc.output('blob');
}

/**
 * Competition Summary Report - Overall statistics
 */
export function generateCompetitionSummaryReport(data: {
  competition: {
    name: string;
    dates: string;
    location: string;
  };
  statistics: {
    total_entries: number;
    total_studios: number;
    total_dancers: number;
    categories: { name: string; count: number }[];
    age_groups: { name: string; count: number }[];
    award_distribution: { level: string; count: number }[];
  };
}): Blob {
  const doc = initPDF('Competition Summary Report');

  // Competition header
  let yPos = 40;
  doc.setFontSize(16);
  doc.setTextColor(COLORS.primary);
  doc.text(data.competition.name, 15, yPos);
  yPos += 8;

  doc.setFontSize(11);
  doc.setTextColor(COLORS.textLight);
  doc.text(data.competition.dates, 15, yPos);
  yPos += 6;
  doc.text(data.competition.location, 15, yPos);
  yPos += 15;

  // Overall statistics
  doc.setFontSize(13);
  doc.setTextColor(COLORS.text);
  doc.text('Overview', 15, yPos);
  yPos += 10;

  const stats = [
    ['Total Entries', data.statistics.total_entries.toString()],
    ['Participating Studios', data.statistics.total_studios.toString()],
    ['Total Dancers', data.statistics.total_dancers.toString()],
  ];

  autoTable(doc, {
    startY: yPos,
    body: stats,
    theme: 'plain',
    styles: { fontSize: 11, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 40, halign: 'right', textColor: COLORS.primary },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Categories breakdown
  doc.setFontSize(13);
  doc.setTextColor(COLORS.text);
  doc.text('Entries by Category', 15, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['Category', 'Entries']],
    body: data.statistics.categories.map((cat) => [cat.name, cat.count.toString()]),
    theme: 'striped',
    headStyles: { fillColor: COLORS.primary, fontSize: 10 },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 40, halign: 'center' },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Award distribution
  doc.setFontSize(13);
  doc.setTextColor(COLORS.text);
  doc.text('Award Distribution', 15, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['Award Level', 'Count']],
    body: data.statistics.award_distribution.map((award) => [
      award.level,
      award.count.toString(),
    ]),
    theme: 'striped',
    headStyles: { fillColor: COLORS.secondary, fontSize: 10 },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 40, halign: 'center' },
    },
  });

  addFooter(doc, 1, 1);

  return doc.output('blob');
}

/**
 * Invoice PDF - Studio invoice for competition entries
 */
export function generateInvoicePDF(invoice: {
  invoiceNumber: string;
  invoiceDate: Date | string;
  studio: {
    name: string;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    province?: string | null;
    postal_code?: string | null;
    country?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  competition: {
    name: string;
    year: number;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    location?: string | null;
  };
  reservation?: {
    spacesRequested: number;
    spacesConfirmed: number;
    depositAmount: number;
    paymentStatus: string | null;
  } | null;
  lineItems: {
    id: string;
    entryNumber: number | null;
    title: string;
    category: string;
    sizeCategory: string;
    participantCount: number;
    entryFee: number;
    lateFee: number;
    total: number;
  }[];
  summary: {
    entryCount: number;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
  };
}): Blob {
  const doc = initPDF(`Invoice ${invoice.invoiceNumber}`);

  // Invoice header with invoice number and date
  let yPos = 40;
  doc.setFontSize(18);
  doc.setTextColor(COLORS.text);
  doc.text('INVOICE', 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setTextColor(COLORS.textLight);
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 15, yPos);
  yPos += 5;

  const invoiceDate = new Date(invoice.invoiceDate);
  doc.text(`Date: ${invoiceDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })}`, 15, yPos);
  yPos += 15;

  // Total amount in top right
  doc.setFontSize(10);
  doc.setTextColor(COLORS.textLight);
  doc.text('Total Amount', 200, 40, { align: 'right' });
  doc.setFontSize(20);
  doc.setTextColor(COLORS.success);
  doc.text(`$${invoice.summary.totalAmount.toFixed(2)}`, 200, 48, { align: 'right' });
  yPos += 5;

  // Bill To section (left) and Competition Info (right)
  const leftX = 15;
  const rightX = 115;

  doc.setFontSize(9);
  doc.setTextColor(COLORS.textLight);
  doc.text('BILL TO', leftX, yPos);
  doc.text('COMPETITION', rightX, yPos);
  yPos += 6;

  // Studio info (Bill To)
  doc.setFontSize(11);
  doc.setTextColor(COLORS.text);
  doc.text(invoice.studio.name, leftX, yPos);

  doc.setFontSize(9);
  doc.setTextColor(COLORS.textLight);
  let studioYPos = yPos + 5;
  if (invoice.studio.address1) {
    doc.text(invoice.studio.address1, leftX, studioYPos);
    studioYPos += 4;
  }
  if (invoice.studio.address2) {
    doc.text(invoice.studio.address2, leftX, studioYPos);
    studioYPos += 4;
  }
  if (invoice.studio.city && invoice.studio.province) {
    doc.text(
      `${invoice.studio.city}, ${invoice.studio.province} ${invoice.studio.postal_code || ''}`,
      leftX,
      studioYPos
    );
    studioYPos += 4;
  }
  if (invoice.studio.country) {
    doc.text(invoice.studio.country, leftX, studioYPos);
    studioYPos += 4;
  }
  if (invoice.studio.email) {
    studioYPos += 2;
    doc.text(`Email: ${invoice.studio.email}`, leftX, studioYPos);
    studioYPos += 4;
  }
  if (invoice.studio.phone) {
    doc.text(`Phone: ${invoice.studio.phone}`, leftX, studioYPos);
  }

  // Competition info (right side)
  doc.setFontSize(11);
  doc.setTextColor(COLORS.text);
  doc.text(invoice.competition.name, rightX, yPos);

  doc.setFontSize(9);
  doc.setTextColor(COLORS.textLight);
  let compYPos = yPos + 5;
  doc.text(`Year: ${invoice.competition.year}`, rightX, compYPos);
  compYPos += 4;

  if (invoice.competition.startDate) {
    const startDate = new Date(invoice.competition.startDate);
    let dateText = `Date: ${startDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`;

    if (invoice.competition.endDate && invoice.competition.startDate !== invoice.competition.endDate) {
      const endDate = new Date(invoice.competition.endDate);
      dateText += ` - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
    }

    doc.text(dateText, rightX, compYPos);
    compYPos += 4;
  }

  if (invoice.competition.location) {
    doc.text(invoice.competition.location, rightX, compYPos, { maxWidth: 85 });
  }

  yPos = Math.max(studioYPos, compYPos) + 12;

  // Reservation details (if exists)
  if (invoice.reservation) {
    doc.setFontSize(9);
    doc.setTextColor(COLORS.textLight);
    doc.text('RESERVATION DETAILS', leftX, yPos);
    yPos += 6;

    const resData = [
      ['Spaces Requested', invoice.reservation.spacesRequested.toString()],
      ['Spaces Confirmed', invoice.reservation.spacesConfirmed.toString()],
      ['Deposit Amount', `$${invoice.reservation.depositAmount.toFixed(2)}`],
      ['Payment Status', (invoice.reservation.paymentStatus || 'PENDING').toUpperCase()],
    ];

    autoTable(doc, {
      startY: yPos,
      body: resData,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 50, textColor: COLORS.textLight },
        1: { cellWidth: 45, textColor: COLORS.text, fontStyle: 'bold' },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Line items table
  doc.setFontSize(9);
  doc.setTextColor(COLORS.textLight);
  doc.text('ENTRIES', leftX, yPos);
  yPos += 6;

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Routine Title', 'Category', 'Size', 'Dancers', 'Routine Fee', 'Late Fee', 'Total']],
    body: invoice.lineItems.map((item) => [
      item.entryNumber?.toString() || '-',
      item.title,
      item.category,
      item.sizeCategory,
      item.participantCount.toString(),
      `$${item.entryFee.toFixed(2)}`,
      item.lateFee > 0 ? `$${item.lateFee.toFixed(2)}` : '-',
      `$${item.total.toFixed(2)}`,
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: '#ffffff',
      fontSize: 8,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 30 },
      3: { cellWidth: 20 },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
    },
  });

  // Totals section
  yPos = (doc as any).lastAutoTable.finalY + 10;

  const totalsX = 130;
  const totalsWidth = 70;

  // Subtotal
  doc.setDrawColor(COLORS.border);
  doc.line(totalsX, yPos, totalsX + totalsWidth, yPos);
  yPos += 5;

  doc.setFontSize(9);
  doc.setTextColor(COLORS.textLight);
  doc.text(`Subtotal (${invoice.summary.entryCount} entries)`, totalsX, yPos);
  doc.setTextColor(COLORS.text);
  doc.text(`$${invoice.summary.subtotal.toFixed(2)}`, totalsX + totalsWidth, yPos, { align: 'right' });
  yPos += 6;

  // Tax (if applicable)
  if (invoice.summary.taxAmount > 0) {
    doc.setTextColor(COLORS.textLight);
    doc.text(`Tax (${(invoice.summary.taxRate * 100).toFixed(2)}%)`, totalsX, yPos);
    doc.setTextColor(COLORS.text);
    doc.text(`$${invoice.summary.taxAmount.toFixed(2)}`, totalsX + totalsWidth, yPos, { align: 'right' });
    yPos += 6;
  }

  // Total (highlighted)
  doc.setDrawColor(COLORS.success);
  doc.setLineWidth(0.5);
  doc.line(totalsX, yPos, totalsX + totalsWidth, yPos);
  yPos += 6;

  doc.setFontSize(12);
  doc.setTextColor(COLORS.text);
  doc.text('TOTAL', totalsX, yPos);
  doc.setFontSize(14);
  doc.setTextColor(COLORS.success);
  doc.text(`$${invoice.summary.totalAmount.toFixed(2)}`, totalsX + totalsWidth, yPos, { align: 'right' });
  yPos += 10;

  // Footer
  yPos += 5;
  doc.setFontSize(9);
  doc.setTextColor(COLORS.textLight);
  doc.text(`Thank you for participating in ${invoice.competition.name}!`, 15, yPos, { maxWidth: 180 });
  yPos += 5;
  doc.text('For questions about this invoice, please contact the competition organizers.', 15, yPos, { maxWidth: 180 });

  addFooter(doc, 1, 1);

  return doc.output('blob');
}
