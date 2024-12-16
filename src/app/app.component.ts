import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DockComponent } from './dock/dock.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DockComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'dock-app';
}
