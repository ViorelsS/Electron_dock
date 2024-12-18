import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  HostListener,
  NgZone,
  OnInit,
} from '@angular/core';

interface App {
  name: string;
  icon: string | 'app-icon.png';
  path: string;
  isExecutable: boolean;
}

@Component({
  selector: 'app-dock',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dock.component.html',
  styleUrl: './dock.component.scss',
})
export class DockComponent implements OnInit {
  isVisible = false;
  isInteracting = false;
  isDragging = false;
  apps: App[] = [];

  constructor(private zone: NgZone, private cdr: ChangeDetectorRef) {
    if (window.electron) {
      window.electron.ipcRenderer.on('mouse-position', (data) => {
        this.zone.run(() => {
          const { x, y, screenBounds } = data;

          const threshold = 50;
          const centerWidth = screenBounds.width / 3;

          const isInTopCenter =
            y <= screenBounds.y + threshold &&
            x >= screenBounds.x + (screenBounds.width - centerWidth) / 2 &&
            x <= screenBounds.x + (screenBounds.width + centerWidth) / 2;

          if (isInTopCenter || this.isInteracting) {
            this.isVisible = true;
          } else {
            this.isVisible = false;
          }

          this.cdr.detectChanges();
        });
      });
    }
  }

  async ngOnInit() {
    if (window.electron) {
      this.apps = await window.electron.ipcRenderer.invoke('read-apps');
      this.cdr.detectChanges();
    }

    window.electron.ipcRenderer.on('apps-cleared', () => {
      this.zone.run(() => {
        this.apps = [];
        this.cdr.detectChanges();
      });
    });
  }

  onMouseEnter() {
    this.isInteracting = true;
    this.isVisible = true;
  }

  onMouseLeave() {
    this.isInteracting = false;
    this.isVisible = false;
  }
  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
    this.isInteracting = true;
  }

  @HostListener('drop', ['$event'])
  async onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    this.isInteracting = false;

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      const newPath = window.electron.getPathForFile(file);

      // Controlla se l'applicazione esiste già
      const appExists = this.apps.some((app) => app.path === newPath);
      if (appExists) {
        console.log("L'applicazione esiste già:", newPath);
        return;
      }

      const isDirectory = file.type === '' && file.size === 0;
      const isExecutable =
        file.name.endsWith('.lnk') || file.name.endsWith('.exe');

      // Richiedi l'icona al processo principale
      const icon = await window.electron.getAppIcon(newPath, isDirectory);

      console.log('New path: ', newPath);
      this.apps.push({
        name: file.name,
        path: newPath,
        icon: icon || 'assets/app-icon.png',
        isExecutable: isExecutable,
      });
      await window.electron.ipcRenderer.invoke('write-apps', this.apps);
      this.cdr.detectChanges();
    }
  }

  openApp(app: App) {
    if (app.isExecutable) {
      window.electron.ipcRenderer.send('launch-app', app.path);
    } else {
      window.electron.ipcRenderer.send('open-folder', app.path);
    }
  }
}
