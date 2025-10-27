export const ERROR_MESSAGES = {
  en: {
    upload_failed: 'Failed to upload image',
    analysis_failed: 'Failed to analyze image',
    function_failed: 'Operation failed',
    network_error: 'Network error occurred',
    rate_limited: 'You are sending requests too quickly. Please wait and try again.',
    unauthorized: 'You are not authorized. Please sign in again.',
    server_unavailable: 'Service is temporarily unavailable. Please try again later.',
    server_error: 'Server error occurred',
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
    rate_limited: '请求过于频繁，请稍后再试。',
    unauthorized: '未授权访问，请重新登录。',
    server_unavailable: '服务暂不可用，请稍后再试。',
    server_error: '服务器错误',
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

// Step labels for the chips shown under the header
export const STEP_LABELS = {
  en: {
    analyze_book_cover: 'Analyzing cover',
    analyze_item_photo: 'Analyzing item photo',
    check_duplicates: 'Checking duplicates',
    create_book: 'Creating book',
    update_book: 'Updating book',
    search_books: 'Searching books',
    adjust_book_quantity: 'Adjusting quantity',
    update_order: 'Updating order',
  },
  zh: {
    analyze_book_cover: '正在分析封面',
    analyze_item_photo: '正在分析物品照片',
    check_duplicates: '正在检查重复',
    create_book: '正在创建书籍',
    update_book: '正在更新书籍',
    search_books: '正在搜索书籍',
    adjust_book_quantity: '正在调整数量',
    update_order: '正在更新订单',
  }
} as const

// General UI strings used across admin AI chat
export const UI_STRINGS = {
  en: {
    input_placeholder: 'Type your message...',
    copy_request_id: 'Copy request id',
    confirm_new_conversation: 'Discard unsent input and start a new conversation?',
    jump_to_latest: 'Jump to latest',
    thinking: 'Thinking...'
  },
  zh: {
    input_placeholder: '输入你的消息…',
    copy_request_id: '复制请求编号',
    confirm_new_conversation: '放弃未发送内容并开始新会话？',
    jump_to_latest: '跳至最新',
    thinking: '思考中...'
  }
} as const
