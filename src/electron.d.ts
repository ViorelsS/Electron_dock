export interface ElectronAPI {
  ipcRenderer: {
    send: (channel: string, data?: any) => void;
    on: (channel: string, listener: (...args: any[]) => void) => void;
    invoke: (channel: string, data?: any) => Promise<any>;
  };
  getPathForFile: (data: any) => string;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export interface FileWithPath extends File {
  path: string;
}
