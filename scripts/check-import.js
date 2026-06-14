const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const latest = await prisma.pdfImport.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      pages: {
        include: { extractedQuestions: true }
      }
    }
  });

  if (!latest) { console.log('No imports found'); return; }

  console.log('=== Latest Import ===');
  console.log('File:', latest.fileName);
  console.log('Status:', latest.status);
  console.log('Pages:', latest.totalPages);
  console.log('PdfPage records:', latest.pages.length);
  console.log('');

  for (const page of latest.pages) {
    const q = page.extractedQuestions.length;
    if (q > 0 || page.errorMsg) {
      console.log(`  Page ${page.pageNumber}: processed=${page.processed}, questions=${q}, error=${page.errorMsg || 'none'}`);
    } else {
      console.log(`  Page ${page.pageNumber}: processed=${page.processed}, questions=0`);
    }
  }

  const totalQ = latest.pages.reduce((s, p) => s + p.extractedQuestions.length, 0);
  console.log('\nTotal extracted questions in DB:', totalQ);
}

main()
  .catch(e => console.log('ERROR:', e.message))
  .finally(() => prisma.$disconnect());
