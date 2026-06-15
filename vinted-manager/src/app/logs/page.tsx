import prisma from "@/lib/prisma";
import LogsTable from "@/components/logs/LogsTable";

export const dynamic = 'force-dynamic';

export default async function LogsPage() {
  const logs = await prisma.extensionLog.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Serialize Date to string to avoid RSC warnings
  const serializedLogs = logs.map(log => ({
    ...log,
    createdAt: log.createdAt.toISOString()
  }));

  return (
    <div className="p-6 h-full flex flex-col bg-[#0a0a0a]">
      <div className="mb-4">
        <h1 className="text-2xl font-mono text-green-500 font-bold tracking-tight">
          &gt; SYSTEM_LOGS
        </h1>
        <p className="text-gray-400 font-mono text-sm mt-1">
          Monitoring {serializedLogs.length} events
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <LogsTable logs={serializedLogs} />
      </div>
    </div>
  );
}
