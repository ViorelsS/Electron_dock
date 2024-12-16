import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-dock',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dock.component.html',
  styleUrl: './dock.component.scss',
})
export class DockComponent {
  activeSection: 'apps' | 'files' = 'apps';

  // Mock apps
  apps = [
    { name: 'App1', icon: 'assets/app1-icon.png', command: 'path/to/app1' },
    { name: 'App2', icon: 'assets/app2-icon.png', command: 'path/to/app2' },
  ];

  // Mock files
  files = [
    { name: 'File 1', path: 'path/to/file1' },
    { name: 'File 2', path: 'path/to/file2' },
  ];

  openApp(app: { name: string; command: string }) {
    console.log(`Apri applicazione: ${app.name} (${app.command})`);
    // TODO: eseguire il comando con electron
  }

  openFile(file: { name: string; path: string }) {
    console.log(`Apri file: ${file.name} (${file.path})`);
    //TODO: aprire il file con Electron
  }
}
