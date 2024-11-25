# Admin LLM Interface for AMTBCF Buddhist Book Management
## Part 1: Core Architecture and File Structure (Things below are what developer absolutly have to follow)

## 1. Overview

### 1.1 Core Design Philosophy 
- Maximize GPT-4o's capabilities for natural language and vision processing, long context window memory, and function calling
- Optimize image handling through Cloudinary integration
- Support complete book management lifecycle

### 1.2 Technical Constants
- the entire website use shadcn ui, so use the components when possible.

```typescript
export const ADMIN_AI_CONSTANTS = {
  MODEL: "gpt-4o",
  CONTEXT_WINDOW: 128_000,
  MAX_OUTPUT_TOKENS: 16_384,
  TEMPERATURE: 0
} as const;

export const CLOUDINARY_CONSTANTS = {
  MAX_IMAGE_SIZE: "19MB",
  SUPPORTED_FORMATS: ["JPEG", "PNG", "HEIC"],
  OPTIMIZATION_PROFILE: {
    quality: "auto",
    fetch_format: "auto",
    crop: "limit",
    max_width: 2048
  }
} as const;

export const CATEGORY_TYPE = {
  PURE_LAND_BOOKS: "净土佛书",
  OTHER_BOOKS: "其他佛书", 
  DHARMA_ITEMS: "法宝",
  BUDDHA_STATUES: "佛像"
} as const;
```

## 2. File Structure

```typescript
src/
├── app/
│   ├── admin/
│   │   └── ai-chat/
│   │       ├── page.tsx               # Admin chat interface page
│   │       │   - Auth protection
│   │       │   - Chat interface layout
│   │       │   - Session management (use middleware to check admin status, already set up)
│   │       │   - Cloudinary integration
│   │       │   - Image upload handling
│   │       │
│   │       ├── loading.tsx            # Loading states
│   │       └── error.tsx              # Error handling
│   │
│   └── api/
│       └── admin/
│           └── ai-chat/
│               ├── route.ts            # Main API endpoint
│               │   - Message processing
│               │   - Function calling
│               │   - Error handling
│               │   - Session management
│               │
│               └── image-upload.ts     # Image upload endpoint
                    - Cloudinary handling
                    - Image optimization
                    - Error handling

├── components/
│   └── admin/
│       └── ai-chat/
│           ├── chat-interface.tsx     # Main chat container
│           │   - Message history
│           │   - Input handling
│           │   - Image preview
│           │   - Status indicators
│           │
│           ├── chat-input.tsx         # Enhanced input component
│           │   - Text input
│           │   - Image upload
│           │   - Command shortcuts
│           │   - Auto-complete
│           │
│           ├── message-display.tsx    # Message rendering
│           │   - Text formatting
│           │   - Image display
│           │   - Action buttons
│           │   - Function results
│           │
│           ├── image-preview.tsx      # Image handling
│           │   - Cloudinary preview
│           │   - Upload progress
│           │   - Image optimization
│           │   - Error states
│           │
│           ├── book-preview.tsx       # Book display
│           │   - Cover image
│           │   - Metadata
│           │   - Action buttons
│           │   - Status indicators
│           │
│           └── function-result.tsx    # Function results
                - Success/error states
                - Data visualization
                - Action confirmation
                - Retry options

├── lib/
│   └── admin/
│       ├── ai/
│       │   ├── llm-manager.ts         # Core LLM logic
│       │   │   - GPT-4o integration
│       │   │   - Context management
│       │   │   - Function calling
│       │   │   - Error handling
│       │   │
│       │   ├── context-builder.ts     # Context management
│       │   │   - Session context
│       │   │   - Book context
│       │   │   - Function context
│       │   │   - Image context
│       │   │
│       │   ├── image-processor.ts     # Image handling
│       │   │   - Cloudinary integration
│       │   │   - Optimization
│       │   │   - Error handling
│       │   │   - Format validation
│       │   │
│       │   ├── function-registry.ts   # Function definitions
│       │   │   - Book management
│       │   │   - Order processing
│       │   │   - Image analysis
│       │   │   - Inventory management
│       │   │
│       │   └── error-handler.ts       # Error management
│       │       - Error classification
│       │       - Error messages
│       │       - Recovery strategies
│       │       - Logging
│       │
│       ├── cloudinary/
│       │   ├── config.ts              # Cloudinary setup
│       │   ├── optimizer.ts           # Image optimization
│       │   └── uploader.ts            # Upload handling
│       │
│       ├── db/
│       │   ├── books.ts               # Book operations
│       │   ├── orders.ts              # Order operations
│       │   ├── inventory.ts           # Inventory tracking
│       │   └── sessions.ts            # Session management
│       │
│       └── utils/
│           ├── validators.ts          # Input validation
│           ├── formatters.ts          # Data formatting
│           └── logger.ts              # Logging system

└── types/
    └── admin/
        ├── chat.ts                    # Chat types
        ├── book.ts                    # Book types
        ├── order.ts                   # Order types
        └── session.ts                 # Session types
```

## 3. Core Components

### 3.1 Chat Interface
The chat interface (`chat-interface.tsx`) serves as the primary interaction point for admins. Key features:
- Real-time message updates
- Image upload handling
- Function result display
- Session management
- Error handling
- Loading states
- Mobile responsiveness

### 3.2 LLM Manager
The LLM manager (`llm-manager.ts`) handles all GPT-4o interactions:
- Message processing
- Function calling
- Context management
- Image analysis
- Error handling
- Response formatting

### 3.3 Image Processor
The image processor (`image-processor.ts`) manages all image-related operations:
- Cloudinary optimization
- Format validation
- Error handling
- Upload management
- Preview generation

### 3.4 Function Registry
The function registry (`function-registry.ts`) defines all available admin functions:
- Book management
- Order processing
- Image analysis
- Inventory management
- Error handling

## 4. Key Interfaces (Things below are design ideas, can be changed by developer)

