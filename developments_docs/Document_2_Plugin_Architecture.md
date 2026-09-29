# Document 2: Plugin Architecture & Module Registration Guide

## 1. Architectural Strategy
To allow absolute extensibility, the system core must remain decoupled from specific block functionalities. Features like Text, Mindmaps, or Spreadsheets are registered dynamically as modular plugins.

## 2. Block Interface Definition (TypeScript)
Every plugin module must implement the following base structure.

```typescript
export interface IWorkspaceBlockModule {
  type: string; // e.g., 'text', 'mindmap', 'spreadsheet'
  allowedExportFormats: string[]; // e.g., ['docx', 'xlsx', 'pdf', 'json']
  
  // Serialize block-specific inner states into a clean MongoDB friendly format
  serializeData(rawInput: any): Record<string, any>;
  
  // Server-side compiler method targeting configurable binary output streams
  exportToFormat(blockData: any, format: string): Promise<Buffer>;
}
```

## 3. MongoDB Subdocument Structural Rule
All custom modules submit unstructured block details within the central `data` object field inside the MongoDB schema wrapper.

```typescript
import { Schema } from 'mongoose';

export const BlockSchema = new Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
  data: { type: Schema.Types.Mixed, required: true } // Managed completely by the registered plugin
});
```
