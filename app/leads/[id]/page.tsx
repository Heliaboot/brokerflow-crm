import { LeadDetailLoader } from "@/components/lead-detail/LeadDetailLoader";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <>
      {/* Same width as the lead page below it */}
      <WelcomeBanner className="max-w-6xl mx-auto mb-4" />
      <LeadDetailLoader leadId={id} />
    </>
  );
}
