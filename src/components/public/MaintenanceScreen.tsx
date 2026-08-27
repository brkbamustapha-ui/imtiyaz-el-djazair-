export function MaintenanceScreen({ message }: { message: string }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-7 px-6 text-center">
      <h1 className="h2 max-w-lg text-balance">{message}</h1>
      <div className="divider-gold w-32" />
    </main>
  );
}
