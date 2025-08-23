import { DeviceMetadata, MeasurementRecord, ParsedFileData } from '../types/FileData';

/**
 * Parser for Testo 174T single-channel devices (temperature only)
 */
export class Testo174TBinaryParser {
  private buffer: ArrayBuffer;
  private view: DataView;
  
  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
  }

  async parse(fileName: string): Promise<ParsedFileData> {
    try {
      console.log('Parsing Testo 174T file:', fileName);
      
      // Basic device metadata
      const deviceMetadata: DeviceMetadata = {
        deviceType: 1,
        deviceModel: 'Testo 174T',
        serialNumber: this.extractSerialNumber() || 'Unknown'
      };

      // Extract measurements
      const measurements = this.extractMeasurements();
      
      // Calculate date range
      const timestamps = measurements.map(m => m.timestamp);
      const startDate = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : new Date();
      const endDate = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : new Date();

      return {
        fileName,
        deviceMetadata,
        measurements,
        startDate,
        endDate,
        recordCount: measurements.length,
        parsingStatus: 'completed'
      };
    } catch (error) {
      console.error('Error parsing Testo 174T file:', error);
      throw new Error(`Failed to parse Testo 174T file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractSerialNumber(): string | null {
    try {
      // Look for serial number pattern in the file
      const serialOffset = this.findString('SerialNumber');
      if (serialOffset !== -1) {
        return this.readNullTerminatedString(serialOffset + 13); // length of "SerialNumber\t"
      }
      return null;
    } catch (error) {
      console.error('Error extracting serial number:', error);
      return null;
    }
  }

  private extractMeasurements(): MeasurementRecord[] {
    const measurements: MeasurementRecord[] = [];
    
    try {
      // Data typically starts at offset 0x0C00
      const dataStartOffset = 0x0C00;
      const recordSize = 8; // 4 bytes timestamp + 4 bytes temperature (single channel)
      
      if (dataStartOffset >= this.buffer.byteLength) {
        return measurements;
      }

      const maxRecords = Math.floor((this.buffer.byteLength - dataStartOffset) / recordSize);
      
      for (let i = 0; i < maxRecords; i++) {
        const offset = dataStartOffset + i * recordSize;
        
        if (offset + recordSize > this.buffer.byteLength) break;
        
        try {
          // Read timestamp (Unix timestamp)
          const timestamp = this.view.getUint32(offset, true);
          const temperature = this.view.getFloat32(offset + 4, true);
          
          // Validate data
          const tempValid = !isNaN(temperature) && temperature > -50 && temperature < 100;
          
          if (timestamp > 0 && tempValid) {
            measurements.push({
              timestamp: new Date(timestamp * 1000),
              temperature: temperature,
              humidity: undefined, // Single channel device
              isValid: tempValid
            });
          }
        } catch (error) {
          console.warn(`Error reading measurement at offset ${offset}:`, error);
        }
      }
      
      console.log(`Extracted ${measurements.length} measurements from Testo 174T file`);
      return measurements;
    } catch (error) {
      console.error('Error extracting measurements:', error);
      return measurements;
    }
  }

  private findString(searchString: string): number {
    const searchBytes = new TextEncoder().encode(searchString);
    
    for (let i = 0; i <= this.buffer.byteLength - searchBytes.length; i++) {
      let found = true;
      for (let j = 0; j < searchBytes.length; j++) {
        if (this.view.getUint8(i + j) !== searchBytes[j]) {
          found = false;
          break;
        }
      }
      if (found) return i;
    }
    
    return -1;
  }

  private readNullTerminatedString(offset: number): string {
    const bytes: number[] = [];
    let currentOffset = offset;
    
    while (currentOffset < this.buffer.byteLength) {
      const byte = this.view.getUint8(currentOffset);
      if (byte === 0 || byte === 0x0D || byte === 0x0A) break;
      if (byte >= 32 && byte <= 126) {
        bytes.push(byte);
      }
      currentOffset++;
    }
    
    return new TextDecoder().decode(new Uint8Array(bytes));
  }
}