// CCLab Mini Project - 9.R Particle World Template

let NUM_OF_PARTICLES = 20; // Decide the initial number of particles.
let MAX_OF_PARTICLES = 500; // Decide the maximum number of particles.

let particles = [];

function setup() {
  let canvas = createCanvas(800, 500);
  canvas.parent("p5-canvas-container");

  // generate particles
  for (let i = 0; i < NUM_OF_PARTICLES; i++) {
    particles[i] = new Particle(random(width), random(height));
  }
}

function mousePressed() {
  particles.push(new Particle(mouseX, mouseY));
}

function draw() {
  background(50);

  // consider generating particles in draw(), using Dynamic Array

  // update and display
  for (let i = 0; i < particles.length; i++) {
    let p = particles[i];
    p.update();
    p.display();
  }

  // limit the number of particles
  if (particles.length > MAX_OF_PARTICLES) {
    particles.splice(0, 1); // remove the first (oldest) particle
  }

  for (let i = 0; i < particles.length; i++) {
    for (let i2 = 0; i2 < particles.length; i2++) {
      if (i != i2) {
        particles[i].collision(particles[i2]);
        console.log(i);
      }

    }
  }

}

class Particle {
  // constructor function
  constructor(startX, startY) {
    // properties (variables): particle's characteristics
    this.x = startX;
    this.y = startY;
    this.dia = 30;
    this.r = random(255);
    this.g = random(255);
    this.b = random(255);
    this.collided = false;
  }
  // methods (functions): particle's behaviors
  update() {
    // this.y--

    // if (this.collided) {
    //   this.y = 200
    // }

    // (add) 
    if (this.y >= 15 && this.collided == false) {
      this.y--;
    }
  }

  collision(particle) {
    let d = dist(particle.x, particle.y, this.x, this.y)
    if (d <= 30) {
      this.collided = true;
    }
  }

  display() {
    // particle's appearance
    push();
    translate(this.x, this.y);

    noFill();
    strokeWeight(2);
    bezier(0, 0, -10, 10, 10, -10, 0, 50);
    fill(this.r, this.g, this.b);
    circle(0, 0, this.dia);


    pop();
  }
}
