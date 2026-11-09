import { LeadDetailLoader } from "@/components/lead-detail/LeadDetailLoader";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  return <LeadDetailLoader leadId={id} />;
}
