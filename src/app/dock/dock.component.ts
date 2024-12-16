import { CommonModule } from '@angular/common';
import { Component, NgZone, ChangeDetectorRef } from '@angular/core';

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

  constructor(private zone: NgZone, private cdr: ChangeDetectorRef) {
    +this.loadFilesFromTmp();
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

      // Listener per il file spostato
      window.electron.ipcRenderer.on('file-moved', (response) => {
        this.zone.run(() => {
          console.log('Risposta ricevuta:', response);
          if (response.success) {
            this.files.push({
              name: response.fileName,
              path: response.destination,
            });
            console.log('File aggiunto alla lista:', response.fileName);
          } else {
            console.error('Errore durante il trasferimento:', response.error);
          }
        });
      });
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

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true; // Attiva lo stato di drag
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;

    const files = event.dataTransfer?.files;

    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log('File trascinato:', file);

        // Ottieni il percorso del file usando dialog
        window.electron.dialog
          .showOpenDialog({
            properties: ['openFile'],
            defaultPath: file.name,
          })
          .then((result) => {
            if (!result.canceled && result.filePaths.length > 0) {
              const filePath = result.filePaths[0];
              console.log('Percorso confermato:', filePath);

              window.electron.ipcRenderer.send('file-dropped', {
                name: file.name,
                path: filePath,
              });
            }
          })
          .catch((err) => console.error('Errore durante il dialog:', err));
      }
    } else {
      console.warn('Nessun file rilevato durante il drop.');
    }
  }

  onDragLeave() {
    this.isDragging = false; // Ripristina lo stato
  }

  // Mock apps
  apps = [
    { name: 'App1', icon: 'assets/app1-icon.png', command: 'path/to/app1' },
    { name: 'App2', icon: 'assets/app2-icon.png', command: 'path/to/app2' },
  ];

  loadFilesFromTmp() {
    window.electron.ipcRenderer
      .invoke('get-tmp-files') // Invoca l'evento nel main process
      .then((response) => {
        if (response.success) {
          console.log('File caricati dalla cartella tmp:', response.files);
          this.files = response.files;
        } else {
          console.error(
            'Errore durante il caricamento dei file:',
            response.error
          );
        }
      })
      .catch((err) => {
        console.error(
          'Errore generale durante la richiesta dei file tmp:',
          err
        );
      });
  }

  files: { name: string; path: string }[] = [];

  openApp(app: { name: string; command: string }) {
    console.log(`Apri applicazione: ${app.name} (${app.command})`);
    // TODO: eseguire il comando con electron
  }

  openFile(file: { name: string; path: string }) {
    console.log(`Tentativo di aprire il file: ${file.name} (${file.path})`);

    if (file.path) {
      window.electron.ipcRenderer.send('file-open', file.path);

      // Ricevi la risposta
      window.electron.ipcRenderer.on('file-open-response', (response) => {
        if (response.success) {
          console.log('File aperto con successo.');
        } else {
          console.error("Errore durante l'apertura del file:", response.error);
        }
      });
    } else {
      console.error('Percorso del file non disponibile.');
    }
  }
}