### 4.1 Admin Session
```typescript
interface AdminSession {
  id: string;
  adminId: string;
  startTime: Date;
  lastActivity: Date;
  context: {
    currentBooks: string[];
    currentOrders: string[];
    imageContext: ImageContext[];
    functionContext: FunctionContext[];
  };
  active: boolean;
}

interface ImageContext {
  url: string;              // Cloudinary URL
  uploadTime: Date;
  analysis: {
    processedAt: Date;
    results: any;
    confidence: number;
  };
}

interface FunctionContext {
  name: string;
  lastCalled: Date;
  results: any;
  status: 'SUCCESS' | 'ERROR';
}
```

### 4.2 Message Types
```typescript
interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  timestamp: Date;
  attachments?: {
    images?: CloudinaryImage[];
    functions?: FunctionCall[];
  };
}

interface CloudinaryImage {
  url: string;
  publicId: string;
  format: string;
  width: number;
  height: number;
  size: number;
}

interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
}
```

# Admin LLM Interface
## Part 2: Function Definitions and LLM Integration

## 1. Function Registry

### 1.1 Book Management Functions
```typescript
const bookManagementTools = [
  {
    "type": "function",
    "function": {
      "name": "analyzeBookCover",
      "description": "Analyze a book cover image to extract information and detect duplicates",
      "parameters": {
        "type": "object",
        "properties": {
          "imageUrl": {
            "type": "string",
            "description": "Cloudinary URL of the book cover image"
          },
          "analysisType": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": ["TEXT_EXTRACTION", "DUPLICATE_CHECK", "CATEGORIZATION"]
            },
            "description": "Types of analysis to perform"
          }
        },
        "required": ["imageUrl"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "addBook",
      "description": "Add a new book to the inventory",
      "parameters": {
        "type": "object",
        "properties": {
          "title_zh": {
            "type": "string",
            "description": "Chinese title of the book"
          },
          "title_en": {
            "type": "string",
            "description": "English title of the book, if available",
            "optional": true
          },
          "category": {
            "type": "string",
            "enum": ["PURE_LAND_BOOKS", "OTHER_BOOKS", "DHARMA_ITEMS", "BUDDHA_STATUES"],
            "description": "Book category, must match preset categories"
          },
          "quantity": {
            "type": "integer",
            "description": "Initial quantity in stock"
          },
          "cover_image": {
            "type": "string",
            "description": "Cloudinary URL of the book cover"
          },
          "description_zh": {
            "type": "string",
            "description": "Chinese description of the book"
          },
          "description_en": {
            "type": "string",
            "description": "English description of the book",
            "optional": true
          }
        },
        "required": ["title_zh", "category", "quantity", "cover_image", "description_zh"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "updateBookQuantity",
      "description": "Update the quantity of a book in inventory",
      "parameters": {
        "type": "object",
        "properties": {
          "book_id": {
            "type": "string",
            "description": "ID of the book to update"
          },
          "quantity_change": {
            "type": "integer",
            "description": "Amount to change quantity by (positive or negative)"
          },
          "reason": {
            "type": "string",
            "enum": ["RESTOCK", "ADJUSTMENT", "DAMAGED", "LOST"],
            "description": "Reason for quantity change"
          }
        },
        "required": ["book_id", "quantity_change", "reason"]
      }
    }
  }
];

const orderManagementTools = [
  {
    "type": "function",
    "function": {
      "name": "processOrder",
      "description": "Process an order status change",
      "parameters": {
        "type": "object",
        "properties": {
          "order_id": {
            "type": "string",
            "description": "ID of the order to process"
          },
          "new_status": {
            "type": "string",
            "enum": ["CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"],
            "description": "New status for the order"
          },
          "tracking_number": {
            "type": "string",
            "description": "Tracking number if status is SHIPPED",
            "optional": true
          },
          "notes": {
            "type": "string",
            "description": "Additional notes for the order",
            "optional": true
          }
        },
        "required": ["order_id", "new_status"]
      }
    }
  }
];

const searchTools = [
  {
    "type": "function",
    "function": {
      "name": "searchBooks",
      "description": "Search for books in the inventory",
      "parameters": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "Search query in English or Chinese"
          },
          "category": {
            "type": "string",
            "enum": ["PURE_LAND_BOOKS", "OTHER_BOOKS", "DHARMA_ITEMS", "BUDDHA_STATUES"],
            "description": "Filter by category",
            "optional": true
          },
          "availability": {
            "type": "boolean",
            "description": "Filter by availability",
            "optional": true
          }
        },
        "required": ["query"]
      }
    }
  }
];
```

## 2. LLM Integration

### 2.1 System Prompts
```typescript
const ADMIN_SYSTEM_PROMPTS = {
  BOOK_MANAGEMENT: `You are a specialized Buddhist book management assistant with expertise in:
- Processing book information in both English and Chinese
- Categorizing books according to preset categories
- Visual analysis of book covers
- Duplicate detection
- Inventory management

Important Guidelines:
1. Always maintain preset categories: PURE_LAND_BOOKS, OTHER_BOOKS, DHARMA_ITEMS, BUDDHA_STATUES
2. Process both English and Chinese text naturally
3. For book analysis, prefer Chinese as primary language when available
4. Always verify stock levels before operations
5. Maintain clear audit trail of changes
6. Use Cloudinary URLs for all image operations`,

  ORDER_PROCESSING: `You are an order management assistant specialized in:
- Order status updates
- Shipping information processing
- Inventory verification
- Customer notes management

Key Requirements:
1. Verify inventory before confirming orders
2. Track all status changes
3. Require tracking numbers for shipped status
4. Maintain audit trail
5. Process both English and Chinese notes`,

  IMAGE_ANALYSIS: `You are a specialized book cover analyst focused on:
- Text extraction from book covers (both English and Chinese)
- Duplicate detection through visual comparison
- Category identification
- Physical condition assessment

Guidelines:
1. Process images through Cloudinary URLs only
2. Prioritize Chinese text when available
3. Use high confidence thresholds for duplicate detection
4. Consider both visual and textual similarities
5. Flag uncertain cases for manual review`
};
```

