"use client";

import { useState, useMemo } from "react";

type LogType = {
  id: string;
  botAccountId: string | null;
  botName: string;
  message: string;
  type: string;
  source: string;
  createdAt: string;
};

export default function LogsTable({ logs }: { logs: LogType[] }) {
  const [search, setSearch] = useState("");
  const [filterBot, setFilterBot] = useState("");

  const uniqueBots = useMemo(() => {
    return Array.from(new Set(logs.map(l => l.botName))).filter(Boolean);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = log.message.toLowerCase().includes(search.toLowerCase()) || 
                          log.botName.toLowerCase().includes(search.toLowerCase()) ||
                          log.source.toLowerCase().includes(search.toLowerCase());
      const matchBot = filterBot ? log.botName === filterBot : true;
      return matchSearch && matchBot;
    });
  }, [logs, search, filterBot]);

  const getColorForType = (type: string) => {
    switch (type.toUpperCase()) {
      case "ERROR": return "text-red-500";
      case "WARN": return "text-yellow-500";
      case "INFO": return "text-blue-400";
      case "SUCCESS": return "text-green-500";
      default: return "text-gray-300";
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 font-mono">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Search logs..."
          className="bg-gray-900 text-green-400 border border-gray-700 p-2 rounded focus:outline-none focus:border-green-500 min-w-[250px]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="bg-gray-900 text-green-400 border border-gray-700 p-2 rounded focus:outline-none focus:border-green-500"
          value={filterBot}
          onChange={(e) => setFilterBot(e.target.value)}
        >
          <option value="">All Bots</option>
          {uniqueBots.map(bot => (
            <option key={bot} value={bot}>{bot}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-gray-900 rounded-md border border-gray-800 shadow-xl">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="sticky top-0 bg-gray-950 text-gray-400 border-b border-gray-800">
            <tr>
              <th className="p-3 font-medium tracking-wider">TIMESTAMP</th>
              <th className="p-3 font-medium tracking-wider">LEVEL</th>
              <th className="p-3 font-medium tracking-wider">BOT</th>
              <th className="p-3 font-medium tracking-wider">SOURCE</th>
              <th className="p-3 font-medium tracking-wider w-full">MESSAGE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {filteredLogs.map(log => (
              <tr key={log.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="p-3 text-gray-500 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className={`p-3 font-bold ${getColorForType(log.type)}`}>
                  [{log.type.toUpperCase()}]
                </td>
                <td className="p-3 text-purple-400 font-semibold whitespace-nowrap">
                  {log.botName}
                </td>
                <td className="p-3 text-gray-400 whitespace-nowrap text-xs">
                  {log.source}
                </td>
                <td className="p-3 text-gray-300 break-words">
                  {log.message}
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500 italic">
                  No logs found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
