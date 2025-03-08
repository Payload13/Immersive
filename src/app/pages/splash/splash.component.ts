import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";

@Component({
  selector: "app-splash",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-900 flex items-center justify-center">
      <div class="text-center">
        <img 
          src="assets/logo-no-bg.png" 
          alt="Immersive" 
          class="w-48 h-auto" 
        />
        <p class="text-gray-400 text-lg">Your Personal Reading Companion</p>
      </div>
    </div>
  `,
})
export class SplashComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {
    // Navigate to library after 2 seconds
    setTimeout(() => {
      this.router.navigate(["/library"]);
    }, 2000);
  }
}