import { CompressedCborCodec } from './CompressedCborCodec';

const codec = new CompressedCborCodec();

const data = {
  name: 'John Doe',
  age: 30,
  isStudent: false,
};

const encodedData = codec.encode(data);
console.log('Encoded:', encodedData);

const decodedData = codec.decode(encodedData);
console.log('Decoded:', decodedData);