### 2.2 Context Management

```typescript
interface LLMContext {
  conversation: {
    messages: ChatMessage[];
    current_focus: {
      books?: string[];
      orders?: string[];
      images?: string[];
    };
  };
  
  function_history: {
    last_called: Record<string, Date>;
    results: Record<string, any>;
  };
  
  session_data: {
    start_time: Date;
    last_activity: Date;
    image_analysis_count: number;
    function_call_count: number;
  };
}

class ContextManager {
  static MAX_MESSAGES = 50;
  static MAX_IMAGES_PER_SESSION = 20;
  static TOKEN_LIMIT = 128000;

  pruneContext(context: LLMContext): LLMContext {
    // Implement context pruning while maintaining critical information
  }

  estimateTokens(context: LLMContext): number {
    // Implement token estimation
  }

  updateContext(context: LLMContext, update: Partial<LLMContext>): LLMContext {
    // Implement context updating
  }
}
```

### 2.3 Function Execution Flow

```typescript
class FunctionExecutor {
  async execute(
    call: FunctionCall, 
    context: LLMContext
  ): Promise<FunctionResult> {
    try {
      // 1. Validate function call
      this.validateCall(call);

      // 2. Check prerequisites
      await this.checkPrerequisites(call);

      // 3. Execute function
      const result = await this.executeFunction(call);

      // 4. Update context
      context = this.updateContext(context, call, result);

      // 5. Log execution
      await this.logExecution(call, result);

      return {
        success: true,
        result,
        context
      };
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  private validateCall(call: FunctionCall) {
    // Implement validation
  }

  private async checkPrerequisites(call: FunctionCall) {
    // Implement prerequisite checking
  }

  private async executeFunction(call: FunctionCall) {
    // Implement function execution
  }

  private updateContext(
    context: LLMContext, 
    call: FunctionCall, 
    result: any
  ): LLMContext {
    // Implement context updating
  }

  private async logExecution(
    call: FunctionCall, 
    result: any
  ) {
    // Implement execution logging
  }
}
```

### 2.4 Error Handling

```typescript
interface FunctionError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
  suggestions?: string[];
}

class ErrorHandler {
  static readonly ERROR_TYPES = {
    VALIDATION: 'VALIDATION_ERROR',
    EXECUTION: 'EXECUTION_ERROR',
    PERMISSION: 'PERMISSION_ERROR',
    RESOURCE: 'RESOURCE_ERROR',
    SYSTEM: 'SYSTEM_ERROR'
  } as const;

  handleError(error: any): FunctionError {
    // Classify and handle error
    const classified = this.classifyError(error);
    
    return {
      code: classified.code,
      message: this.getErrorMessage(classified),
      details: classified.details,
      recoverable: this.isRecoverable(classified),
      suggestions: this.getSuggestions(classified)
    };
  }

  private classifyError(error: any) {
    // Implement error classification
  }

  private getErrorMessage(error: any) {
    // Get appropriate error message
  }

  private isRecoverable(error: any) {
    // Determine if error is recoverable
  }

  private getSuggestions(error: any) {
    // Get recovery suggestions
  }
}
```

## 3. Integration Points

### 3.1 GPT-4o Integration
```typescript
class LLMManager {
  private context: LLMContext;
  private functionExecutor: FunctionExecutor;
  private errorHandler: ErrorHandler;

  async processMessage(
    message: ChatMessage
  ): Promise<ProcessingResult> {
    try {
      // 1. Build context for GPT-4o
      const gptContext = this.buildContext(message);

      // 2. Get response from GPT-4o
      const response = await this.getGPTResponse(gptContext);

      // 3. Handle function calls if any
      if (response.function_call) {
        return this.handleFunctionCall(response.function_call);
      }

      // 4. Update context
      this.updateContext(response);

      return {
        response,
        context: this.context,
        status: 'success'
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private buildContext(message: ChatMessage) {
    // Build context for GPT-4o
  }

  private async getGPTResponse(context: any) {
    // Get response from GPT-4o
  }

  private async handleFunctionCall(functionCall: any) {
    // Handle function calls
  }

  private updateContext(response: any) {
    // Update context
  }

  private handleError(error: any) {
    // Handle errors
  }
}
```

### 3.2 Message Processing Pipeline

```typescript
interface MessageProcessor {
  preprocessMessage(message: ChatMessage): Promise<ChatMessage>;
  processMessage(message: ChatMessage): Promise<ProcessingResult>;
  postprocessResult(result: ProcessingResult): Promise<ProcessingResult>;
}

class AdminMessageProcessor implements MessageProcessor {
  private llmManager: LLMManager;
  private contextManager: ContextManager;
  
  async preprocessMessage(message: ChatMessage): Promise<ChatMessage> {
    // Implement preprocessing
  }
  
  async processMessage(message: ChatMessage): Promise<ProcessingResult> {
    // Implement processing
  }
  
  async postprocessResult(result: ProcessingResult): Promise<ProcessingResult> {
    // Implement postprocessing
  }
}
```

## 4. Performance Considerations

### 4.1 Token Management
- Implement token counting and management
- Prune context when approaching limits
- Maintain essential context for continuity
- Optimize image descriptions for token usage

### 4.2 Response Time Optimization
- Parallel function execution when possible
- Efficient context management
- Caching of frequent operations
- Optimized image processing

### 4.3 Error Recovery
- Graceful degradation
- Automatic retry strategies
- Context preservation during errors
- Clear error communication

# Admin LLM Interface
## Part 3: Image Processing and Cloudinary Integration

## 1. Cloudinary Configuration

### 1.1 Setup and Constants
```typescript
const CLOUDINARY_CONFIG = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
} as const;

const IMAGE_CONSTRAINTS = {
  maxFileSize: "19MB",
  supportedFormats: ["JPEG", "PNG", "HEIC"],
  optimalDimensions: {
    maxWidth: 2048,
    quality: "auto",
    format: "auto"
  }
} as const;

const UPLOAD_PRESETS = {
  bookCovers: {
    folder: "book-covers",
    transformation: [
      { quality: "auto" },
      { fetch_format: "auto" },
      { width: 2048, crop: "limit" }
    ]
  }
} as const;
```

