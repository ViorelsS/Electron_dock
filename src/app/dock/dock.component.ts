import { CommonModule } from '@angular/common';
import {
  Component,
  NgZone,
  ChangeDetectorRef,
  ɵSSR_CONTENT_INTEGRITY_MARKER,
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
  activeSection: 'apps' | 'files' = 'apps';
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
  }

  // Rileva l'evento dragover
  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  // Rileva l'evento drop
  onDrop(event: DragEvent) {
    event.preventDefault();

    console.log('EVENT', event.dataTransfer);
    const files = event.dataTransfer?.files;
    window.electron.ipcRenderer.send('files-dropped', event);

    // if (files && files.length > 0) {
    //   // const filePaths = Array.from(files).map((file) => file.path);
    //   // Invia i percorsi dei file al processo principale di Electron
    //   // window.electron.ipcRenderer.send('files-dropped', filePaths);
    // }
    this.isDragging = false;
  }

  // Apre un'applicazione
  openApp(app: App) {
    console.log('Apertura app:', app.name);
    if (app.path) {
      window.electron.ipcRenderer.send('file-open', app.path);
    } else {
      console.error('Percorso applicazione non disponibile.');
    }
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

  // Carica le applicazioni salvate
  loadApps() {
    window.electron.ipcRenderer.invoke('load-apps').then((apps) => {
      this.apps = apps;
      console.log('Applicazioni caricate:', this.apps);
      this.cdr.detectChanges();
    });
  }

  // Salva le applicazioni correnti
  saveApps() {
    window.electron.ipcRenderer.send('save-apps', this.apps);
  }

  // Rimuove un'applicazione
  removeApp(appToRemove: App) {
    this.apps = this.apps.filter((app) => app.path !== appToRemove.path);
    this.saveApps(); // Salva automaticamente le app aggiornate
    this.cdr.detectChanges();
  }
}
