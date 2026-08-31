'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';
import Swal from 'sweetalert2';

interface Tournament {
  id: string;
  name: string;
  sport: 'CRICKET' | 'FOOTBALL' | 'TENNIS';
  start_date: string;
  end_date: string | null;
  source: 'CRICAPI' | 'API_FOOTBALL' | 'MANUAL';
  is_active: boolean;
}

interface SourceStatus {
  source: string;
  configured: boolean;
  last_run_at: string | null;
  success: boolean | null;
  items_synced: number;
  error_message: string | null;
}

interface SyncStatusResponse {
  cricket: SourceStatus;
  football: SourceStatus;
}

const timeAgo = (isoString: string) => {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const formatDate = (value: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const sportColors: Record<string, string> = {
  CRICKET: 'bg-lime-200 text-lime-800',
  FOOTBALL: 'bg-blue-100 text-blue-800',
  TENNIS: 'bg-purple-100 text-purple-800',
};

// What to point a salesman toward restocking when this sport's tournament is coming up
const stockHints: Record<string, string> = {
  CRICKET: 'Cricket Jerseys, Polo Jerseys, Shorts, Kit',
  FOOTBALL: 'Football Jersey, Shorts, Gloves',
  TENNIS: 'Tennis Accessories',
};

const sourceLabels: Record<string, string> = {
  CRICAPI: 'Auto (Cricket)',
  API_FOOTBALL: 'Auto (Football)',
  MANUAL: 'Manual',
};

const TournamentsPage: React.FC = () => {
  const { showToast } = useToast();

  const [userRole, setUserRole] = useState<string | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({
    name: '',
    sport: 'CRICKET' as Tournament['sport'],
    start_date: '',
    end_date: '',
    is_active: true,
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const response = await fetch('/api/auth/session', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.user?.role || null);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };
    fetchRole();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '100');
      if (searchTerm) params.append('search_string', searchTerm);

      const response = await fetch(`/api/tournament/list?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setTournaments(data.data || []);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to fetch tournaments', 'error');
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      showToast('Error fetching tournaments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/tournament/sync-status', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data);
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
  }, []);

  const openTournamentDetails = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setEditDraft({
      name: tournament.name,
      sport: tournament.sport,
      start_date: tournament.start_date,
      end_date: tournament.end_date || '',
      is_active: tournament.is_active,
    });
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedTournament(null), 300);
  };

  const handleSaveEdit = async () => {
    if (!selectedTournament) return;
    if (!editDraft.name.trim() || !editDraft.start_date) {
      showToast('Name and start date are required', 'error');
      return;
    }

    setSavingEdit(true);
    try {
      const response = await fetch(`/api/tournament/update/${selectedTournament.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editDraft.name.trim(),
          sport: editDraft.sport,
          start_date: editDraft.start_date,
          end_date: editDraft.end_date || null,
          is_active: editDraft.is_active,
        }),
      });

      if (response.ok) {
        showToast('Tournament updated successfully', 'success');
        closePanel();
        fetchTournaments();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to update tournament', 'error');
      }
    } catch (error) {
      console.error('Error updating tournament:', error);
      showToast('Error updating tournament', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTournament) return;

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This tournament record will be permanently deleted.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/tournament/${selectedTournament.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        showToast('Tournament deleted successfully', 'success');
        closePanel();
        fetchTournaments();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to delete tournament', 'error');
      }
    } catch (error) {
      console.error('Error deleting tournament:', error);
      showToast('Error deleting tournament', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/tournament/sync-now', {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        showToast(`Synced: ${data.cricket_synced} cricket, ${data.football_synced} football`, 'success');
        fetchTournaments();
        fetchSyncStatus();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Sync failed', 'error');
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
      showToast('Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const isDirty = selectedTournament
    ? editDraft.name !== selectedTournament.name ||
      editDraft.sport !== selectedTournament.sport ||
      editDraft.start_date !== selectedTournament.start_date ||
      editDraft.end_date !== (selectedTournament.end_date || '') ||
      editDraft.is_active !== selectedTournament.is_active
    : false;

  return (
    <div className="p-2 py-5 bg-white pt-14 md:pt-0">
      <PageHeader title="Tournaments" />

      {syncStatus && (
        <div className="regal-card p-3 md:p-4 mb-4 flex flex-col sm:flex-row gap-3 sm:gap-6">
          {([
            { key: 'cricket' as const, label: 'Cricket sync', icon: '🏏' },
            { key: 'football' as const, label: 'Football sync', icon: '⚽' },
          ]).map(({ key, label, icon }) => {
            const s = syncStatus[key];
            const statusColor = !s.configured
              ? 'bg-gray-100 text-gray-600'
              : s.success
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800';
            const statusText = !s.configured
              ? 'Not configured'
              : s.success
              ? `${s.items_synced} synced`
              : 'Failed';
            return (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span>{icon}</span>
                <span className="font-medium text-gray-700">{label}:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{statusText}</span>
                {s.last_run_at && <span className="text-xs text-gray-400">· {timeAgo(s.last_run_at)}</span>}
                {s.error_message && (
                  <span className="text-xs text-red-500 truncate max-w-xs" title={s.error_message}>
                    {s.error_message}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap px-4 py-2 flex items-center gap-2"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </button>
            {userRole === 'admin' && (
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="regal-btn bg-gray-800 text-white whitespace-nowrap px-4 py-2 disabled:opacity-50"
                title="Fetch the latest cricket/football tournament dates right now"
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>

          {showSearch && (
            <div className="relative mt-2">
              <input
                type="text"
                placeholder="Search tournaments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="regal-input w-full pl-10 pr-4 py-4"
                autoFocus
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      ) : (
        <div className="border-0 p-0">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-100">
                <tr className="text-xs text-gray-900 uppercase tracking-wider font-semibold">
                  <th className="px-3 py-5 text-left w-16">S.No</th>
                  <th className="px-3 py-5 text-left w-56">Name</th>
                  <th className="px-3 py-5 text-left w-24">Sport</th>
                  <th className="px-3 py-5 text-left w-56">Restock Hint</th>
                  <th className="px-3 py-5 text-left w-28">Starts</th>
                  <th className="px-3 py-5 text-left w-28">Ends</th>
                  <th className="px-3 py-5 text-left w-28">Source</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tournaments.map((t, index) => (
                  <tr
                    key={t.id}
                    onClick={() => openTournamentDetails(t)}
                    className={`text-sm text-gray-900 transition-colors cursor-pointer hover:bg-gray-50 ${
                      !t.is_active ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="px-3 py-4">{index + 1}</td>
                    <td className="px-3 py-4 font-medium whitespace-normal break-words">{t.name}</td>
                    <td className="px-3 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${sportColors[t.sport]}`}>
                        {t.sport}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-gray-500 truncate">{stockHints[t.sport]}</td>
                    <td className="px-3 py-4">{formatDate(t.start_date)}</td>
                    <td className="px-3 py-4">{formatDate(t.end_date)}</td>
                    <td className="px-3 py-4 text-gray-500">{sourceLabels[t.source]}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {tournaments.length === 0 && (
              <p className="text-center py-12 text-gray-500">
                No tournaments tracked yet. They sync automatically every 1-2 hours.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Right-side tournament details/edit panel */}
      {selectedTournament && (
        <div className={`fixed inset-0 z-50 flex justify-end ${isPanelOpen ? '' : 'pointer-events-none'}`}>
          <div
            className={`fixed inset-0 bg-black transition-opacity duration-300 ${
              isPanelOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
            }`}
            onClick={closePanel}
          ></div>

          <div
            className={`relative w-full sm:w-2/5 h-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto ${
              isPanelOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">Tournament Details</h2>
              <button onClick={closePanel} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Close">
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Name</label>
                <input
                  type="text"
                  value={editDraft.name}
                  onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                  className="regal-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Sport</label>
                <select
                  value={editDraft.sport}
                  onChange={(e) => setEditDraft({ ...editDraft, sport: e.target.value as Tournament['sport'] })}
                  className="regal-input w-full"
                >
                  <option value="CRICKET">Cricket</option>
                  <option value="FOOTBALL">Football</option>
                  <option value="TENNIS">Tennis</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={editDraft.start_date}
                  onChange={(e) => setEditDraft({ ...editDraft, start_date: e.target.value })}
                  className="regal-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={editDraft.end_date}
                  onChange={(e) => setEditDraft({ ...editDraft, end_date: e.target.value })}
                  className="regal-input w-full"
                />
              </div>

              <div className="flex justify-between border-b border-gray-100 pb-3 pt-2">
                <span className="text-sm text-gray-500">Source</span>
                <span className="text-sm font-medium text-gray-900">{sourceLabels[selectedTournament.source]}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="text-sm text-gray-500">Show in alert banner (active)</label>
                <input
                  type="checkbox"
                  checked={editDraft.is_active}
                  onChange={(e) => setEditDraft({ ...editDraft, is_active: e.target.checked })}
                  className="h-5 w-5"
                />
              </div>

              <div className="pt-4 flex flex-wrap gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit || !isDirty}
                  className={`regal-btn px-4 py-2 ${
                    savingEdit || !isDirty ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-regal-yellow text-regal-black'
                  }`}
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>

                {userRole === 'admin' && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className={`regal-btn px-4 py-2 ${
                      deleting ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-600 text-white'
                    }`}
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentsPage;
