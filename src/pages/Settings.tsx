import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { UserPlus, Shield, Users, Pencil, Trash2, Power, CreditCard, RefreshCcw, Loader2, Eye, EyeOff, Copy } from 'lucide-react';
import userService, { AegisUser, SaveUserRequest } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import settingsService, { StripeSettingsResponse, UpdateStripeSettingsPayload, AiSettingsResponse, UpdateAiSettingsPayload } from '../services/settingsService';

type StripeFormState = {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  removeSecretKey: boolean;
  removePublishableKey: boolean;
  removeWebhookSecret: boolean;
};

type AiFormState = {
  anthropicApiKey: string;
  claudeApiKey: string;
  openAiApiKey: string;
  removeAnthropicApiKey: boolean;
  removeClaudeApiKey: boolean;
  removeOpenAiApiKey: boolean;
};

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

  const [activeTab, setActiveTab] = useState<'users' | 'business' | 'ai'>('users');

  const [stripeSettings, setStripeSettings] = useState<StripeSettingsResponse | null>(null);
  const [stripeForm, setStripeForm] = useState<StripeFormState>({
    secretKey: '',
    publishableKey: '',
    webhookSecret: '',
    removeSecretKey: false,
    removePublishableKey: false,
    removeWebhookSecret: false,
  });
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeSaving, setStripeSaving] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [stripeSuccess, setStripeSuccess] = useState<string | null>(null);
  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [showStripeWebhook, setShowStripeWebhook] = useState(false);

  const [aiSettings, setAiSettings] = useState<AiSettingsResponse | null>(null);
  const [aiForm, setAiForm] = useState<AiFormState>({
    anthropicApiKey: '',
    claudeApiKey: '',
    openAiApiKey: '',
    removeAnthropicApiKey: false,
    removeClaudeApiKey: false,
    removeOpenAiApiKey: false,
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);

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

  const loadUsers = useCallback(async () => {
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
  }, [canViewSettings]);

  const loadStripeSettings = useCallback(async () => {
    if (!canViewSettings) return;
    try {
      setStripeLoading(true);
      setStripeError(null);
      const result = await settingsService.getStripeSettings();
      setStripeSettings(result);
      setStripeForm({
        secretKey: '',
        publishableKey: result.publishableKey || '',
        webhookSecret: '',
        removeSecretKey: false,
        removePublishableKey: false,
        removeWebhookSecret: false,
      });
      setStripeSuccess(null);
      setShowStripeSecret(false);
      setShowStripeWebhook(false);
    } catch (err: any) {
      console.error('Failed to load Stripe settings', err);
      setStripeError(err.response?.data?.error || err.message || 'Failed to load Stripe settings');
    } finally {
      setStripeLoading(false);
    }
  }, [canViewSettings]);

  const loadAiSettings = useCallback(async () => {
    if (!canViewSettings) return;
    try
    {
      setAiLoading(true);
      setAiError(null);
      const result = await settingsService.getAiSettings();
      setAiSettings(result);
      setAiForm({
        anthropicApiKey: '',
        claudeApiKey: '',
        openAiApiKey: '',
        removeAnthropicApiKey: false,
        removeClaudeApiKey: false,
        removeOpenAiApiKey: false,
      });
      setAiSuccess(null);
      setShowAnthropicKey(false);
      setShowClaudeKey(false);
      setShowOpenAiKey(false);
    }
    catch (err: any)
    {
      console.error('Failed to load AI settings', err);
      setAiError(err.response?.data?.error || err.message || 'Failed to load AI settings');
    }
    finally
    {
      setAiLoading(false);
    }
  }, [canViewSettings]);

  useEffect(() => {
     if (canViewSettings) {
       loadUsers();
       loadStripeSettings();
       loadAiSettings();
     }
  }, [canViewSettings, loadUsers, loadStripeSettings, loadAiSettings]);

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

  const handleStripeInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setStripeForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStripeCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setStripeForm(prev => ({
      ...prev,
      [name]: checked,
      ...(name === 'removeSecretKey' && checked ? { secretKey: '' } : {}),
      ...(name === 'removePublishableKey' && checked ? { publishableKey: '' } : {}),
      ...(name === 'removeWebhookSecret' && checked ? { webhookSecret: '' } : {}),
    }));
  };

  const handleStripeReset = () => {
    setStripeError(null);
    setStripeSuccess(null);
    setStripeForm({
      secretKey: '',
      publishableKey: stripeSettings?.publishableKey ?? '',
      webhookSecret: '',
      removeSecretKey: false,
      removePublishableKey: false,
      removeWebhookSecret: false,
    });
  };

  const handleAiInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setAiForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAiCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setAiForm(prev => ({
      ...prev,
      [name]: checked,
      ...(name === 'removeAnthropicApiKey' && checked ? { anthropicApiKey: '' } : {}),
      ...(name === 'removeClaudeApiKey' && checked ? { claudeApiKey: '' } : {}),
      ...(name === 'removeOpenAiApiKey' && checked ? { openAiApiKey: '' } : {}),
    }));
  };

  const handleAiReset = () => {
    setAiError(null);
    setAiSuccess(null);
    setAiForm({
      anthropicApiKey: '',
      claudeApiKey: '',
      openAiApiKey: '',
      removeAnthropicApiKey: false,
      removeClaudeApiKey: false,
      removeOpenAiApiKey: false,
    });
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

  const handleStripeSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStripeSaving(true);
    setStripeError(null);
    setStripeSuccess(null);

    try
    {
      const payload: UpdateStripeSettingsPayload = {};

      if (stripeForm.removeSecretKey)
      {
        payload.removeSecretKey = true;
      }
      else if (stripeForm.secretKey.trim())
      {
        payload.secretKey = stripeForm.secretKey.trim();
      }

      if (stripeForm.removePublishableKey)
      {
        payload.removePublishableKey = true;
      }
      else
      {
        const trimmedPublishable = stripeForm.publishableKey.trim();
        if (trimmedPublishable.length > 0) {
          payload.publishableKey = trimmedPublishable;
        }
      }

      if (stripeForm.removeWebhookSecret)
      {
        payload.removeWebhookSecret = true;
      }
      else if (stripeForm.webhookSecret.trim())
      {
        payload.webhookSecret = stripeForm.webhookSecret.trim();
      }

      await settingsService.updateStripeSettings(payload);
      setStripeSuccess('Stripe settings updated successfully.');
      await loadStripeSettings();
    }
    catch (err: any)
    {
      console.error('Failed to update Stripe settings', err);
      setStripeError(err.response?.data?.error || err.message || 'Failed to update Stripe settings');
    }
    finally
    {
      setStripeSaving(false);
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

  const handleAiSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAiSaving(true);
    setAiError(null);
    setAiSuccess(null);

    try
    {
      const payload: UpdateAiSettingsPayload = {};

      if (aiForm.removeAnthropicApiKey)
      {
        payload.removeAnthropicApiKey = true;
      }
      else
      {
        const trimmed = aiForm.anthropicApiKey.trim();
        if (trimmed.length > 0)
        {
          payload.anthropicApiKey = trimmed;
        }
      }

      if (aiForm.removeClaudeApiKey)
      {
        payload.removeClaudeApiKey = true;
      }
      else
      {
        const trimmed = aiForm.claudeApiKey.trim();
        if (trimmed.length > 0)
        {
          payload.claudeApiKey = trimmed;
        }
      }

      if (aiForm.removeOpenAiApiKey)
      {
        payload.removeOpenAiApiKey = true;
      }
      else
      {
        const trimmed = aiForm.openAiApiKey.trim();
        if (trimmed.length > 0)
        {
          payload.openAiApiKey = trimmed;
        }
      }

      await settingsService.updateAiSettings(payload);
      setAiSuccess('AI settings updated successfully.');
      await loadAiSettings();
    }
    catch (err: any)
    {
      console.error('Failed to update AI settings', err);
      setAiError(err.response?.data?.error || err.message || 'Failed to update AI settings');
    }
    finally
    {
      setAiSaving(false);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return 'Never';
    return new Date(value).toLocaleString();
  };

  const maskSecret = (value?: string | null) => {
    if (!value) return '';
    const trimmed = value.trim();
    if (trimmed.length <= 8) {
      const visible = trimmed.slice(-2);
      return `${'*'.repeat(Math.max(trimmed.length - 2, 0))}${visible}`;
    }
    return `${trimmed.slice(0, 4)}********${trimmed.slice(-4)}`;
  };

  const handleCopy = async (value?: string | null, setMessage?: (msg: string | null) => void) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setMessage?.('Copied to clipboard.');
      setTimeout(() => setMessage?.(null), 3000);
    } catch (err) {
      setMessage?.('Unable to copy to clipboard.');
      setTimeout(() => setMessage?.(null), 3000);
    }
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

        <div className="border-b border-gray-200">
          <nav className="flex gap-4" aria-label="Settings tabs">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-3 py-2 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'users'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Users
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('business')}
              className={`px-3 py-2 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'business'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Business
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`px-3 py-2 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'ai'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              AI Integration
            </button>
          </nav>
        </div>

        {activeTab === 'users' && (
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
        )}

        {activeTab === 'business' && (
        <section className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Business Settings
              </h2>
              <p className="text-sm text-gray-500">
                Manage the Stripe credentials used for payments across the platform.
              </p>
            </div>
            <button
              type="button"
              onClick={loadStripeSettings}
              disabled={stripeLoading || stripeSaving}
              className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-60"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <form onSubmit={handleStripeSubmit} className="px-6 py-6 space-y-6">
            {stripeError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {stripeError}
              </div>
            )}

            {stripeSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {stripeSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Stripe Secret Key</label>
                <input
                  type="password"
                  name="secretKey"
                  value={stripeForm.secretKey}
                  onChange={handleStripeInputChange}
                  placeholder="sk_live_..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500">
                  {stripeSettings?.hasSecretKey
                    ? `Stored key: ${stripeSettings.secretKeyPreview ?? '••••'}. Leave blank to keep.`
                    : 'No secret key stored yet. Paste your Stripe secret key to enable payouts.'}
                </p>
                {stripeSettings?.secretKey && (
                  <div className="flex items-start justify-between gap-3 rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
                    <span className="font-mono text-sm break-all select-all">
                      {showStripeSecret ? stripeSettings.secretKey : maskSecret(stripeSettings.secretKey)}
                    </span>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setShowStripeSecret(prev => !prev)}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        {showStripeSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {showStripeSecret ? 'Hide' : 'Show'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(stripeSettings.secretKey, setStripeSuccess)}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </button>
                    </div>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    name="removeSecretKey"
                    checked={stripeForm.removeSecretKey}
                    onChange={handleStripeCheckboxChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Remove stored secret key on save
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Stripe Publishable Key</label>
                <input
                  type="text"
                  name="publishableKey"
                  value={stripeForm.publishableKey}
                  onChange={handleStripeInputChange}
                  placeholder="pk_live_..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500">
                  {stripeSettings?.publishableKey
                    ? 'Update the key or leave unchanged to keep the current value.'
                    : 'Paste the publishable key used by your Stripe account.'}
                </p>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    name="removePublishableKey"
                    checked={stripeForm.removePublishableKey}
                    onChange={handleStripeCheckboxChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Remove publishable key on save
                </label>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Stripe Webhook Secret</label>
                <input
                  type="password"
                  name="webhookSecret"
                  value={stripeForm.webhookSecret}
                  onChange={handleStripeInputChange}
                  placeholder="whsec_..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500">
                  {stripeSettings?.hasWebhookSecret
                    ? `Stored webhook secret: ${stripeSettings.webhookSecretPreview ?? '••••'}. Leave blank to keep.`
                    : 'Set the signing secret for your Stripe webhook endpoint.'}
                </p>
                {stripeSettings?.webhookSecret && (
                  <div className="flex items-start justify-between gap-3 rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
                    <span className="font-mono text-sm break-all select-all">
                      {showStripeWebhook ? stripeSettings.webhookSecret : maskSecret(stripeSettings.webhookSecret)}
                    </span>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setShowStripeWebhook(prev => !prev)}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        {showStripeWebhook ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {showStripeWebhook ? 'Hide' : 'Show'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(stripeSettings.webhookSecret, setStripeSuccess)}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </button>
                    </div>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    name="removeWebhookSecret"
                    checked={stripeForm.removeWebhookSecret}
                    onChange={handleStripeCheckboxChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Remove webhook secret on save
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={handleStripeReset}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100"
                disabled={stripeSaving}
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={stripeSaving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {stripeSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save Stripe Settings'
                )}
              </button>
            </div>
          </form>

          {stripeLoading && (
            <div className="bg-gray-50 px-6 py-3 text-sm text-gray-500 border-t border-gray-200">
              Loading Stripe settings…
            </div>
          )}
        </section>
        )}

        {activeTab === 'ai' && (
        <section className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI Integration</h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage API keys used by Anthropic/Claude and OpenAI integrations powering the AI assistant.
              </p>
            </div>
            <button
              type="button"
              onClick={loadAiSettings}
              disabled={aiLoading || aiSaving}
              className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-60"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <form onSubmit={handleAiSubmit} className="px-6 py-6 space-y-6">
            {aiError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {aiError}
              </div>
            )}

            {aiSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {aiSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Anthropic / Claude API Key</label>
                <input
                  type="password"
                  name="anthropicApiKey"
                  value={aiForm.anthropicApiKey}
                  onChange={handleAiInputChange}
                  placeholder="sk-ant-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500">
                  {aiSettings?.hasAnthropicKey
                    ? `Stored key: ${aiSettings.anthropicKeyPreview ?? '••••'}. Leave blank to keep.`
                    : 'Paste your Anthropic API key used for Claude requests.'}
                </p>
                {aiSettings?.anthropicApiKey && (
                  <div className="flex items-start justify-between gap-3 rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
                    <span className="font-mono text-sm break-all select-all">
                      {showAnthropicKey ? aiSettings.anthropicApiKey : maskSecret(aiSettings.anthropicApiKey)}
                    </span>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAnthropicKey(prev => !prev)}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        {showAnthropicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {showAnthropicKey ? 'Hide' : 'Show'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(aiSettings.anthropicApiKey, setAiSuccess)}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </button>
                    </div>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    name="removeAnthropicApiKey"
                    checked={aiForm.removeAnthropicApiKey}
                    onChange={handleAiCheckboxChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Remove stored key on save
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Claude API Key (if different)</label>
                <input
                  type="password"
                  name="claudeApiKey"
                  value={aiForm.claudeApiKey}
                  onChange={handleAiInputChange}
                  placeholder="sk-ant-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500">
                  {aiSettings?.hasClaudeKey
                    ? `Stored key: ${aiSettings.claudeKeyPreview ?? '••••'}. Leave blank to keep.`
                    : 'If you use a separate key for Claude, paste it here. Otherwise leave blank.'}
                </p>
                {aiSettings?.claudeApiKey && (
                  <div className="flex items-start justify-between gap-3 rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
                    <span className="font-mono text-sm break-all select-all">
                      {showClaudeKey ? aiSettings.claudeApiKey : maskSecret(aiSettings.claudeApiKey)}
                    </span>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setShowClaudeKey(prev => !prev)}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        {showClaudeKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {showClaudeKey ? 'Hide' : 'Show'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(aiSettings.claudeApiKey, setAiSuccess)}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </button>
                    </div>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    name="removeClaudeApiKey"
                    checked={aiForm.removeClaudeApiKey}
                    onChange={handleAiCheckboxChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Remove stored key on save
                </label>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700">OpenAI API Key</label>
                <input
                  type="password"
                  name="openAiApiKey"
                  value={aiForm.openAiApiKey}
                  onChange={handleAiInputChange}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500">
                  {aiSettings?.hasOpenAiKey
                    ? `Stored key: ${aiSettings.openAiKeyPreview ?? '••••'}. Leave blank to keep.`
                    : 'Paste the OpenAI API key if you use GPT-based recommendations or voice synthesis.'}
                </p>
                {aiSettings?.openAiApiKey && (
                  <div className="flex items-start justify-between gap-3 rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
                    <span className="font-mono text-sm break-all select-all">
                      {showOpenAiKey ? aiSettings.openAiApiKey : maskSecret(aiSettings.openAiApiKey)}
                    </span>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setShowOpenAiKey(prev => !prev)}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        {showOpenAiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {showOpenAiKey ? 'Hide' : 'Show'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(aiSettings.openAiApiKey, setAiSuccess)}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </button>
                    </div>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    name="removeOpenAiApiKey"
                    checked={aiForm.removeOpenAiApiKey}
                    onChange={handleAiCheckboxChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Remove stored key on save
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={handleAiReset}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100"
                disabled={aiSaving}
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={aiSaving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {aiSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save AI Settings'
                )}
              </button>
            </div>
          </form>

          {aiLoading && (
            <div className="bg-gray-50 px-6 py-3 text-sm text-gray-500 border-t border-gray-200">
              Loading AI settings…
            </div>
          )}
        </section>
        )}

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

