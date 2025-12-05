let imgPBot, imgPBag, imgPS, backGround, recycle, plasticObjects;
let trash = [];
let year = 2025;

function preload() {
  imgPBot = loadImage("assets/trashPhotos/plasticbottle.jpg");
  imgPBag = loadImage("assets/trashPhotos/plasticBag.png");
  imgPS = loadImage("assets/trashPhotos/plasticStraws.png");
  imgPaBag = loadImage("assets/trashPhotos/paperBag.jpeg");
  imgPaS = loadImage("assets/trashPhotos/paperStraw.jpg");
  imgPaBot = loadImage("assets/trashPhotos/paperBottle.png");
  backGround = loadImage("assets/trashPhotos/ocean.jpg");
  recycle = loadImage("assets/trashPhotos/recycle.avif");
  converter = loadImage("assets/trashPhotos/converter.avif");
}

function setup() {
  let canvas = createCanvas(800, 500);
  canvas.parent("p5-canvas-container");
  for (let i = 0; i < 10; i++) {
    trash.push(new Trash(random(width), random(width), imgPBot));
    trash.push(new Trash(random(width), random(width), imgPBag));
    trash.push(new Trash(random(width), random(width), imgPS));
  }
}

function draw() {
  image(backGround, 0, 0, 800, 500);
  image(recycle, 0, height / 2 - 50, 100, 100);
  image(converter, width - 100, height / 2 - 50, 100, 100);
  for (let i = 0; i < trash.length; i++) {
    trash[i].draw();
    trash[i].update();
    if (trash[i].img == imgPBot)
      trash[i].converted(imgPaBot);
    if (trash[i].img == imgPBag)
      trash[i].converted(imgPaBag);
    if (trash[i].img == imgPS)
      trash[i].converted(imgPaS);
  }
  for (let i = trash.length - 1; i >= 0; i--) {
    if (trash[i].delete)
      trash.splice(i, 1);
  }

  if (frameCount % 60 == 0) {
    trash.push(new Trash(random(width), random(width), imgPBot));
    trash.push(new Trash(random(width), random(width), imgPBag));
    trash.push(new Trash(random(width), random(width), imgPS));
    year++;
  }
  plasticObjects = trash.length * 1000000;

  updateDisplay();
}

function updateDisplay() {
  let yearElement = document.getElementById('year-display');
  if (yearElement) {
    yearElement.textContent = year;
  }
  let plasticElement = document.getElementById('plastic-count');
  if (plasticElement) {
    plasticElement.textContent = plasticObjects.toLocaleString();
  }
}

class Trash {
  constructor(x, y, img) {
    this.x = x;
    this.y = y;
    this.img = img;
    this.speedX = random(1, 3);
    this.speedY = random(1, 3);
    this.delete = false;
    this.isConverted = false;
    this.opacity = 255;
  }

  update() {
    if (this.drag()) {
      this.drag();
    }
    else {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.x < 0 || this.x > 800)
        this.speedX *= -1;
      if (this.y < 0 || this.y > 500)
        this.speedY *= -1;
    }
    this.recycled();
    if (this.isConverted)
      this.dissolve();
  }

  drag() {
    if (mouseIsPressed) {
      if (dist(this.x, this.y, mouseX, mouseY) < 50) {
        this.x = mouseX;
        this.y = mouseY;
        return true;
      }
    }
    return false;
  }

  draw() {
    push();
    translate(this.x, this.y);
    tint(255, this.opacity);
    image(this.img, 0, 0, 50, 50);
    pop();
  }

  recycled() {
    if (this.drag()) {
      if (dist(this.x, this.y, 50, height / 2) < 50) {
        this.delete = true;
      }
    }
  }

  converted(image) {
    if (this.drag()) {
      if (dist(this.x, this.y, width - 50, height / 2) < 50) {
        this.img = image;
        this.isConverted = true;
      }
    }
  }

  dissolve() {
    this.opacity -= 3;
    this.opacity = constrain(this.opacity, 0, 255);
    if (this.opacity < 1)
      this.delete = true;
  }
}