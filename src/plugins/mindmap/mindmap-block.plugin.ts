import { BaseWorkspaceBlock, IBlockPluginData } from '../base-block';

/**
 * Interface for Mindmap node.
 */
export interface IMindmapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  parentId: string | null;
}

/**
 * Interface for Mindmap plugin data.
 */
export interface IMindmapPluginData extends IBlockPluginData {
  nodes: IMindmapNode[];
  rootNodeId: string;
}

/**
 * MindmapBlockPlugin implements the BaseWorkspaceBlock for mindmap functionality.
 */
export class MindmapBlockPlugin extends BaseWorkspaceBlock<IMindmapPluginData> {
  readonly type = 'mindmap';

  serialize(rawInput: any): IMindmapPluginData {
    return {
      nodes: rawInput.nodes || [],
      rootNodeId: rawInput.rootNodeId || ''
    };
  }

  async exportToFormat(blockData: IMindmapPluginData, format: string): Promise<Buffer> {
    if (format === 'json') {
      return Buffer.from(JSON.stringify(blockData));
    }
    
    // Placeholder for specialized mindmap export (e.g., Mermaid, PlantUML, or Image)
    const mockExport = `[Mock Mindmap Export in ${format} format]`;
    return Buffer.from(mockExport);
  }
}
