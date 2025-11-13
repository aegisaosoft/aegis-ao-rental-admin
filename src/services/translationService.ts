// services/translationService.ts
import {
  TranslateRequest,
  TranslateAllRequest,
} from '../types/translation.types';
import api from './api';

export class TranslationService {
  /**
   * Translate text to a single target language
   */
  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string> {
    const request: TranslateRequest = {
      text,
      targetLanguage,
      sourceLanguage,
    };

    try {
      const response = await api.post<any>('/translation/translate', request);
      // Handle standardized response format: { result: { translation: "..." }, reason: 0, ... }
      const translationData = response.data?.result || response.data;
      if (translationData?.translation) {
        return translationData.translation;
      }
      // Fallback for direct response format
      if (response.data?.translation) {
        return response.data.translation;
      }
      throw new Error('Invalid response format from translation API');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Translation failed';
      throw new Error(`Translation failed: ${errorMessage}`);
    }
  }

  /**
   * Translate text to all supported languages
   */
  async translateToAll(
    text: string,
    sourceLanguage?: string
  ): Promise<Record<string, string>> {
    const request: TranslateAllRequest = {
      text,
      sourceLanguage,
    };

    try {
      const response = await api.post<any>('/translation/translate-all', request);
      // Handle standardized response format: { result: { translations: {...} }, reason: 0, ... }
      const translationData = response.data?.result || response.data;
      if (translationData?.translations) {
        return translationData.translations;
      }
      // Fallback for direct response format
      if (response.data?.translations) {
        return response.data.translations;
      }
      throw new Error('Invalid response format from translation API');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Translation failed';
      throw new Error(`Translation failed: ${errorMessage}`);
    }
  }

  /**
   * Translate multiple texts to a single language
   */
  async translateBatch(
    texts: string[],
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string[]> {
    const promises = texts.map((text) =>
      this.translateText(text, targetLanguage, sourceLanguage)
    );
    return Promise.all(promises);
  }
}

// Export singleton instance
export const translationService = new TranslationService();