### 1.2 Cloudinary Service Implementation
```typescript
class CloudinaryService {
  private v2: typeof import('cloudinary').v2;
  
  constructor() {
    this.v2 = require('cloudinary').v2;
    this.v2.config(CLOUDINARY_CONFIG);
  }

  async uploadBookCover(file: File): Promise<CloudinaryResponse> {
    try {
      // 1. Validate file
      this.validateFile(file);
      
      // 2. Upload with optimization
      const result = await this.v2.uploader.upload(file, {
        ...UPLOAD_PRESETS.bookCovers,
        resource_type: "image"
      });

      // 3. Validate result
      this.validateUploadResult(result);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        resourceType: result.resource_type
      };
    } catch (error) {
      throw new CloudinaryError(
        'Failed to upload book cover',
        { cause: error }
      );
    }
  }

  private validateFile(file: File) {
    if (file.size > this.parseSize(IMAGE_CONSTRAINTS.maxFileSize)) {
      throw new ValidationError(`File size exceeds ${IMAGE_CONSTRAINTS.maxFileSize}`);
    }
    
    const format = file.name.split('.').pop()?.toUpperCase();
    if (!IMAGE_CONSTRAINTS.supportedFormats.includes(format)) {
      throw new ValidationError(
        `Unsupported format: ${format}. Supported: ${IMAGE_CONSTRAINTS.supportedFormats.join(', ')}`
      );
    }
  }

  private validateUploadResult(result: any) {
    // Implement upload result validation
  }

  private parseSize(sizeString: string): number {
    // Implement size string parsing (e.g., "19MB" to bytes)
  }
}
```

## 2. Image Processing Flow

### 2.1 Upload Handler Component
```typescript
interface ImageUploadProps {
  onUploadComplete: (result: CloudinaryResponse) => void;
  onError: (error: Error) => void;
  uploadText?: string;
  maxFiles?: number;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onUploadComplete,
  onError,
  uploadText = "Upload Book Cover",
  maxFiles = 1
}) => {
  const [uploading, setUploading] = useState(false);
  const cloudinary = useCloudinary();

  const handleDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      setUploading(true);
      const file = acceptedFiles[0];
      
      // Upload and optimize via Cloudinary
      const result = await cloudinary.uploadBookCover(file);
      onUploadComplete(result);
    } catch (error) {
      onError(error);
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete, onError]);

  return (
    <div className="w-full">
      <Dropzone
        onDrop={handleDrop}
        accept={IMAGE_CONSTRAINTS.supportedFormats}
        maxSize={parseSize(IMAGE_CONSTRAINTS.maxFileSize)}
        maxFiles={maxFiles}
        disabled={uploading}
      >
        {({ getRootProps, getInputProps }) => (
          <div
            {...getRootProps()}
            className="border-2 border-dashed rounded-lg p-4 text-center"
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex items-center justify-center">
                <Spinner />
                <span className="ml-2">Uploading...</span>
              </div>
            ) : (
              <p>{uploadText}</p>
            )}
          </div>
        )}
      </Dropzone>
    </div>
  );
};
```

### 2.2 Image Preview Component
```typescript
interface ImagePreviewProps {
  imageUrl: string;
  title?: string;
  onRemove?: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageUrl,
  title,
  onRemove
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="relative rounded-lg overflow-hidden">
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Alert variant="error" title="Failed to load image" />
        </div>
      )}
      <img
        src={imageUrl}
        alt={title || "Book cover"}
        onLoad={() => setLoaded(true)}
        onError={() => setError("Failed to load image")}
        className={clsx(
          "w-full h-auto",
          !loaded && "invisible",
          error && "invisible"
        )}
      />
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-white"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
```

## 3. Image Analysis Integration

### 3.1 LLM Image Analysis
```typescript
interface ImageAnalysisManager {
  async analyzeBookCover(imageUrl: string): Promise<BookAnalysis> {
    try {
      // 1. Prepare image for GPT-4o
      const preparedImage = await this.prepareImageForAnalysis(imageUrl);
      
      // 2. Create analysis prompts
      const messages = this.createAnalysisPrompts(preparedImage);
      
      // 3. Get analysis from GPT-4o
      const analysis = await this.getLLMAnalysis(messages);
      
      // 4. Process and validate results
      const results = await this.processAnalysisResults(analysis);
      
      // 5. Store analysis results
      await this.storeAnalysisResults(results);
      
      return results;
    } catch (error) {
      throw new AnalysisError('Failed to analyze book cover', { cause: error });
    }
  }

  private async prepareImageForAnalysis(imageUrl: string): Promise<string> {
    // Ensure image is optimized for LLM processing
    return imageUrl;
  }

  private createAnalysisPrompts(imageUrl: string): ChatMessage[] {
    return [
      {
        role: "system",
        content: ADMIN_SYSTEM_PROMPTS.IMAGE_ANALYSIS
      },
      {
        role: "user",
        content: "Please analyze this book cover and extract key information.",
        attachments: {
          images: [imageUrl]
        }
      }
    ];
  }
}
```

### 3.2 Duplicate Detection
```typescript
interface DuplicateDetector {
  async checkForDuplicates(
    imageUrl: string,
    bookInfo: Partial<BookInfo>
  ): Promise<DuplicateCheckResult> {
    try {
      // 1. Visual similarity check
      const visualSimilarity = await this.checkVisualSimilarity(imageUrl);
      
      // 2. Metadata similarity check
      const metadataSimilarity = await this.checkMetadataSimilarity(bookInfo);
      
      // 3. Combine results
      const duplicates = this.combineSimilarityResults(
        visualSimilarity,
        metadataSimilarity
      );
      
      return {
        hasDuplicates: duplicates.length > 0,
        duplicates,
        confidence: this.calculateConfidence(duplicates)
      };
    } catch (error) {
      throw new DuplicateCheckError(
        'Failed to check for duplicates',
        { cause: error }
      );
    }
  }

  private async checkVisualSimilarity(
    imageUrl: string
  ): Promise<SimilarityResult[]> {
    // Use GPT-4o for visual comparison
    return [];
  }

  private async checkMetadataSimilarity(
    bookInfo: Partial<BookInfo>
  ): Promise<SimilarityResult[]> {
    // Check metadata similarity
    return [];
  }
}
```

