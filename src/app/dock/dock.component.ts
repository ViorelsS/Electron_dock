import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  HostListener,
  NgZone,
} from '@angular/core';

interface App {
  name: string;
  icon: string | 'assets/app-icon.png';
  path: string;
}

@Component({
  selector: 'app-dock',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dock.component.html',
  styleUrl: './dock.component.scss',
})
export class DockComponent {
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
    window.electron.ipcRenderer.on('file-path-received', (path) => {
      this.zone.run(() => {
        console.log('Percorso del file ricevuto:', path);
      });
    });

    window.electron.ipcRenderer.on('file-paths', (updatedFileList) => {
      this.zone.run(() => {
        updatedFileList.forEach((file: App) => {
          this.apps.push({
            name: file.name,
            icon: file.icon,
            path: file.path,
          });
        });
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
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent) {
    event.preventDefault();

    const files = event.dataTransfer?.files;
    if (files?.length) {
      const fileList = [];
      for (let i = 0; i < files.length; i++) {
        fileList.push({
          name: files[i].name,
          path: (files[i] as any).path || '',
        });
      }
      console.log('NEL COMPONENT', fileList);
      (window as any).electron.ipcRenderer.send('file-dropped', fileList);
    }
  }
}
