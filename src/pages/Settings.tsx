import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { UserPlus, Shield, Users, Pencil, Trash2, Power } from 'lucide-react';
import userService, { AegisUser, SaveUserRequest } from '../services/userService';
import { useAuth } from '../context/AuthContext';

const Settings: React.FC = () => {
  const [users, setUsers] = useState<AegisUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<AegisUser | null>(null);
  const [formData, setFormData] = useState<SaveUserRequest>({
    userId: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'agent',
    isActive: true,
    password: ''
  });

  const { user, loading: authLoading } = useAuth();
  const roleLower = ((user as any)?.role ?? (user as any)?.Role ?? '').toString().toLowerCase();
  const canViewSettings = !!user && (roleLower === 'mainadmin' || roleLower === 'admin');
  const isMainAdmin = roleLower === 'mainadmin';
  const canCreateUsers = isMainAdmin || roleLower === 'admin';
  const canEditPassword =
    isMainAdmin ||
    !editingUser ||
    (roleLower === 'admin' && editingUser?.role !== 'mainadmin');

  const filteredUsers = useMemo(
    () => (includeInactive ? users : users.filter(u => u.isActive)),
    [users, includeInactive]
  );

  const loadUsers = async () => {
    if (!canViewSettings) return;
    try {
      setLoading(true);
      setError(null);
      const result = await userService.getUsers(true);
      setUsers(result);
    } catch (err: any) {
      console.error('Failed to load users', err);
      setError(err.response?.data?.error || err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canViewSettings) {
      loadUsers();
    }
  }, [canViewSettings, isMainAdmin]);

  const resetForm = () => {
    setFormData({
      userId: '',
      firstName: '',
      lastName: '',
      phone: '',
      role: 'agent',
      isActive: true,
      password: ''
    });
    setEditingUser(null);
  };

  const handleOpenCreate = () => {
    if (!canCreateUsers) {
      setError('You do not have permission to create users.');
      return;
    }
    resetForm();
    setFormOpen(true);
  };

  const handleOpenEdit = (targetUser: AegisUser) => {
    const canEdit =
      isMainAdmin ||
      (roleLower === 'admin' && targetUser.role !== 'mainadmin');
    if (!canEdit) {
      setError('You do not have permission to edit this user.');
      return;
    }
    setEditingUser(targetUser);
    setFormData({
      userId: targetUser.userId,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      phone: targetUser.phone ?? '',
      role: (targetUser.role as 'mainadmin' | 'admin' | 'agent') ?? 'agent',
      isActive: targetUser.isActive,
      password: ''
    });
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    resetForm();
  };
  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const checked = (event.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]:
        type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const userIdTrimmed = formData.userId.trim();
    const firstNameTrimmed = formData.firstName.trim();
    const lastNameTrimmed = formData.lastName.trim();
    const phoneTrimmed = formData.phone?.trim() ?? '';
    const passwordTrimmed = formData.password?.trim() ?? '';

    if (!userIdTrimmed || !firstNameTrimmed || !lastNameTrimmed) {
      setError('User ID, first name, and last name are required.');
      return;
    }

    if (!editingUser && !canCreateUsers) {
      setError('You do not have permission to create users.');
      return;
    }

    const selectedRole = (() => {
      if (formData.role === 'mainadmin' && !isMainAdmin) {
        return 'admin';
      }
      return formData.role;
    })() as 'mainadmin' | 'admin' | 'agent';

    const canSendPassword = canEditPassword;

    if (canSendPassword && !editingUser) {
      if (passwordTrimmed.length < 8) {
        setError('Password must be at least 8 characters when creating a user.');
        return;
      }
    }

    if (canSendPassword && editingUser && passwordTrimmed && passwordTrimmed.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    const basePayload: SaveUserRequest = {
      userId: userIdTrimmed,
      firstName: firstNameTrimmed,
      lastName: lastNameTrimmed,
      phone: phoneTrimmed || undefined,
      role: selectedRole,
      isActive: formData.isActive,
      password: canSendPassword && passwordTrimmed ? passwordTrimmed : undefined
    };

    try {
      setFormSubmitting(true);
      setError(null);

      if (editingUser) {
        const updatePayload: Partial<SaveUserRequest> = {
          userId: basePayload.userId,
          firstName: basePayload.firstName,
          lastName: basePayload.lastName,
          phone: basePayload.phone,
          role: basePayload.role,
          isActive: basePayload.isActive,
          password: basePayload.password
        };

        if (!isMainAdmin) {
          delete updatePayload.role;
          delete updatePayload.isActive;
        }

        if (!canSendPassword || !passwordTrimmed) {
          delete updatePayload.password;
        }

        await userService.updateUser(editingUser.id, updatePayload);
      } else {
        await userService.createUser({
          ...basePayload,
          password: passwordTrimmed
        });
      }

      await loadUsers();
      handleCloseForm();
    } catch (err: any) {
      console.error('Failed to save user', err);
      setError(err.response?.data?.error || err.message || 'Failed to save user');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (targetUser: AegisUser) => {
    if (!isMainAdmin) {
      setError('Only main administrators can delete users.');
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to delete ${targetUser.firstName} ${targetUser.lastName}?`);
    if (!confirmed) return;

    try {
      await userService.deleteUser(targetUser.id);
      await loadUsers();
    } catch (err: any) {
      console.error('Failed to delete user', err);
      setError(err.response?.data?.error || err.message || 'Failed to delete user');
    }
  };

  const handleToggleActive = async (targetUser: AegisUser) => {
    if (!isMainAdmin) {
      setError('Only main administrators can change account status.');
      return;
    }
    try {
      await userService.updateUser(targetUser.id, { isActive: !targetUser.isActive });
      await loadUsers();
    } catch (err: any) {
      console.error('Failed to update user', err);
      setError(err.response?.data?.error || err.message || 'Failed to update user');
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return 'Never';
    return new Date(value).toLocaleString();
  };

  if (!authLoading && !canViewSettings) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white border border-red-200 rounded-lg p-8 text-center shadow-sm">
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">Access Restricted</h1>
            <p className="text-gray-600">
              You need administrator privileges to manage platform users. Please contact an admin if
              you believe this is an error.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-gray-600">
            Manage administrative features for the Aegis Rental platform.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <section className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Manage Users
              </h2>
              <p className="text-sm text-gray-500">
                Control who can access the admin portal and configure their roles.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(e) => setIncludeInactive(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Include inactive
              </label>
              {canCreateUsers && (
                <button
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 transition"
                >
                  <UserPlus className="h-4 w-4" />
                  Add User
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto px-6 py-4">
            {loading ? (
              <div className="py-10 text-center text-gray-500">Loading users…</div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                No users found. {includeInactive ? 'Add your first admin user.' : 'Toggle "include inactive" to see all users.'}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Login
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Sign In
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map(listUser => {
                    const canEditUser =
                      isMainAdmin ||
                      (roleLower === 'admin' && listUser.role !== 'mainadmin');
                    return (
                    <tr key={listUser.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {listUser.firstName} {listUser.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{listUser.userId}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{listUser.role}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            listUser.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {listUser.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(listUser.lastLogin)}</td>
                      <td className="px-4 py-3 text-sm text-right space-x-2">
                        {canEditUser && (
                          <button
                            onClick={() => handleOpenEdit(listUser)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-blue-600 hover:text-blue-800"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                        )}
                        {isMainAdmin && (
                          <>
                            <button
                              onClick={() => handleToggleActive(listUser)}
                              className={`inline-flex items-center gap-1 px-2 py-1 ${
                                listUser.isActive ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'
                              }`}
                            >
                              <Power className="h-4 w-4" />
                              {listUser.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDelete(listUser)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Shield className="h-4 w-4 text-blue-500" />
              <span>
                Manage administrator accounts for the Aegis platform. Use caution when granting the
                <span className="mx-1 font-medium text-gray-800">admin</span> role.
              </span>
            </div>
          </div>
        </section>

        {formOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-40 px-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingUser ? 'Edit User' : 'Add User'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Provide user details and assign administrative role.
                  </p>
                </div>
                {isMainAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                      <span className="ml-1 text-xs text-gray-500">
                        {editingUser ? '(leave blank to keep current password)' : '(min 8 characters)'}
                      </span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password ?? ''}
                      onChange={handleFormChange}
                      placeholder={editingUser ? '••••••••' : 'Enter password'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required={!editingUser}
                      minLength={8}
                    />
                  </div>
                )}
                <button onClick={handleCloseForm} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Login (email or username)
                  </label>
                  <input
                    type="text"
                    name="userId"
                    value={formData.userId}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="agent">Agent</option>
                      <option value="admin">Admin</option>
                      {isMainAdmin && <option value="mainadmin">Main Admin</option>}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={!!formData.isActive}
                      onChange={handleFormChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      disabled={!isMainAdmin}
                    />
                    Active
                  </label>
                </div>
                {canEditPassword && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                      <span className="ml-1 text-xs text-gray-500">
                        {editingUser ? '(leave blank to keep current password)' : '(min 8 characters)'}
                      </span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password ?? ''}
                      onChange={handleFormChange}
                      placeholder={editingUser ? '••••••••' : 'Enter password'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required={!editingUser}
                      disabled={!!editingUser && !canEditPassword}
                      minLength={8}
                    />
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {formSubmitting ? 'Saving…' : editingUser ? 'Save Changes' : 'Add User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Settings;