## 4. Image Processing Pipeline

### 4.1 Pipeline Implementation
```typescript
class ImageProcessingPipeline {
  private cloudinary: CloudinaryService;
  private analyzer: ImageAnalysisManager;
  private duplicateDetector: DuplicateDetector;

  async process(file: File): Promise<ProcessingResult> {
    try {
      // 1. Upload and optimize
      const uploadResult = await this.cloudinary.uploadBookCover(file);
      
      // 2. Analyze image
      const analysis = await this.analyzer.analyzeBookCover(
        uploadResult.url
      );
      
      // 3. Check for duplicates
      const duplicateCheck = await this.duplicateDetector.checkForDuplicates(
        uploadResult.url,
        analysis.bookInfo
      );
      
      // 4. Return complete results
      return {
        uploadResult,
        analysis,
        duplicateCheck,
        status: 'success'
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private handleError(error: unknown): ProcessingResult {
    // Implement error handling
    return {
      status: 'error',
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}
```

### 4.2 Usage in Admin Interface
```typescript
function AdminBookUpload() {
  const pipeline = useImageProcessingPipeline();
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const handleFileUpload = async (file: File) => {
    try {
      setProcessing(true);
      const result = await pipeline.process(file);
      setResult(result);
      
      if (result.status === 'success') {
        if (result.duplicateCheck.hasDuplicates) {
          // Show duplicate warning UI
          showDuplicateWarning(result.duplicateCheck);
        } else {
          // Show book info form pre-filled with analysis
          showBookForm(result.analysis);
        }
      }
    } catch (error) {
      // Show error UI
      showError(error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <ImageUpload
        onUploadComplete={handleFileUpload}
        onError={showError}
      />
      {processing && <ProcessingIndicator />}
      {result && <ResultDisplay result={result} />}
    </div>
  );
}
```

## database design ideas 
  // Enhanced Prisma schema with improved LLM integration
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")
  extensions = [uuid_ossp(map: "uuid-ossp", schema: "extensions"), vector]
}

// Core Models

model Book {
  id                    String          @id @default(uuid())
  title_zh             String          // Chinese title required
  title_en             String?         // Optional English title
  description_zh       String          @db.Text
  description_en       String?         @db.Text
  cover_image          String?         // Cloudinary URL
  quantity             Int             @default(0)
  category             Category        @relation(fields: [category_id], references: [id])
  category_id          String
  
  // LLM-related fields
  content_vector       Unsupported("vector")?    // For semantic search
  cover_image_analysis Json?           // GPT-4o image analysis results
  auto_generated_tags  String[]        // Tags generated by LLM
  verified_tags        String[]        // Tags verified by admin
  pending_tags         String[]        // Tags awaiting verification
  rejected_tags        String[]        // Explicitly rejected tags
  similar_books        String[]        // IDs of similar books detected by LLM
  
  // Content analysis
  content_summary_zh   String?         @db.Text // Generated by LLM
  content_summary_en   String?         @db.Text // Generated by LLM
  keywords_zh          String[]        // Keywords extracted by LLM
  keywords_en          String[]        // Keywords extracted by LLM
  difficulty_level     Int?            // 1-5, analyzed by LLM
  
  // Metadata
  author_zh            String?
  author_en            String?
  publisher_zh         String?
  publisher_en         String?
  publication_date     DateTime?
  isbn                 String?
  
  // Status and tracking
  status              BookStatus      @default(ACTIVE)
  inventory_history    InventoryChange[]
  view_count          Int             @default(0)
  last_viewed_at      DateTime?
  created_at          DateTime        @default(now())
  updated_at          DateTime        @updatedAt
  discontinued_at     DateTime?
  discontinued_reason String?
  
  // Analysis history
  analyses            BookAnalysis[]
  tag_history         TagHistory[]
  image_analyses      ImageAnalysis[]
  order_items         OrderItem[]
  cart_items          CartItem[]

  @@index([title_zh, title_en])
  @@index([category_id])
  @@index([status])
  @@index([auto_generated_tags])
  @@index([verified_tags])
}

model Category {
  id              String       @id @default(uuid())
  type            CategoryType @unique
  name_zh         String
  name_en         String
  description_zh  String?      @db.Text
  description_en  String?      @db.Text
  image           String?      // Cloudinary URL
  books           Book[]
  created_at      DateTime     @default(now())
  updated_at      DateTime     @updatedAt

  @@index([type])
}

model ImageAnalysis {
  id              String    @id @default(uuid())
  book_id         String
  book            Book      @relation(fields: [book_id], references: [id])
  image_url       String    // Cloudinary URL
  analysis_type   ImageAnalysisType
  result          Json      // GPT-4o analysis results
  confidence      Float
  created_at      DateTime  @default(now())
  created_by      String    // Admin email
  prompt_version  Int       // Track prompt versions

  @@index([book_id])
  @@index([analysis_type])
}

model BookAnalysis {
  id              String        @id @default(uuid())
  book_id         String
  book            Book          @relation(fields: [book_id], references: [id])
  analysis_type   AnalysisType
  result          Json
  confidence      Float
  prompt_used     String        @db.Text
  prompt_version  Int
  created_at      DateTime      @default(now())
  created_by      String        // Admin email

  @@index([book_id])
  @@index([analysis_type])
}

model TagHistory {
  id              String    @id @default(uuid())
  book_id         String
  book            Book      @relation(fields: [book_id], references: [id])
  tag             String
  tag_type        TagType
  is_auto         Boolean   // True if generated by LLM
  confidence      Float?    // For LLM-generated tags
  status          TagStatus @default(PENDING)
  added_by        String    // Admin email or "LLM"
  added_at        DateTime  @default(now())
  reviewed_by     String?   // Admin email
  reviewed_at     DateTime?
  prompt_version  Int?      // For LLM-generated tags

  @@index([book_id])
  @@index([tag])
  @@index([status])
}

