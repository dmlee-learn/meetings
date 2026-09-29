/**
 * Base Interface for all Workspace Blocks.
 * Following the requirements in AGENTS.md and developments_docs/guide/coding-standards.md
 */
export interface IBlockPluginData {
  [key: string]: any;
}

export interface IBaseWorkspaceBlock<T extends IBlockPluginData = IBlockPluginData> {
  readonly type: string;
  
  /**
   * Serialize block-specific inner states into a clean MongoDB friendly format.
   * Used before saving to the Document model.
   */
  serialize(rawInput: any): T;

  /**
   * Server-side compiler method targeting configurable binary output streams.
   * @param blockData The serialized data of the block
   * @param format The target format (e.g., 'docx', 'xlsx', 'pdf', 'json')
   */
  exportToFormat(blockData: T, format: string): Promise<Buffer>;
}

/**
 * Abstract class to be extended by all plugin modules.
 * Ensures consistent implementation of the plugin lifecycle.
 */
export abstract class BaseWorkspaceBlock<T extends IBlockPluginData> implements IBaseWorkspaceBlock<T> {
  abstract readonly type: string;

  abstract serialize(rawInput: any): T;

  abstract exportToFormat(blockData: T, format: string): Promise<Buffer>;

  // Common utility for plugins to validate their data structure
  protected validateData(data: T, schema: (data: T) => boolean): boolean {
    return schema(data);
  }
}
