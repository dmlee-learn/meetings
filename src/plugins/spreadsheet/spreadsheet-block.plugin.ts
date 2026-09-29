import { BaseWorkspaceBlock, IBlockPluginData } from '../base-block';
import * as XLSX from 'xlsx';
import { sanitizeObject, sanitizeNoSQLQuery } from '../../services/utils/sanitizer';

/**
 * Interface for Spreadsheet-specific plugin data.
 */
export interface ISpreadsheetNode {
  row: number;
  col: number;
  value: any;
  style?: {
    backgroundColor?: string;
    fontWeight?: 'normal' | 'bold';
  };
}

export interface ISpreadsheetPluginData extends IBlockPluginData {
  cells: ISpreadsheetNode[];
  rowCount: number;
  colCount: number;
}

/**
 * SpreadsheetBlockPlugin은 스프레드시트 블록을 관리하며 .xlsx 파일 내보내기를 지원합니다.
 */
export class SpreadsheetBlockPlugin extends BaseWorkspaceBlock<ISpreadsheetPluginData> {
  readonly type = 'spreadsheet';

  serialize(rawInput: any): ISpreadsheetPluginData {
    // 데이터 정제(Sanitization) 수행
    const safeCells = (rawInput.cells || []).map((cell: any) => ({
      ...cell,
      value: typeof cell.value === 'string' ? sanitizeNoSQLQuery(cell.value) : cell.value
    }));

    return {
      cells: safeCells,
      rowCount: rawInput.rowCount || 100,
      colCount: rawInput.colCount || 26
    };
  }

  async exportToFormat(blockData: ISpreadsheetPluginData, format: string): Promise<Buffer> {
    if (format === 'json') {
      return Buffer.from(JSON.stringify(blockData));
    }

    if (format === 'xlsx') {
      return this.generateXlsx(blockData);
    }

    throw new Error(`Export format ${format} is not supported for spreadsheet.`);
  }

  /**
   * XLSX 라이브러리를 사용하여 스프레드시트 데이터를 .xlsx 파일 바이너리로 변환합니다.
   */
  private generateXlsx(data: ISpreadsheetPluginData): Buffer {
    // 워크시트 객체 생성
    const worksheet: XLSX.WorkSheet = {};
    
    // 셀 데이터 매핑
    data.cells.forEach(cell => {
      const cellAddress = XLSX.utils.encode_cell({ r: cell.row, c: cell.col });
      worksheet[cellAddress] = {
        v: cell.value,
        t: typeof cell.value === 'number' ? 'n' : 's'
      };
    });

    // 워크시트 범위 설정 (예: A1:Z100)
    const range = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: data.rowCount - 1, c: data.colCount - 1 }
    });
    worksheet['!ref'] = range;

    // 워크북 생성 및 엑셀 파일 버퍼 변환
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
  }
}
