import api from './api';

export interface StripeSettingsResponse {
  publishableKey: string;
  hasSecretKey: boolean;
  secretKeyPreview?: string | null;
  secretKey?: string | null;
  hasWebhookSecret: boolean;
  webhookSecretPreview?: string | null;
  webhookSecret?: string | null;
}

export interface UpdateStripeSettingsPayload {
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
  removeSecretKey?: boolean;
  removePublishableKey?: boolean;
  removeWebhookSecret?: boolean;
}

export interface AiSettingsResponse {
  hasAnthropicKey: boolean;
  anthropicKeyPreview?: string | null;
  anthropicApiKey?: string | null;
  hasClaudeKey: boolean;
  claudeKeyPreview?: string | null;
  claudeApiKey?: string | null;
  hasOpenAiKey: boolean;
  openAiKeyPreview?: string | null;
  openAiApiKey?: string | null;
}

export interface UpdateAiSettingsPayload {
  anthropicApiKey?: string;
  claudeApiKey?: string;
  openAiApiKey?: string;
  removeAnthropicApiKey?: boolean;
  removeClaudeApiKey?: boolean;
  removeOpenAiApiKey?: boolean;
}

const unwrap = <T>(data: any): T => (data?.result !== undefined ? data.result : data);

const settingsService = {
  async getStripeSettings(): Promise<StripeSettingsResponse> {
    const response = await api.get('/settings/stripe');
    return unwrap<StripeSettingsResponse>(response.data);
  },

  async updateStripeSettings(payload: UpdateStripeSettingsPayload): Promise<void> {
    await api.put('/settings/stripe', payload);
  },

  async getAiSettings(): Promise<AiSettingsResponse> {
    const response = await api.get('/settings/ai');
    return unwrap<AiSettingsResponse>(response.data);
  },

  async updateAiSettings(payload: UpdateAiSettingsPayload): Promise<void> {
    await api.put('/settings/ai', payload);
  },
};

export default settingsService;
