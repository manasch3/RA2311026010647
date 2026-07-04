'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle, XCircle, Clock, Server, Play, Plus } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ queued: 0, running: 0, completed: 0, failed: 0, deadLetter: 0 });
  const [workers, setWorkers] = useState([]);
  const [queues, setQueues] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQueue, setSelectedQueue] = useState('');

  const fetchData = async () => {
    try {
      const [workerRes, queueRes, jobRes] = await Promise.all([
        fetch('/api/workers'),
        fetch('/api/queues'),
        fetch(`/api/jobs${selectedQueue ? `?queueId=${selectedQueue}` : ''}`)
      ]);
      const workerData = await workerRes.json();
      const queueData = await queueRes.json();
      const jobData = await jobRes.json();
      
      setStats(workerData.stats || { queued: 0, running: 0, completed: 0, failed: 0, deadLetter: 0 });
      setWorkers(workerData.workers || []);
      setQueues(queueData || []);
      setJobs(jobData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [selectedQueue]);

  const createDummyJob = async () => {
    if (queues.length === 0) return alert('No queues available. Seed the DB first.');
    const q: any = queues[0];
    await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Demo Job ' + Math.floor(Math.random() * 1000),
        queueId: q.id,
        payload: { sleep: 2000, shouldFail: Math.random() > 0.8 }, // 20% chance to fail
      })
    });
    fetchData();
  };

  const retryJob = async (jobId: string) => {
    await fetch('/api/jobs/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId })
    });
    fetchData();
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Distributed Job Scheduler</h1>
            <p className="text-gray-500 mt-1">Real-time Dashboard</p>
          </div>
          <button 
            onClick={createDummyJob}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow font-medium transition-colors"
          >
            <Plus size={18} /> Spawn Demo Job
          </button>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={<Clock className="text-blue-500"/>} title="Queued" value={stats.queued} />
          <StatCard icon={<Activity className="text-indigo-500 animate-pulse"/>} title="Running" value={stats.running} />
          <StatCard icon={<CheckCircle className="text-emerald-500"/>} title="Completed" value={stats.completed} />
          <StatCard icon={<XCircle className="text-rose-500"/>} title="Failed" value={stats.failed} />
          <StatCard icon={<Server className="text-gray-500"/>} title="DLQ" value={stats.deadLetter} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Workers Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Server size={18} className="text-gray-500" /> Active Workers ({workers.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
              {workers.length === 0 ? <p className="p-5 text-gray-400 text-center">No active workers.</p> : null}
              {workers.map((w: any) => (
                <div key={w.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{w.id}</p>
                    <p className="text-xs text-gray-500">Started: {new Date(w.startedAt).toLocaleString()}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${w.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                    {w.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Jobs Panel */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Activity size={18} className="text-indigo-500" /> Recent Jobs
              </h2>
              <select 
                className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                value={selectedQueue}
                onChange={(e) => setSelectedQueue(e.target.value)}
              >
                <option value="">All Queues</option>
                {queues.map((q: any) => (
                  <option key={q.id} value={q.id}>{q.name}</option>
                ))}
              </select>
            </div>
            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
              {jobs.length === 0 ? <p className="p-5 text-gray-400 text-center">No jobs found.</p> : null}
              {jobs.map((job: any) => (
                <div key={job.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900">{job.name}</p>
                    <div className="flex gap-4 mt-1 text-xs text-gray-500">
                      <span>ID: {job.id.substring(0,8)}...</span>
                      <span>Attempts: {job.attempts}/{job.maxAttempts}</span>
                      {job.lockedBy && <span>Worker: {job.lockedBy.split('-')[0]}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {job.status === 'FAILED' && (
                      <button onClick={() => retryJob(job.id)} className="text-xs text-blue-600 font-semibold hover:underline bg-blue-50 px-2 py-1 rounded">Retry</button>
                    )}
                    <JobStatusBadge status={job.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value }: { icon: any, title: string, value: number }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className="p-3 bg-gray-50 rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const styles: any = {
    QUEUED: 'bg-blue-100 text-blue-700',
    RUNNING: 'bg-indigo-100 text-indigo-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    FAILED: 'bg-rose-100 text-rose-700',
  };
  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${styles[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  );
}
