'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { formatDistanceToNow } from 'date-fns';

type ViewMode = 'cards' | 'table';

export default function UserManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | 'studio_director' | 'competition_director' | 'super_admin'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  const { data, isLoading, error, refetch } = trpc.superAdmin.users.getAllUsers.useQuery({
    search: searchQuery || undefined,
    role: selectedRole === 'all' ? undefined : selectedRole,
    limit: 100,
  });

  const deleteUserMutation = trpc.superAdmin.users.deleteUser.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedUserIds(new Set());
    },
    onError: (error) => {
      alert(`Delete failed: ${error.message}`);
    },
  });

  const users = data?.users || [];
  const total = data?.total || 0;

  const handleSelectAll = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map(u => u.id)));
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedUserIds.size === 0) return;

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedUserIds.size} user(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    for (const userId of selectedUserIds) {
      try {
        await deleteUserMutation.mutateAsync({ userId });
      } catch (err) {
        console.error(`Failed to delete user ${userId}:`, err);
      }
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    const confirmed = confirm(
      `Are you sure you want to delete ${email}? This action cannot be undone.`
    );

    if (!confirmed) return;

    await deleteUserMutation.mutateAsync({ userId });
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-500/20 border-purple-400/30 text-purple-300';
      case 'competition_director':
        return 'bg-blue-500/20 border-blue-400/30 text-blue-300';
      case 'studio_director':
        return 'bg-green-500/20 border-green-400/30 text-green-300';
      default:
        return 'bg-gray-500/20 border-gray-400/30 text-gray-300';
    }
  };

  const formatRole = (role: string | null) => {
    if (!role) return 'No Role';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-purple-400 hover:text-purple-300 text-sm inline-block mb-4"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">👥 User Management</h1>
          <p className="text-gray-400">Search and manage all users across tenants</p>
        </div>

        {/* Controls */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ color: 'white' }}
              >
                <option value="all" style={{ backgroundColor: '#1e293b', color: 'white' }}>All Roles</option>
                <option value="super_admin" style={{ backgroundColor: '#1e293b', color: 'white' }}>Super Admin</option>
                <option value="competition_director" style={{ backgroundColor: '#1e293b', color: 'white' }}>Competition Director</option>
                <option value="studio_director" style={{ backgroundColor: '#1e293b', color: 'white' }}>Studio Director</option>
              </select>
            </div>

            {/* View Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">View</label>
              <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex-1 px-3 py-2 rounded text-sm transition-all ${
                    viewMode === 'table'
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex-1 px-3 py-2 rounded text-sm transition-all ${
                    viewMode === 'cards'
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Cards
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {users.length} of {total} users
            </div>

            {selectedUserIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={deleteUserMutation.isPending}
                className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-400/30 rounded-lg hover:bg-red-500/30 transition-all font-medium text-sm disabled:opacity-50"
              >
                {deleteUserMutation.isPending ? 'Deleting...' : `Delete ${selectedUserIds.size} Selected`}
              </button>
            )}
          </div>
        </div>

        {/* User List */}
        {isLoading ? (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-12 text-center">
            <div className="text-gray-400">Loading users...</div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-red-400">Error loading users: {error.message}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-12 text-center">
            <p className="text-gray-400 mb-2">No users found</p>
            <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/10 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.size === users.length && users.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Last Sign In
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className={`hover:bg-white/5 transition-colors ${
                        selectedUserIds.has(user.id) ? 'bg-purple-500/10' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">
                          {user.first_name} {user.last_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{user.users.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                          {formatRole(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {user.tenants?.name || 'N/A'}
                        </div>
                        {user.tenants?.subdomain && (
                          <div className="text-xs text-gray-500">
                            {user.tenants.subdomain}.compsync.net
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {user.users.last_sign_in_at
                            ? formatDistanceToNow(new Date(user.users.last_sign_in_at), { addSuffix: true })
                            : 'Never'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.users.email || 'unknown')}
                          disabled={deleteUserMutation.isPending}
                          className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-400/30 rounded hover:bg-red-500/30 transition-all disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Cards View */
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6 transition-colors ${
                  selectedUserIds.has(user.id) ? 'bg-purple-500/10 border-purple-400/30' : 'hover:bg-white/10'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.has(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="mt-1 w-4 h-4 rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {user.first_name} {user.last_name}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                          {formatRole(user.role)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400 mb-1">Email</p>
                          <p className="text-white">{user.users.email}</p>
                        </div>

                        {user.phone && (
                          <div>
                            <p className="text-gray-400 mb-1">Phone</p>
                            <p className="text-white">{user.phone}</p>
                          </div>
                        )}

                        {user.tenants && (
                          <div>
                            <p className="text-gray-400 mb-1">Tenant</p>
                            <p className="text-white">{user.tenants.name}</p>
                            <p className="text-gray-500 text-xs">{user.tenants.subdomain}.compsync.net</p>
                          </div>
                        )}

                        {user.created_at && (
                          <div>
                            <p className="text-gray-400 mb-1">Joined</p>
                            <p className="text-white">{formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</p>
                          </div>
                        )}

                        {user.users.last_sign_in_at && (
                          <div>
                            <p className="text-gray-400 mb-1">Last Sign In</p>
                            <p className="text-white">{formatDistanceToNow(new Date(user.users.last_sign_in_at), { addSuffix: true })}</p>
                          </div>
                        )}

                        {user.users._count.studios_studios_owner_idTousers > 0 && (
                          <div>
                            <p className="text-gray-400 mb-1">Studios Owned</p>
                            <p className="text-white">{user.users._count.studios_studios_owner_idTousers}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteUser(user.id, user.users.email || 'unknown')}
                    disabled={deleteUserMutation.isPending}
                    className="ml-4 px-4 py-2 bg-red-500/20 text-red-400 border border-red-400/30 rounded-lg hover:bg-red-500/30 transition-all font-medium text-sm disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
