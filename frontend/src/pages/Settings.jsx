import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authApi, notificationsApi, auditApi, clientsApi } from '../services/api';
import { downloadClientsCsv, downloadClientsExcel } from '../utils/clientExport';
import PasswordHints from '../components/PasswordHints';
import { validatePasswordForm } from '../utils/validation';
import { subscribeToPush, unsubscribeFromPush } from '../utils/push';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    branch: user?.branch || '',
    employeeId: user?.employeeId || '',
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({
    dailyDigestEnabled: true,
    dailyDigestHour: 7,
    pushEnabled: false,
    pushSubscribed: false,
    pushConfigured: false,
  });
  const [savingNotif, setSavingNotif] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [backupPrefs, setBackupPrefs] = useState({
    weeklyBackupEnabled: true,
    weeklyBackupWeekday: 1,
    weeklyBackupHour: 8,
    lastWeeklyBackupAt: null,
  });
  const [savingBackup, setSavingBackup] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        branch: user.branch || '',
        employeeId: user.employeeId || '',
      });
    }
  }, [user]);

  useEffect(() => {
    notificationsApi.preferences()
      .then((r) => setNotifPrefs(r.data))
      .catch(() => {});
    auditApi.list({ limit: 20 })
      .then((r) => setAuditLogs(r.data.items || []))
      .catch(() => {})
      .finally(() => setAuditLoading(false));
    clientsApi.backupPreferences()
      .then((r) => setBackupPrefs(r.data))
      .catch(() => {});
  }, []);

  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const saveBackupPrefs = async (e) => {
    e.preventDefault();
    setSavingBackup(true);
    try {
      const res = await clientsApi.updateBackupPreferences({
        weeklyBackupEnabled: backupPrefs.weeklyBackupEnabled,
        weeklyBackupWeekday: Number(backupPrefs.weeklyBackupWeekday),
        weeklyBackupHour: Number(backupPrefs.weeklyBackupHour),
      });
      setBackupPrefs(res.data);
      toast.success('Backup schedule saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save backup settings');
    } finally {
      setSavingBackup(false);
    }
  };

  const sendBackupNow = async () => {
    try {
      const res = await clientsApi.sendBackupNow();
      toast.success(res.data.message);
      const prefs = await clientsApi.backupPreferences();
      setBackupPrefs(prefs.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send backup');
    }
  };

  const saveNotifPrefs = async (e) => {
    e.preventDefault();
    setSavingNotif(true);
    try {
      const res = await notificationsApi.updatePreferences({
        dailyDigestEnabled: notifPrefs.dailyDigestEnabled,
        dailyDigestHour: Number(notifPrefs.dailyDigestHour),
        pushEnabled: notifPrefs.pushEnabled,
      });
      setNotifPrefs(res.data);
      toast.success('Notification preferences saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save preferences');
    } finally {
      setSavingNotif(false);
    }
  };

  const enablePush = async () => {
    setPushLoading(true);
    try {
      await subscribeToPush();
      const res = await notificationsApi.preferences();
      setNotifPrefs(res.data);
      toast.success('Push notifications enabled');
    } catch (err) {
      toast.error(err.message || 'Could not enable push');
    } finally {
      setPushLoading(false);
    }
  };

  const disablePush = async () => {
    setPushLoading(true);
    try {
      await unsubscribeFromPush();
      await notificationsApi.updatePreferences({ pushEnabled: false });
      const res = await notificationsApi.preferences();
      setNotifPrefs(res.data);
      toast.success('Push notifications disabled');
    } catch (err) {
      toast.error(err.message || 'Could not disable push');
    } finally {
      setPushLoading(false);
    }
  };

  const sendDigestNow = async () => {
    try {
      const res = await notificationsApi.sendDigestNow();
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send digest');
    }
  };

  const handleProfile = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });
  const handlePassword = (e) => setPasswords({ ...passwords, [e.target.name]: e.target.value });

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await authApi.updateProfile(profile);
      updateUser(res.data);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    const validation = validatePasswordForm(passwords);
    setPasswordErrors(validation);
    if (Object.keys(validation).length) return;
    setSavingPassword(true);
    try {
      await authApi.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success('Password changed');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your profile and account security</p>
      </div>

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input name="name" value={profile.name} onChange={handleProfile} className="input" required />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" value={profile.email} onChange={handleProfile} className="input" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Branch <span className="text-gray-400 font-normal">(optional)</span></label>
              <input name="branch" value={profile.branch} onChange={handleProfile} className="input" placeholder="Main Street" />
            </div>
            <div>
              <label className="label">Employee ID <span className="text-gray-400 font-normal">(optional)</span></label>
              <input name="employeeId" value={profile.employeeId} onChange={handleProfile} className="input" placeholder="EMP-1001" />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={savingProfile}>
            {savingProfile ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Protect your data</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Export a full copy of your clients anytime. Schedule a weekly backup email with your client list attached.
        </p>
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            className="btn-primary"
            disabled={exportingData}
            onClick={async () => {
              setExportingData(true);
              try {
                await downloadClientsCsv();
                toast.success('Downloaded full client backup (CSV)');
              } catch {
                toast.error('Export failed');
              } finally {
                setExportingData(false);
              }
            }}
          >
            {exportingData ? 'Exporting…' : 'Export all clients (CSV)'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={exportingData}
            onClick={async () => {
              setExportingData(true);
              try {
                await downloadClientsExcel();
                toast.success('Downloaded full client backup (Excel)');
              } catch {
                toast.error('Export failed');
              } finally {
                setExportingData(false);
              }
            }}
          >
            Export all (Excel)
          </button>
        </div>
        <form onSubmit={saveBackupPrefs} className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={backupPrefs.weeklyBackupEnabled}
              onChange={(e) => setBackupPrefs({ ...backupPrefs, weeklyBackupEnabled: e.target.checked })}
            />
            Weekly backup email (CSV attachment)
          </label>
          {backupPrefs.weeklyBackupEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Day (UTC)</label>
                <select
                  className="input"
                  value={backupPrefs.weeklyBackupWeekday}
                  onChange={(e) => setBackupPrefs({ ...backupPrefs, weeklyBackupWeekday: e.target.value })}
                >
                  {WEEKDAYS.map((label, i) => (
                    <option key={label} value={i}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Hour (UTC, 0–23)</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  className="input"
                  value={backupPrefs.weeklyBackupHour}
                  onChange={(e) => setBackupPrefs({ ...backupPrefs, weeklyBackupHour: e.target.value })}
                />
              </div>
            </div>
          )}
          {backupPrefs.lastWeeklyBackupAt && (
            <p className="text-xs text-gray-500">
              Last backup: {format(new Date(backupPrefs.lastWeeklyBackupAt), 'MMM d, yyyy h:mm a')}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={savingBackup}>
              {savingBackup ? 'Saving…' : 'Save backup schedule'}
            </button>
            <button type="button" className="btn-secondary" onClick={sendBackupNow}>
              Send backup now
            </button>
          </div>
          <p className="text-xs text-gray-500">Without SMTP, backups are logged in the backend console.</p>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h2>
        <form onSubmit={saveNotifPrefs} className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={notifPrefs.dailyDigestEnabled}
              onChange={(e) => setNotifPrefs({ ...notifPrefs, dailyDigestEnabled: e.target.checked })}
            />
            Daily email digest (tasks + appointments)
          </label>
          {notifPrefs.dailyDigestEnabled && (
            <div>
              <label className="label">Digest send hour (UTC, 0–23)</label>
              <input
                type="number"
                min={0}
                max={23}
                value={notifPrefs.dailyDigestHour}
                onChange={(e) => setNotifPrefs({ ...notifPrefs, dailyDigestHour: e.target.value })}
                className="input w-24"
              />
              <p className="text-xs text-gray-500 mt-1">Without SMTP, digest is logged in the backend console.</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={savingNotif}>
              {savingNotif ? 'Saving…' : 'Save notification settings'}
            </button>
            <button type="button" className="btn-secondary" onClick={sendDigestNow}>
              Send digest now
            </button>
          </div>
        </form>
        <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
          <p className="text-sm font-medium text-gray-700">Push notifications (PWA)</p>
          <p className="text-xs text-gray-500">
            Install the app from your browser menu, then enable push. Requires VAPID keys on the server (
            <code className="text-xs">npm run generate-vapid</code> in backend).
          </p>
          {notifPrefs.pushConfigured ? (
            <div className="flex flex-wrap gap-2">
              {notifPrefs.pushSubscribed ? (
                <button type="button" className="btn-secondary" disabled={pushLoading} onClick={disablePush}>
                  {pushLoading ? '…' : 'Disable push'}
                </button>
              ) : (
                <button type="button" className="btn-primary" disabled={pushLoading} onClick={enablePush}>
                  {pushLoading ? '…' : 'Enable push notifications'}
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-amber-700">Push not configured on server yet.</p>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Change password</h2>
        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <label className="label">Current password</label>
            <input
              name="currentPassword"
              type="password"
              value={passwords.currentPassword}
              onChange={handlePassword}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              name="newPassword"
              type="password"
              value={passwords.newPassword}
              onChange={handlePassword}
              className={`input ${passwordErrors.newPassword ? 'input-error' : ''}`}
              required
            />
            <PasswordHints password={passwords.newPassword} />
            {passwordErrors.newPassword && <p className="text-xs text-red-600 mt-1">{passwordErrors.newPassword}</p>}
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              name="confirmPassword"
              type="password"
              value={passwords.confirmPassword}
              onChange={handlePassword}
              className={`input ${passwordErrors.confirmPassword ? 'input-error' : ''}`}
              required
            />
            {passwordErrors.confirmPassword && <p className="text-xs text-red-600 mt-1">{passwordErrors.confirmPassword}</p>}
          </div>
          <button type="submit" className="btn-primary" disabled={savingPassword}>
            {savingPassword ? 'Updating…' : 'Change password'}
          </button>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Audit log</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Recent changes to clients, tasks, and appointments (who changed what and when).
        </p>
        {auditLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : auditLogs.length === 0 ? (
          <p className="text-sm text-gray-400">No audit entries yet.</p>
        ) : (
          <ul className="space-y-3 max-h-80 overflow-y-auto">
            {auditLogs.map((entry) => (
              <li key={entry._id} className="text-sm border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0">
                <div className="flex flex-wrap justify-between gap-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {entry.action} {entry.entityType}
                    {entry.entityLabel ? `: ${entry.entityLabel}` : ''}
                  </span>
                  <span className="text-xs text-gray-400">{format(new Date(entry.createdAt), 'MMM d, yyyy h:mm a')}</span>
                </div>
                {entry.changes?.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {entry.changes.slice(0, 3).map((c) => c.field).join(', ')}
                    {entry.changes.length > 3 ? ` +${entry.changes.length - 3} more` : ''}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-6 text-sm text-gray-500 dark:text-gray-400">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Security</h2>
        <p>
          Never commit <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">.env</code> files.
          Use <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">backend/.env.example</code> as a template.
          See <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">docs/SECURITY.md</code> for JWT rotation and production checklist.
        </p>
      </section>
    </div>
  );
}
