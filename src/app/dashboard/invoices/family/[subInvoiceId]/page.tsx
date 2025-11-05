import SubInvoiceDetail from '@/components/SubInvoiceDetail';

type Props = {
  params: Promise<{ subInvoiceId: string }>;
};

export default async function SubInvoiceDetailPage({ params }: Props) {
  const { subInvoiceId } = await params;

  return (
    <div className="min-h-screen bg-background p-6">
      <SubInvoiceDetail subInvoiceId={subInvoiceId} />
    </div>
  );
}
