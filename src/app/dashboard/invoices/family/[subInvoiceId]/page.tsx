import SubInvoiceDetail from '@/components/SubInvoiceDetail';

type Props = {
  params: { subInvoiceId: string };
};

export default function SubInvoiceDetailPage({ params }: Props) {
  return (
    <div className="min-h-screen bg-background p-6">
      <SubInvoiceDetail subInvoiceId={params.subInvoiceId} />
    </div>
  );
}
