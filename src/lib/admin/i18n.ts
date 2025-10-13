export const ERROR_MESSAGES = {
  en: {
    upload_failed: 'Failed to upload image',
    analysis_failed: 'Failed to analyze image',
    function_failed: 'Operation failed',
    network_error: 'Network error occurred',
    unknown_error: 'An unknown error occurred',
    retry_suggestion: 'Please try again',
    invalid_file: 'Invalid file type. Only images are allowed.',
    file_too_large: 'File too large. Maximum size is 10MB.',
    no_file: 'No file selected',
  },
  zh: {
    upload_failed: '图片上传失败',
    analysis_failed: '图片分析失败',
    function_failed: '操作失败',
    network_error: '网络连接错误',
    unknown_error: '发生未知错误',
    retry_suggestion: '请重试',
    invalid_file: '文件类型无效。仅支持图片格式。',
    file_too_large: '文件过大。最大限制为10MB。',
    no_file: '未选择文件',
  },
} as const

export const LOADING_MESSAGES = {
  en: {
    uploading: 'Uploading image...',
    analyzing: 'Analyzing image...',
    processing: 'Processing...',
    checking: 'Checking database...',
  },
  zh: {
    uploading: '正在上传图片...',
    analyzing: '正在分析图片...',
    processing: '处理中...',
    checking: '正在检查数据库...',
  },
} as const

export type UILanguage = keyof typeof ERROR_MESSAGES

export function mapUnknownError(language: UILanguage, err: unknown): string {
  if (err instanceof Error) return err.message || ERROR_MESSAGES[language].unknown_error
  if (typeof err === 'string') return err || ERROR_MESSAGES[language].unknown_error
  return ERROR_MESSAGES[language].unknown_error
}