model InventoryChange {
  id              String        @id @default(uuid())
  book_id         String
  book            Book          @relation(fields: [book_id], references: [id])
  quantity_change Int
  reason          ChangeReason
  notes           String?
  created_at      DateTime      @default(now())
  created_by      String        // Admin email
  order_id        String?       // If change is related to an order

  @@index([book_id])
  @@index([created_at])
}

// LLM Session Management

model AdminChatSession {
  id                   String         @id @default(uuid())
  admin_email          String
  session_type         SessionType
  created_at           DateTime       @default(now())
  last_activity        DateTime       @default(now())
  context              Json?          // Current conversation context
  current_books        String[]       // Book IDs in current context
  current_orders       String[]       // Order IDs in current context
  conversation_history Json?          // Full conversation history
  llm_settings         Json?          // Custom LLM settings
  function_calls      Json?          // History of function calls
  active              Boolean        @default(true)
  prompt_versions     Json?          // Track prompt versions used
  confidence_threshold Float?         // For LLM decisions
  auto_approve_threshold Float?      // For auto-approving LLM suggestions

  @@index([admin_email])
  @@index([session_type])
  @@index([last_activity])
}

model SystemPrompt {
  id              String    @id @default(uuid())
  name            String    @unique
  content         String    @db.Text
  description     String?
  use_case        String
  version         Int       @default(1)
  is_active       Boolean   @default(true)
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  created_by      String    // Admin email
  performance_metrics Json? // Track prompt performance

  @@index([name])
  @@index([use_case])
  @@index([version])
}

// Enums and Types

enum BookStatus {
  ACTIVE
  DISCONTINUED
  OUT_OF_STOCK
  PENDING_REVIEW
}

enum CategoryType {
  PURE_LAND_BOOKS
  OTHER_BOOKS
  DHARMA_ITEMS
  BUDDHA_STATUES
}

enum AnalysisType {
  CONTENT_SUMMARY
  DIFFICULTY_LEVEL
  CATEGORY_SUGGESTION
  TAG_GENERATION
  DUPLICATE_CHECK
  TRANSLATION_QUALITY
  CONTENT_ADVISORY
}

enum ImageAnalysisType {
  TEXT_EXTRACTION
  DUPLICATE_CHECK
  QUALITY_ASSESSMENT
  CONTENT_VERIFICATION
  DAMAGE_DETECTION
}

enum TagType {
  CONTENT
  AUTHOR
  THEME
  DIFFICULTY
  AUDIENCE
}

enum TagStatus {
  PENDING
  APPROVED
  REJECTED
  AUTO_APPROVED
}

enum SessionType {
  INVENTORY_MANAGEMENT
  ORDER_PROCESSING
  CUSTOMER_SERVICE
  CONTENT_ANALYSIS
}

enum ChangeReason {
  RESTOCK
  ORDER
  DAMAGE
  LOSS
  RETURN
  ADJUSTMENT
}

## 5. .env set up (just structure, no actual values) (Things below are what developer absolutely need to know)
# database
DATABASE_URL=
DIRECT_URL=
# openai for gpt-4o
OPENAI_API_KEY=
# cloudinary
CLOUDINARY_URL=cloudinary://123456789012345:abcdefghijklmnopqrstuvwxyz1234@cloud_name


## 6. Scenario example: (the language used in examples are just example, we want to fully utilize the LLM's capabilities to process natural language and image data, so no preset language what so ever)
Admin: [Uploads an image of a Buddhist book](image upload to cloudinary for optimization and use for book listing showing, and then image is sent to LLM for processing)
LLM: I'll process this image for you and check our database. Let me analyze it step by step.
I've detected some text from the image. Here's what I found:
Title (Chinese): 淨土十要
Title (English): Ten Essentials of Pure Land Buddhism
Category: PURE_LAND_BOOKS (净土佛书)
Suggested tags: 淨土, Pure Land, 印光大師
[Cover Image shown]
Would you like to review and modify these suggested tags before I proceed with duplicate checking?
Admin: remove "Pure Land" tag since we already have 淨土, and add "修持" tag
LLM: I've updated the information:
Title (Chinese): 淨土十要
Title (English): Ten Essentials of Pure Land Buddhism
Category: PURE_LAND_BOOKS (净土佛书)
Tags: 淨土, 印光大師, 修持
[Cover Image shown]
Let me check our database for potential duplicates...
[After database search and image comparison]
I found a similar book in our database. Let me show you both:
Existing book:
Title (Chinese): 淨土十要
Title (English): Ten Essentials of Pure Land Buddhism (Second Edition)
Category: PURE_LAND_BOOKS
Tags: 淨土, 印光大師, 修持
Quantity: 15 copies
[Cover Image shown]
Would you like to:

Update the existing listing
Create a new listing for this edition
Let me know if the extracted information needs correction

