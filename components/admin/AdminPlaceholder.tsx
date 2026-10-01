import { Card } from "@/components/ui/card";

export function AdminPlaceholder({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card className="flex flex-col items-center justify-center border-dashed border-gray-300 bg-white px-6 py-20 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-blue-50 text-primary">
          {icon}
        </div>
        <h2 className="mt-4 text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-gray-600">{description}</p>
        <p className="mt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Coming soon
        </p>
      </Card>
    </div>
  );
}
