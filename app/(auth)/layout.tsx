export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <div className="min-h-screen bg-white">{children}</div>;
}
