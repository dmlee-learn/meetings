import { DocumentService } from '../services/core.service';
import { TextBlockPlugin } from './text/text-block.plugin';
import { MindmapBlockPlugin } from './mindmap/mindmap-block.plugin';
import { SpreadsheetBlockPlugin } from './spreadsheet/spreadsheet-block.plugin';

/**
 * PluginManager는 모든 블록 플러그인을 등록하고 관리합니다.
 * documentService를 주입받아 블록 데이터를 MongoDB에 저장/조회합니다.
 */
export class PluginManager {
  private plugins: Map<string, any> = new Map();
  private docService: DocumentService;

  constructor(docService: DocumentService) {
    this.docService = docService;
    // 기본 플러그인 등록
    this.registerPlugin(new TextBlockPlugin());
    this.registerPlugin(new MindmapBlockPlugin());
    this.registerPlugin(new SpreadsheetBlockPlugin());
  }

  registerPlugin(plugin: any) {
    this.plugins.set(plugin.type, plugin);
  }

  getPlugin(type: string) {
    return this.plugins.get(type);
  }

  /**
   * 문서에 새 블록을 추가합니다.
   */
  async addBlockToDocument(docId: string, type: string, rawData: any) {
    const plugin = this.getPlugin(type);
    if (!plugin) {
      throw new Error(`알 수 없는 블록 타입: ${type}`);
    }

    // 플러그인의 serialize 메서드로 데이터 정리
    const serializedData = plugin.serialize(rawData);

    // MongoDB에 블록 추가
    const doc = await this.docService.getDocumentById(docId);
    if (!doc) {
      throw new Error(`문서를 찾을 수 없습니다: ${docId}`);
    }

    const newBlockId = `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    doc.blocks.push({
      id: newBlockId,
      type: type,
      updatedAt: new Date(),
      data: serializedData
    });

    await this.docService.updateDocument(docId, { blocks: doc.blocks });
    return doc;
  }

  /**
   * 특정 블록의 데이터를 내보냅니다.
   */
  async exportBlock(docId: string, blockId: string, format: string) {
    const doc = await this.docService.getDocumentById(docId);
    if (!doc) {
      throw new Error(`문서를 찾을 수 없습니다: ${docId}`);
    }

    const block = doc.blocks.find(b => b.id === blockId);
    if (!block) {
      throw new Error(`블록을 찾을 수 없습니다: ${blockId}`);
    }

    const plugin = this.getPlugin(block.type);
    if (!plugin) {
      throw new Error(`알 수 없는 블록 타입: ${block.type}`);
    }

    return plugin.exportToFormat(block.data, format);
  }
}