Admin: No, this is a different book. The title should be 淨土指歸
LLM: I apologize for the misunderstanding. Thank you for the correction. Here's the updated information:
Title (Chinese): 淨土指歸
Title (English): null (I don't see an English title on the cover)
Category: PURE_LAND_BOOKS (净土佛书)
Tags: 淨土, 指歸
[Cover Image shown]
How many copies would you like to add to the inventory?
Admin: 50 copies. Also add 印光大師 to the tags
LLM: Here's the final information before I create the listing:
Title (Chinese): 淨土指歸
Title (English): null
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸, 印光大師
Quantity: 50 copies
[Cover Image shown]
Creating the listing now... Done! Would you like to make any other changes or add a description?
Admin: yes change the english title to "Pure Land Guidelines"
LLM: I'll update the English title. Here's the complete updated information:
Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸, 印光大師
Quantity: 50 copies
[Cover Image shown]
The English title has been updated. Is there anything else you'd like to modify?
Admin: show me all books with less than 20 copies
LLM: I'll search for books with low inventory (less than 20 copies). Here's what I found:
Book #1:
Title (Chinese): 淨土修持指要
Title (English): Essential Guidelines for Pure Land Practice
Category: PURE_LAND_BOOKS
Tags: 淨土, 修持
Quantity: 12 copies
[Cover Image shown]
Book #2:
Title (Chinese): 阿彌陀經講義
Title (English): Commentary on Amitabha Sutra
Category: PURE_LAND_BOOKS
Tags: 阿彌陀經, 經典
Quantity: 8 copies
[Cover Image shown]
Book #3:
Title (Chinese): 禪門修證指要
Title (English): Essential Guidelines for Chan Practice
Category: OTHER_BOOKS
Tags: 禪門, 修證
Quantity: 15 copies
[Cover Image shown]
Book #4:
Title (Chinese): 佛陀本生故事
Title (English): Buddha's Jataka Tales
Category: OTHER_BOOKS
Tags: 佛陀, 本生
Quantity: 5 copies
[Cover Image shown]
Would you like me to sort these by quantity, category, or would you like to update any of these quantities?
Admin: remove the buddha tales book, we are not planning to restock
LLM: I understand you want to remove "佛陀本生故事". Here's the current information:
Title (Chinese): 佛陀本生故事
Title (English): Buddha's Jataka Tales
Category: OTHER_BOOKS
Tags: 佛陀, 本生
Quantity: 5 copies
[Cover Image shown]
Setting quantity to 0 will effectively remove it from active inventory. Would you like me to proceed with this?
Also, would you like me to add a note in the system indicating that this item won't be restocked?
Admin: yes and yes
LLM: I've updated the book "佛陀本生故事". Here's the updated low inventory list (less than 20 copies):
Book #1:
Title (Chinese): 淨土修持指要
Title (English): Essential Guidelines for Pure Land Practice
Category: PURE_LAND_BOOKS
Tags: 淨土, 修持
Quantity: 12 copies
[Cover Image shown]
Book #2:
Title (Chinese): 阿彌陀經講義
Title (English): Commentary on Amitabha Sutra
Category: PURE_LAND_BOOKS
Tags: 阿彌陀經, 經典
Quantity: 8 copies
[Cover Image shown]
Book #3:
Title (Chinese): 禪門修證指要
Title (English): Essential Guidelines for Chan Practice
Category: OTHER_BOOKS
Tags: 禪門, 修證
Quantity: 15 copies
[Cover Image shown]
Would you like to check any other inventory levels or make additional updates?
Admin: do we have any pure land books by 印光大師?
LLM: Let me search the database for Pure Land books by Master Yin Guang:
Book #1:
Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸, 印光大師
Quantity: 50 copies
[Cover Image shown]
Book #2:
Title (Chinese): 印光大師文鈔
Title (English): Collected Works of Master Yin Guang
Category: PURE_LAND_BOOKS
Tags: 印光大師, 淨土, 文鈔
Quantity: 25 copies
[Cover Image shown]
Book #3:
Title (Chinese): 淨土修持指要
Title (English): Essential Guidelines for Pure Land Practice
Category: PURE_LAND_BOOKS
Tags: 淨土, 修持, 印光大師
Quantity: 12 copies
[Cover Image shown]
Would you like to see more details about any of these books or make inventory updates?
Admin: the second one is running low, add 30 more copies
LLM: I understand you want to add 30 copies to "印光大師文鈔". Let me confirm we're updating the correct book:
Title (Chinese): 印光大師文鈔
Title (English): Collected Works of Master Yin Guang
Category: PURE_LAND_BOOKS
Tags: 印光大師, 淨土, 文鈔
Current quantity: 25 copies
Adding: 30 copies
New total will be: 55 copies
[Cover Image shown]
Should I proceed with this update?
Admin: yes, and update the english title to "Selected Writings of Master Yin Guang"
LLM: I'll make both updates. Here's the updated information:
Title (Chinese): 印光大師文鈔
Title (English): Selected Writings of Master Yin Guang
Category: PURE_LAND_BOOKS
Tags: 印光大師, 淨土, 文鈔
Quantity: 55 copies
[Cover Image shown]
Both changes have been applied. Is there anything else you'd like to modify?
Admin: for the book 阿彌陀經講義, i want to update its tags
LLM: Here's the current information for "阿彌陀經講義":
Title (Chinese): 阿彌陀經講義
Title (English): Commentary on Amitabha Sutra
Category: PURE_LAND_BOOKS
Tags: 阿彌陀經, 經典
Quantity: 8 copies
[Cover Image shown]
What changes would you like to make to the tags?
Admin: add 註解 and 淨土 tags
LLM: I'll update the tags. Here's the complete updated information:
Title (Chinese): 阿彌陀經講義
Title (English): Commentary on Amitabha Sutra
Category: PURE_LAND_BOOKS
Tags: 阿彌陀經, 經典, 註解, 淨土
Quantity: 8 copies
[Cover Image shown]
The tags have been updated. Would you like to make any other changes to this book?
Admin: search for books tagged with both 修持 and 淨土
LLM: I'll search for books that have both "修持" and "淨土" tags. Found 2 books:
Book #1:
Title (Chinese): 淨土修持指要
Title (English): Essential Guidelines for Pure Land Practice
Category: PURE_LAND_BOOKS
Tags: 淨土, 修持, 印光大師
Quantity: 12 copies
[Cover Image shown]
Book #2:
Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸, 修持, 印光大師
Quantity: 50 copies
[Cover Image shown]
Would you like to see more details about any of these books?

Admin: show me new orders that need processing
LLM: I'll check for new orders in the system. Found 3 new orders with NEW status:
Order #1242 (Received 2 hours ago)
Status: NEW
Items:

Book ID: BK-2024-0472
Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸, 印光大師
Quantity ordered: 2
[Cover Image shown]
Book ID: BK-2024-0389
Title (Chinese): 印光大師文鈔
Title (English): Selected Writings of Master Yin Guang
Category: PURE_LAND_BOOKS
Tags: 印光大師, 淨土, 文鈔
Quantity ordered: 1
[Cover Image shown]

Shipping Information:
Name: John Smith
Phone: +1 (555) 123-4567
Email: john.smith@email.com
Address: 123 Dharma Street, Unit 5
Pure Land City, PL 12345
Notes: Need before the end of month

Order #1243 (Received 1 hour ago)
Status: NEW
Items:

Book ID: BK-2024-0156
Title (Chinese): 阿彌陀經講義
Title (English): Commentary on Amitabha Sutra
Category: PURE_LAND_BOOKS
Tags: 阿彌陀經, 經典, 註解, 淨土
Quantity ordered: 5
[Cover Image shown]

Shipping Information:
Name: Mary Johnson
Phone: +1 (555) 987-6543
Email: mary.j@email.com
Address: 456 Buddha Avenue
Dharma City, DC 54321
Notes: null

Order #1244 (Just received)
Status: NEW
Items:

Book ID: BK-2024-0233
Title (Chinese): 禪門修證指要
Title (English): Essential Guidelines for Chan Practice
Category: OTHER_BOOKS
Tags: 禪門, 修證
Quantity ordered: 3
[Cover Image shown]
Book ID: BK-2024-0472
Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸, 印光大師
Quantity ordered: 1
[Cover Image shown]

Shipping Information:
Name: David Chen
Phone: +1 (555) 246-8135
Email: d.chen@email.com
Address: 789 Meditation Lane
Zen Valley, ZV 98765
Notes: Urgent request - Needed for study group next week
Would you like to process any of these orders?
Admin: i will start with order 1242
LLM: I'll help process Order #1242.

Setting status to PROCESSING
Confirmation email sent to john.smith@email.com

Here's the order details for your reference:
Order #1242 (Updated to PROCESSING)
Items:

Book ID: BK-2024-0472
Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸, 印光大師
Quantity ordered: 2
[Cover Image shown]
Book ID: BK-2024-0389
Title (Chinese): 印光大師文鈔
Title (English): Selected Writings of Master Yin Guang
Category: PURE_LAND_BOOKS
Tags: 印光大師, 淨土, 文鈔
Quantity ordered: 1
[Cover Image shown]

Shipping Information:
Name: John Smith
Phone: +1 (555) 123-4567
Email: john.smith@email.com
Address: 123 Dharma Street, Unit 5
Pure Land City, PL 12345
Notes: Need before the end of month
Admin: the tracking number is TBD-24022-1242
LLM: Updates made to Order #1242:

Tracking number added: TBD-24022-1242
Status updated from PROCESSING to SHIPPED
Shipping confirmation email sent to john.smith@email.com with tracking number




Would you like to make any other updates?
Admin: show me all orders that are processing
LLM: Here are all orders currently with PROCESSING status:
Order #1244 (Updated 30 minutes ago)
Status: PROCESSING
Items:

Book ID: BK-2024-0233
Title (Chinese): 禪門修證指要
Title (English): Essential Guidelines for Chan Practice
Category: OTHER_BOOKS
Tags: 禪門, 修證
Quantity ordered: 3
[Cover Image shown]
Book ID: BK-2024-0472
Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸, 印光大師
Quantity ordered: 1
[Cover Image shown]

Shipping Information:
Name: David Chen
Phone: +1 (555) 246-8135
Email: d.chen@email.com
Address: 789 Meditation Lane
Zen Valley, ZV 98765
Notes: Urgent request - Needed for study group next week

Order #1239 (Updated 1 hour ago)
Status: PROCESSING
Items:

Book ID: BK-2024-0167
Title (Chinese): 佛門修持指南
Title (English): Buddhist Practice Guide
Category: OTHER_BOOKS
Tags: 佛門, 修持
Quantity ordered: 1
[Cover Image shown]

Shipping Information:
Name: Sarah Williams
Phone: +1 (555) 777-9999
Email: s.williams@email.com
Address: 321 Temple Road
Dharma Valley, DV 67890
Notes: null
Would you like to update any of these orders?
Admin: update order 1239 to shipped with no tracking number
LLM: Updates made to Order #1239:

Status updated from PROCESSING to SHIPPED
No tracking number added (as requested)
Shipping confirmation email sent to s.williams@email.com




Remaining orders in PROCESSING status:
Order #1244 (David Chen)
Would you like to process any other orders?
Admin: show me all orders that are shipped last week
LLM: Here are all orders with SHIPPED status from last 7 days:
Order #1242
Status: SHIPPED
Items:

Book ID: BK-2024-0472
Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸, 印光大師
Quantity ordered: 2
[Cover Image shown]
Book ID: BK-2024-0389
Title (Chinese): 印光大師文鈔
Title (English): Selected Writings of Master Yin Guang
Category: PURE_LAND_BOOKS
Tags: 印光大師, 淨土, 文鈔
Quantity ordered: 1
[Cover Image shown]

Shipping Information:
Name: John Smith
Tracking Number: TBD-24022-1242
Notes: Need before the end of month
Would you like to make any updates to the shipped orders?
Admin: mark order 1242 as completed
LLM: Updates made to Order #1242:

Status updated from SHIPPED to COMPLETED
No further action needed

Order details archived:
Order #1242 (Completed)
Items:

Book ID: BK-2024-0472
Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Quantity ordered: 2
Book ID: BK-2024-0389
Title (Chinese): 印光大師文鈔
Title (English): Selected Writings of Master Yin Guang
Quantity ordered: 1

Customer: John Smith
Tracking Number: TBD-24022-1242
Notes: Need before the end of month
Would you like to perform any other order operations?

# note: 
The authentication and authorization are already well handled by:
Supabase Auth with magic links for authentication
Role-based access control in middleware for:
Protected API routes (/api/*)
Admin routes (/admin/*) - requires ADMIN or SUPER_ADMIN role
Super Admin routes (/super-admin/*) - requires SUPER_ADMIN role

so skip the authentication and authorization in the LLM function