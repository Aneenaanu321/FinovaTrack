import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { dashboardApi, tasksApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const PRIORITY_COLOR = { High: 'bg-red-100 text-red-700', Medium: 'bg-yellow-100 text-yellow-700', Low: 'bg-green-100 text-green-700' };

function StatCard({ label, value, color, icon }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    dashboardApi.stats()
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const completeTask = async (id) => {
    try {
      await tasksApi.complete(id);
      toast.success('Task completed!');
      load();
    } catch {
      toast.error('Failed to complete task');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  const { stats, todayTasks, overdueTasks, todayAppointments, upcomingAppointments } = data || {};

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good morning, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Clients" value={stats?.totalClients ?? 0} color="bg-blue-50" icon={<svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
        <StatCard label="Active Deals" value={stats?.activeDeals ?? 0} color="bg-purple-50" icon={<svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} />
        <StatCard label="Completed Tasks" value={stats?.completedTasks ?? 0} color="bg-green-50" icon={<svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard label="Overdue Tasks" value={stats?.overdueTasks ?? 0} color="bg-red-50" icon={<svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Today's Appointments</h2>
            <Link to="/appointments" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          {todayAppointments?.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No appointments today</p>
          ) : (
            <ul className="space-y-3">
              {todayAppointments?.map((appt) => (
                <li key={appt._id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary-700">{format(new Date(appt.dateTime), 'HH')}</span>
                    <span className="text-xs text-primary-500">{format(new Date(appt.dateTime), 'mm')}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{appt.client?.name}</p>
                    <p className="text-xs text-gray-500">{appt.type} {appt.location ? `· ${appt.location}` : ''}</p>
                    {appt.notes && <p className="text-xs text-gray-400 mt-1 truncate">{appt.notes}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Today's Tasks</h2>
            <Link to="/tasks" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          {todayTasks?.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No tasks for today</p>
          ) : (
            <ul className="space-y-2">
              {todayTasks?.map((task) => (
                <li key={task._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <button onClick={() => completeTask(task._id)} className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 flex-shrink-0 transition-colors" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    {task.client && <p className="text-xs text-gray-400">{task.client.name}</p>}
                  </div>
                  <span className={`badge ${PRIORITY_COLOR[task.priority]}`}>{task.priority}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {overdueTasks?.length > 0 && (
        <div className="card border-red-100">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <h2 className="font-semibold text-red-700">Overdue Tasks</h2>
            <span className="badge bg-red-100 text-red-700">{overdueTasks.length}</span>
          </div>
          <ul className="space-y-2">
            {overdueTasks.map((task) => (
              <li key={task._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-red-50">
                <button onClick={() => completeTask(task._id)} className="w-5 h-5 rounded-full border-2 border-red-300 hover:border-green-500 flex-shrink-0 transition-colors" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                  <p className="text-xs text-red-500">Due {format(new Date(task.dueDate), 'MMM d')}</p>
                </div>
                {task.client && <span className="text-xs text-gray-400 hidden sm:block">{task.client.name}</span>}
                <span className={`badge ${PRIORITY_COLOR[task.priority]}`}>{task.priority}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {upcomingAppointments?.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Upcoming Appointments</h2>
            <Link to="/appointments" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          <ul className="space-y-2">
            {upcomingAppointments.map((appt) => (
              <li key={appt._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex flex-col items-center justify-center flex-shrink-0 text-center">
                  <span className="text-xs font-bold text-gray-700">{format(new Date(appt.dateTime), 'MMM')}</span>
                  <span className="text-sm font-bold text-gray-900">{format(new Date(appt.dateTime), 'd')}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{appt.client?.name}</p>
                  <p className="text-xs text-gray-500">{format(new Date(appt.dateTime), 'h:mm a')} · {appt.type}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
