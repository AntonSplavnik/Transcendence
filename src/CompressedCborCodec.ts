import * as cbor from 'cbor';
import * as pako from 'pako';

export class CompressedCborCodec {
  encode(data: any): Buffer {
    const cborData = cbor.encode(data);
    const compressedData = pako.deflate(cborData);
    return Buffer.from(compressedData);
  }

  decode(buffer: Buffer): any {
    const decompressedData = pako.inflate(buffer);
    return cbor.decode(Buffer.from(decompressedData));
  }
}
