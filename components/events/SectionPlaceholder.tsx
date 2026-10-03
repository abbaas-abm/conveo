import { Card } from "@/components/ui/card";

export function SectionPlaceholder({
  title,
  message = "The event organizers are still confirming these details. Please check back soon.",
}: {
  title: string;
  message?: string;
}) {
  return (
    <Card className="border-dashed border-gray-300 bg-slate-50 p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-gray-500">{message}</p>
    </Card>
  );
}
