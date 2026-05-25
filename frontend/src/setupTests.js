import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock window.scrollTo since it's not implemented in JSDOM
window.scrollTo = jest.fn();
