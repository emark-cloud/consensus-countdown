export {};

declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?: any[] | object;
      }) => Promise<any>;
      on?: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}
