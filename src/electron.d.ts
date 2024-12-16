export interface ElectronAPI {
  ipcRenderer: {
    send: (channel: string, data?: any) => void;
    on: (channel: string, listener: (...args: any[]) => void) => void;
    invoke: (channel: string, data?: any) => Promise<any>;
  };
  dialog: {
    showOpenDialog: (
      options: any
    ) => Promise<{ canceled: boolean; filePaths: string[] }>;
  };
  path: {
    resolve: (...args: string[]) => string;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
