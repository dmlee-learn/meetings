import { Document, Packer, Paragraph, TextRun } from 'docx';
import { BaseWorkspaceBlock, IBlockPluginData } from '../base-block';
import { sanitizeObject, sanitizeNoSQLQuery } from '../../services/utils/sanitizer';

interface ITextPluginData extends IBlockPluginData {
  content: string;
  format: 'markdown' | 'plain-text';
}

/**
 * TextBlockPlugin은 텍스트 블록을 관리하며 .docx 파일 내보내기를 지원합니다.
 */
export class TextBlockPlugin extends BaseWorkspaceBlock<ITextPluginData> {
  readonly type = 'text';

  serialize(rawInput: any): ITextPluginData {
    // 데이터 정제(Sanitization) 수행
    const safeContent = sanitizeNoSQLQuery(rawInput.content || '');
    
    return {
      content: safeContent,
      format: rawInput.format || 'markdown'
    };
  }

  async exportToFormat(blockData: ITextPluginData, format: string): Promise<Buffer> {
    const content = blockData.content;
    
    if (format === 'json') {
      return Buffer.from(JSON.stringify(blockData));
    }

    if (format === 'docx') {
      return this.generateDocx(content);
    }

    throw new Error(`Export format ${format} is not supported for text.`);
  }

  /**
   * Docx 라이브러리를 사용하여 텍스트를 .docx 파일 바이너리로 변환합니다.
   */
  private async generateDocx(text: string): Promise<Buffer> {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun(text)]
          })
        ]
      }]
    });

    return await Packer.toBuffer(doc);
  }
}
