import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { clientsApi, tasksApi, appointmentsApi } from '../services/api';

const KYC_COLOR = { 'Not Started': 'bg-gray-100 text-gray-600', 'In Progress': 'bg-yellow-100 text-yellow-700', 'Completed': 'bg-green-100 text-green-700' };
const DEAL_COLOR = { 'New': 'bg-gray-100 text-gray-600', 'Contacted': 'bg-blue-100 text-blue-700', 'Interested': 'bg-purple-100 text-purple-700', 'Closed': 'bg-green-100 text-green-700' };
const DEAL_STEPS = ['New', 'Contacted', 'Interested', 'Closed'];

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([clientsApi.get(id), tasksApi.list({ clientId: id }), appointmentsApi.list({ clientId: id })])
      .then(([c, t, a]) => { setClient(c.data); setTasks(t.data); setAppointments(a.data); })
      .catch(() => toast.error('Failed to load client'))
      .finally(() => setLoading(false));
  }, [id]);

  const completeTask = async (taskId) => {
    try { await tasksApi.complete(taskId); setTasks(tasks.map(t => t._id === taskId ? { ...t, status: 'Completed' } : t)); toast.success('Task completed'); }
    catch { toast.error('Failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!client) return <div className="text-center py-16 text-gray-400">Client not found</div>;

  const dealIdx = DEAL_STEPS.indexOf(client.dealStatus);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/clients" className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></Link>
        <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
      </div>
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            {client.phone && <p className="text-sm text-gray-600"><span className="font-medium">Phone:</span> {client.phone}</p>}
            {client.email && <p className="text-sm text-gray-600"><span className="font-medium">Email:</span> {client.email}</p>}
            {client.notes && <p className="text-sm text-gray-600"><span className="font-medium">Notes:</span> {client.notes}</p>}
            {client.nextAction && <p className="text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg"><span className="font-medium">Next Action:</span> {client.nextAction}</p>}
          </div>
          <div className="flex gap-2">
            <span className={`badge ${DEAL_COLOR[client.dealStatus]}`}>{client.dealStatus}</span>
            <span className={`badge ${KYC_COLOR[client.kycStatus]}`}>KYC: {client.kycStatus}</span>
          </div>
        </div>
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Deal Progress</p>
          <div className="flex items-center gap-2">
            {DEAL_STEPS.map((step, i) => (
              <React.Fragment key={step}>
                <div className={`flex flex-col items-center ${i <= dealIdx ? 'text-primary-600' : 'text-gray-300'}`}>
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold ${i <= dealIdx ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-gray-50'}`}>
                    {i < dealIdx ? '✓' : i + 1}
                  </div>
                  <span className="text-xs mt-1 hidden sm:block">{step}</span>
                </div>
                {i < DEAL_STEPS.length - 1 && (<div className={`flex-1 h-0.5 ${i < dealIdx ? 'bg-primary-400' : 'bg-gray-200'}`} />)}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Tasks ({tasks.length})</h2>
          {tasks.length === 0 ? <p className="text-sm text-gray-400 py-4 text-center">No tasks for this client</p> : (
            <ul className="space-y-2">
              {tasks.map(t => (
                <li key={t._id} className={`flex items-start gap-3 p-2 rounded-lg ${t.status === 'Completed' ? 'opacity-50' : 'hover:bg-gray-50'}`}>
                  {t.status === 'Pending' ? (
                    <button onClick={() => completeTask(t._id)} className="mt-0.5 w-4 h-4 rounded border-2 border-gray-300 hover:border-green-500 flex-shrink-0" />
                  ) : (
                    <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  )}
                  <div>
                    <p className={`text-sm font-medium ${t.status === 'Completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{t.title}</p>
                    {t.dueDate && <p className="text-xs text-gray-400">{format(new Date(t.dueDate), 'MMM d, yyyy')}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Appointments ({appointments.length})</h2>
          {appointments.length === 0 ? <p className="text-sm text-gray-400 py-4 text-center">No appointments for this client</p> : (
            <ul className="space-y-2">
              {appointments.map(a => (
                <li key={a._id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-primary-50 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary-600">{format(new Date(a.dateTime), 'MMM')}</span>
                    <span className="text-sm font-bold text-primary-700">{format(new Date(a.dateTime), 'd')}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{format(new Date(a.dateTime), 'h:mm a')}</p>
                    <p className="text-xs text-gray-500">{a.type}{a.location ? ` · ${a.location}` : ''}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
