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

          const threshold = 50; // Soglia di altezza dal bordo superiore
          const centerWidth = screenBounds.width / 3; // Un terzo centrale dello schermo

          const isInTopCenter =
            y <= screenBounds.y + threshold && // Vicino al bordo superiore
            x >= screenBounds.x + (screenBounds.width - centerWidth) / 2 && // Dentro l'inizio della zona centrale
            x <= screenBounds.x + (screenBounds.width + centerWidth) / 2; // Fine della zona centrale

          // La barra appare se è nella zona centrale e non stai interagendo
          if (isInTopCenter || this.isInteracting) {
            this.isVisible = true;
          } else {
            this.isVisible = false;
          }

          this.cdr.detectChanges(); // Forza il cambio nel DOM
        });
      });
    }
    window.electron.ipcRenderer.on('file-paths', (updatedFileList) => {
      this.zone.run(() => {
        console.log('Percorsi dei file:', updatedFileList);
        // Puoi ora utilizzare updatedFileList per avviare i file
      });
    });
  }

  // Rileva se il mouse entra nella dock
  onMouseEnter() {
    this.isInteracting = true;
    this.isVisible = true;
  }

  // Rileva se il mouse lascia la dock
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
          path: (files[i] as any).path || '', // Aggiungi un fallback per il percorso
        });
      }
      console.log('NEL COMPONENT', fileList);
      (window as any).electron.ipcRenderer.send('file-dropped', fileList);
    }
  }
}
