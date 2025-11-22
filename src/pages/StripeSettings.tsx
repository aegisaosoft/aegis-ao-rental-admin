import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { Plus, Edit, Trash2, X, Save, Eye, EyeOff, CreditCard, Key, Lock, Calendar } from 'lucide-react';
import api from '../services/api';
import { encrypt, decrypt } from '../services/encryptionService';

interface StripeSetting {
  id: string;
  name: string;
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
  createdAt: string;
  updatedAt: string;
  // Store encrypted versions for display when editing
  encryptedSecretKey?: string;
  encryptedPublishableKey?: string;
  encryptedWebhookSecret?: string;
}

interface CreateStripeSettingDto {
  name: string;
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
}

interface UpdateStripeSettingDto {
  name?: string;
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
}

const StripeSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<CreateStripeSettingDto>({
    name: '',
    secretKey: '',
    publishableKey: '',
    webhookSecret: '',
  });

  const { data: settings, isLoading, error } = useQuery<StripeSetting[]>({
    queryKey: ['stripeSettings'],
    queryFn: async () => {
      const response = await api.get('/StripeSettings');
      const rawSettings = response.data.result || response.data || [];
      
      // Store both encrypted (for edit display) and decrypted (for view display) versions
      const processedSettings = await Promise.all(
        rawSettings.map(async (setting: StripeSetting) => {
          const decryptedSecretKey = setting.secretKey ? await decrypt(setting.secretKey) : undefined;
          const decryptedPublishableKey = setting.publishableKey ? await decrypt(setting.publishableKey) : undefined;
          const decryptedWebhookSecret = setting.webhookSecret ? await decrypt(setting.webhookSecret) : undefined;
          
          return {
            ...setting,
            // Decrypted for viewing
            secretKey: decryptedSecretKey,
            publishableKey: decryptedPublishableKey,
            webhookSecret: decryptedWebhookSecret,
            // Encrypted for showing in edit mode
            encryptedSecretKey: setting.secretKey,
            encryptedPublishableKey: setting.publishableKey,
            encryptedWebhookSecret: setting.webhookSecret,
          };
        })
      );
      
      return processedSettings;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateStripeSettingDto) => {
      // Encrypt plain text keys before sending (GUI encrypts, backend stores as-is)
      // If key already looks encrypted (base64), send as-is
      const processedData: CreateStripeSettingDto = {
        name: data.name,
        secretKey: data.secretKey 
          ? (data.secretKey.startsWith('sk_') ? await encrypt(data.secretKey) : data.secretKey)
          : undefined,
        publishableKey: data.publishableKey
          ? (data.publishableKey.startsWith('pk_') ? await encrypt(data.publishableKey) : data.publishableKey)
          : undefined,
        webhookSecret: data.webhookSecret
          ? (data.webhookSecret.startsWith('whsec_') ? await encrypt(data.webhookSecret) : data.webhookSecret)
          : undefined,
      };
      
      const response = await api.post('/StripeSettings', processedData);
      return response.data.result || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripeSettings'] });
      setIsCreating(false);
      setFormData({ name: '', secretKey: '', publishableKey: '', webhookSecret: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateStripeSettingDto }) => {
      // Encrypt plain text keys before sending (GUI encrypts, backend stores as-is)
      // If key already looks encrypted (base64), send as-is
      const processedData: UpdateStripeSettingDto = {
        name: data.name,
        secretKey: data.secretKey
          ? (data.secretKey.startsWith('sk_') ? await encrypt(data.secretKey) : data.secretKey)
          : undefined,
        publishableKey: data.publishableKey
          ? (data.publishableKey.startsWith('pk_') ? await encrypt(data.publishableKey) : data.publishableKey)
          : undefined,
        webhookSecret: data.webhookSecret
          ? (data.webhookSecret.startsWith('whsec_') ? await encrypt(data.webhookSecret) : data.webhookSecret)
          : undefined,
      };
      
      const response = await api.put(`/StripeSettings/${id}`, processedData);
      return response.data.result || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripeSettings'] });
      setEditingId(null);
      setFormData({ name: '', secretKey: '', publishableKey: '', webhookSecret: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/StripeSettings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripeSettings'] });
    },
  });

  const handleEdit = (setting: StripeSetting) => {
    setEditingId(setting.id);
    // Show encrypted keys in edit form (what's stored in DB)
    setFormData({
      name: setting.name || '',
      secretKey: setting.encryptedSecretKey || '',
      publishableKey: setting.encryptedPublishableKey || '',
      webhookSecret: setting.encryptedWebhookSecret || '',
    });
    setIsCreating(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({ name: '', secretKey: '', publishableKey: '', webhookSecret: '' });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ name: '', secretKey: '', publishableKey: '', webhookSecret: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If editing and field is empty or same as encrypted value, don't send it (keep existing)
    const data: CreateStripeSettingDto | UpdateStripeSettingDto = {
      name: formData.name,
    };

    if (editingId) {
      const currentSetting = settings?.find(s => s.id === editingId);
      // Only include keys if they're different from encrypted values (user entered new value)
      if (formData.secretKey && formData.secretKey !== currentSetting?.encryptedSecretKey) {
        (data as UpdateStripeSettingDto).secretKey = formData.secretKey;
      }
      if (formData.publishableKey && formData.publishableKey !== currentSetting?.encryptedPublishableKey) {
        (data as UpdateStripeSettingDto).publishableKey = formData.publishableKey;
      }
      if (formData.webhookSecret && formData.webhookSecret !== currentSetting?.encryptedWebhookSecret) {
        (data as UpdateStripeSettingDto).webhookSecret = formData.webhookSecret;
      }
      updateMutation.mutate({ id: editingId, data: data as UpdateStripeSettingDto });
    } else {
      // For create, send all provided keys
      (data as CreateStripeSettingDto).secretKey = formData.secretKey || undefined;
      (data as CreateStripeSettingDto).publishableKey = formData.publishableKey || undefined;
      (data as CreateStripeSettingDto).webhookSecret = formData.webhookSecret || undefined;
      createMutation.mutate(data as CreateStripeSettingDto);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const toggleSecretVisibility = (id: string) => {
    setShowSecrets((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const maskSecret = (value?: string) => {
    if (!value) return '';
    if (value.length <= 8) return '••••••••';
    return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Stripe Settings</h1>
          </div>
          <p className="text-gray-600 ml-12">Manage your Stripe API configurations and webhook secrets</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Configuration Profiles</h2>
              <p className="text-sm text-gray-500 mt-1">Create and manage multiple Stripe configurations</p>
            </div>
            {!isCreating && !editingId && (
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-medium"
              >
                <Plus className="h-5 w-5" />
                Add New
              </button>
            )}
          </div>

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
              <p className="text-gray-600 font-medium">Loading Stripe settings...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <X className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-red-800 font-semibold">Failed to load Stripe settings</p>
                  <p className="text-red-600 text-sm mt-1">Please try refreshing the page</p>
                </div>
              </div>
            </div>
          )}

          {/* Create/Edit Form */}
          {(isCreating || editingId) && (
            <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-blue-600 rounded-lg">
                  <Plus className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingId ? 'Edit Configuration' : 'Create New Configuration'}
                </h3>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    maxLength={20}
                    required
                    disabled={editingId !== null}
                    placeholder="e.g., test, production"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    Unique identifier for this Stripe configuration
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Lock className="h-4 w-4 text-red-600" />
                    Secret Key
                  </label>
                  <input
                    type="password"
                    value={formData.secretKey}
                    onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white font-mono text-sm"
                    placeholder="sk_live_..."
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Key className="h-4 w-4 text-green-600" />
                    Publishable Key
                  </label>
                  <input
                    type="text"
                    value={formData.publishableKey}
                    onChange={(e) => setFormData({ ...formData, publishableKey: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white font-mono text-sm"
                    placeholder="pk_live_..."
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Lock className="h-4 w-4 text-purple-600" />
                    Webhook Secret
                  </label>
                  <input
                    type="password"
                    value={formData.webhookSecret}
                    onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white font-mono text-sm"
                    placeholder="whsec_..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    <Save className="h-4 w-4" />
                    {editingId ? 'Save Changes' : 'Create Configuration'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Settings List */}
          {!isLoading && !error && (!settings || settings.length === 0) ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <CreditCard className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 text-lg font-medium mb-2">No Stripe settings found</p>
              <p className="text-gray-500 mb-6">Get started by creating your first Stripe configuration</p>
              {!isCreating && (
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-medium"
                >
                  <Plus className="h-5 w-5" />
                  Add First Setting
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {settings?.map((setting) => (
                <div
                  key={setting.id}
                  className="group relative p-6 bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <CreditCard className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{setting.name}</h3>
                          {editingId === setting.id && (
                            <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                              Editing
                            </span>
                          )}
                        </div>
                      </div>

                      {editingId === setting.id ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <Lock className="h-4 w-4 text-red-600" />
                              Secret Key
                            </label>
                            <div className="mb-2 p-2 bg-gray-50 rounded border border-gray-200">
                              <p className="text-xs text-gray-500 mb-1">Encrypted (stored in DB):</p>
                              <p className="font-mono text-xs text-gray-700 break-all">{setting.encryptedSecretKey || 'Not set'}</p>
                            </div>
                            <input
                              type="password"
                              value={formData.secretKey}
                              onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white font-mono text-sm"
                              placeholder="Enter new plain text key (sk_live_...) or leave encrypted value"
                            />
                            <p className="text-xs text-gray-500 mt-1">Leave empty to keep current encrypted key, or enter new plain text key</p>
                          </div>

                          <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <Key className="h-4 w-4 text-green-600" />
                              Publishable Key
                            </label>
                            <div className="mb-2 p-2 bg-gray-50 rounded border border-gray-200">
                              <p className="text-xs text-gray-500 mb-1">Encrypted (stored in DB):</p>
                              <p className="font-mono text-xs text-gray-700 break-all">{setting.encryptedPublishableKey || 'Not set'}</p>
                            </div>
                            <input
                              type="text"
                              value={formData.publishableKey}
                              onChange={(e) => setFormData({ ...formData, publishableKey: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white font-mono text-sm"
                              placeholder="Enter new plain text key (pk_live_...) or leave encrypted value"
                            />
                            <p className="text-xs text-gray-500 mt-1">Leave empty to keep current encrypted key, or enter new plain text key</p>
                          </div>

                          <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <Lock className="h-4 w-4 text-purple-600" />
                              Webhook Secret
                            </label>
                            <div className="mb-2 p-2 bg-gray-50 rounded border border-gray-200">
                              <p className="text-xs text-gray-500 mb-1">Encrypted (stored in DB):</p>
                              <p className="font-mono text-xs text-gray-700 break-all">{setting.encryptedWebhookSecret || 'Not set'}</p>
                            </div>
                            <input
                              type="password"
                              value={formData.webhookSecret}
                              onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white font-mono text-sm"
                              placeholder="Enter new plain text key (whsec_...) or leave encrypted value"
                            />
                            <p className="text-xs text-gray-500 mt-1">Leave empty to keep current encrypted key, or enter new plain text key</p>
                          </div>

                          <div className="flex gap-3 pt-2">
                            <button
                              type="submit"
                              disabled={updateMutation.isPending}
                              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                              <Save className="h-4 w-4" />
                              Save Changes
                            </button>
                            <button
                              type="button"
                              onClick={handleCancel}
                              className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
                            >
                              <X className="h-4 w-4" />
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="space-y-4">
                          <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Lock className="h-4 w-4 text-red-600" />
                                <span className="text-sm font-semibold text-gray-700">Secret Key</span>
                              </div>
                              {setting.secretKey && (
                                <button
                                  onClick={() => toggleSecretVisibility(setting.id)}
                                  className="text-gray-400 hover:text-gray-600 transition-colors"
                                  type="button"
                                  title={showSecrets[setting.id] ? 'Hide' : 'Show'}
                                >
                                  {showSecrets[setting.id] ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </div>
                            <p className="font-mono text-xs text-gray-700 mt-2 break-all">
                              {showSecrets[setting.id]
                                ? setting.secretKey || 'Not set'
                                : maskSecret(setting.secretKey) || 'Not set'}
                            </p>
                          </div>

                          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Key className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-semibold text-gray-700">Publishable Key</span>
                            </div>
                            <p className="font-mono text-xs text-gray-700 break-all">
                              {setting.publishableKey || 'Not set'}
                            </p>
                          </div>

                          <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Lock className="h-4 w-4 text-purple-600" />
                                <span className="text-sm font-semibold text-gray-700">Webhook Secret</span>
                              </div>
                              {setting.webhookSecret && (
                                <button
                                  onClick={() => toggleSecretVisibility(`${setting.id}-webhook`)}
                                  className="text-gray-400 hover:text-gray-600 transition-colors"
                                  type="button"
                                  title={showSecrets[`${setting.id}-webhook`] ? 'Hide' : 'Show'}
                                >
                                  {showSecrets[`${setting.id}-webhook`] ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </div>
                            <p className="font-mono text-xs text-gray-700 mt-2 break-all">
                              {showSecrets[`${setting.id}-webhook`]
                                ? setting.webhookSecret || 'Not set'
                                : maskSecret(setting.webhookSecret) || 'Not set'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              Created: {new Date(setting.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {editingId !== setting.id && (
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(setting)}
                          className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:shadow-sm"
                          title="Edit"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(setting.id, setting.name)}
                          className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-all hover:shadow-sm"
                          title="Delete"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default StripeSettings;

